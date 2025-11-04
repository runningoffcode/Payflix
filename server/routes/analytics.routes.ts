import { Router, Request, Response } from 'express';
import { db } from '../database/db-factory';
import { aiAgentService } from '../services/ai-agent.service';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client for comment queries
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/analytics/platform
 * Get platform-wide analytics
 */
router.get('/platform', async (req: Request, res: Response) => {
  try {
    const videos = await db.getAllVideos();
    const allPayments = [];

    for (const video of videos) {
      const payments = await db.getPaymentsByVideo(video.id);
      allPayments.push(...payments);
    }

    const metrics = await aiAgentService.calculatePlatformMetrics(allPayments);

    res.json({
      metrics: {
        totalVideos: videos.length,
        totalViews: videos.reduce((sum, v) => sum + v.views, 0),
        totalRevenue: metrics.totalRevenue,
        platformRevenue: metrics.platformRevenue,
        creatorRevenue: metrics.creatorRevenue,
        totalTransactions: metrics.totalTransactions,
        averageVideoPrice: videos.reduce((sum, v) => sum + v.priceUsdc, 0) / videos.length,
      },
      recentVideos: videos.slice(0, 5),
    });
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/creator/:walletAddress
 * Get creator analytics
 */
router.get('/creator/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const user = await db.getUserByWallet(walletAddress);
    if (!user || !user.isCreator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const videos = await db.getVideosByCreator(user.id);
    const allPayments: any[] = [];
    const videoEarningsMap = new Map<string, number>();
    const videoCommentCountMap = new Map<string, number>();

    // Calculate earnings for each video from verified payments
    for (const video of videos) {
      const payments = await db.getPaymentsByVideo(video.id);
      const verifiedPayments = payments.filter((p: any) => p.status === 'verified' || p.status === 'confirmed');
      allPayments.push(...verifiedPayments);

      const earnings = verifiedPayments.reduce((sum: number, p: any) => sum + (p.creatorAmount || p.amount || 0), 0);
      videoEarningsMap.set(video.id, earnings);

      // Get comment count for this video
      try {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', video.id);

        videoCommentCountMap.set(video.id, count || 0);
      } catch (error) {
        console.error(`Error fetching comments for video ${video.id}:`, error);
        videoCommentCountMap.set(video.id, 0);
      }
    }

    const totalEarnings = allPayments.reduce((sum: number, p: any) => sum + (p.creatorAmount || p.amount || 0), 0);
    const totalViews = videos.reduce((sum: number, v: any) => sum + v.views, 0);
    const totalComments = Array.from(videoCommentCountMap.values()).reduce((sum, count) => sum + count, 0);

    res.json({
      creator: {
        walletAddress: user.walletAddress,
        username: user.username,
      },
      stats: {
        totalVideos: videos.length,
        totalEarnings,
        totalViews,
        totalSales: allPayments.length,
        totalComments,
        averageVideoPrice: videos.reduce((sum, v) => sum + v.priceUsdc, 0) / (videos.length || 1),
      },
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        priceUsdc: v.priceUsdc,
        views: v.views,
        earnings: videoEarningsMap.get(v.id) || 0,
        commentCount: videoCommentCountMap.get(v.id) || 0,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching creator analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
