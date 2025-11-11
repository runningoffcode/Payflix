"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const video_upload_service_1 = require("../services/video-upload.service");
const db_factory_1 = require("../database/db-factory");
const router = (0, express_1.Router)();
/**
 * POST /api/upload/video
 * Upload a new video (creators only)
 * Supports multipart/form-data with video file
 */
router.post('/video', auth_middleware_1.authenticateJWT, auth_middleware_1.requireCreator, video_upload_service_1.videoUpload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { title, description, category, priceUsdc } = req.body;
        if (!title || priceUsdc === undefined || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        console.log(`📤 Processing video upload: ${title} (Category: ${category})`);
        // Validate video file
        const validation = await (0, video_upload_service_1.validateVideoFile)(req.file.path);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        // Process video (extract metadata, generate thumbnail, upload to Arweave)
        const processed = await (0, video_upload_service_1.processVideo)(req.file.path, {
            title,
            description: description || '',
            creatorWallet: req.user.walletAddress,
            priceUsdc: parseFloat(priceUsdc),
        });
        // Create video record in database
        const videoId = `video_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const video = await db_factory_1.db.createVideo({
            id: videoId,
            creatorId: req.user.id,
            creatorWallet: req.user.walletAddress,
            title,
            description: description || '',
            category: category || 'Entertainment',
            priceUsdc: parseFloat(priceUsdc),
            thumbnailUrl: processed.thumbnailUrl,
            videoUrl: processed.videoUrl,
            videoPath: processed.storageId,
            duration: processed.duration,
            views: 0,
            earnings: 0,
        });
        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            video: {
                id: video.id,
                title: video.title,
                storageId: processed.storageId,
                fileSize: processed.fileSize,
                thumbnailUrl: processed.thumbnailUrl,
                videoUrl: processed.videoUrl,
                duration: processed.duration,
            },
        });
    }
    catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({
            error: 'Failed to upload video',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/upload/status/:arweaveId
 * Check Arweave upload status
 */
router.get('/status/:arweaveId', auth_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const { arweaveId } = req.params;
        // In production, check actual Arweave status
        // const status = await arweaveService.getTransactionStatus(arweaveId);
        res.json({
            arweaveId,
            status: 'confirmed',
            url: `https://arweave.net/${arweaveId}`,
        });
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});
exports.default = router;
