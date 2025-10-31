/**
 * Session Keys Service
 * Manages session keypairs for seamless X402 payments
 * Session keys allow facilitator to sign transactions on behalf of users (with their approval)
 */

import { Keypair, PublicKey, Connection, Transaction } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import crypto from 'crypto';
import { db } from '../database/db-factory';

// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

interface SessionData {
  id: string;
  userId: string;
  userWallet: string;
  sessionPublicKey: string;
  sessionPrivateKeyEncrypted: string;
  approvedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  approvalSignature: string;
  status: 'active' | 'expired' | 'revoked';
  expiresAt: Date;
  createdAt: Date;
}

interface CreateSessionRequest {
  userId: string;
  userWallet: string;
  approvedAmount: number;
  expiresIn?: number; // hours, default 24
}

export class SessionService {
  private connection: Connection;
  private usdcMint: PublicKey;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.usdcMint = new PublicKey(
      process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    );
  }

  /**
   * Encrypt session private key for secure storage
   */
  private encryptPrivateKey(privateKey: Uint8Array): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'),
      iv
    );

    let encrypted = cipher.update(Buffer.from(privateKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + Encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypt session private key for signing
   */
  private decryptPrivateKey(encryptedData: string): Uint8Array {
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);

    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return new Uint8Array(decrypted);
  }

  /**
   * Generate session keypair and approval transaction
   */
  async createSession(request: CreateSessionRequest): Promise<{
    sessionId: string;
    approvalTransaction: string; // Serialized, user needs to sign
    sessionPublicKey: string;
  }> {
    console.log(`\n🔐 Creating session for user: ${request.userWallet}`);
    console.log(`   Approved amount: ${request.approvedAmount} USDC`);

    // Generate new session keypair
    const sessionKeypair = Keypair.generate();

    console.log(`   Session public key: ${sessionKeypair.publicKey.toBase58()}`);

    // Get user's USDC token account
    const userWallet = new PublicKey(request.userWallet);
    const userUsdcAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      userWallet
    );

    // Create approval transaction (user approves session to spend)
    const transaction = new Transaction();

    transaction.add(
      createApproveInstruction(
        userUsdcAccount,                    // User's USDC account
        sessionKeypair.publicKey,          // Session keypair (delegate)
        userWallet,                        // User must sign
        Math.floor(request.approvedAmount * 1_000_000) // Amount in lamports
      )
    );

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;

    // Serialize for user to sign
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Encrypt and store session keypair (before user signs, we prepare it)
    const encryptedPrivateKey = this.encryptPrivateKey(sessionKeypair.secretKey);

    // Calculate expiration (default 24 hours)
    const expiresIn = request.expiresIn || 24;
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

    // Store in database (pending approval)
    const sessionId = crypto.randomUUID();

    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    console.log(`   ✅ Session created (pending user approval)`);

    return {
      sessionId,
      approvalTransaction: serialized.toString('base64'),
      sessionPublicKey: sessionKeypair.publicKey.toBase58(),
    };
  }

  /**
   * Confirm session after user signs approval
   */
  async confirmSession(
    sessionId: string,
    userId: string,
    userWallet: string,
    approvedAmount: number,
    approvalSignature: string,
    sessionPublicKey: string,
    sessionKeypair: Keypair,
    expiresAt: Date
  ): Promise<SessionData> {
    // Encrypt private key
    const encryptedPrivateKey = this.encryptPrivateKey(sessionKeypair.secretKey);

    // Store in database (implementation depends on your DB)
    // For now, return the session data structure
    const sessionData: SessionData = {
      id: sessionId,
      userId,
      userWallet,
      sessionPublicKey,
      sessionPrivateKeyEncrypted: encryptedPrivateKey,
      approvedAmount,
      spentAmount: 0,
      remainingAmount: approvedAmount,
      approvalSignature,
      status: 'active',
      expiresAt,
      createdAt: new Date(),
    };

    console.log(`✅ Session ${sessionId} confirmed and activated!`);

    return sessionData;
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userWallet: string): Promise<SessionData | null> {
    // This will be implemented with actual database query
    // For now, placeholder
    console.log(`🔍 Looking for active session for: ${userWallet}`);
    return null;
  }

  /**
   * Get session keypair (decrypted) for signing
   */
  async getSessionKeypair(sessionId: string): Promise<Keypair | null> {
    // Query database for session
    // This will be implemented with actual DB
    console.log(`🔓 Decrypting session keypair: ${sessionId}`);
    return null;
  }

  /**
   * Update spent amount and recalculate remaining
   */
  async updateSessionSpending(
    sessionId: string,
    amount: number
  ): Promise<void> {
    console.log(`💸 Recording spend of ${amount} USDC for session ${sessionId}`);
    // Update in database
    // This will be implemented with actual DB
  }

  /**
   * Revoke session (user-initiated)
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    console.log(`🚫 Revoking session ${sessionId} for user ${userId}`);
    // Update status to 'revoked' in database
    return true;
  }

  /**
   * Expire old sessions (cron job)
   */
  async expireOldSessions(): Promise<number> {
    console.log('🧹 Expiring old sessions...');
    // Update status to 'expired' where expiresAt < now
    return 0;
  }

  /**
   * Check if session is valid for payment
   */
  async isSessionValid(
    sessionId: string,
    requiredAmount: number
  ): Promise<{ valid: boolean; reason?: string }> {
    // Query session from database
    // Check: status = active, expiresAt > now, remainingAmount >= requiredAmount
    return { valid: true };
  }
}

export const sessionService = new SessionService();
