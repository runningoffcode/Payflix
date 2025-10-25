import { Router, Request, Response } from 'express';
import { db } from '../database';
import { checkVideoAccess, send402Response, sendX402Error, validatePaymentProof } from '../middleware/x402.middleware';
import { aiAgentService } from '../services/ai-agent.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/videos
 * Get all videos
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const videos = await db.getAllVideos();

    // Return video list without exposing stream URLs
    const videoList = videos.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      priceUsdc: v.priceUsdc,
      duration: v.duration,
      views: v.views,
      creatorId: v.creatorId,
      createdAt: v.createdAt,
    }));

    res.json({ videos: videoList });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

/**
 * GET /api/videos/:id
 * Get video details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = await db.getVideoById(id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      priceUsdc: video.priceUsdc,
      duration: video.duration,
      views: video.views,
      creatorId: video.creatorId,
      createdAt: video.createdAt,
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

/**
 * GET /api/videos/:id/stream
 * Stream video content (protected by x402)
 * Returns 402 if payment not made
 */
router.get('/:id/stream', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userWallet = req.headers['x-wallet-address'] as string;

    const video = await db.getVideoById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user has access
    let hasAccess = false;
    if (userWallet) {
      const user = await db.getUserByWallet(userWallet);
      if (user) {
        hasAccess = await db.hasVideoAccess(user.id, id);
      }
    }

    // X402 Protocol: Check access
    const accessCheck = await checkVideoAccess(
      id,
      video.priceUsdc,
      video.creatorWallet,
      userWallet,
      hasAccess
    );

    if (!accessCheck.allowed) {
      // Return HTTP 402 Payment Required with payment details
      return send402Response(res, accessCheck.challenge!);
    }

    // Increment view count
    await db.updateVideo(id, { views: video.views + 1 });

    // In a real implementation, stream the actual video file
    // For now, return a success message with stream URL
    res.json({
      message: 'Access granted',
      streamUrl: video.videoUrl,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
      },
    });
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

/**
 * POST /api/videos/:id/verify-payment
 * Verify payment and grant video access
 * This is where the AI Agent processes payments
 */
router.post('/:id/verify-payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionSignature, userWallet } = req.body;

    // Validate payment proof
    const validation = validatePaymentProof({
      transactionSignature,
      userWallet,
      videoId: id,
    });

    if (!validation.valid) {
      return sendX402Error(res, validation.error || 'Invalid payment proof');
    }

    // Get video
    const video = await db.getVideoById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if payment already processed
    const existingPayment = await db.getPaymentByTransaction(transactionSignature);
    if (existingPayment) {
      return res.json({
        success: true,
        message: 'Payment already verified',
        accessGranted: true,
      });
    }

    // Get or create user
    let user = await db.getUserByWallet(userWallet);
    if (!user) {
      user = await db.createUser({
        id: `user_${uuidv4()}`,
        walletAddress: userWallet,
        isCreator: false,
        createdAt: new Date(),
      });
    }

    // AI Agent: Verify payment and split revenue
    console.log('\n=== AI Agent Processing Payment ===');
    const result = await aiAgentService.verifyAndSplitPayment(
      transactionSignature,
      video,
      userWallet
    );

    if (!result.verified || !result.payment) {
      return sendX402Error(res, result.error || 'Payment verification failed', 402);
    }

    // Store payment record
    const payment = await db.createPayment({
      ...result.payment,
      userId: user.id,
    } as any);

    // Grant video access
    await db.grantVideoAccess({
      userId: user.id,
      videoId: id,
      paymentId: payment.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    // Update video earnings
    await db.updateVideo(id, {
      earnings: video.earnings + result.payment.creatorAmount!,
    });

    console.log('=== Payment Processing Complete ===\n');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      accessGranted: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        creatorAmount: payment.creatorAmount,
        platformAmount: payment.platformAmount,
        transactionSignature: payment.transactionSignature,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

/**
 * POST /api/videos
 * Create a new video (creators only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, priceUsdc, creatorWallet, thumbnailUrl } = req.body;

    if (!title || !creatorWallet || priceUsdc === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get or create creator
    let creator = await db.getUserByWallet(creatorWallet);
    if (!creator) {
      creator = await db.createUser({
        id: `user_${uuidv4()}`,
        walletAddress: creatorWallet,
        isCreator: true,
        createdAt: new Date(),
      });
    }

    const videoId = `video_${uuidv4()}`;
    const video = await db.createVideo({
      id: videoId,
      creatorId: creator.id,
      creatorWallet,
      title,
      description: description || '',
      priceUsdc,
      thumbnailUrl: thumbnailUrl || `https://picsum.photos/seed/${videoId}/640/360`,
      videoUrl: `/api/videos/${videoId}/stream`,
      duration: 0,
      views: 0,
      earnings: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ video });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

export default router;
