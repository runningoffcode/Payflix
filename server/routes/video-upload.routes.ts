import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticateJWT, requireCreator } from '../middleware/auth.middleware';
import { videoUpload, processVideo, validateVideoFile } from '../services/video-upload.service';
import { db } from '../database/db-factory';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/upload/video
 * Upload a new video (creators only)
 * Supports multipart/form-data with video file
 */
router.post(
  '/video',
  authenticateJWT,
  requireCreator,
  videoUpload.single('video'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, description, priceUsdc } = req.body;

      if (!title || priceUsdc === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log(`📤 Processing video upload: ${title}`);

      // Validate video file
      const validation = await validateVideoFile(req.file.path);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Process video (extract metadata, generate thumbnail, upload to Arweave)
      const processed = await processVideo(req.file.path, {
        title,
        description: description || '',
        creatorWallet: req.user.walletAddress,
        priceUsdc: parseFloat(priceUsdc),
      });

      // Create video record in database
      const video = await db.createVideo({
        creatorId: req.user.id,
        creatorWallet: req.user.walletAddress,
        title,
        description: description || '',
        priceUsdc: parseFloat(priceUsdc),
        thumbnailUrl: processed.thumbnailUrl,
        videoUrl: processed.videoUrl,
        videoPath: processed.arweaveId,
        duration: processed.duration,
        views: 0,
        earnings: 0,
      });

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        video: {
          id: video.id,
          title: video.title,
          arweaveId: processed.arweaveId,
          thumbnailUrl: processed.thumbnailUrl,
          videoUrl: processed.videoUrl,
          duration: processed.duration,
        },
      });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({
        error: 'Failed to upload video',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/upload/status/:arweaveId
 * Check Arweave upload status
 */
router.get('/status/:arweaveId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { arweaveId } = req.params;

    // In production, check actual Arweave status
    // const status = await arweaveService.getTransactionStatus(arweaveId);

    res.json({
      arweaveId,
      status: 'confirmed',
      url: `https://arweave.net/${arweaveId}`,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

export default router;
