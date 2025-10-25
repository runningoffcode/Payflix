import { Router, Request, Response } from 'express';
import { db } from '../database';
import { aiAgentService } from '../services/ai-agent.service';

const router = Router();

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
    const allPayments = [];

    for (const video of videos) {
      const payments = await db.getPaymentsByVideo(video.id);
      allPayments.push(...payments);
    }

    const totalEarnings = allPayments.reduce((sum, p) => sum + p.creatorAmount, 0);
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);

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
        averageVideoPrice: videos.reduce((sum, v) => sum + v.priceUsdc, 0) / (videos.length || 1),
      },
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        priceUsdc: v.priceUsdc,
        views: v.views,
        earnings: v.earnings,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching creator analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
