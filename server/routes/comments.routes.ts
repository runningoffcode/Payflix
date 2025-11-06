import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../database/db-factory';
import { sessionPaymentService } from '../services/session-payment.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/comments/:videoId
 * Get all comments for a video
 */
router.get('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    console.log(`📖 Fetching comments for video: ${videoId}`);

    // Fetch comments ordered by creation date (newest first)
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    console.log(`✅ Found ${comments?.length || 0} comments`);

    return res.json({
      comments: comments || [],
      count: comments?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/comments/:videoId:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch comments' });
  }
});

/**
 * POST /api/comments
 * Create a new comment (with optional session key payment for paid comments)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { videoId, content, userWallet, username, profilePictureUrl } = req.body;

    console.log(`💬 Creating comment for video ${videoId} by ${userWallet}`);

    // Validation
    if (!videoId || !content || !userWallet) {
      return res.status(400).json({ error: 'videoId, content, and userWallet are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment content cannot exceed 1000 characters' });
    }

    // Fetch video to check comment settings
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, comments_enabled, comment_price, creator_wallet')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error('❌ Video not found:', videoError);
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if comments are enabled
    if (!video.comments_enabled) {
      return res.status(403).json({ error: 'Comments are disabled for this video' });
    }

    // Get user ID
    let user = await db.getUserByWallet(userWallet);
    if (!user) {
      console.log(`   Creating user for wallet ${userWallet}`);
      user = await db.createUser({
        walletAddress: userWallet,
        username: username || `User ${userWallet.substring(0, 8)}`,
        email: null,
        profilePictureUrl: profilePictureUrl || undefined,
        isCreator: false,
      });
    }

    const commentPrice = Number(video.comment_price || 0);
    const isCreatorCommenting = video.creator_wallet === userWallet;
    const effectivePrice = isCreatorCommenting ? 0 : commentPrice;
    let paymentId: string | null = null;
    let transactionSignature: string | null = null;

    if (effectivePrice > 0) {
      console.log(`💰 Comment requires payment: $${commentPrice} USDC`);

      const hasSession = await sessionPaymentService.hasActiveSession(userWallet);
      if (!hasSession) {
        return res.status(402).json({
          error: 'No active session',
          message: 'Please deposit USDC to your session balance to leave a paid comment.',
          requiresSession: true,
          commentPrice,
        });
      }

      const sessionBalance = await sessionPaymentService.getSessionBalance(userWallet);
      if (sessionBalance.remainingAmount && sessionBalance.remainingAmount < effectivePrice) {
        return res.status(402).json({
          error: 'Insufficient session balance',
          message: `This comment costs $${commentPrice} USDC. You currently have $${sessionBalance.remainingAmount ?? 0} USDC remaining.`,
          requiresPayment: true,
          commentPrice,
          remaining: sessionBalance.remainingAmount ?? 0,
        });
      }

      const paymentResult = await sessionPaymentService.processSessionPayment({
        userWallet,
        videoId,
        amount: effectivePrice,
        creatorWallet: video.creator_wallet,
      });

      if (!paymentResult.success) {
        return res.status(500).json({
          error: 'Payment Failed',
          message: paymentResult.error || 'Unable to process comment payment.',
        });
      }

      transactionSignature = paymentResult.signature ?? `comment_${Date.now()}`;

      const platformFeePercent = 2.85;
      const platformAmount = effectivePrice * (platformFeePercent / 100);
      const creatorAmount = effectivePrice - platformAmount;

      paymentId = uuidv4();
      await db.createPayment({
        id: paymentId,
        videoId,
        userId: user.id,
        userWallet,
        creatorWallet: video.creator_wallet,
        amount: effectivePrice,
        creatorAmount,
        platformAmount,
        transactionSignature,
        status: 'verified',
      });
    } else if (isCreatorCommenting && commentPrice > 0) {
      console.log('🔁 Creator commenting on own video - skipping payment deduction.');
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        id: commentId,
        video_id: videoId,
        user_id: user.id,
        user_wallet: userWallet,
        username: username || user.username || null,
        profile_picture_url: profilePictureUrl || user.profilePictureUrl || null,
        content: content.trim(),
        payment_id: paymentId,
      })
      .select()
      .single();

    if (commentError) {
      console.error('❌ Error creating comment:', commentError);
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    const updatedBalance = effectivePrice > 0
      ? await sessionPaymentService.getSessionBalance(userWallet)
      : null;

    console.log(`✅ Comment created: ${commentId}`);

    return res.status(201).json({
      comment,
      message: effectivePrice > 0
        ? `Comment posted! $${effectivePrice} deducted from your session.`
        : isCreatorCommenting && commentPrice > 0
          ? 'Comment posted! Creators are not charged for comments on their own videos.'
          : 'Comment posted successfully',
      balance: updatedBalance,
      chargedAmount: effectivePrice,
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/comments:', error);
    return res.status(500).json({ error: error.message || 'Failed to create comment' });
  }
});

/**
 * DELETE /api/comments/:commentId
 * Delete a comment (owner or video creator only)
 */
router.delete('/:commentId', async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userWallet = req.headers['x-wallet-address'] as string;

    if (!userWallet) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    console.log(`🗑️ Deleting comment ${commentId} by ${userWallet}`);

    // Fetch the comment with video creator info
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select(`
        *,
        videos!inner(
          creator_id,
          users!inner(wallet_address)
        )
      `)
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      console.error('❌ Comment not found:', commentError);
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the comment owner or video creator
    const isOwner = comment.user_wallet === userWallet;
    const isCreator = (comment as any).videos?.users?.wallet_address === userWallet;

    if (!isOwner && !isCreator) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' });
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('❌ Error deleting comment:', deleteError);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }

    console.log(`✅ Comment deleted: ${commentId}`);

    return res.json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/comments/:commentId:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete comment' });
  }
});

/**
 * PUT /api/comments/videos/:videoId/settings
 * Update comment settings for a video (creator only)
 */
router.put('/videos/:videoId/settings', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { commentsEnabled, commentPrice } = req.body;
    const creatorWallet = req.headers['x-wallet-address'] as string;

    if (!creatorWallet) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    console.log(`⚙️ Updating comment settings for video ${videoId}`);

    // Get creator ID from wallet
    const { data: creator, error: creatorError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', creatorWallet)
      .single();

    if (creatorError || !creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('creator_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.creator_id !== creator.id) {
      return res.status(403).json({ error: 'You do not own this video' });
    }

    // Validate comment price
    if (commentPrice !== undefined && (commentPrice < 0 || commentPrice > 1000)) {
      return res.status(400).json({ error: 'Comment price must be between 0 and 1000 USDC' });
    }

    // Update comment settings
    const updates: any = {};
    if (commentsEnabled !== undefined) updates.comments_enabled = commentsEnabled;
    if (commentPrice !== undefined) updates.comment_price = commentPrice;

    const { error: updateError } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', videoId);

    if (updateError) {
      console.error('❌ Error updating comment settings:', updateError);
      return res.status(500).json({ error: 'Failed to update comment settings' });
    }

    console.log(`✅ Comment settings updated for video ${videoId}`);

    return res.json({
      message: 'Comment settings updated successfully',
      settings: updates,
    });
  } catch (error: any) {
    console.error('❌ Error in PUT /api/comments/videos/:videoId/settings:', error);
    return res.status(500).json({ error: error.message || 'Failed to update comment settings' });
  }
});

export default router;
