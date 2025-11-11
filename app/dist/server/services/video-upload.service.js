"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoUpload = void 0;
exports.processVideo = processVideo;
exports.validateVideoFile = validateVideoFile;
exports.cleanupTempFiles = cleanupTempFiles;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const config_1 = __importDefault(require("../config"));
const r2_storage_service_1 = require("./r2-storage.service");
/**
 * Video Upload Service
 * Handles video file uploads, processing, and storage
 */
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(config_1.default.storage.videoPath, 'temp');
        // Create directory if it doesn't exist
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
// File filter
const fileFilter = (req, file, cb) => {
    // Accept video files only
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only video files are allowed.'));
    }
};
// Multer upload instance
exports.videoUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.default.storage.uploadMaxSize, // 500MB default
    },
});
/**
 * Process uploaded video
 * - Extract metadata (duration, resolution, etc.)
 * - Generate thumbnail
 * - Upload to R2 (Cloudflare R2)
 */
async function processVideo(filePath, metadata) {
    try {
        console.log('📹 Processing video:', metadata.title);
        // Extract video metadata
        const videoInfo = await getVideoMetadata(filePath);
        // Generate thumbnail
        const thumbnailPath = await generateThumbnail(filePath);
        // Upload thumbnail to R2
        const thumbnail = await r2_storage_service_1.r2StorageService.uploadThumbnail(thumbnailPath, metadata.title);
        // Upload video to R2
        const video = await r2_storage_service_1.r2StorageService.uploadVideo(filePath, metadata);
        // Clean up temporary files
        fs_1.default.unlinkSync(filePath);
        fs_1.default.unlinkSync(thumbnailPath);
        console.log('✅ Video processed successfully');
        return {
            duration: Math.floor(videoInfo.duration),
            thumbnailUrl: thumbnail.url,
            videoUrl: video.url,
            storageId: video.fileId,
            fileSize: video.size,
        };
    }
    catch (error) {
        console.error('❌ Video processing failed:', error);
        // Clean up on error
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        throw error;
    }
}
/**
 * Get video metadata using ffmpeg
 */
function getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
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
function generateThumbnail(videoPath) {
    return new Promise((resolve, reject) => {
        const outputPath = path_1.default.join(config_1.default.storage.videoPath, 'temp', `thumb-${(0, uuid_1.v4)()}.jpg`);
        (0, fluent_ffmpeg_1.default)(videoPath)
            .screenshots({
            count: 1,
            timemarks: ['5%'], // Take screenshot at 5% of video duration
            filename: path_1.default.basename(outputPath),
            folder: path_1.default.dirname(outputPath),
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
async function validateVideoFile(filePath) {
    try {
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            return { valid: false, error: 'File not found' };
        }
        // Check file size
        const stats = fs_1.default.statSync(filePath);
        if (stats.size > config_1.default.storage.uploadMaxSize) {
            return {
                valid: false,
                error: `File too large. Max size: ${config_1.default.storage.uploadMaxSize / 1024 / 1024}MB`,
            };
        }
        // Verify it's a valid video file
        const metadata = await getVideoMetadata(filePath);
        if (!metadata.duration || metadata.duration === 0) {
            return { valid: false, error: 'Invalid video file' };
        }
        return { valid: true };
    }
    catch (error) {
        return { valid: false, error: 'Failed to validate video file' };
    }
}
/**
 * Clean up old temporary files
 */
function cleanupTempFiles(olderThanHours = 24) {
    const tempDir = path_1.default.join(config_1.default.storage.videoPath, 'temp');
    if (!fs_1.default.existsSync(tempDir)) {
        return;
    }
    const now = Date.now();
    const maxAge = olderThanHours * 60 * 60 * 1000;
    fs_1.default.readdirSync(tempDir).forEach((file) => {
        const filePath = path_1.default.join(tempDir, file);
        const stats = fs_1.default.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
            fs_1.default.unlinkSync(filePath);
            console.log(`🗑️  Cleaned up old temp file: ${file}`);
        }
    });
}
