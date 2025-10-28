// ============================================
// FLIX BACKEND - ANALYTICS SERVICE
// ============================================
// Handles analytics tracking and creator stats

import { supabase } from '../lib/supabase';
import type {
  CreatorStats,
  CreatorAnalytics,
  VideoAnalytics,
  ApiResponse,
  VideoWithCreator,
} from '../types/supabase';

// ============================================
// GET CREATOR STATS
// ============================================

export async function getCreatorStats(
  creatorId: string
): Promise<ApiResponse<CreatorStats>> {
  try {
    const { data, error } = await supabase
      .from('creator_stats')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch creator stats' };
  }
}

// ============================================
// GET CREATOR ANALYTICS (Full dashboard data)
// ============================================

export async function getCreatorAnalytics(
  creatorId: string
): Promise<ApiResponse<CreatorAnalytics>> {
  try {
    // Get creator stats
    const statsResponse = await getCreatorStats(creatorId);
    if (statsResponse.error || !statsResponse.data) {
      return { data: null, error: statsResponse.error || 'Failed to fetch stats' };
    }

    // Get views trend (last 30 days)
    const { data: viewsTrendData, error: viewsTrendError } = await supabase
      .from('video_views')
      .select('created_at')
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .in(
        'video_id',
        supabase.from('videos').select('id').eq('creator_id', creatorId)
      );

    // Process views trend
    const viewsTrend = processViewsTrend(viewsTrendData || []);

    // Get revenue trend (last 30 days)
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('created_at, amount')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('created_at', { ascending: true });

    // Process revenue trend
    const revenueTrend = processRevenueTrend(transactionsData || []);

    // Get top videos
    const { data: topVideosData, error: topVideosError } = await supabase
      .from('videos')
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          username,
          profile_image_url,
          role,
          bio
        )
      `
      )
      .eq('creator_id', creatorId)
      .order('views', { ascending: false })
      .limit(5);

    const analytics: CreatorAnalytics = {
      total_videos: statsResponse.data.total_videos,
      total_views: statsResponse.data.total_views,
      total_clicks: statsResponse.data.total_clicks,
      total_revenue: statsResponse.data.total_revenue,
      views_trend: viewsTrend,
      revenue_trend: revenueTrend,
      top_videos: (topVideosData as VideoWithCreator[]) || [],
    };

    return { data: analytics, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch analytics' };
  }
}

// ============================================
// GET VIDEO ANALYTICS
// ============================================

export async function getVideoAnalytics(
  videoId: string
): Promise<ApiResponse<VideoAnalytics>> {
  try {
    // Get video data
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('views, clicks')
      .eq('id', videoId)
      .single();

    if (videoError) {
      return { data: null, error: videoError.message };
    }

    // Get revenue for this video
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('video_id', videoId)
      .eq('status', 'completed');

    const revenue = transactionsData
      ? transactionsData.reduce((sum, t) => sum + Number(t.amount), 0)
      : 0;

    // Get views by date (last 30 days)
    const { data: viewsData, error: viewsError } = await supabase
      .from('video_views')
      .select('created_at')
      .eq('video_id', videoId)
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    const viewsByDate = processViewsByDate(viewsData || []);

    // Get average watch duration
    const { data: durationData, error: durationError } = await supabase
      .from('video_views')
      .select('watched_duration')
      .eq('video_id', videoId)
      .not('watched_duration', 'is', null);

    const avgWatchDuration = durationData
      ? durationData.reduce((sum, v) => sum + (v.watched_duration || 0), 0) /
        durationData.length
      : 0;

    const analytics: VideoAnalytics = {
      video_id: videoId,
      views: videoData.views,
      clicks: videoData.clicks,
      revenue,
      views_by_date: viewsByDate,
      avg_watch_duration: Math.round(avgWatchDuration),
    };

    return { data: analytics, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch video analytics' };
  }
}

// ============================================
// GET RECENT TRANSACTIONS FOR CREATOR
// ============================================

export async function getCreatorTransactions(
  creatorId: string,
  limit: number = 10
): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
        *,
        video:videos (
          id,
          title,
          thumbnail_url
        ),
        user:users!user_id (
          id,
          username,
          profile_image_url
        )
      `
      )
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || 'Failed to fetch transactions',
    };
  }
}

// ============================================
// GET USER'S UNLOCKED VIDEOS
// ============================================

export async function getUserUnlockedVideos(
  userId: string
): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('video_unlocks')
      .select(
        `
        *,
        video:videos (
          *,
          creator:users!creator_id (
            id,
            username,
            profile_image_url,
            role,
            bio
          )
        )
      `
      )
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || 'Failed to fetch unlocked videos',
    };
  }
}

// ============================================
// GET USER'S VIEWING HISTORY
// ============================================

export async function getUserViewingHistory(
  userId: string,
  limit: number = 20
): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('video_views')
      .select(
        `
        *,
        video:videos (
          *,
          creator:users!creator_id (
            id,
            username,
            profile_image_url,
            role,
            bio
          )
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    // Get unique videos (user may have viewed same video multiple times)
    const uniqueVideos = Array.from(
      new Map(data?.map((item) => [item.video.id, item])).values()
    );

    return { data: uniqueVideos, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || 'Failed to fetch viewing history',
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function processViewsTrend(
  viewsData: Array<{ created_at: string }>
): Array<{ date: string; views: number }> {
  const viewsByDate: Record<string, number> = {};

  // Initialize last 30 days with 0 views
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    viewsByDate[dateKey] = 0;
  }

  // Count views by date
  viewsData.forEach((view) => {
    const dateKey = view.created_at.split('T')[0];
    if (viewsByDate[dateKey] !== undefined) {
      viewsByDate[dateKey]++;
    }
  });

  return Object.entries(viewsByDate).map(([date, views]) => ({ date, views }));
}

function processRevenueTrend(
  transactionsData: Array<{ created_at: string; amount: number }>
): Array<{ date: string; revenue: number }> {
  const revenueByDate: Record<string, number> = {};

  // Initialize last 30 days with 0 revenue
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    revenueByDate[dateKey] = 0;
  }

  // Sum revenue by date
  transactionsData.forEach((transaction) => {
    const dateKey = transaction.created_at.split('T')[0];
    if (revenueByDate[dateKey] !== undefined) {
      revenueByDate[dateKey] += Number(transaction.amount);
    }
  });

  return Object.entries(revenueByDate).map(([date, revenue]) => ({
    date,
    revenue,
  }));
}

function processViewsByDate(
  viewsData: Array<{ created_at: string }>
): Record<string, number> {
  const viewsByDate: Record<string, number> = {};

  viewsData.forEach((view) => {
    const dateKey = view.created_at.split('T')[0];
    viewsByDate[dateKey] = (viewsByDate[dateKey] || 0) + 1;
  });

  return viewsByDate;
}
