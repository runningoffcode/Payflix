import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

/**
 * Cloudflare R2 Storage Service
 * S3-compatible storage with zero egress fees
 */
export class R2StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // Initialize R2 client (S3-compatible)
    this.s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' region
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });

    this.bucketName = config.r2.bucketName;
    this.publicUrl = config.r2.publicUrl || config.r2.endpoint;

    console.log('✅ Cloudflare R2 storage initialized');
    console.log(`   Bucket: ${this.bucketName}`);
    console.log(`   Endpoint: ${config.r2.endpoint}`);
  }

  /**
   * Upload video to R2
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
    fileId: string;
    url: string;
    size: number;
  }> {
    try {
      const fileName = path.basename(filePath);
      const fileId = `videos/${Date.now()}-${fileName}`;
      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);

      console.log(`📤 Uploading video to R2: ${fileId}`);

      // Use multipart upload for large files
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: fileId,
          Body: fileStream,
          ContentType: this.getContentType(fileName),
          Metadata: {
            title: metadata.title,
            description: metadata.description,
            creatorWallet: metadata.creatorWallet,
            priceUsdc: metadata.priceUsdc.toString(),
          },
        },
      });

      // Track upload progress
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`   Upload progress: ${percent}%`);
        }
      });

      await upload.done();

      const url = `${this.publicUrl}/${this.bucketName}/${fileId}`;

      console.log(`✅ Video uploaded successfully`);
      console.log(`   URL: ${url}`);
      console.log(`   Size: ${this.formatBytes(stats.size)}`);

      return {
        fileId,
        url,
        size: stats.size,
      };
    } catch (error) {
      console.error('❌ Failed to upload video to R2:', error);
      throw error;
    }
  }

  /**
   * Upload thumbnail to R2
   */
  async uploadThumbnail(
    filePath: string,
    title: string
  ): Promise<{
    fileId: string;
    url: string;
  }> {
    try {
      const fileName = path.basename(filePath);
      const fileId = `thumbnails/${Date.now()}-${fileName}`;
      const fileBuffer = fs.readFileSync(filePath);

      console.log(`📤 Uploading thumbnail to R2: ${fileId}`);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
          Body: fileBuffer,
          ContentType: this.getContentType(fileName),
          Metadata: {
            title,
          },
        })
      );

      // Extract just the filename from fileId (remove "thumbnails/" prefix)
      const thumbnailFileName = fileId.replace('thumbnails/', '');
      // Return API endpoint URL instead of direct R2 URL
      const url = `/api/videos/thumbnails/${thumbnailFileName}`;

      console.log(`✅ Thumbnail uploaded successfully to R2: ${fileId}`);
      console.log(`   Accessible via: ${url}`);

      return {
        fileId,
        url,
      };
    } catch (error) {
      console.error('❌ Failed to upload thumbnail to R2:', error);
      throw error;
    }
  }

  /**
   * Get signed URL for private video access
   * (Can be used for paid content with expiring links)
   */
  async getSignedUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error);
      throw error;
    }
  }

  /**
   * Check if file exists in R2
   */
  async fileExists(fileId: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
        })
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
        })
      );
      // Return full response which includes ContentLength, ContentType, etc.
      return response;
    } catch (error) {
      console.error('❌ Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get video stream from R2
   * Supports range requests for video streaming
   */
  async getVideoStream(
    fileId: string,
    start?: number,
    end?: number
  ): Promise<{
    stream: any;
    contentType: string;
    contentLength?: number;
  }> {
    try {
      const commandParams: any = {
        Bucket: this.bucketName,
        Key: fileId,
      };

      // Add Range header if start/end are provided
      if (start !== undefined && end !== undefined) {
        commandParams.Range = `bytes=${start}-${end}`;
      }

      const command = new GetObjectCommand(commandParams);
      const response = await this.s3Client.send(command);

      return {
        stream: response.Body,
        contentType: response.ContentType || 'video/mp4',
        contentLength: response.ContentLength,
      };
    } catch (error) {
      console.error('❌ Failed to get video stream from R2:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
export const r2StorageService = new R2StorageService();
