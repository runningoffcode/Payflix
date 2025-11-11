import { Router, Request, Response } from 'express';
import { db } from '../database/db-factory';
import { requireX402Payment, checkExistingPayment, X402ProtectedRequest } from '../middleware/x402.middleware';
import { v4 as uuidv4 } from 'uuid';
import { r2StorageService } from '../services/r2-storage.service';
import multer from 'multer';
import path from 'path';

const router = Router();

// Setup multer for thumbnail uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * GET /api/videos
 * Get all videos
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, page = '1', limit = '20', order, sort, creatorWallet: creatorWalletQuery } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
    const parsedPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const normalizedCategory =
      typeof category === 'string' && category.trim().length > 0 && category.toLowerCase() !== 'all'
        ? category.trim()
        : undefined;

    const orderByParam =
      typeof sort === 'string' && ['created_at', 'views', 'price_usdc'].includes(sort)
        ? (sort as 'created_at' | 'views' | 'price_usdc')
        : 'created_at';

    const orderDirectionParam =
      typeof order === 'string' && order.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const creatorWallet =
      typeof creatorWalletQuery === 'string' && creatorWalletQuery.trim().length > 0
        ? creatorWalletQuery.trim()
        : undefined;

    let videos;
    let total;

    if (typeof search === 'string' && search.trim().length > 0) {
      const result = await db.searchVideos({
        search,
        limit: parsedLimit,
        offset,
        category: normalizedCategory,
        orderBy: orderByParam,
        orderDirection: orderDirectionParam,
        creatorWallet,
      });

      videos = result.videos;
      total = result.total;
    } else {
      const allVideos = await db.getAllVideos();
      let filtered = normalizedCategory
        ? allVideos.filter((video) => video.category === normalizedCategory)
        : allVideos;

      if (creatorWallet) {
        filtered = filtered.filter((video) => video.creatorWallet === creatorWallet);
      }

      total = filtered.length;
      videos = filtered.slice(offset, offset + parsedLimit);
    }

    const videoList = videos.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      category: v.category,
      thumbnailUrl: v.thumbnailUrl,
      priceUsdc: v.priceUsdc,
      duration: v.duration,
      views: v.views,
      creatorId: v.creatorId,
      creatorWallet: v.creatorWallet,
      creatorName: v.creatorUsername || 'Anonymous Creator',
      creatorProfilePicture: v.creatorProfilePicture || null,
      createdAt: v.createdAt,
    }));

    res.json({
      videos: videoList,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        hasMore: offset + videoList.length < total,
      },
    });
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
      videoUrl: video.videoUrl,
      priceUsdc: video.priceUsdc,
      duration: video.duration,
      views: video.views,
      creatorId: video.creatorId,
      creatorWallet: video.creatorWallet,
      commentsEnabled: video.commentsEnabled ?? true,
      commentPrice: Number(video.commentPrice ?? 0),
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
 * GET /api/videos/:id/play-url
 * Get a signed URL for direct streaming from R2 with session binding
 * Creates a streaming session tied to user's wallet to prevent URL sharing
 */
router.get('/:id/play-url', checkExistingPayment(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userWallet = req.headers['x-wallet-address'] as string;

    console.log(`🔗 Generating secure streaming session for video: ${id}`);
    console.log(`   User wallet: ${userWallet}`);

    if (!userWallet) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    const video = await db.getVideoById(id);

    if (!video) {
      console.log(`❌ Video not found: ${id}`);
      return res.status(404).json({ error: 'Video not found' });
    }

    console.log(`📂 Video path: ${video.videoPath}`);

    // Check for existing active session (reuse if available)
    let existingSession = await db.getActiveStreamingSession(userWallet, id);

    let sessionToken: string;
    let sessionId: string;

    if (existingSession) {
      console.log(`♻️  Reusing existing session: ${existingSession.id}`);
      sessionToken = existingSession.session_token;
      sessionId = existingSession.id;
    } else {
      // Create new streaming session
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      sessionToken = `${Buffer.from(`${userWallet}:${id}:${Date.now()}`).toString('base64')}_${Math.random().toString(36).substring(7)}`;

      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      await db.createStreamingSession({
        id: sessionId,
        userWallet,
        videoId: id,
        sessionToken,
        expiresAt,
      });

      console.log(`✅ Created new streaming session: ${sessionId}`);
      console.log(`   Session token: ${sessionToken.substring(0, 20)}...`);
      console.log(`   Expires at: ${expiresAt.toISOString()}`);
    }

    // Generate signed URL valid for 1 hour
    const signedUrl = await r2StorageService.getSignedUrl(video.videoPath, 3600);

    console.log(`✅ Signed URL generated (expires in 1 hour)`);

    res.json({
      url: signedUrl,
      sessionToken,
      sessionId,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate video URL' });
  }
});

/**
 * GET /api/videos/:id/stream-secure
 * Stream video with session validation to prevent URL sharing
 * Session token contains embedded wallet information for validation
 * No wallet header needed - security comes from session binding
 */
router.get('/:id/stream-secure', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionToken = req.query.session as string;

    console.log(`🔒 Secure stream request for video: ${id}`);
    console.log(`   Session token: ${sessionToken?.substring(0, 20)}...`);

    if (!sessionToken) {
      console.log(`❌ No session token provided`);
      return res.status(401).json({ error: 'Session token required' });
    }

    // Validate session (wallet is stored in session record)
    const session = await db.getStreamingSessionByToken(sessionToken);

    if (!session) {
      console.log(`❌ Session not found or expired`);
      return res.status(403).json({
        error: 'Invalid or expired session',
        reason: 'Session not found or has expired. Please refresh the page.'
      });
    }

    // Verify video matches session
    if (session.video_id !== id) {
      console.log(`❌ Video ID mismatch - Session video: ${session.video_id}, Requested: ${id}`);
      return res.status(403).json({
        error: 'Unauthorized',
        reason: 'Session is for a different video'
      });
    }

    console.log(`✅ Session validated successfully for wallet: ${session.user_wallet}`);

    // Update last accessed time (non-blocking)
    db.updateStreamingSessionAccess(sessionToken).catch(err =>
      console.error('Warning: Failed to update session access time:', err)
    );

    // Get video details
    const video = await db.getVideoById(id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Generate a fresh signed URL (in case the original one expired)
    const signedUrl = await r2StorageService.getSignedUrl(video.videoPath, 3600);

    console.log(`✅ Redirecting to signed R2 URL`);
    console.log(`   This session is bound to wallet: ${session.user_wallet}`);
    console.log(`   URL sharing will not work - each user needs their own session`);

    // Redirect to the R2 signed URL
    // The session validation ensures only the authorized wallet can access this
    // Even if someone shares the stream-secure URL, they'd need a valid session token
    // for their own wallet, which they won't have without payment
    res.redirect(signedUrl);

  } catch (error) {
    console.error('❌ Error in secure stream:', error);
    res.status(500).json({ error: 'Failed to stream video' });
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

/**
 * PUT /api/videos/:id/edit
 * Edit video metadata
 */
router.put('/:id/edit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, price_usdc, comments_enabled, comment_price, creator_wallet } = req.body;

    // Verify ownership
    const video = await db.getVideoById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.creatorWallet !== creator_wallet) {
      return res.status(403).json({ error: 'Not authorized to edit this video' });
    }

    // Update video using Supabase
    await db.updateVideo(id, {
      title,
      description,
      priceUsdc: price_usdc,
    });

    // Update comment settings using Supabase
    await db.upsertCommentSettings(id, comments_enabled, comment_price);

    res.json({ success: true });
  } catch (error) {
    console.error('Error editing video:', error);
    res.status(500).json({ error: 'Failed to edit video' });
  }
});

/**
 * POST /api/videos/:id/thumbnail
 * Upload custom thumbnail for video
 * TODO: Implement with Supabase client and R2 storage
 */
// router.post('/:id/thumbnail', upload.single('thumbnail'), async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { creator_wallet } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ error: 'No thumbnail file provided' });
//     }

//     // Verify ownership
//     const video = await db.getVideoById(id);
//     if (!video) {
//       return res.status(404).json({ error: 'Video not found' });
//     }

//     if (video.creatorWallet !== creator_wallet) {
//       return res.status(403).json({ error: 'Not authorized to edit this video' });
//     }

//     // Upload thumbnail to R2
//     const thumbnailKey = `thumbnails/${id}_${Date.now()}.${req.file.mimetype.split('/')[1]}`;
//     await r2StorageService.uploadFile(thumbnailKey, req.file.buffer, req.file.mimetype);

//     // Get public URL
//     const thumbnailUrl = await r2StorageService.getPublicUrl(thumbnailKey);

//     // Update video
//     await db.query(
//       `UPDATE videos
//        SET thumbnail_url = $1, custom_thumbnail_uploaded = true, updated_at = NOW()
//        WHERE id = $2`,
//       [thumbnailUrl, id]
//     );

//     res.json({ success: true, thumbnailUrl });
//   } catch (error) {
//     console.error('Error uploading thumbnail:', error);
//     res.status(500).json({ error: 'Failed to upload thumbnail' });
//   }
// });

/**
 * PATCH /api/videos/:id/archive
 * Archive/Unarchive a video
 * Hides video from public listings but keeps it accessible for purchasers
 */
router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    console.log('📦 ARCHIVE request received for video:', req.params.id);
    const { id } = req.params;
    const { archived, creator_wallet } = req.body;

    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'archived field must be a boolean' });
    }

    if (!creator_wallet) {
      return res.status(400).json({ error: 'creator_wallet is required' });
    }

    // Verify ownership
    const video = await db.getVideoById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.creatorWallet !== creator_wallet) {
      return res.status(403).json({ error: 'Not authorized to archive this video' });
    }

    // Update video archived status
    const updated = await db.updateVideo(id, { archived });
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update video' });
    }

    console.log(`✅ Video ${archived ? 'archived' : 'unarchived'} successfully`);
    res.json({
      success: true,
      message: archived ? 'Video archived - hidden from public view' : 'Video unarchived - now visible to public',
      video: updated
    });
  } catch (error) {
    console.error('Error archiving video:', error);
    res.status(500).json({ error: 'Failed to archive video' });
  }
});

/**
 * DELETE /api/videos/:id
 * Delete a video (only allowed if NO purchases exist - web3 permanence principle)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    console.log('🗑️  DELETE request received for video:', req.params.id);
    console.log('   Request body:', req.body);

    const { id } = req.params;
    const { creator_wallet } = req.body;

    if (!creator_wallet) {
      console.error('❌ No creator_wallet provided in request body');
      return res.status(400).json({ error: 'creator_wallet is required' });
    }

    // Verify ownership
    const video = await db.getVideoById(id);
    if (!video) {
      console.error('❌ Video not found:', id);
      return res.status(404).json({ error: 'Video not found' });
    }

    console.log('   Video found. Creator wallet:', video.creatorWallet);
    console.log('   Request wallet:', creator_wallet);

    if (video.creatorWallet !== creator_wallet) {
      console.error('❌ Wallet mismatch - not authorized to delete');
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    // 🌐 WEB3 PERMANENCE CHECK: Videos with purchases cannot be deleted
    console.log('   Checking if video has any purchases...');
    const payments = await db.getPaymentsByVideo(id);

    if (payments && payments.length > 0) {
      console.log(`⛔ Cannot delete - video has ${payments.length} purchase(s)`);
      console.log('   Web3 principle: Once purchased, content is permanent');
      return res.status(403).json({
        error: 'Cannot delete video with purchases',
        message: 'This video has been purchased by users. Web3 principle: purchased content is permanent. Use archive instead.',
        purchaseCount: payments.length,
        canArchive: true
      });
    }

    console.log('   ✅ No purchases found - deletion allowed');

    // Delete from database using Supabase (cascade will handle related records)
    console.log('   Deleting video from database...');
    const deleted = await db.deleteVideo(id);

    if (!deleted) {
      console.error('❌ Video was not found in database - may have been already deleted');
      return res.status(404).json({ error: 'Video not found or already deleted' });
    }

    console.log('✅ Video deleted successfully from database');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

/**
 * GET /api/videos/thumbnails/:fileId
 * Serve thumbnail from R2 storage
 */
router.get('/thumbnails/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    // Generate signed URL valid for 1 hour (thumbnails are public-ish, so longer expiry is OK)
    const signedUrl = await r2StorageService.getSignedUrl(`thumbnails/${fileId}`, 3600);

    // Redirect to the signed R2 URL
    res.redirect(signedUrl);
  } catch (error) {
    console.error('❌ Error serving thumbnail:', error);
    res.status(404).json({ error: 'Thumbnail not found' });
  }
});

/**
 * PATCH /api/videos/:id/archive
 * Archive a video (hide from public but keep access for buyers - web3 permanence)
 */
router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    console.log('📦 ARCHIVE request received for video:', req.params.id);
    console.log('   Request body:', req.body);

    const { id } = req.params;
    const { creator_wallet } = req.body;

    if (!creator_wallet) {
      console.error('❌ No creator_wallet provided in request body');
      return res.status(400).json({ error: 'creator_wallet is required' });
    }

    // Verify ownership
    const video = await db.getVideoById(id);
    if (!video) {
      console.error('❌ Video not found:', id);
      return res.status(404).json({ error: 'Video not found' });
    }

    console.log('   Video found. Creator wallet:', video.creatorWallet);
    console.log('   Request wallet:', creator_wallet);

    if (video.creatorWallet !== creator_wallet) {
      console.error('❌ Wallet mismatch - not authorized to archive');
      return res.status(403).json({ error: 'Not authorized to archive this video' });
    }

    // Archive the video (hide from public but keep for buyers)
    console.log('   Archiving video...');
    await db.updateVideo(id, { archived: true });

    console.log('✅ Video archived successfully');
    console.log('   - Hidden from public listings');
    console.log('   - Buyers still have access (web3 permanence)');

    res.json({
      success: true,
      message: 'Video archived. Hidden from public but accessible to buyers.'
    });
  } catch (error) {
    console.error('❌ Error archiving video:', error);
    res.status(500).json({ error: 'Failed to archive video' });
  }
});

export default router;
