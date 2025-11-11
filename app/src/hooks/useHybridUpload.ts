// ============================================
// FLIX HYBRID - UPLOAD HOOK
// ============================================
// React hook for uploading videos to Arweave + Supabase

import { useState } from 'react';
import { uploadVideoHybrid, estimateVideoUploadCost } from '../services/hybrid-video.service';
import type { Video } from '../types/supabase';

interface UploadState {
  stage: string;
  progress: number;
  uploading: boolean;
  error: string | null;
  video: Video | null;
}

export function useHybridUpload() {
  const [state, setState] = useState<UploadState>({
    stage: '',
    progress: 0,
    uploading: false,
    error: null,
    video: null,
  });

  const uploadVideo = async (
    videoFile: File,
    thumbnailFile: File | null,
    metadata: {
      title: string;
      description: string;
      price: number;
      category?: string;
      tags?: string[];
      is_promoted?: boolean;
    }
  ) => {
    setState({
      stage: 'Preparing upload...',
      progress: 0,
      uploading: true,
      error: null,
      video: null,
    });

    const result = await uploadVideoHybrid(
      videoFile,
      thumbnailFile,
      metadata,
      (stage, progressInfo) => {
        setState((prev) => ({
          ...prev,
          stage,
          progress: progressInfo.percentage,
        }));
      }
    );

    if (result.error) {
      setState({
        stage: '',
        progress: 0,
        uploading: false,
        error: result.error,
        video: null,
      });
      return result;
    }

    setState({
      stage: 'Upload complete!',
      progress: 100,
      uploading: false,
      error: null,
      video: result.data,
    });

    return result;
  };

  const estimateCost = async (videoFile: File) => {
    return await estimateVideoUploadCost(videoFile);
  };

  const reset = () => {
    setState({
      stage: '',
      progress: 0,
      uploading: false,
      error: null,
      video: null,
    });
  };

  return {
    ...state,
    uploadVideo,
    estimateCost,
    reset,
  };
}
