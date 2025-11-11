"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const local_storage_service_1 = require("../services/local-storage.service");
const router = (0, express_1.Router)();
/**
 * GET /api/storage/videos/:filename
 * Serve video files from local storage
 */
router.get('/videos/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = local_storage_service_1.localStorageService.getFilePath('videos', filename);
        if (!local_storage_service_1.localStorageService.fileExists('videos', filename)) {
            return res.status(404).json({ error: 'Video not found' });
        }
        // Get file stats
        const stats = fs_1.default.statSync(filePath);
        const fileSize = stats.size;
        const range = req.headers.range;
        // Support for video streaming with range requests
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;
            const file = fs_1.default.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': getContentType(filePath),
            };
            res.writeHead(206, head);
            file.pipe(res);
        }
        else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': getContentType(filePath),
            };
            res.writeHead(200, head);
            fs_1.default.createReadStream(filePath).pipe(res);
        }
    }
    catch (error) {
        console.error('Error serving video:', error);
        res.status(500).json({ error: 'Failed to serve video' });
    }
});
/**
 * GET /api/storage/thumbnails/:filename
 * Serve thumbnail images from local storage
 */
router.get('/thumbnails/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = local_storage_service_1.localStorageService.getFilePath('thumbnails', filename);
        if (!local_storage_service_1.localStorageService.fileExists('thumbnails', filename)) {
            return res.status(404).json({ error: 'Thumbnail not found' });
        }
        res.setHeader('Content-Type', getContentType(filePath));
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.sendFile(filePath);
    }
    catch (error) {
        console.error('Error serving thumbnail:', error);
        res.status(500).json({ error: 'Failed to serve thumbnail' });
    }
});
/**
 * GET /api/storage/stats
 * Get storage statistics
 */
router.get('/stats', (req, res) => {
    try {
        const stats = local_storage_service_1.localStorageService.getStats();
        res.json({
            ...stats,
            totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
        });
    }
    catch (error) {
        console.error('Error getting storage stats:', error);
        res.status(500).json({ error: 'Failed to get storage stats' });
    }
});
/**
 * Get content type from file extension
 */
function getContentType(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const contentTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
    };
    return contentTypes[ext] || 'application/octet-stream';
}
exports.default = router;
