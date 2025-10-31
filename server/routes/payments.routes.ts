/**
 * Payment Routes (Session-Based Deposit Model)
 * User deposits USDC, then watches videos seamlessly
 * Funds deducted from user's session balance
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionPaymentService } from '../services/session-payment.service';
import { db } from '../database/db-factory';

const router = Router();

/**
 * POST /api/payments/seamless
 * Process a seamless payment via facilitator (no user signature required)
 */
router.post('/seamless', async (req, res) => {
  try {
    const { videoId, userWallet } = req.body;

    if (!videoId || !userWallet) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'videoId and userWallet are required',
      });
    }

    console.log(`\n🎬 Seamless payment request for video ${videoId}`);

    // Get video details
    const video = await db.getVideoById(videoId);
    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
      });
    }

    if (!video.creatorWallet) {
      return res.status(400).json({
        error: 'Invalid video configuration',
        message: 'Video does not have a creator wallet configured',
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

    // Check if user has an active session
    const hasSession = await sessionPaymentService.hasActiveSession(userWallet);
    if (!hasSession) {
      return res.status(402).json({
        error: 'No Active Session',
        message: 'Please deposit USDC to start watching videos',
        requiresSession: true,
      });
    }

    // Get session balance
    const sessionBalance = await sessionPaymentService.getSessionBalance(userWallet);
    if (sessionBalance.remainingAmount && sessionBalance.remainingAmount < video.priceUsdc) {
      return res.status(402).json({
        error: 'Insufficient Balance',
        message: `Your balance: $${sessionBalance.remainingAmount} USDC. Required: $${video.priceUsdc} USDC. Please deposit more to continue watching.`,
        requiresTopUp: true,
        remaining: sessionBalance.remainingAmount,
        required: video.priceUsdc,
      });
    }

    // Process seamless payment via session key
    const result = await sessionPaymentService.processSessionPayment({
      userWallet,
      videoId,
      amount: video.priceUsdc,
      creatorWallet: video.creatorWallet,
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Payment Failed',
        message: result.error || 'Failed to process payment',
      });
    }

    // Record payment in database
    const platformFeePercent = 2.35;
    const platformAmount = video.priceUsdc * (platformFeePercent / 100);
    const creatorAmount = video.priceUsdc - platformAmount;

    await db.createPayment({
      id: uuidv4(),
      videoId: video.id,
      userId: user.id,
      userWallet,
      creatorWallet: video.creatorWallet,
      amount: video.priceUsdc,
      creatorAmount,
      platformAmount,
      transactionSignature: result.signature!,
      status: 'verified',
    });

    // Increment video views
    await db.incrementVideoViews(videoId);

    console.log(`   ✅ Seamless payment complete!`);

    return res.json({
      success: true,
      signature: result.signature,
      message: 'Payment successful! Enjoy your video.',
      payment: {
        amount: video.priceUsdc,
        signature: result.signature,
        videoId,
      },
    });
  } catch (error: any) {
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

export default router;
