"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processVideoWithRetry = processVideoWithRetry;
exports.cleanupFile = cleanupFile;
exports.validateVideoFile = validateVideoFile;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const config_1 = __importDefault(require("../config"));
/**
 * Process video with retry logic and detailed error handling
 */
async function processVideoWithRetry(filePath, metadata, maxRetries = 3) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`  Attempt ${attempt}/${maxRetries}...`);
            // Validate file exists
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            const stats = fs_1.default.statSync(filePath);
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
        }
        catch (error) {
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
function getVideoMetadata(filePath, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`FFmpeg metadata extraction timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
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
async function generateThumbnailWithRetry(videoPath, maxRetries = 2) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await generateThumbnail(videoPath);
        }
        catch (error) {
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
function generateThumbnail(videoPath, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const outputPath = path_1.default.join(config_1.default.storage.videoPath, 'temp', `thumb-${(0, uuid_1.v4)()}.jpg`);
        // Ensure temp directory exists
        const tempDir = path_1.default.dirname(outputPath);
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        const timeout = setTimeout(() => {
            reject(new Error(`Thumbnail generation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        (0, fluent_ffmpeg_1.default)(videoPath)
            .screenshots({
            count: 1,
            timemarks: ['5%'], // Take screenshot at 5% of video duration
            filename: path_1.default.basename(outputPath),
            folder: path_1.default.dirname(outputPath),
            size: '640x360',
        })
            .on('end', () => {
            clearTimeout(timeout);
            // Verify file was created
            if (!fs_1.default.existsSync(outputPath)) {
                reject(new Error(`Thumbnail file not created: ${outputPath}`));
                return;
            }
            // Verify file has content
            const stats = fs_1.default.statSync(outputPath);
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
function cleanupFile(filePath) {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`  🗑️  Cleaned up: ${path_1.default.basename(filePath)}`);
        }
    }
    catch (error) {
        console.error(`  ⚠️  Cleanup failed for ${filePath}:`, error.message);
    }
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
        if (stats.size === 0) {
            return { valid: false, error: 'File is empty' };
        }
        if (stats.size > config_1.default.storage.uploadMaxSize) {
            return {
                valid: false,
                error: `File too large. Max size: ${config_1.default.storage.uploadMaxSize / 1024 / 1024}MB`,
            };
        }
        // Verify it's a valid video file
        const metadata = await getVideoMetadata(filePath);
        if (!metadata.duration || metadata.duration === 0) {
            return { valid: false, error: 'Invalid video file: no duration' };
        }
        return { valid: true };
    }
    catch (error) {
        return { valid: false, error: `Validation failed: ${error.message}` };
    }
}
