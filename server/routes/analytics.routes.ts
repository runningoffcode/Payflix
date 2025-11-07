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

const TRENDING_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let trendingCache: { payload: any | null; expiresAt: number } = {
  payload: null,
  expiresAt: 0,
};

router.get('/trending', async (_req: Request, res: Response) => {
  try {
    if (trendingCache.payload && trendingCache.expiresAt > Date.now()) {
      return res.json(trendingCache.payload);
    }

    const [creatorHighlights, videoHighlights] = await Promise.all([
      computeTrendingCreators(),
      computeTrendingVideos(),
    ]);

    const payload = {
      refreshedAt: new Date().toISOString(),
      creators: creatorHighlights,
      videos: videoHighlights,
    };

    trendingCache = {
      payload,
      expiresAt: Date.now() + TRENDING_CACHE_TTL_MS,
    };

    res.json(payload);
  } catch (error) {
    console.error('Error fetching trending analytics:', error);
    res.status(500).json({ error: 'Failed to fetch trending analytics' });
  }
});

type WeightedMetricConfig = Record<string, number>;

function applyWeightedScore<T extends Record<string, number>>(items: T[], weights: WeightedMetricConfig) {
  const metrics = Object.keys(weights);
  metrics.forEach((metric) => {
    const values = items.map((item) => item[metric] || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    items.forEach((item) => {
      let normalized = 0;
      if (range === 0) {
        normalized = max > 0 ? 1 : 0;
      } else {
        normalized = (item[metric] - min) / range;
      }
      (item as any)[`normalized_${metric}`] = normalized;
    });
  });

  items.forEach((item) => {
    let score = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      score += ((item as any)[`normalized_${metric}`] || 0) * weight;
    }
    (item as any).score = Number(score.toFixed(4));
  });
}

function toNumber(value: any): number {
  const num = typeof value === 'number' ? value : parseFloat(value || '0');
  return Number.isFinite(num) ? num : 0;
}

function getDateBoundary(hoursBack: number): string {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return since.toISOString().split('T')[0];
}

async function computeTrendingCreators() {
  const sinceDate = getDateBoundary(24);
  const { data, error } = await supabase
    .from('creator_analytics')
    .select('creator_wallet, revenue, views, subscribers, date')
    .gte('date', sinceDate);

  if (error) {
    console.error('Supabase error fetching creator analytics:', error);
    return [];
  }

  const aggregates = new Map<
    string,
    {
      creatorWallet: string;
      revenue24h: number;
      views24h: number;
      subscribers24h: number;
    }
  >();

  for (const row of data || []) {
    if (!row.creator_wallet) continue;
    if (!aggregates.has(row.creator_wallet)) {
      aggregates.set(row.creator_wallet, {
        creatorWallet: row.creator_wallet,
        revenue24h: 0,
        views24h: 0,
        subscribers24h: 0,
      });
    }
    const aggregate = aggregates.get(row.creator_wallet)!;
    aggregate.revenue24h += toNumber(row.revenue);
    aggregate.views24h += toNumber(row.views);
    aggregate.subscribers24h += toNumber(row.subscribers);
  }

  const creatorList = Array.from(aggregates.values());
  if (!creatorList.length) return [];

  applyWeightedScore(creatorList as any[], {
    revenue24h: 0.5,
    subscribers24h: 0.3,
    views24h: 0.2,
  });

  const sorted = creatorList.sort((a, b) => (b as any).score - (a as any).score).slice(0, 2);

  const walletAddresses = sorted.map((item) => item.creatorWallet);
  let creatorProfiles: any[] | null = [];
  if (walletAddresses.length) {
    const { data } = await supabase
      .from('users')
      .select('wallet_address, username, profile_image_url, bio')
      .in('wallet_address', walletAddresses);
    creatorProfiles = data;
  }

  return sorted.map((entry) => {
    const profile = creatorProfiles?.find((p) => p.wallet_address === entry.creatorWallet);
    return {
      walletAddress: entry.creatorWallet,
      username: profile?.username || null,
      profilePictureUrl: profile?.profile_image_url || null,
      bio: profile?.bio || null,
      stats: {
        revenue24h: Number(entry.revenue24h.toFixed(2)),
        views24h: entry.views24h,
        subscribers24h: entry.subscribers24h,
      },
      score: (entry as any).score,
    };
  });
}

async function computeTrendingVideos() {
  const sinceDate = getDateBoundary(24);
  const { data, error } = await supabase
    .from('video_analytics')
    .select('video_id, revenue, views, comments, date')
    .gte('date', sinceDate);

  if (error) {
    console.error('Supabase error fetching video analytics:', error);
    return [];
  }

  const aggregates = new Map<
    string,
    {
      videoId: string;
      revenue24h: number;
      views24h: number;
      comments24h: number;
    }
  >();

  for (const row of data || []) {
    if (!row.video_id) continue;
    if (!aggregates.has(row.video_id)) {
      aggregates.set(row.video_id, {
        videoId: row.video_id,
        revenue24h: 0,
        views24h: 0,
        comments24h: 0,
      });
    }
    const aggregate = aggregates.get(row.video_id)!;
    aggregate.revenue24h += toNumber(row.revenue);
    aggregate.views24h += toNumber(row.views);
    aggregate.comments24h += toNumber(row.comments);
  }

  const videoList = Array.from(aggregates.values());
  if (!videoList.length) return [];

  applyWeightedScore(videoList as any[], {
    revenue24h: 0.6,
    views24h: 0.3,
    comments24h: 0.1,
  });

  const sorted = videoList.sort((a, b) => (b as any).score - (a as any).score).slice(0, 2);
  const videoIds = sorted.map((item) => item.videoId);
  let videoRecords: any[] | null = [];
  if (videoIds.length) {
    const { data } = await supabase
      .from('videos')
      .select('id, title, thumbnail_url, price_usdc, creator_wallet')
      .in('id', videoIds);
    videoRecords = data;
  }

  return sorted.map((entry) => {
    const video = videoRecords?.find((v) => v.id === entry.videoId);
    return {
      id: entry.videoId,
      title: video?.title || 'Untitled Video',
      thumbnailUrl: video?.thumbnail_url || null,
      priceUsdc: video?.price_usdc || 0,
      creatorWallet: video?.creator_wallet || null,
      stats: {
        revenue24h: Number(entry.revenue24h.toFixed(2)),
        views24h: entry.views24h,
        comments24h: entry.comments24h,
      },
      score: (entry as any).score,
    };
  });
}

export default router;
