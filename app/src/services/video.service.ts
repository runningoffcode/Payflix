// @ts-nocheck
// ============================================
// FLIX BACKEND - VIDEO SERVICE
// ============================================
// Handles all video-related operations

import { supabase } from '../lib/supabase';
import type {
  Video,
  VideoWithCreator,
  CreateVideoInput,
  UpdateVideoInput,
  ApiResponse,
  PaginatedResponse,
  VideoFilters,
  PaginationParams,
} from '../types/supabase';

// ============================================
// GET ALL VIDEOS (with pagination and filters)
// ============================================

export async function getVideos(
  filters: VideoFilters = {},
  pagination: PaginationParams = {}
): Promise<ApiResponse<PaginatedResponse<VideoWithCreator>>> {
  try {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      order = 'desc',
    } = pagination;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
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
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.creator_id) {
      query = query.eq('creator_id', filters.creator_id);
    }
    if (filters.min_price !== undefined) {
      query = query.gte('price', filters.min_price);
    }
    if (filters.max_price !== undefined) {
      query = query.lte('price', filters.max_price);
    }
    if (filters.is_promoted !== undefined) {
      query = query.eq('is_promoted', filters.is_promoted);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        data: data as VideoWithCreator[],
        total: count || 0,
        page,
        limit,
        hasMore: count ? to < count - 1 : false,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch videos' };
  }
}

// ============================================
// GET TRENDING VIDEOS
// ============================================

export async function getTrendingVideos(
  limit: number = 20
): Promise<ApiResponse<VideoWithCreator[]>> {
  try {
    const { data, error } = await supabase.rpc('get_trending_videos', {
      limit_count: limit,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as VideoWithCreator[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch trending videos' };
  }
}

// ============================================
// GET TOP VIDEOS
// ============================================

export async function getTopVideos(
  limit: number = 20
): Promise<ApiResponse<VideoWithCreator[]>> {
  try {
    const { data, error } = await supabase.rpc('get_top_videos', {
      limit_count: limit,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as VideoWithCreator[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch top videos' };
  }
}

// ============================================
// GET VIDEO BY ID
// ============================================

export async function getVideoById(
  videoId: string
): Promise<ApiResponse<VideoWithCreator>> {
  try {
    const { data, error } = await supabase
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
      .eq('id', videoId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as VideoWithCreator, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch video' };
  }
}

// ============================================
// CREATE VIDEO
// ============================================

export async function createVideo(
  videoData: CreateVideoInput
): Promise<ApiResponse<Video>> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'You must be logged in to upload videos' };
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        creator_id: user.id,
        ...videoData,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null, message: 'Video uploaded successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to create video' };
  }
}

// ============================================
// UPDATE VIDEO
// ============================================

export async function updateVideo(
  videoId: string,
  updates: UpdateVideoInput
): Promise<ApiResponse<Video>> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null, message: 'Video updated successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to update video' };
  }
}

// ============================================
// DELETE VIDEO
// ============================================

export async function deleteVideo(videoId: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('videos').delete().eq('id', videoId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null, message: 'Video deleted successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to delete video' };
  }
}

// ============================================
// GET CREATOR'S VIDEOS
// ============================================

export async function getCreatorVideos(
  creatorId: string,
  pagination: PaginationParams = {}
): Promise<ApiResponse<PaginatedResponse<VideoWithCreator>>> {
  return getVideos({ creator_id: creatorId }, pagination);
}

// ============================================
// INCREMENT VIDEO VIEWS
// ============================================

export async function incrementVideoViews(
  videoId: string,
  userId?: string,
  watchedDuration?: number
): Promise<ApiResponse<null>> {
  try {
    // Insert video view record
    const { error } = await supabase.from('video_views').insert({
      video_id: videoId,
      user_id: userId || null,
      watched_duration: watchedDuration || null,
      ip_address: null, // In production, get from request
      user_agent: navigator.userAgent,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    // The database trigger will automatically increment the view count
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to record view' };
  }
}

// ============================================
// CHECK VIDEO ACCESS
// ============================================

export async function checkVideoAccess(
  videoId: string,
  userId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { data, error } = await supabase.rpc('has_video_access', {
      user_uuid: userId,
      video_uuid: videoId,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to check video access' };
  }
}

// ============================================
// SEARCH VIDEOS
// ============================================

export async function searchVideos(
  searchQuery: string,
  pagination: PaginationParams = {}
): Promise<ApiResponse<PaginatedResponse<VideoWithCreator>>> {
  return getVideos({ search: searchQuery }, pagination);
}

// ============================================
// GET VIDEOS BY CATEGORY
// ============================================

export async function getVideosByCategory(
  category: string,
  pagination: PaginationParams = {}
): Promise<ApiResponse<PaginatedResponse<VideoWithCreator>>> {
  return getVideos({ category }, pagination);
}

// ============================================
// PROMOTE VIDEO (Make it trending)
// ============================================

export async function promoteVideo(
  videoId: string,
  isPromoted: boolean = true
): Promise<ApiResponse<Video>> {
  return updateVideo(videoId, { is_promoted: isPromoted });
}
