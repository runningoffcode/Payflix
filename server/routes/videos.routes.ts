import { Router, Request, Response } from 'express';
import { db } from '../database/db-factory';
import { requireX402Payment, checkExistingPayment, X402ProtectedRequest } from '../middleware/x402.middleware';
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
      creatorWallet: v.creatorWallet,
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
      creatorWallet: video.creatorWallet,
      createdAt: video.createdAt,
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

/**
 * GET /api/videos/:id/stream
 * Stream video content (protected by X402)
 * Returns 402 if payment not made, processes payment via X402 facilitator
 */
router.get(
  '/:id/stream',
  checkExistingPayment(),
  requireX402Payment(async (req: Request) => {
    const video = await db.getVideoById(req.params.id);
    if (!video) {
      throw new Error('Video not found');
    }
    return {
      amount: video.priceUsdc,
      recipient: video.creatorWallet,
      resource: `/api/videos/${video.id}/stream`,
    };
  }),
  async (req: X402ProtectedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const video = await db.getVideoById(id);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Payment verified - grant access
      res.json({
        message: 'Access granted',
        payment: req.payment,
        video: {
          id: video.id,
          title: video.title,
          videoUrl: video.videoUrl,
          duration: video.duration,
        },
      });
    } catch (error) {
      console.error('Error streaming video:', error);
      res.status(500).json({ error: 'Failed to stream video' });
    }
  }
);

// DEPRECATED: /verify-payment endpoint replaced by X402 facilitator system
// Payment verification now happens via X-PAYMENT header in /stream endpoint

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
        walletAddress: creatorWallet,
        isCreator: true,
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
