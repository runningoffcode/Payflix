/**
 * Payment Routes (Session-Based Deposit Model)
 * User deposits USDC, then watches videos seamlessly
 * Funds deducted from user's session balance
 */

import { Router } from 'express';
import { processSeamlessVideoUnlock, SeamlessPaymentError } from '../services/payment-orchestrator.service';

const router = Router();

/**
 * POST /api/payments/seamless
 * Process a seamless payment via facilitator (no user signature required)
 */
router.post('/seamless', async (req, res) => {
  try {
    const { videoId, userWallet } = req.body;
    const result = await processSeamlessVideoUnlock({ videoId, userWallet });
    return res.json(result);
  } catch (error: any) {
    if (error instanceof SeamlessPaymentError) {
      return res.status(error.status).json(error.payload);
    }
    console.error('❌ Seamless payment error:', error);
    return res.status(500).json({
      error: 'Payment Processing Error',
      message: error.message || 'An error occurred while processing payment',
    });
  }
});

/**
 * GET /api/payments/session/balance?userWallet=...
 * Check user's session balance (their deposited amount)
 */
router.get('/session/balance', async (req, res) => {
  try {
    const { userWallet } = req.query;

    if (!userWallet || typeof userWallet !== 'string') {
      return res.status(400).json({
        error: 'Missing userWallet parameter',
      });
    }

    const sessionBalance = await sessionPaymentService.getSessionBalance(userWallet);

    console.log(`📊 Session balance query for ${userWallet}:`, sessionBalance);

    if (!sessionBalance.hasSession) {
      console.log('   ⚠️  No active session found');
      return res.json({
        hasSession: false,
        message: 'No active session found. Please deposit USDC.',
      });
    }

    const response = {
      hasSession: true,
      approvedAmount: sessionBalance.approvedAmount,
      spentAmount: sessionBalance.spentAmount,
      remainingAmount: sessionBalance.remainingAmount,
      token: 'USDC',
      network: 'devnet',
    };

    console.log('   ✅ Returning balance:', response);

    return res.json(response);
  } catch (error: any) {
    console.error('   ❌ Error fetching balance:', error);
    return res.status(500).json({
      error: 'Failed to fetch session balance',
      message: error.message,
    });
  }
});

/**
 * POST /api/payments/direct
 * Process a direct payment (user signs transaction)
 * Fallback for when user doesn't have a session
 */
router.post('/direct', async (req, res) => {
  try {
    const { videoId, userWallet, signedTransaction } = req.body;

    if (!videoId || !userWallet || !signedTransaction) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'videoId, userWallet, and signedTransaction are required',
      });
    }

    console.log(`\n💳 Direct payment request for video ${videoId}`);
    console.log(`   User: ${userWallet}`);

    // Get video details
    const video = await db.getVideoById(videoId);
    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
      });
    }

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

    // Check if user already paid
    const existingPayment = await db.getUserPaymentForVideo(user.id, videoId);
    if (existingPayment && existingPayment.status === 'verified') {
      console.log(`   ✅ User already paid for this video`);
      return res.json({
        success: true,
        alreadyPaid: true,
        signature: existingPayment.transactionSignature,
        message: 'You already have access to this video',
      });
    }

    // Deserialize and send the signed transaction
    const { Connection } = require('@solana/web3.js');
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Decode the base64 signed transaction
    const transactionBuffer = Buffer.from(signedTransaction, 'base64');
    const { Transaction } = require('@solana/web3.js');
    const transaction = Transaction.from(transactionBuffer);

    console.log(`   📡 Broadcasting transaction...`);
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`   ⏳ Confirming transaction: ${signature}`);
    await connection.confirmTransaction(signature, 'confirmed');
    console.log(`   ✅ Transaction confirmed!`);

    // Record payment in database
    const platformFeePercent = 2.85;
    const platformAmount = video.priceUsdc * (platformFeePercent / 100);
    const creatorAmount = video.priceUsdc - platformAmount;

    const paymentId = uuidv4();
    const paymentRecord = await db.createPayment({
      id: paymentId,
      videoId: video.id,
      userId: user.id,
      userWallet,
      creatorWallet: video.creatorWallet!,
      amount: video.priceUsdc,
      creatorAmount,
      platformAmount,
      transactionSignature: signature,
      status: 'verified',
    });

    await db.updatePayment(paymentRecord.id, {
      status: 'verified',
      verifiedAt: new Date(),
    });

    // Grant video access (lifetime access)
    await db.grantVideoAccess({
      userId: user.id,
      videoId: video.id,
      paymentId,
      grantedAt: new Date(),
      expiresAt: new Date('2099-12-31'), // Lifetime access
    });

    console.log(`   ✅ Video access granted`);

    // Increment video views
    await db.incrementVideoViews(videoId);

    // Reflect the new revenue in the video row for creator stats/profile cards
    const nextEarnings = (video.earnings || 0) + creatorAmount;
    await db.updateVideo(video.id, { earnings: nextEarnings });

    invalidateDigitalIdCache(video.creatorWallet!);

    return res.json({
      success: true,
      signature,
      message: 'Payment successful! Enjoy your video.',
      payment: {
        amount: video.priceUsdc,
        signature,
        videoId,
      },
    });
  } catch (error: any) {
    console.error('❌ Direct payment error:', error);
    return res.status(500).json({
      error: 'Payment Processing Error',
      message: error.message || 'An error occurred while processing payment',
    });
  }
});

export default router;
