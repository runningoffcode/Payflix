// ============================================
// FLIX BACKEND - VIDEOS HOOK
// ============================================
// React hook for fetching and managing videos

import { useState, useEffect } from 'react';
import type { VideoWithCreator, VideoFilters, PaginationParams } from '../types/supabase';
import * as videoService from '../services/video.service';

export function useVideos(
  filters: VideoFilters = {},
  pagination: PaginationParams = {}
) {
  const [videos, setVideos] = useState<VideoWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchVideos();
  }, [JSON.stringify(filters), JSON.stringify(pagination)]);

  async function fetchVideos() {
    setLoading(true);
    setError(null);

    const result = await videoService.getVideos(filters, pagination);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.data) {
      setVideos(result.data.data);
      setHasMore(result.data.hasMore);
      setTotal(result.data.total);
    }

    setLoading(false);
  }

  return {
    videos,
    loading,
    error,
    hasMore,
    total,
    refetch: fetchVideos,
  };
}

export function useTrendingVideos(limit: number = 20) {
  const [videos, setVideos] = useState<VideoWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingVideos();
  }, [limit]);

  async function fetchTrendingVideos() {
    setLoading(true);
    setError(null);

    const result = await videoService.getTrendingVideos(limit);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setVideos(result.data);
    }

    setLoading(false);
  }

  return {
    videos,
    loading,
    error,
    refetch: fetchTrendingVideos,
  };
}

export function useTopVideos(limit: number = 20) {
  const [videos, setVideos] = useState<VideoWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopVideos();
  }, [limit]);

  async function fetchTopVideos() {
    setLoading(true);
    setError(null);

    const result = await videoService.getTopVideos(limit);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setVideos(result.data);
    }

    setLoading(false);
  }

  return {
    videos,
    loading,
    error,
    refetch: fetchTopVideos,
  };
}

export function useVideo(videoId: string) {
  const [video, setVideo] = useState<VideoWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  async function fetchVideo() {
    setLoading(true);
    setError(null);

    const result = await videoService.getVideoById(videoId);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setVideo(result.data);
    }

    setLoading(false);
  }

  return {
    video,
    loading,
    error,
    refetch: fetchVideo,
  };
}
