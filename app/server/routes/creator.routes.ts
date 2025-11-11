import { Router, Request, Response } from 'express';
import { db } from '../database/db-factory';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
 * GET /api/creator/analytics
 * Get enhanced creator analytics with time-based data
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { wallet, range = '7d' } = req.query;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // Calculate date range
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get today's stats from creator_analytics table
    const todayStatsQuery = await db.query(
      `SELECT views, revenue, comments, subscribers
       FROM creator_analytics
       WHERE creator_wallet = $1 AND date = CURRENT_DATE
       LIMIT 1`,
      [wallet]
    );

    const todayStats = todayStatsQuery.rows[0] || {
      views: 0,
      revenue: 0,
      comments: 0,
      subscribers: 0,
    };

    // Get revenue chart data
    const revenueChartQuery = await db.query(
      `SELECT date, revenue
       FROM creator_analytics
       WHERE creator_wallet = $1 AND date >= $2
       ORDER BY date ASC`,
      [wallet, startDate]
    );

    const revenueChart = {
      labels: revenueChartQuery.rows.map((row) =>
        new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      data: revenueChartQuery.rows.map((row) => parseFloat(row.revenue) || 0),
    };

    // Get views chart data
    const viewsChartQuery = await db.query(
      `SELECT date, views
       FROM creator_analytics
       WHERE creator_wallet = $1 AND date >= $2
       ORDER BY date ASC`,
      [wallet, startDate]
    );

    const viewsChart = {
      labels: viewsChartQuery.rows.map((row) =>
        new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      data: viewsChartQuery.rows.map((row) => parseInt(row.views) || 0),
    };

    // Get top performing videos
    const topVideosQuery = await db.query(
      `SELECT v.id, v.title, v.thumbnail_url,
              COALESCE(SUM(va.views), 0) as views,
              COALESCE(SUM(va.revenue), 0) as revenue
       FROM videos v
       LEFT JOIN video_analytics va ON v.id = va.video_id
       WHERE v.creator_wallet = $1
       GROUP BY v.id
       ORDER BY revenue DESC
       LIMIT 5`,
      [wallet]
    );

    const topVideos = topVideosQuery.rows.map((row) => ({
      id: row.id,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      views: parseInt(row.views) || 0,
      revenue: parseFloat(row.revenue) || 0,
    }));

    // Get live viewers count
    const liveViewersQuery = await db.query(
      `SELECT COUNT(DISTINCT user_wallet) as count
       FROM live_viewers lv
       JOIN videos v ON lv.video_id = v.id
       WHERE v.creator_wallet = $1 AND lv.last_heartbeat > NOW() - INTERVAL '30 seconds'`,
      [wallet]
    );

    const liveViewers = parseInt(liveViewersQuery.rows[0]?.count) || 0;

    res.json({
      todayStats: {
        views: parseInt(todayStats.views) || 0,
        revenue: parseFloat(todayStats.revenue) || 0,
        comments: parseInt(todayStats.comments) || 0,
        subscribers: parseInt(todayStats.subscribers) || 0,
      },
      revenueChart,
      viewsChart,
      topVideos,
      liveViewers,
    });
  } catch (error) {
    console.error('Error fetching creator analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/creator/videos
 * Get all videos for a creator with detailed info
 */
router.get('/videos', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const videosQuery = await db.query(
      `SELECT v.*,
              cs.comments_enabled,
              cs.comment_price,
              COALESCE(SUM(va.views), v.views) as total_views,
              COALESCE(SUM(va.revenue), 0) as earnings
       FROM videos v
       LEFT JOIN comment_settings cs ON v.id = cs.video_id
       LEFT JOIN video_analytics va ON v.id = va.video_id
       WHERE v.creator_wallet = $1
       GROUP BY v.id, cs.comments_enabled, cs.comment_price
       ORDER BY v.created_at DESC`,
      [wallet]
    );

    const videos = videosQuery.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      price_usdc: parseFloat(row.price_usdc),
      thumbnail_url: row.thumbnail_url,
      custom_thumbnail_uploaded: row.custom_thumbnail_uploaded || false,
      views: parseInt(row.total_views) || 0,
      earnings: parseFloat(row.earnings) || 0,
      created_at: row.created_at,
      comments_enabled: row.comments_enabled !== false, // Default to true
      comment_price: row.comment_price ? parseFloat(row.comment_price) : 0.01,
    }));

    res.json({ videos });
  } catch (error) {
    console.error('Error fetching creator videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

export default router;
