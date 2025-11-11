import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import config from '../config';

/**
 * Process video with retry logic and detailed error handling
 */
export async function processVideoWithRetry(
  filePath: string,
  metadata: {
    title: string;
    description: string;
    creatorWallet: string;
    priceUsdc: number;
  },
  maxRetries: number = 3
): Promise<{
  duration: number;
  width: number;
  height: number;
  format: string;
  thumbnailPath: string;
}> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);

      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      console.log(`  File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Extract metadata
      console.log('  Extracting video metadata...');
      const videoInfo = await getVideoMetadata(filePath);
      console.log(`  ✓ Metadata extracted: ${videoInfo.duration}s, ${videoInfo.width}x${videoInfo.height}`);

      // Generate thumbnail
      console.log('  Generating thumbnail...');
      const thumbnailPath = await generateThumbnailWithRetry(filePath, 2);
      console.log(`  ✓ Thumbnail generated: ${thumbnailPath}`);

      return {
        ...videoInfo,
        thumbnailPath,
      };

    } catch (error: any) {
      lastError = error;
      console.error(`  ❌ Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Progressive delay
        console.log(`  ⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Video processing failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Get video metadata using ffmpeg with timeout
 */
function getVideoMetadata(filePath: string, timeoutMs: number = 30000): Promise<{
  duration: number;
  width: number;
  height: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`FFmpeg metadata extraction timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      clearTimeout(timeout);

      if (err) {
        console.error('  FFprobe error:', err);
        reject(new Error(`FFprobe failed: ${err.message}`));
        return;
      }

      if (!metadata || !metadata.streams) {
        reject(new Error('No metadata returned from FFprobe'));
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

      if (!videoStream) {
        reject(new Error('No video stream found in file'));
        return;
      }

      if (!metadata.format || !metadata.format.duration) {
        reject(new Error('No duration found in video metadata'));
        return;
      }

      resolve({
        duration: metadata.format.duration,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        format: metadata.format.format_name || 'unknown',
      });
    });
  });
}

/**
 * Generate thumbnail with retry logic
 */
async function generateThumbnailWithRetry(
  videoPath: string,
  maxRetries: number = 2
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateThumbnail(videoPath);
    } catch (error: any) {
      lastError = error;
      console.error(`    Thumbnail attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw new Error(`Thumbnail generation failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Generate video thumbnail using FFmpeg
 */
function generateThumbnail(videoPath: string, timeoutMs: number = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      config.storage.videoPath,
      'temp',
      `thumb-${uuidv4()}.jpg`
    );

    // Ensure temp directory exists
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timeout = setTimeout(() => {
      reject(new Error(`Thumbnail generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        timemarks: ['5%'], // Take screenshot at 5% of video duration
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x360',
      })
      .on('end', () => {
        clearTimeout(timeout);

        // Verify file was created
        if (!fs.existsSync(outputPath)) {
          reject(new Error(`Thumbnail file not created: ${outputPath}`));
          return;
        }

        // Verify file has content
        const stats = fs.statSync(outputPath);
        if (stats.size === 0) {
          reject(new Error('Thumbnail file is empty'));
          return;
        }

        resolve(outputPath);
      })
      .on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`FFmpeg thumbnail generation failed: ${err.message}`));
      });
  });
}

/**
 * Cleanup file with error handling
 */
export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  🗑️  Cleaned up: ${path.basename(filePath)}`);
    }
  } catch (error: any) {
    console.error(`  ⚠️  Cleanup failed for ${filePath}:`, error.message);
  }
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
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (stats.size > config.storage.uploadMaxSize) {
      return {
        valid: false,
        error: `File too large. Max size: ${config.storage.uploadMaxSize / 1024 / 1024}MB`,
      };
    }

    // Verify it's a valid video file
    const metadata = await getVideoMetadata(filePath);

    if (!metadata.duration || metadata.duration === 0) {
      return { valid: false, error: 'Invalid video file: no duration' };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: `Validation failed: ${error.message}` };
  }
}
