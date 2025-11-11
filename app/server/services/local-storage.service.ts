import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';

/**
 * Local Storage Service
 * Fallback storage for development when Arweave is not configured
 * Stores files locally and serves them via the API
 */
export class LocalStorageService {
  private storagePath: string;

  constructor() {
    // Use uploads directory instead of config storage path
    this.storagePath = path.join(process.cwd(), 'uploads');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      path.join(this.storagePath, 'videos'),
      path.join(this.storagePath, 'thumbnails'),
      path.join(this.storagePath, 'temp'),
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    console.log('✅ Local storage directories initialized');
  }

  /**
   * Upload video to local storage
   */
  async uploadVideo(
    filePath: string,
    metadata: {
      title: string;
      description: string;
      creatorWallet: string;
      priceUsdc: number;
    }
  ): Promise<{
    transactionId: string;
    url: string;
  }> {
    try {
      console.log(`💾 Storing video locally: ${metadata.title}`);

      // Generate unique ID
      const fileId = uuidv4();
      const ext = path.extname(filePath);
      const newFileName = `${fileId}${ext}`;
      const destPath = path.join(this.storagePath, 'videos', newFileName);

      // Copy file to storage
      fs.copyFileSync(filePath, destPath);

      // Store metadata as JSON
      const metadataPath = path.join(
        this.storagePath,
        'videos',
        `${fileId}.json`
      );
      fs.writeFileSync(
        metadataPath,
        JSON.stringify(
          {
            id: fileId,
            originalName: path.basename(filePath),
            ...metadata,
            uploadedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      const url = `/api/storage/videos/${fileId}${ext}`;

      console.log(`✅ Video stored locally with ID: ${fileId}`);
      console.log(`🔗 URL: ${url}`);

      return {
        transactionId: fileId,
        url,
      };
    } catch (error) {
      console.error('❌ Failed to store video locally:', error);
      throw error;
    }
  }

  /**
   * Upload thumbnail to local storage
   */
  async uploadThumbnail(
    filePath: string,
    title: string
  ): Promise<{
    transactionId: string;
    url: string;
  }> {
    try {
      console.log(`💾 Storing thumbnail locally for: ${title}`);

      // Generate unique ID
      const fileId = uuidv4();
      const ext = path.extname(filePath);
      const newFileName = `${fileId}${ext}`;
      const destPath = path.join(this.storagePath, 'thumbnails', newFileName);

      // Copy file to storage
      fs.copyFileSync(filePath, destPath);

      const url = `/api/storage/thumbnails/${fileId}${ext}`;

      console.log(`✅ Thumbnail stored locally with ID: ${fileId}`);

      return {
        transactionId: fileId,
        url,
      };
    } catch (error) {
      console.error('❌ Failed to store thumbnail locally:', error);
      throw error;
    }
  }

  /**
   * Get file path from storage
   */
  getFilePath(type: 'videos' | 'thumbnails', filename: string): string {
    return path.join(this.storagePath, type, filename);
  }

  /**
   * Check if file exists
   */
  fileExists(type: 'videos' | 'thumbnails', filename: string): boolean {
    const filePath = this.getFilePath(type, filename);
    return fs.existsSync(filePath);
  }

  /**
   * Delete file from storage
   */
  deleteFile(type: 'videos' | 'thumbnails', filename: string): boolean {
    try {
      const filePath = this.getFilePath(type, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    totalVideos: number;
    totalThumbnails: number;
    totalSize: number;
  } {
    const videosDir = path.join(this.storagePath, 'videos');
    const thumbnailsDir = path.join(this.storagePath, 'thumbnails');

    let totalVideos = 0;
    let totalThumbnails = 0;
    let totalSize = 0;

    if (fs.existsSync(videosDir)) {
      const videoFiles = fs.readdirSync(videosDir).filter((f) => !f.endsWith('.json'));
      totalVideos = videoFiles.length;
      videoFiles.forEach((file) => {
        const stats = fs.statSync(path.join(videosDir, file));
        totalSize += stats.size;
      });
    }

    if (fs.existsSync(thumbnailsDir)) {
      const thumbFiles = fs.readdirSync(thumbnailsDir);
      totalThumbnails = thumbFiles.length;
      thumbFiles.forEach((file) => {
        const stats = fs.statSync(path.join(thumbnailsDir, file));
        totalSize += stats.size;
      });
    }

    return {
      totalVideos,
      totalThumbnails,
      totalSize,
    };
  }
}

export const localStorageService = new LocalStorageService();
