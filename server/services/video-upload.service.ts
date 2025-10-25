import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import config from '../config';
import { arweaveService } from './arweave.service';

/**
 * Video Upload Service
 * Handles video file uploads, processing, and storage
 */

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(config.storage.videoPath, 'temp');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept video files only
  const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'));
  }
};

// Multer upload instance
export const videoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.storage.uploadMaxSize, // 500MB default
  },
});

/**
 * Process uploaded video
 * - Extract metadata (duration, resolution, etc.)
 * - Generate thumbnail
 * - Upload to Arweave
 */
export async function processVideo(
  filePath: string,
  metadata: {
    title: string;
    description: string;
    creatorWallet: string;
    priceUsdc: number;
  }
): Promise<{
  duration: number;
  thumbnailUrl: string;
  videoUrl: string;
  arweaveId: string;
}> {
  try {
    console.log('📹 Processing video:', metadata.title);

    // Extract video metadata
    const videoInfo = await getVideoMetadata(filePath);

    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(filePath);

    // Upload thumbnail to Arweave
    const thumbnail = await arweaveService.uploadThumbnail(
      thumbnailPath,
      metadata.title
    );

    // Upload video to Arweave
    const video = await arweaveService.uploadVideo(filePath, metadata);

    // Clean up temporary files
    fs.unlinkSync(filePath);
    fs.unlinkSync(thumbnailPath);

    console.log('✅ Video processed successfully');

    return {
      duration: Math.floor(videoInfo.duration),
      thumbnailUrl: thumbnail.url,
      videoUrl: video.url,
      arweaveId: video.transactionId,
    };
  } catch (error) {
    console.error('❌ Video processing failed:', error);
    // Clean up on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
}

/**
 * Get video metadata using ffmpeg
 */
function getVideoMetadata(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        format: metadata.format.format_name || 'unknown',
      });
    });
  });
}

/**
 * Generate video thumbnail
 */
function generateThumbnail(videoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      config.storage.videoPath,
      'temp',
      `thumb-${uuidv4()}.jpg`
    );

    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        timemarks: ['5%'], // Take screenshot at 5% of video duration
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x360',
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * Validate video file
 */
export async function validateVideoFile(filePath: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File not found' };
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > config.storage.uploadMaxSize) {
      return {
        valid: false,
        error: `File too large. Max size: ${config.storage.uploadMaxSize / 1024 / 1024}MB`,
      };
    }

    // Verify it's a valid video file
    const metadata = await getVideoMetadata(filePath);

    if (!metadata.duration || metadata.duration === 0) {
      return { valid: false, error: 'Invalid video file' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Failed to validate video file' };
  }
}

/**
 * Clean up old temporary files
 */
export function cleanupTempFiles(olderThanHours: number = 24): void {
  const tempDir = path.join(config.storage.videoPath, 'temp');

  if (!fs.existsSync(tempDir)) {
    return;
  }

  const now = Date.now();
  const maxAge = olderThanHours * 60 * 60 * 1000;

  fs.readdirSync(tempDir).forEach((file) => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);

    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Cleaned up old temp file: ${file}`);
    }
  });
}
