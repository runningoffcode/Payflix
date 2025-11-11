/**
 * User Profile Routes
 * Manage user profiles (username, profile picture)
 */

import { Router } from 'express';
import { db } from '../database/db-factory';

const router = Router();

/**
 * GET /api/users/profile?walletAddress=...
 * Get user profile by wallet address
 */
router.get('/profile', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({
        error: 'Missing walletAddress parameter',
      });
    }

    const user = await db.getUserByWallet(walletAddress);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this wallet address',
      });
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      walletAddress: user.walletAddress,
      bio: user.bio,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      error: 'Failed to fetch user profile',
      message: error.message,
    });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile (username, profile picture, bio)
 */
router.put('/profile', async (req, res) => {
  try {
    const { walletAddress, username, profilePicture, bio } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Missing walletAddress',
      });
    }

    // Get existing user
    const existingUser = await db.getUserByWallet(walletAddress);
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Please connect your wallet first',
      });
    }

    // Check if username is taken (if provided)
    if (username && username !== existingUser.username) {
      const usernameExists = await db.getUserByUsername(username);
      if (usernameExists && usernameExists.id !== existingUser.id) {
        return res.status(400).json({
          error: 'Username already taken',
          message: 'Please choose a different username',
        });
      }
    }

    // Update user profile
    const updates: any = {};
    if (username !== undefined) updates.username = username;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    if (bio !== undefined) updates.bio = bio;

    const updatedUser = await db.updateUserProfile(existingUser.id, updates);

    if (!updatedUser) {
      return res.status(500).json({
        error: 'Failed to update profile',
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        walletAddress: updatedUser.walletAddress,
        bio: updatedUser.bio,
      },
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      message: error.message,
    });
  }
});

export default router;
