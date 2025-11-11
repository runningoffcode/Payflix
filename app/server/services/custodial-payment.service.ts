/**
 * Custodial Payment Service (X402 Kora Pattern)
 * Handles seamless payments where facilitator signs on behalf of users
 * No wallet popups - instant, frictionless payments
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import config from '../config/index';

export interface CustodialPaymentRequest {
  userId: string;
  userWallet: string;
  videoId: string;
  amount: number; // USDC amount
  creatorWallet: string;
}

export interface CustodialPaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export class CustodialPaymentService {
  private connection: Connection;
  private facilitatorWallet: Keypair | null = null;
  private usdcMint: PublicKey;
  private platformFeeWallet: PublicKey;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.usdcMint = new PublicKey(config.solana.usdcMintAddress);
    this.platformFeeWallet = new PublicKey(config.solana.platformFeeWallet);

    // Initialize facilitator wallet (Kora)
    this.initializeFacilitator();
  }

  private initializeFacilitator() {
    try {
      if (
        config.solana.platformWalletPrivateKey &&
        config.solana.platformWalletPrivateKey !== 'your_platform_wallet_private_key_here'
      ) {
        const keyData = JSON.parse(config.solana.platformWalletPrivateKey);
        this.facilitatorWallet = Keypair.fromSecretKey(new Uint8Array(keyData));
        console.log('✅ Custodial facilitator initialized:', this.facilitatorWallet.publicKey.toBase58());
      } else {
        console.warn('⚠️  Custodial facilitator: No wallet configured');
      }
    } catch (error) {
      console.error('❌ Failed to initialize custodial facilitator:', error);
    }
  }

  /**
   * Process a seamless payment on behalf of user
   * Facilitator creates, signs, and sends the transaction
   * No user interaction required!
   */
  async processSeamlessPayment(request: CustodialPaymentRequest): Promise<CustodialPaymentResult> {
    try {
      console.log('\n💸 Processing seamless custodial payment...');
      console.log(`   User: ${request.userWallet}`);
      console.log(`   Amount: ${request.amount} USDC`);
      console.log(`   Creator: ${request.creatorWallet}`);

      if (!this.facilitatorWallet) {
        return {
          success: false,
          error: 'Facilitator wallet not configured',
        };
      }

      // STEP 1: Check if user has enough USDC balance
      console.log(`   🔍 Checking user's USDC balance...`);
      const userPublicKey = new PublicKey(request.userWallet);
      const userUsdcAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        userPublicKey
      );

      try {
        const userBalance = await this.connection.getTokenAccountBalance(userUsdcAccount);
        const userBalanceUsdc = parseFloat(userBalance.value.uiAmountString || '0');

        console.log(`   💰 User balance: ${userBalanceUsdc} USDC`);
        console.log(`   💵 Required: ${request.amount} USDC`);

        if (userBalanceUsdc < request.amount) {
          console.log(`   ❌ Insufficient funds!`);
          return {
            success: false,
            error: `Insufficient USDC balance. You have ${userBalanceUsdc} USDC but need ${request.amount} USDC.`,
          };
        }

        console.log(`   ✅ User has sufficient funds!`);
      } catch (error) {
        console.log(`   ❌ User doesn't have a USDC account or has 0 balance`);
        return {
          success: false,
          error: 'You need USDC in your wallet to watch videos. Please add USDC to your wallet first.',
        };
      }

      // Calculate revenue split
      const totalLamports = Math.floor(request.amount * 1_000_000); // USDC has 6 decimals
      const platformFeePercent = 2.85;
      const platformAmount = Math.floor(totalLamports * (platformFeePercent / 100));
      const creatorAmount = totalLamports - platformAmount;

      console.log(`   Creator gets: ${(creatorAmount / 1_000_000).toFixed(6)} USDC`);
      console.log(`   Platform fee: ${(platformAmount / 1_000_000).toFixed(6)} USDC`);

      // Get creator public key
      const creatorPublicKey = new PublicKey(request.creatorWallet);

      // Get token accounts
      const facilitatorTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        this.facilitatorWallet.publicKey
      );

      const creatorTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        creatorPublicKey
      );

      const platformTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        this.platformFeeWallet
      );

      // Build transaction
      const transaction = new Transaction();

      // Check and create creator token account if needed
      const creatorAccountInfo = await this.connection.getAccountInfo(creatorTokenAccount);
      if (!creatorAccountInfo) {
        console.log('   📝 Creating creator token account...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.facilitatorWallet.publicKey, // payer
            creatorTokenAccount,
            creatorPublicKey,
            this.usdcMint
          )
        );
      }

      // Check and create platform token account if needed
      const platformAccountInfo = await this.connection.getAccountInfo(platformTokenAccount);
      if (!platformAccountInfo) {
        console.log('   📝 Creating platform token account...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.facilitatorWallet.publicKey, // payer
            platformTokenAccount,
            this.platformFeeWallet,
            this.usdcMint
          )
        );
      }

      // Transfer to creator
      transaction.add(
        createTransferInstruction(
          facilitatorTokenAccount, // from facilitator's USDC account
          creatorTokenAccount,
          this.facilitatorWallet.publicKey,
          creatorAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Transfer platform fee
      transaction.add(
        createTransferInstruction(
          facilitatorTokenAccount, // from facilitator's USDC account
          platformTokenAccount,
          this.facilitatorWallet.publicKey,
          platformAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Send and confirm
      console.log('   📡 Broadcasting transaction...');
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.facilitatorWallet],
        {
          commitment: 'confirmed',
        }
      );

      console.log('   ✅ Payment settled!');
      console.log(`   Signature: ${signature}\n`);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      console.error('   ❌ Payment failed:', error.message);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  /**
   * Check facilitator USDC balance
   */
  async getFacilitatorBalance(): Promise<number> {
    if (!this.facilitatorWallet) {
      return 0;
    }

    try {
      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        this.facilitatorWallet.publicKey
      );

      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      return parseFloat(accountInfo.value.uiAmount?.toString() || '0');
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const custodialPaymentService = new CustodialPaymentService();
