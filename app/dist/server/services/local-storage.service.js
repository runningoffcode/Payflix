"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localStorageService = exports.LocalStorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
/**
 * Local Storage Service
 * Fallback storage for development when Arweave is not configured
 * Stores files locally and serves them via the API
 */
class LocalStorageService {
    constructor() {
        Object.defineProperty(this, "storagePath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Use uploads directory instead of config storage path
        this.storagePath = path_1.default.join(process.cwd(), 'uploads');
        this.ensureDirectories();
    }
    ensureDirectories() {
        const dirs = [
            path_1.default.join(this.storagePath, 'videos'),
            path_1.default.join(this.storagePath, 'thumbnails'),
            path_1.default.join(this.storagePath, 'temp'),
        ];
        dirs.forEach((dir) => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
        console.log('✅ Local storage directories initialized');
    }
    /**
     * Upload video to local storage
     */
    async uploadVideo(filePath, metadata) {
        try {
            console.log(`💾 Storing video locally: ${metadata.title}`);
            // Generate unique ID
            const fileId = (0, uuid_1.v4)();
            const ext = path_1.default.extname(filePath);
            const newFileName = `${fileId}${ext}`;
            const destPath = path_1.default.join(this.storagePath, 'videos', newFileName);
            // Copy file to storage
            fs_1.default.copyFileSync(filePath, destPath);
            // Store metadata as JSON
            const metadataPath = path_1.default.join(this.storagePath, 'videos', `${fileId}.json`);
            fs_1.default.writeFileSync(metadataPath, JSON.stringify({
                id: fileId,
                originalName: path_1.default.basename(filePath),
                ...metadata,
                uploadedAt: new Date().toISOString(),
            }, null, 2));
            const url = `/api/storage/videos/${fileId}${ext}`;
            console.log(`✅ Video stored locally with ID: ${fileId}`);
            console.log(`🔗 URL: ${url}`);
            return {
                transactionId: fileId,
                url,
            };
        }
        catch (error) {
            console.error('❌ Failed to store video locally:', error);
            throw error;
        }
    }
    /**
     * Upload thumbnail to local storage
     */
    async uploadThumbnail(filePath, title) {
        try {
            console.log(`💾 Storing thumbnail locally for: ${title}`);
            // Generate unique ID
            const fileId = (0, uuid_1.v4)();
            const ext = path_1.default.extname(filePath);
            const newFileName = `${fileId}${ext}`;
            const destPath = path_1.default.join(this.storagePath, 'thumbnails', newFileName);
            // Copy file to storage
            fs_1.default.copyFileSync(filePath, destPath);
            const url = `/api/storage/thumbnails/${fileId}${ext}`;
            console.log(`✅ Thumbnail stored locally with ID: ${fileId}`);
            return {
                transactionId: fileId,
                url,
            };
        }
        catch (error) {
            console.error('❌ Failed to store thumbnail locally:', error);
            throw error;
        }
    }
    /**
     * Get file path from storage
     */
    getFilePath(type, filename) {
        return path_1.default.join(this.storagePath, type, filename);
    }
    /**
     * Check if file exists
     */
    fileExists(type, filename) {
        const filePath = this.getFilePath(type, filename);
        return fs_1.default.existsSync(filePath);
    }
    /**
     * Delete file from storage
     */
    deleteFile(type, filename) {
        try {
            const filePath = this.getFilePath(type, filename);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Failed to delete file:', error);
            return false;
        }
    }
    /**
     * Get storage statistics
     */
    getStats() {
        const videosDir = path_1.default.join(this.storagePath, 'videos');
        const thumbnailsDir = path_1.default.join(this.storagePath, 'thumbnails');
        let totalVideos = 0;
        let totalThumbnails = 0;
        let totalSize = 0;
        if (fs_1.default.existsSync(videosDir)) {
            const videoFiles = fs_1.default.readdirSync(videosDir).filter((f) => !f.endsWith('.json'));
            totalVideos = videoFiles.length;
            videoFiles.forEach((file) => {
                const stats = fs_1.default.statSync(path_1.default.join(videosDir, file));
                totalSize += stats.size;
            });
        }
        if (fs_1.default.existsSync(thumbnailsDir)) {
            const thumbFiles = fs_1.default.readdirSync(thumbnailsDir);
            totalThumbnails = thumbFiles.length;
            thumbFiles.forEach((file) => {
                const stats = fs_1.default.statSync(path_1.default.join(thumbnailsDir, file));
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
exports.LocalStorageService = LocalStorageService;
exports.localStorageService = new LocalStorageService();
