// ============================================
// FLIX HYBRID - VIDEO SERVICE
// ============================================
// Combines Arweave permanent storage with Supabase database
// Best of both worlds: Decentralized storage + Modern database

// @ts-nocheck
import { supabase } from '../lib/supabase';
import {
  uploadVideoToArweave,
  uploadThumbnailToArweave,
  getVideoDuration,
  createThumbnailFromVideo,
} from './arweave-storage.service';
import type {
  Video,
  ApiResponse,
  UploadProgress,
} from '../types/supabase';

// ============================================
// UPLOAD VIDEO (HYBRID: Arweave + Supabase)
// ============================================

export async function uploadVideoHybrid(
  videoFile: File,
  thumbnailFile: File | null,
  metadata: {
    title: string;
    description: string;
    price: number;
    category?: string;
    tags?: string[];
    is_promoted?: boolean;
  },
  onProgress?: (stage: string, progress: UploadProgress) => void
): Promise<ApiResponse<Video>> {
  try {
    // Step 1: Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { data: null, error: 'You must be logged in to upload videos' };
    }

    // Step 2: Get user profile (need wallet address)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile?.wallet_address) {
      return {
        data: null,
        error: 'Please connect your Solana wallet before uploading videos',
      };
    }

    // Step 3: Upload video to Arweave (permanent storage)
    onProgress?.('Uploading video to Arweave...', {
      loaded: 0,
      total: videoFile.size,
      percentage: 0,
    });

    const videoUploadResult = await uploadVideoToArweave(
      videoFile,
      {
        title: metadata.title,
        description: metadata.description || '',
        creatorWallet: userProfile.wallet_address,
        priceUsdc: metadata.price,
      },
      (progress) => {
        onProgress?.('Uploading video to Arweave...', progress);
      }
    );

    if (videoUploadResult.error || !videoUploadResult.data) {
      return {
        data: null,
        error: videoUploadResult.error || 'Failed to upload video to Arweave',
      };
    }

    const { url: videoUrl, transactionId: videoTxId, duration } = videoUploadResult.data;

    // Step 4: Upload or generate thumbnail
    let thumbnailUrl: string;

    if (thumbnailFile) {
      // User provided thumbnail
      onProgress?.('Uploading thumbnail to Arweave...', {
        loaded: 0,
        total: thumbnailFile.size,
        percentage: 0,
      });

      const thumbnailResult = await uploadThumbnailToArweave(
        thumbnailFile,
        metadata.title,
        (progress) => {
          onProgress?.('Uploading thumbnail...', progress);
        }
      );

      if (thumbnailResult.error || !thumbnailResult.data) {
        // Fall back to auto-generated thumbnail
        const thumbBlob = await createThumbnailFromVideo(videoFile);
        const thumbFile = new File([thumbBlob], 'thumbnail.jpg', {
          type: 'image/jpeg',
        });
        const autoThumbResult = await uploadThumbnailToArweave(
          thumbFile,
          metadata.title
        );

        thumbnailUrl = autoThumbResult.data?.url || '';
      } else {
        thumbnailUrl = thumbnailResult.data.url;
      }
    } else {
      // Auto-generate thumbnail from video
      onProgress?.('Generating thumbnail...', {
        loaded: 0,
        total: 100,
        percentage: 0,
      });

      const thumbBlob = await createThumbnailFromVideo(videoFile);
      const thumbFile = new File([thumbBlob], 'thumbnail.jpg', {
        type: 'image/jpeg',
      });

      const thumbResult = await uploadThumbnailToArweave(thumbFile, metadata.title);
      thumbnailUrl = thumbResult.data?.url || '';
    }

    // Step 5: Save video metadata to Supabase database
    onProgress?.('Saving to database...', {
      loaded: 100,
      total: 100,
      percentage: 100,
    });

    const { data: video, error: dbError } = await supabase
      .from('videos')
      .insert({
        creator_id: authUser.id,
        title: metadata.title,
        description: metadata.description || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration,
        price: metadata.price,
        category: metadata.category || null,
        tags: metadata.tags || null,
        is_promoted: metadata.is_promoted || false,
      })
      .select()
      .single();

    if (dbError) {
      return {
        data: null,
        error: `Video uploaded to Arweave but database save failed: ${dbError.message}`,
      };
    }

    // Step 6: Store Arweave transaction IDs for reference (optional metadata table)
    // You could create an arweave_transactions table to track these
    console.log('Arweave Video TX:', videoTxId);
    console.log('Arweave Video URL:', videoUrl);

    return {
      data: video,
      error: null,
      message: `Video uploaded successfully! Permanent storage on Arweave (TX: ${videoTxId})`,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || 'Failed to upload video',
    };
  }
}

// ============================================
// GET VIDEO WITH ARWEAVE STATUS
// ============================================

export async function getVideoWithArweaveStatus(videoId: string): Promise<
  ApiResponse<{
    video: any;
    arweave: {
      confirmed: boolean;
      transactionId: string;
    };
  }>
> {
  try {
    // Get video from Supabase
    const { data: video, error } = await supabase
      .from('videos')
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          username,
          profile_image_url,
          role,
          bio,
          wallet_address
        )
      `
      )
      .eq('id', videoId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Extract Arweave transaction ID from URL
    // Assuming URL format: https://arweave.net/TRANSACTION_ID
    const txId = video.video_url.split('/').pop() || '';

    // You could check Arweave confirmation status here
    // For now, return video with transaction info
    return {
      data: {
        video,
        arweave: {
          confirmed: true, // You can query Arweave for actual status
          transactionId: txId,
        },
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// UPDATE VIDEO METADATA (Database only)
// ============================================

export async function updateVideoMetadata(
  videoId: string,
  updates: {
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    tags?: string[];
    is_promoted?: boolean;
  }
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

    return {
      data,
      error: null,
      message: 'Video metadata updated (Arweave content remains immutable)',
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// DELETE VIDEO (Database only - Arweave is permanent!)
// ============================================

export async function deleteVideoFromDatabase(
  videoId: string
): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('videos').delete().eq('id', videoId);

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: null,
      error: null,
      message:
        'Video removed from database. Note: Content remains permanently on Arweave.',
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

// ============================================
// GET ARWEAVE STREAMING URL
// ============================================

export function getArweaveStreamUrl(videoUrl: string): string {
  // Arweave URLs are already streamable
  // Just return the URL as-is
  return videoUrl;
}

// ============================================
// CALCULATE UPLOAD COST BEFORE UPLOADING
// ============================================

export async function estimateVideoUploadCost(
  videoFile: File
): Promise<ApiResponse<{ ar: number; usd: number; size: string }>> {
  try {
    const { estimateArweaveUploadCost, formatFileSize } = await import(
      './arweave-storage.service'
    );

    const costResult = await estimateArweaveUploadCost(videoFile.size);

    if (costResult.error || !costResult.data) {
      return { data: null, error: costResult.error || 'Failed to estimate cost' };
    }

    return {
      data: {
        ...costResult.data,
        size: formatFileSize(videoFile.size),
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
