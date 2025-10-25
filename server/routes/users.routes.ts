import { Router, Request, Response } from 'express';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

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
      id: `user_${uuidv4()}`,
      walletAddress,
      username,
      isCreator: false,
      createdAt: new Date(),
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
    let videos = [];
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
        id: `user_${uuidv4()}`,
        walletAddress,
        isCreator: true,
        createdAt: new Date(),
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

export default router;
