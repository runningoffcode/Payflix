import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../database';
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
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const user = await db.getUserByWallet(walletAddress);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's video access
    const videoAccess = await db.getUserVideoAccess(user.id);
    const payments = await db.getPaymentsByUser(user.id);

    // If creator, get their videos
    let videos: any[] = [];
    if (user.isCreator) {
      videos = await db.getVideosByCreator(user.id);
    }

    res.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        isCreator: user.isCreator,
        createdAt: user.createdAt,
      },
      stats: {
        videosOwned: videoAccess.length,
        totalSpent: payments.reduce((sum, p) => sum + p.amount, 0),
        videosCreated: videos.length,
        totalEarnings: videos.reduce((sum, v) => sum + v.earnings, 0),
      },
      purchasedVideos: videoAccess.map((va) => va.videoId),
      createdVideos: videos.map((v) => v.id),
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
 * PUT /api/users/update-profile
 * Update user profile (username and profile picture)
 */
router.put('/update-profile', upload.single('profilePicture'), async (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const { username } = req.body;
    const file = req.file;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const user = await db.getUserByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let profilePictureUrl = user.profilePictureUrl;

    // Upload profile picture to Supabase Storage if provided
    if (file) {
      try {
        const fileName = `${user.id}-${Date.now()}.${file.mimetype.split('/')[1]}`;
        const filePath = `profile-pictures/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (error) {
          console.error('Supabase upload error:', error);
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath);

        profilePictureUrl = urlData.publicUrl;
      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res.status(500).json({ error: 'Failed to upload profile picture' });
      }
    }

    // Update user profile in database
    const updatedUser = await db.updateUser(user.id, {
      username: username || user.username,
      profilePictureUrl,
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser!.id,
        wallet_address: updatedUser!.walletAddress,
        username: updatedUser!.username,
        profile_picture_url: updatedUser!.profilePictureUrl,
        is_creator: updatedUser!.isCreator,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
