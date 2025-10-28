// ============================================
// FLIX HYBRID - ARWEAVE STORAGE SERVICE
// ============================================
// Uses your existing Arweave backend for permanent storage
// Integrates with Supabase for database tracking

import type { ApiResponse, UploadProgress, UploadResult } from '../types/supabase';

// Your backend API URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

// ============================================
// UPLOAD VIDEO TO ARWEAVE
// ============================================

export async function uploadVideoToArweave(
  file: File,
  metadata: {
    title: string;
    description: string;
    creatorWallet: string;
    priceUsdc: number;
  },
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<{ transactionId: string; url: string; duration: number }>> {
  try {
    // Validate file
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid video file' };
    }

    // Get video duration
    const duration = await getVideoDuration(file);

    // Create form data
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', metadata.title);
    formData.append('description', metadata.description);
    formData.append('creatorWallet', metadata.creatorWallet);
    formData.append('priceUsdc', metadata.priceUsdc.toString());

    // Simulate progress
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    // Upload to your backend (which handles Arweave)
    const response = await fetch(`${BACKEND_URL}/upload/video`, {
      method: 'POST',
      body: formData,
      // Add auth header if needed
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Upload failed' };
    }

    const result = await response.json();

    // Simulate 100% progress
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    return {
      data: {
        transactionId: result.transactionId,
        url: result.url,
        duration,
      },
      error: null,
      message: 'Video uploaded to Arweave successfully!',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to upload video' };
  }
}

// ============================================
// UPLOAD THUMBNAIL TO ARWEAVE
// ============================================

export async function uploadThumbnailToArweave(
  file: File,
  videoTitle: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<{ transactionId: string; url: string }>> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { data: null, error: validation.error || 'Invalid image file' };
    }

    const formData = new FormData();
    formData.append('thumbnail', file);
    formData.append('videoTitle', videoTitle);

    // Simulate progress
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    const response = await fetch(`${BACKEND_URL}/upload/thumbnail`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Thumbnail upload failed' };
    }

    const result = await response.json();

    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    return {
      data: {
        transactionId: result.transactionId,
        url: result.url,
      },
      error: null,
      message: 'Thumbnail uploaded to Arweave!',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to upload thumbnail' };
  }
}

// ============================================
// GET ARWEAVE TRANSACTION STATUS
// ============================================

export async function getArweaveTransactionStatus(
  transactionId: string
): Promise<ApiResponse<{ status: string; confirmed: boolean; blockHeight?: number }>> {
  try {
    const response = await fetch(`${BACKEND_URL}/arweave/status/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      return { data: null, error: 'Failed to get transaction status' };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to check status' };
  }
}

// ============================================
// ESTIMATE ARWEAVE UPLOAD COST
// ============================================

export async function estimateArweaveUploadCost(
  fileSizeBytes: number
): Promise<ApiResponse<{ ar: number; usd: number }>> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/arweave/estimate-cost?size=${fileSizeBytes}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      return { data: null, error: 'Failed to estimate cost' };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to estimate cost' };
  }
}

// ============================================
// GET ARWEAVE WALLET BALANCE
// ============================================

export async function getArweaveBalance(): Promise<ApiResponse<number>> {
  try {
    const response = await fetch(`${BACKEND_URL}/arweave/balance`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      return { data: null, error: 'Failed to get balance' };
    }

    const data = await response.json();
    return { data: data.balance, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to get balance' };
  }
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

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAuthToken(): string {
  // Get JWT token from localStorage or wherever you store it
  return localStorage.getItem('auth_token') || '';
}

// ============================================
// FORMAT FILE SIZE
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
