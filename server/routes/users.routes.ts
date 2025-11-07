import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../database/db-factory';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

/**
 * POST /api/users/connect-wallet
 * Connect wallet (one-time setup)
 */
router.post('/connect-wallet', async (req: Request, res: Response) => {
  try {
    const { walletAddress, username } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // Check if user already exists
    let user = await db.getUserByWallet(walletAddress);

    if (user) {
      return res.json({
        message: 'Wallet already connected',
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          isCreator: user.isCreator,
        },
      });
    }

    // Create new user
    user = await db.createUser({
      walletAddress,
      username,
      isCreator: false,
    });

    res.status(201).json({
      message: 'Wallet connected successfully',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        isCreator: user.isCreator,
      },
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

/**
 * GET /api/users/profile
 * Get user profile by wallet address
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const headerWallet = req.headers['x-wallet-address'];
    const queryWallet = typeof req.query.walletAddress === 'string' ? req.query.walletAddress : undefined;

    const walletAddress = (queryWallet && queryWallet.trim()) || (typeof headerWallet === 'string' ? headerWallet.trim() : '');

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const user = await db.getUserByWallet(walletAddress);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isSelf =
      typeof headerWallet === 'string' &&
      headerWallet.trim() &&
      headerWallet.trim() === walletAddress;

    const videoAccess = isSelf ? await db.getUserVideoAccess(user.id) : [];
    const payments = isSelf ? await db.getPaymentsByUser(user.id) : [];
    const creatorVideos = user.isCreator ? await db.getVideosByCreator(user.id) : [];
    const subscriberCount = await db.getSubscriberCount(user.walletAddress);

    res.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        bio: user.bio,
        profile_picture_url: user.profilePictureUrl,
        isCreator: user.isCreator,
        createdAt: user.createdAt,
      },
      stats: {
        videosOwned: videoAccess.length,
        totalSpent: payments.reduce((sum, p) => sum + p.amount, 0),
        videosCreated: creatorVideos.length,
        totalEarnings: creatorVideos.reduce((sum, v) => sum + v.earnings, 0),
        subscriberCount,
      },
      purchasedVideos: videoAccess.map((va) => va.videoId),
      createdVideos: creatorVideos.map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        priceUsdc: video.priceUsdc,
        thumbnailUrl: video.thumbnailUrl,
        views: video.views,
        createdAt: video.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * POST /api/users/become-creator
 * Upgrade user account to creator
 */
router.post('/become-creator', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    let user = await db.getUserByWallet(walletAddress);

    if (!user) {
      // Create new creator user
      user = await db.createUser({
        walletAddress,
        isCreator: true,
      });
    } else {
      // Upgrade existing user
      user = await db.updateUser(user.id, { isCreator: true });
    }

    res.json({
      message: 'Successfully upgraded to creator account',
      user: {
        id: user!.id,
        walletAddress: user!.walletAddress,
        isCreator: user!.isCreator,
      },
    });
  } catch (error) {
    console.error('Error upgrading to creator:', error);
    res.status(500).json({ error: 'Failed to upgrade to creator' });
  }
});

/**
 * GET /api/users/purchased-videos
 * Get all videos user has purchased
 */
router.get('/purchased-videos', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const user = await db.getUserByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const videoAccess = await db.getUserVideoAccess(user.id);
    const videos = await Promise.all(
      videoAccess.map((va) => db.getVideoById(va.videoId))
    );

    res.json({
      videos: videos.filter((v) => v !== null),
    });
  } catch (error) {
    console.error('Error fetching purchased videos:', error);
    res.status(500).json({ error: 'Failed to fetch purchased videos' });
  }
});

/**
 * GET /api/users/owned-video-ids
 * Get IDs of all videos user owns (for showing badges on home page)
 */
router.get('/owned-video-ids', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.json({ videoIds: [] }); // Return empty array if not logged in
    }

    const user = await db.getUserByWallet(walletAddress);
    if (!user) {
      return res.json({ videoIds: [] });
    }

    const videoAccess = await db.getUserVideoAccess(user.id);
    const videoIds = videoAccess.map((va) => va.videoId);

    res.json({ videoIds });
  } catch (error) {
    console.error('Error fetching owned video IDs:', error);
    res.json({ videoIds: [] }); // Return empty array on error
  }
});

/**
 * PUT /api/users/update-profile
 * Update user profile (username and profile picture)
 */
router.put('/update-profile', upload.single('profilePicture'), async (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const { username } = req.body;
    const file = req.file;

    console.log('📝 Update profile request:');
    console.log('   Wallet:', walletAddress);
    console.log('   Username:', username);
    console.log('   Has file:', !!file);

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const user = await db.getUserByWallet(walletAddress);
    if (!user) {
      console.error('User not found for wallet:', walletAddress);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('   User found:', user.id);

    let profilePictureUrl = user.profilePictureUrl;

    // Upload profile picture if provided
    if (file) {
      try {
        const fileName = `${user.id}-${Date.now()}.${file.mimetype.split('/')[1]}`;
        const filePath = `profile-pictures/${fileName}`;

        // Try uploading to Supabase Storage first
        const { data, error } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (error) {
          console.warn('⚠️  Supabase storage not available, using base64 fallback');
          // Fallback: Store as base64 data URL
          const base64 = file.buffer.toString('base64');
          profilePictureUrl = `data:${file.mimetype};base64,${base64}`;
          console.log('✅ Profile picture stored as base64');
        } else {
          // Get public URL from Supabase storage
          const { data: urlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

          profilePictureUrl = urlData.publicUrl;
          console.log('✅ Profile picture uploaded to Supabase:', profilePictureUrl);
        }
      } catch (uploadError) {
        console.warn('⚠️  Upload error, using base64 fallback:', uploadError);
        // Fallback: Store as base64 data URL
        try {
          const base64 = file.buffer.toString('base64');
          profilePictureUrl = `data:${file.mimetype};base64,${base64}`;
          console.log('✅ Profile picture stored as base64');
        } catch (base64Error) {
          console.error('❌ Failed to process profile picture:', base64Error);
          // Keep the old profile picture URL
        }
      }
    }

    // Update user profile in database
    console.log('   Updating database with:', {
      username: username || user.username,
      profilePictureUrl
    });

    const updatedUser = await db.updateUser(user.id, {
      username: username || user.username,
      profilePictureUrl,
    });

    if (!updatedUser) {
      console.error('Failed to update user in database');
      return res.status(500).json({ error: 'Failed to update profile in database' });
    }

    console.log('   ✅ Profile updated successfully!');

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        wallet_address: updatedUser.walletAddress,
        username: updatedUser.username,
        profile_picture_url: updatedUser.profilePictureUrl,
        is_creator: updatedUser.isCreator,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/users/creator-videos
 * Get all videos created by the user (creator) with earnings
 */
router.get('/creator-videos', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const user = await db.getUserByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isCreator) {
      return res.status(403).json({ error: 'User is not a creator' });
    }

    const videos = await db.getVideosByCreator(user.id);

    // Calculate earnings for each video from payments
    const videosWithEarnings = await Promise.all(
      videos.map(async (video: any) => {
        const payments = await db.getPaymentsByVideo(video.id);
        const earnings = payments
          .filter((p: any) => p.status === 'verified')
          .reduce((sum: number, p: any) => sum + (p.creatorAmount || 0), 0);

        return {
          ...video,
          earnings: earnings,
        };
      })
    );

    res.json({
      videos: videosWithEarnings || [],
    });
  } catch (error) {
    console.error('Error fetching creator videos:', error);
    res.status(500).json({ error: 'Failed to fetch creator videos' });
  }
});

export default router;
