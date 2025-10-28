// ============================================
// FLIX BACKEND - STORAGE SERVICE
// ============================================
// Handles file uploads to Supabase Storage

import { supabase, STORAGE_BUCKETS, getPublicUrl } from '../lib/supabase';
import type { ApiResponse, UploadProgress, UploadResult } from '../types/supabase';

// ============================================
// UPLOAD VIDEO
// ============================================

export async function uploadVideo(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<UploadResult>> {
  try {
    // Validate file
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid video file' };
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'You must be logged in to upload videos' };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

    // Simulate progress (Supabase doesn't provide native progress callbacks)
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.VIDEOS)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { data: null, error: error.message };
    }

    // Simulate 100% progress
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    // Get public URL
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.VIDEOS, data.path);

    return {
      data: {
        url: publicUrl,
        path: data.path,
        size: file.size,
      },
      error: null,
      message: 'Video uploaded successfully!',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to upload video' };
  }
}

// ============================================
// UPLOAD THUMBNAIL
// ============================================

export async function uploadThumbnail(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<UploadResult>> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid image file' };
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'You must be logged in to upload thumbnails' };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

    // Simulate progress
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.THUMBNAILS)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { data: null, error: error.message };
    }

    // Simulate 100% progress
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    // Get public URL
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.THUMBNAILS, data.path);

    return {
      data: {
        url: publicUrl,
        path: data.path,
        size: file.size,
      },
      error: null,
      message: 'Thumbnail uploaded successfully!',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to upload thumbnail' };
  }
}

// ============================================
// UPLOAD PROFILE IMAGE
// ============================================

export async function uploadProfileImage(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<UploadResult>> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid image file' };
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'You must be logged in to upload profile images' };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

    // Simulate progress
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_IMAGES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { data: null, error: error.message };
    }

    // Simulate 100% progress
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    // Get public URL
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.PROFILE_IMAGES, data.path);

    return {
      data: {
        url: publicUrl,
        path: data.path,
        size: file.size,
      },
      error: null,
      message: 'Profile image uploaded successfully!',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to upload profile image' };
  }
}

// ============================================
// DELETE FILE
// ============================================

export async function deleteFile(
  bucket: string,
  path: string
): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null, message: 'File deleted successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to delete file' };
  }
}

// ============================================
// GET FILE URL
// ============================================

export function getFileUrl(bucket: string, path: string): string {
  return getPublicUrl(bucket, path);
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateVideoFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Video file size must be less than 500MB' };
  }

  // Check file type
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-matroska',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid video format. Allowed formats: MP4, WebM, OGG, MOV, MKV',
    };
  }

  return { valid: true };
}

function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image file size must be less than 5MB' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid image format. Allowed formats: JPEG, PNG, WebP',
    };
  }

  return { valid: true };
}

function sanitizeFileName(fileName: string): string {
  // Remove special characters and spaces
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_');
}

// ============================================
// GET VIDEO DURATION
// ============================================

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

// ============================================
// CREATE THUMBNAIL FROM VIDEO
// ============================================

export async function createThumbnailFromVideo(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // Seek to 2 seconds or 10% of video duration
      video.currentTime = Math.min(2, video.duration * 0.1);
    };

    video.onseeked = () => {
      // Set canvas dimensions (16:9 aspect ratio)
      canvas.width = 1280;
      canvas.height = 720;

      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail'));
            }
          },
          'image/jpeg',
          0.9
        );
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}
