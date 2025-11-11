"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.r2StorageService = exports.R2StorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
/**
 * Cloudflare R2 Storage Service
 * S3-compatible storage with zero egress fees
 */
class R2StorageService {
    constructor() {
        Object.defineProperty(this, "s3Client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bucketName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "publicUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Initialize R2 client (S3-compatible)
        this.s3Client = new client_s3_1.S3Client({
            region: 'auto', // R2 uses 'auto' region
            endpoint: config_1.config.r2.endpoint,
            credentials: {
                accessKeyId: config_1.config.r2.accessKeyId,
                secretAccessKey: config_1.config.r2.secretAccessKey,
            },
        });
        this.bucketName = config_1.config.r2.bucketName;
        this.publicUrl = config_1.config.r2.publicUrl || config_1.config.r2.endpoint;
        console.log('✅ Cloudflare R2 storage initialized');
        console.log(`   Bucket: ${this.bucketName}`);
        console.log(`   Endpoint: ${config_1.config.r2.endpoint}`);
    }
    /**
     * Upload video to R2
     */
    async uploadVideo(filePath, metadata) {
        try {
            const fileName = path_1.default.basename(filePath);
            const fileId = `videos/${Date.now()}-${fileName}`;
            const fileStream = fs_1.default.createReadStream(filePath);
            const stats = fs_1.default.statSync(filePath);
            console.log(`📤 Uploading video to R2: ${fileId}`);
            // Use multipart upload for large files
            const upload = new lib_storage_1.Upload({
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
        }
        catch (error) {
            console.error('❌ Failed to upload video to R2:', error);
            throw error;
        }
    }
    /**
     * Upload thumbnail to R2
     */
    async uploadThumbnail(filePath, title) {
        try {
            const fileName = path_1.default.basename(filePath);
            const fileId = `thumbnails/${Date.now()}-${fileName}`;
            const fileBuffer = fs_1.default.readFileSync(filePath);
            console.log(`📤 Uploading thumbnail to R2: ${fileId}`);
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileId,
                Body: fileBuffer,
                ContentType: this.getContentType(fileName),
                Metadata: {
                    title,
                },
            }));
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
        }
        catch (error) {
            console.error('❌ Failed to upload thumbnail to R2:', error);
            throw error;
        }
    }
    /**
     * Get signed URL for private video access
     * (Can be used for paid content with expiring links)
     */
    async getSignedUrl(fileId, expiresIn = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: fileId,
            });
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn });
            return signedUrl;
        }
        catch (error) {
            console.error('❌ Failed to generate signed URL:', error);
            throw error;
        }
    }
    /**
     * Check if file exists in R2
     */
    async fileExists(fileId) {
        try {
            await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucketName,
                Key: fileId,
            }));
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get file metadata
     */
    async getFileMetadata(fileId) {
        try {
            const response = await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucketName,
                Key: fileId,
            }));
            // Return full response which includes ContentLength, ContentType, etc.
            return response;
        }
        catch (error) {
            console.error('❌ Failed to get file metadata:', error);
            throw error;
        }
    }
    /**
     * Get content type based on file extension
     */
    getContentType(fileName) {
        const ext = path_1.default.extname(fileName).toLowerCase();
        const contentTypes = {
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
    async getVideoStream(fileId, start, end) {
        try {
            const commandParams = {
                Bucket: this.bucketName,
                Key: fileId,
            };
            // Add Range header if start/end are provided
            if (start !== undefined && end !== undefined) {
                commandParams.Range = `bytes=${start}-${end}`;
            }
            const command = new client_s3_1.GetObjectCommand(commandParams);
            const response = await this.s3Client.send(command);
            return {
                stream: response.Body,
                contentType: response.ContentType || 'video/mp4',
                contentLength: response.ContentLength,
            };
        }
        catch (error) {
            console.error('❌ Failed to get video stream from R2:', error);
            throw error;
        }
    }
    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}
exports.R2StorageService = R2StorageService;
// Export singleton instance
exports.r2StorageService = new R2StorageService();
