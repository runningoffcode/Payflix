/**
 * Session-Based Payment Service
 * Processes X402 payments using session keys (seamless, no popups!)
 * User funds come from their own wallet via delegated session key
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import crypto from 'crypto';
import { db } from '../database/db-factory';

// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.SESSION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SESSION_ENCRYPTION_KEY not configured');
  }
  return Buffer.from(key.substring(0, 64), 'hex');
}

function decryptPrivateKey(encryptedData: string): Uint8Array {
  const combined = Buffer.from(encryptedData, 'base64');

  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return new Uint8Array(decrypted);
}

interface SessionPaymentRequest {
  userWallet: string;
  videoId: string;
  amount: number;
  creatorWallet: string;
}

interface SessionPaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export class SessionPaymentService {
  private connection: Connection;
  private usdcMint: PublicKey;
  private platformFeeWallet: PublicKey;
  private facilitatorWallet: Keypair | null = null;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    this.usdcMint = new PublicKey(
      process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    );

    this.platformFeeWallet = new PublicKey(
      process.env.PLATFORM_FEE_WALLET || '81qpJ8kP4kb1Vf7kgubyEUcJ726dHEEqpFRP4wTFsr1o'
    );

    // Initialize facilitator wallet (pays for transaction fees)
    try {
      if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
        const keyData = JSON.parse(process.env.PLATFORM_WALLET_PRIVATE_KEY);
        this.facilitatorWallet = Keypair.fromSecretKey(new Uint8Array(keyData));
        console.log('💳 Session Payment Service initialized');
        console.log(`   Platform fee wallet: ${this.platformFeeWallet.toBase58()}`);
        console.log(`   Facilitator (gas payer): ${this.facilitatorWallet.publicKey.toBase58()}`);
      } else {
        console.warn('⚠️  No facilitator wallet configured - session payments will fail');
      }
    } catch (error) {
      console.error('❌ Failed to initialize facilitator wallet:', error);
    }
  }

  /**
   * Process seamless payment using session key
   * Funds come from USER'S wallet (not platform's wallet!)
   */
  async processSessionPayment(request: SessionPaymentRequest): Promise<SessionPaymentResult> {
    try {
      console.log(`\n💸 Processing session-based payment...`);
      console.log(`   User: ${request.userWallet}`);
      console.log(`   Amount: ${request.amount} USDC`);
      console.log(`   Creator: ${request.creatorWallet}`);

      // Check if facilitator wallet is configured
      if (!this.facilitatorWallet) {
        return {
          success: false,
          error: 'Facilitator wallet not configured. Cannot process payment.',
        };
      }

      // Get active session for user
      const sessionData = await db.getActiveSession(request.userWallet);
      if (!sessionData) {
        return {
          success: false,
          error: 'No active session found. Please create a session first.',
        };
      }

      // Check if session has enough remaining balance
      const remainingAmount = parseFloat(sessionData.remaining_amount);
      if (remainingAmount < request.amount) {
        return {
          success: false,
          error: `Insufficient session balance. Remaining: ${remainingAmount} USDC, Required: ${request.amount} USDC`,
        };
      }

      // Decrypt session keypair
      const sessionPrivateKey = decryptPrivateKey(sessionData.session_private_key_encrypted);
      const sessionKeypair = Keypair.fromSecretKey(sessionPrivateKey);

      console.log(`   Session key: ${sessionKeypair.publicKey.toBase58()}`);

      // Check if user has enough USDC in their wallet
      const userPublicKey = new PublicKey(request.userWallet);
      const userUsdcAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        userPublicKey
      );

      try {
        const userAccountInfo = await this.connection.getAccountInfo(userUsdcAccount);
        if (!userAccountInfo) {
          return {
            success: false,
            error: `You don't have a USDC account. Please add USDC to your wallet first on Solana Devnet.`,
          };
        }

        const userBalance = await this.connection.getTokenAccountBalance(userUsdcAccount);
        const userBalanceUsdc = parseFloat(userBalance.value.uiAmountString || '0');

        console.log(`   User USDC balance: ${userBalanceUsdc} USDC`);

        if (userBalanceUsdc < request.amount) {
          return {
            success: false,
            error: `Insufficient USDC in wallet. You have ${userBalanceUsdc} USDC but need ${request.amount} USDC. Please add more USDC to your wallet.`,
          };
        }
      } catch (error: any) {
        return {
          success: false,
          error: `Unable to check wallet balance. Please ensure you have USDC in your wallet.`,
        };
      }

      // Calculate revenue split (97.65% creator / 2.35% platform)
      const totalLamports = Math.floor(request.amount * 1_000_000);
      const platformAmount = Math.floor(totalLamports * 0.0235);
      const creatorAmount = totalLamports - platformAmount;

      console.log(`   Creator gets: ${(creatorAmount / 1_000_000).toFixed(6)} USDC`);
      console.log(`   Platform fee: ${(platformAmount / 1_000_000).toFixed(6)} USDC`);

      // Get creator token account
      const creatorPublicKey = new PublicKey(request.creatorWallet);

      const creatorUsdcAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        creatorPublicKey
      );

      const platformUsdcAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        this.platformFeeWallet
      );

      // Build transaction
      const transaction = new Transaction();

      // Check if creator's USDC account exists
      const creatorAccountInfo = await this.connection.getAccountInfo(creatorUsdcAccount);
      if (!creatorAccountInfo) {
        console.log('   Creating creator USDC account...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.facilitatorWallet.publicKey, // Facilitator pays for account creation
            creatorUsdcAccount,
            creatorPublicKey,
            this.usdcMint
          )
        );
      }

      // Check if platform's USDC account exists
      const platformAccountInfo = await this.connection.getAccountInfo(platformUsdcAccount);
      if (!platformAccountInfo) {
        console.log('   Creating platform USDC account...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.facilitatorWallet.publicKey, // Facilitator pays for account creation
            platformUsdcAccount,
            this.platformFeeWallet,
            this.usdcMint
          )
        );
      }

      // Transfer from user to creator (session key signs as delegate)
      transaction.add(
        createTransferInstruction(
          userUsdcAccount,           // FROM: User's USDC account
          creatorUsdcAccount,        // TO: Creator's USDC account
          sessionKeypair.publicKey,  // AUTHORITY: Session keypair (delegate)
          creatorAmount              // 97.65%
        )
      );

      // Transfer from user to platform (session key signs as delegate)
      transaction.add(
        createTransferInstruction(
          userUsdcAccount,           // FROM: User's USDC account
          platformUsdcAccount,       // TO: Platform's USDC account
          sessionKeypair.publicKey,  // AUTHORITY: Session keypair (delegate)
          platformAmount             // 2.35%
        )
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.facilitatorWallet.publicKey; // Facilitator pays for gas

      console.log(`   📡 Broadcasting transaction...`);

      // Both facilitator (for fees) and session key (for delegation) sign
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.facilitatorWallet, sessionKeypair], // Both sign!
        { commitment: 'confirmed' }
      );

      console.log(`   ✅ Payment settled!`);
      console.log(`   Signature: ${signature}`);

      // Update session spending
      await db.updateSessionSpending(sessionData.id, request.amount);

      return {
        success: true,
        signature,
      };

    } catch (error: any) {
      console.error(`   ❌ Payment failed:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if user has an active session
   */
  async hasActiveSession(userWallet: string): Promise<boolean> {
    const session = await db.getActiveSession(userWallet);
    return session !== null;
  }

  /**
   * Get session balance info
   */
  async getSessionBalance(userWallet: string): Promise<{
    hasSession: boolean;
    approvedAmount?: number;
    spentAmount?: number;
    remainingAmount?: number;
  }> {
    const session = await db.getActiveSession(userWallet);

    if (!session) {
      return { hasSession: false };
    }

    return {
      hasSession: true,
      approvedAmount: parseFloat(session.approved_amount),
      spentAmount: parseFloat(session.spent_amount),
      remainingAmount: parseFloat(session.remaining_amount),
    };
  }
}

export const sessionPaymentService = new SessionPaymentService();
