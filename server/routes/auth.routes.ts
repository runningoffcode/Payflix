import { Router, Request, Response } from 'express';
import { db } from '../database';
import { generateAccessToken, generateRefreshToken, authenticateJWT } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/auth/challenge
 * Get a login challenge message to sign with wallet
 */
router.post('/challenge', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // Generate a unique challenge message
    const timestamp = Date.now();
    const nonce = uuidv4();
    const message = `Sign this message to authenticate with PayFlix\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

    res.json({
      success: true,
      message,
      nonce,
      timestamp,
    });
  } catch (error) {
    console.error('Challenge error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with wallet address and get JWT tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // In production, verify the wallet signature here
    // For now, we'll skip signature verification for simplicity

    // Get or create user (all users are creators by default)
    let user = await db.getUserByWallet(walletAddress);

    if (!user) {
      console.log('🆕 User not found, creating new user...');
      try {
        user = await db.createUser({
          walletAddress,
          isCreator: true, // Everyone is a creator by default
        });
        console.log('✅ User created successfully:', user.id);
      } catch (error) {
        console.error('❌ Error creating user:', error);
        return res.status(500).json({ error: 'Failed to create user account' });
      }
    } else {
      console.log('✅ Existing user found:', user.id);
      if (!user.isCreator) {
        // Upgrade existing non-creator users to creators automatically
        user = await db.updateUser(user.id, { isCreator: true }) || user;
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token: accessToken,  // Frontend expects 'token'
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email || `${user.walletAddress.slice(0, 8)}@flix.temp`,
        role: user.isCreator ? 'creator' : 'viewer',
        isCreator: user.isCreator,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token (implement proper verification in production)
    // For now, decode and get user

    res.json({
      success: true,
      accessToken: 'new-access-token',
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      user: {
        id: req.user.id,
        walletAddress: req.user.walletAddress,
        username: req.user.username,
        email: req.user.email,
        isCreator: req.user.isCreator,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (invalidate refresh token)
 */
router.post('/logout', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // In production, invalidate the refresh token in database

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
