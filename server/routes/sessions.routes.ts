/**
 * Session Keys Routes
 * Endpoints for creating and managing X402 session keys
 */

import { Router } from 'express';
import { Keypair, PublicKey, Transaction, Connection } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import crypto from 'crypto';
import { db } from '../database/db-factory';

const router = Router();

// In-memory storage for pending sessions (before user confirms)
// In production, use Redis or similar distributed cache
const pendingSessions = new Map<string, {
  sessionKeypair: Keypair;
  encryptedPrivateKey: string;
  userId: string;
  userWallet: string;
  approvedAmount: number;
  expiresAt: Date;
}>();

// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.SESSION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SESSION_ENCRYPTION_KEY not configured');
  }
  return Buffer.from(key.substring(0, 64), 'hex');
}

function encryptPrivateKey(privateKey: Uint8Array): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(Buffer.from(privateKey));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
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

/**
 * POST /api/sessions/create
 * Create a new session key (returns transaction for user to sign)
 */
router.post('/create', async (req, res) => {
  try {
    const { userWallet, approvedAmount, expiresIn } = req.body;

    if (!userWallet || !approvedAmount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userWallet and approvedAmount are required',
      });
    }

    console.log(`\n🔐 Creating session for wallet: ${userWallet}`);
    console.log(`   Approved amount: ${approvedAmount} USDC`);

    // Get or create user
    let user = await db.getUserByWallet(userWallet);
    if (!user) {
      console.log(`   Creating new user for wallet: ${userWallet}`);
      user = await db.createUser({
        walletAddress: userWallet,
        username: `User ${userWallet.substring(0, 8)}`,
        email: null,
        profilePicture: null,
      });
    }

    // Generate session keypair
    const sessionKeypair = Keypair.generate();
    console.log(`   Session public key: ${sessionKeypair.publicKey.toBase58()}`);

    // Setup Solana connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    const usdcMint = new PublicKey(
      process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    );

    // Get user's USDC account
    const userPublicKey = new PublicKey(userWallet);
    const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, userPublicKey);

    // Create approval transaction
    const transaction = new Transaction();
    transaction.add(
      createApproveInstruction(
        userUsdcAccount,
        sessionKeypair.publicKey,
        userPublicKey,
        Math.floor(approvedAmount * 1_000_000)
      )
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Serialize transaction for user to sign
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Calculate expiration
    const expirationHours = expiresIn || 24;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Encrypt and temporarily store session keypair (will be saved after user signs)
    const encryptedPrivateKey = encryptPrivateKey(sessionKeypair.secretKey);

    // Store pending session data in memory cache
    pendingSessions.set(sessionId, {
      sessionKeypair,
      encryptedPrivateKey,
      userId: user.id,
      userWallet,
      approvedAmount,
      expiresAt,
    });

    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    console.log(`   ✅ Session prepared (awaiting user signature)`);

    return res.json({
      success: true,
      sessionId,
      sessionPublicKey: sessionKeypair.publicKey.toBase58(),
      approvalTransaction: serialized.toString('base64'),
      expiresAt: expiresAt.toISOString(),
      message: 'Please sign the approval transaction with your wallet',
    });
  } catch (error: any) {
    console.error('❌ Error creating session:', error);
    return res.status(500).json({
      error: 'Session Creation Failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/sessions/confirm
 * Confirm session after user signs approval transaction
 */
router.post('/confirm', async (req, res) => {
  try {
    const { sessionId, approvalSignature } = req.body;

    if (!sessionId || !approvalSignature) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'sessionId and approvalSignature are required',
      });
    }

    // Get pending session
    const pendingSession = pendingSessions.get(sessionId);
    if (!pendingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session expired or does not exist',
      });
    }

    console.log(`\n✅ Confirming session: ${sessionId}`);
    console.log(`   Signature: ${approvalSignature}`);

    // Verify signature on Solana (simplified - in production, verify the transaction)
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    try {
      const tx = await connection.getTransaction(approvalSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return res.status(400).json({
          error: 'Invalid signature',
          message: 'Transaction not found on blockchain',
        });
      }
    } catch (error) {
      console.warn('Could not verify transaction (may not be confirmed yet)');
    }

    // Save session to database
    await db.createSession({
      id: sessionId,
      userId: pendingSession.userId,
      userWallet: pendingSession.userWallet,
      sessionPublicKey: pendingSession.sessionKeypair.publicKey.toBase58(),
      sessionPrivateKeyEncrypted: pendingSession.encryptedPrivateKey,
      approvedAmount: pendingSession.approvedAmount,
      approvalSignature,
      expiresAt: pendingSession.expiresAt,
    });

    // Clean up pending session
    pendingSessions.delete(sessionId);

    console.log(`   ✅ Session activated!`);

    return res.json({
      success: true,
      session: {
        id: sessionId,
        approvedAmount: pendingSession.approvedAmount,
        remainingAmount: pendingSession.approvedAmount,
        expiresAt: pendingSession.expiresAt.toISOString(),
      },
      message: 'Session activated! You can now make seamless payments.',
    });
  } catch (error: any) {
    console.error('❌ Error confirming session:', error);
    return res.status(500).json({
      error: 'Session Confirmation Failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/sessions/active
 * Get active session for user
 */
router.get('/active', async (req, res) => {
  try {
    const { userWallet } = req.query;

    if (!userWallet) {
      return res.status(400).json({
        error: 'Missing userWallet parameter',
      });
    }

    const session = await db.getActiveSession(userWallet as string);

    if (!session) {
      return res.json({
        hasActiveSession: false,
        message: 'No active session found',
      });
    }

    return res.json({
      hasActiveSession: true,
      session: {
        id: session.id,
        approvedAmount: parseFloat(session.approved_amount),
        spentAmount: parseFloat(session.spent_amount),
        remainingAmount: parseFloat(session.remaining_amount),
        expiresAt: session.expires_at,
        status: session.status,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching active session:', error);
    return res.status(500).json({
      error: 'Failed to fetch session',
      message: error.message,
    });
  }
});

/**
 * POST /api/sessions/revoke
 * Revoke an active session
 */
router.post('/revoke', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing sessionId',
      });
    }

    const success = await db.revokeSession(sessionId);

    if (!success) {
      return res.status(500).json({
        error: 'Failed to revoke session',
      });
    }

    console.log(`🚫 Session revoked: ${sessionId}`);

    return res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error: any) {
    console.error('❌ Error revoking session:', error);
    return res.status(500).json({
      error: 'Failed to revoke session',
      message: error.message,
    });
  }
});

export default router;
