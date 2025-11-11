"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const auth_middleware_1 = require("../middleware/auth.middleware");
const db_factory_1 = require("../database/db-factory");
const video_processor_v2_service_1 = require("../services/video-processor-v2.service");
const r2_storage_service_1 = require("../services/r2-storage.service");
const config_1 = __importDefault(require("../config"));
// Configure multer for video + thumbnail uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(config_1.default.storage.videoPath, 'temp');
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
const multiFileUpload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: config_1.default.storage.uploadMaxSize,
    },
});
const router = (0, express_1.Router)();
/**
 * POST /api/upload/video
 * BULLETPROOF video upload with comprehensive error handling
 */
router.post('/video', auth_middleware_1.authenticateJWT, auth_middleware_1.requireCreator, multiFileUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
    const startTime = Date.now();
    let tempFilePath = null;
    let thumbnailPath = null;
    let customThumbnailPath = null;
    let customThumbnailProvided = false;
    try {
        console.log('\n🎬 ========== VIDEO UPLOAD STARTED ==========');
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log(`👤 User ID: ${req.user?.id}`);
        console.log(`💼 User Wallet (from JWT): ${req.user?.walletAddress}`);
        // ========== STEP 1: VALIDATE REQUEST ==========
        console.log('\n✓ Step 1: Validating request...');
        const files = req.files;
        if (!files || !files.video || files.video.length === 0) {
            console.error('❌ No video file uploaded');
            return res.status(400).json({
                error: 'No video file uploaded',
                step: 'validation',
                details: 'The "video" field is required in multipart/form-data'
            });
        }
        const videoFile = files.video[0];
        tempFilePath = videoFile.path;
        console.log(`✓ Video file received: ${videoFile.originalname}`);
        console.log(`  - Path: ${tempFilePath}`);
        console.log(`  - Size: ${(videoFile.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  - MIME type: ${videoFile.mimetype}`);
        // Check if custom thumbnail was provided
        if (files.thumbnail && files.thumbnail.length > 0) {
            customThumbnailPath = files.thumbnail[0].path;
            customThumbnailProvided = true;
            console.log(`✓ Custom thumbnail provided: ${files.thumbnail[0].originalname}`);
            console.log(`  - Path: ${customThumbnailPath}`);
            console.log(`  - Size: ${(files.thumbnail[0].size / 1024).toFixed(2)} KB`);
        }
        else {
            console.log(`ℹ️  No custom thumbnail provided - will auto-generate from video`);
        }
        if (!req.user) {
            console.error('❌ No authenticated user');
            return res.status(401).json({
                error: 'Unauthorized',
                step: 'auth',
                details: 'User not authenticated. JWT token may be invalid or expired.'
            });
        }
        const { title, description, category, priceUsdc, commentsEnabled, commentPrice } = req.body;
        if (!title || priceUsdc === undefined) {
            console.error('❌ Missing required fields:', { title: !!title, priceUsdc: !!priceUsdc });
            return res.status(400).json({
                error: 'Missing required fields',
                step: 'validation',
                details: 'Both "title" and "priceUsdc" are required',
                received: { title: !!title, priceUsdc: !!priceUsdc }
            });
        }
        console.log(`✓ Title: "${title}"`);
        console.log(`✓ Category: ${category || 'Entertainment'}`);
        console.log(`✓ Price: $${priceUsdc} USDC`);
        console.log(`✓ Comments: ${commentsEnabled === 'true' ? 'Enabled' : 'Disabled'}`);
        if (commentsEnabled === 'true' && commentPrice) {
            console.log(`✓ Comment Price: $${commentPrice} USDC`);
        }
        console.log(`✓ Description: ${description ? 'provided' : 'none'}`);
        // ========== STEP 2: VERIFY USER EXISTS (OR CREATE) ==========
        console.log('\n✓ Step 2: Verifying user in database...');
        // IMPORTANT: Verify that the JWT wallet matches the connected wallet
        // This prevents issues where an old JWT from a previous wallet session is being used
        console.log('🔐 Wallet Verification:');
        console.log(`   JWT Wallet: ${req.user.walletAddress}`);
        console.log(`   JWT User ID: ${req.user.id}`);
        let userRecord;
        try {
            // First try to find by ID
            userRecord = await db_factory_1.db.getUserById(req.user.id);
            if (!userRecord) {
                console.log(`⚠️  User not found by ID: ${req.user.id}`);
                console.log(`🔍 Checking by wallet address: ${req.user.walletAddress}...`);
                // Try to find by wallet address (in case they have an old UUID-format user)
                userRecord = await db_factory_1.db.getUserByWallet(req.user.walletAddress);
                if (userRecord) {
                    console.log(`✅ Found existing user by wallet address`);
                    console.log(`  - User ID: ${userRecord.id} (${userRecord.id.includes('-') ? 'OLD UUID format' : 'new TEXT format'})`);
                    console.log(`  - Wallet Address: ${userRecord.walletAddress}`);
                    console.log(`  - Username: ${userRecord.username || 'N/A'}`);
                    console.log(`  - Is Creator: ${userRecord.isCreator}`);
                    // If user exists but isn't a creator, upgrade them
                    if (!userRecord.isCreator) {
                        console.log(`📝 Upgrading user to creator status...`);
                        await db_factory_1.db.updateUser(userRecord.id, { isCreator: true });
                        userRecord.isCreator = true;
                        console.log(`✓ User upgraded to creator`);
                    }
                }
                else {
                    console.log(`📝 No user found - creating new user...`);
                    // Auto-create user if they don't exist
                    // This allows any authenticated user to upload without manual registration
                    userRecord = await db_factory_1.db.createUser({
                        walletAddress: req.user.walletAddress,
                        username: req.user.username || null,
                        email: null,
                        isCreator: true, // Anyone uploading becomes a creator
                    });
                    console.log(`✅ User auto-created successfully`);
                    console.log(`  - User ID: ${userRecord.id}`);
                    console.log(`  - Wallet Address: ${userRecord.walletAddress}`);
                    console.log(`  - Username: ${userRecord.username || 'N/A'}`);
                    console.log(`  - Is Creator: ${userRecord.isCreator}`);
                }
            }
            else {
                console.log(`✓ User verified in database by ID`);
                console.log(`  - User ID: ${userRecord.id}`);
                console.log(`  - Wallet Address: ${userRecord.walletAddress}`);
                console.log(`  - Username: ${userRecord.username || 'N/A'}`);
                console.log(`  - Is Creator: ${userRecord.isCreator}`);
                // If user exists but isn't a creator, upgrade them
                if (!userRecord.isCreator) {
                    console.log(`📝 Upgrading user to creator status...`);
                    await db_factory_1.db.updateUser(userRecord.id, { isCreator: true });
                    userRecord.isCreator = true;
                    console.log(`✓ User upgraded to creator`);
                }
            }
        }
        catch (dbError) {
            console.error('❌ Database error while verifying/creating user:', dbError);
            return res.status(500).json({
                error: 'Database error',
                step: 'database_validation',
                details: dbError.message,
                code: dbError.code
            });
        }
        // ========== STEP 3: PROCESS VIDEO (FFmpeg) ==========
        console.log('\n✓ Step 3: Processing video with FFmpeg...');
        let processed;
        try {
            processed = await (0, video_processor_v2_service_1.processVideoWithRetry)(tempFilePath, {
                title,
                description: description || '',
                creatorWallet: req.user.walletAddress,
                priceUsdc: parseFloat(priceUsdc),
            });
            // Use custom thumbnail if provided, otherwise use auto-generated
            if (customThumbnailProvided && customThumbnailPath) {
                thumbnailPath = customThumbnailPath;
                console.log(`✓ Using custom thumbnail: ${thumbnailPath}`);
                // Clean up auto-generated thumbnail since we're using custom
                (0, video_processor_v2_service_1.cleanupFile)(processed.thumbnailPath);
            }
            else {
                thumbnailPath = processed.thumbnailPath;
                console.log(`✓ Using auto-generated thumbnail: ${thumbnailPath}`);
            }
            console.log(`✓ Video processed successfully`);
            console.log(`  - Duration: ${processed.duration}s`);
            console.log(`  - Resolution: ${processed.width}x${processed.height}`);
            console.log(`  - Format: ${processed.format}`);
        }
        catch (ffmpegError) {
            console.error('❌ FFmpeg processing failed:', ffmpegError);
            (0, video_processor_v2_service_1.cleanupFile)(tempFilePath);
            if (customThumbnailPath)
                (0, video_processor_v2_service_1.cleanupFile)(customThumbnailPath);
            return res.status(500).json({
                error: 'Video processing failed',
                step: 'ffmpeg_processing',
                details: ffmpegError.message,
                suggestion: 'Ensure the video file is valid and not corrupted'
            });
        }
        // ========== STEP 4: UPLOAD TO CLOUDFLARE R2 STORAGE ==========
        console.log('\n✓ Step 4: Uploading to Cloudflare R2 storage...');
        let videoUploadResult;
        let thumbnailUploadResult;
        try {
            // Upload thumbnail first (smaller, faster)
            console.log('  Uploading thumbnail to R2...');
            thumbnailUploadResult = await r2_storage_service_1.r2StorageService.uploadThumbnail(thumbnailPath, title);
            console.log(`  ✓ Thumbnail uploaded to R2: ${thumbnailUploadResult.url}`);
            // Upload video
            console.log('  Uploading video to R2...');
            videoUploadResult = await r2_storage_service_1.r2StorageService.uploadVideo(tempFilePath, {
                title,
                description: description || '',
                creatorWallet: req.user.walletAddress,
                priceUsdc: parseFloat(priceUsdc),
            });
            console.log(`  ✓ Video uploaded to R2: ${videoUploadResult.url}`);
        }
        catch (storageError) {
            console.error('❌ Storage upload failed:', storageError);
            (0, video_processor_v2_service_1.cleanupFile)(tempFilePath);
            if (thumbnailPath)
                (0, video_processor_v2_service_1.cleanupFile)(thumbnailPath);
            return res.status(500).json({
                error: 'Storage upload failed',
                step: 'storage_upload',
                details: storageError.message,
                code: storageError.code || storageError.name,
                suggestion: 'Check storage configuration'
            });
        }
        // ========== STEP 5: CREATE DATABASE RECORD ==========
        console.log('\n✓ Step 5: Creating database record...');
        const videoId = `video_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        console.log(`  Generated video ID: ${videoId}`);
        // Get file size before cleanup
        const fileStats = fs_1.default.statSync(tempFilePath);
        const fileSize = fileStats.size;
        console.log(`  ✓ File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        let video;
        try {
            video = await db_factory_1.db.createVideo({
                id: videoId,
                creatorId: userRecord.id, // Use the actual database user ID, not JWT ID
                creatorWallet: userRecord.walletAddress, // Use wallet from database record
                title,
                description: description || '',
                category: category || 'Entertainment',
                priceUsdc: parseFloat(priceUsdc),
                thumbnailUrl: thumbnailUploadResult.url,
                videoUrl: `/api/videos/${videoId}/stream`, // Use streaming endpoint, not direct R2 URL
                videoPath: videoUploadResult.fileId, // R2 file ID for internal use
                duration: Math.floor(processed.duration),
                views: 0,
                earnings: 0,
                commentsEnabled: commentsEnabled === 'true',
                commentPrice: commentPrice ? parseFloat(commentPrice) : 0,
            });
            console.log(`✓ Database record created successfully`);
            console.log(`  - Video ID: ${video.id}`);
            console.log(`  - Creator ID: ${video.creatorId}`);
            console.log(`  - Creator Wallet: ${video.creatorWallet}`);
            console.log(`  - Creator Username: ${userRecord.username || 'N/A'}`);
        }
        catch (dbError) {
            console.error('❌ Database insert failed:', dbError);
            console.error('  Error code:', dbError.code);
            console.error('  Error message:', dbError.message);
            console.error('  Error detail:', dbError.detail);
            // Note: Video is already in R2, but DB failed
            // In production, you might want to delete from R2 or have a cleanup job
            return res.status(500).json({
                error: 'Database error',
                step: 'database_insert',
                details: dbError.message,
                code: dbError.code,
                constraint: dbError.constraint,
                suggestion: dbError.code === '23505' ? 'Video ID already exists (very rare, try again)' :
                    dbError.code === '23503' ? 'Foreign key constraint failed. Your user ID may be invalid. Please reconnect your wallet.' :
                        dbError.code === '23502' ? 'Required field is NULL. Contact support.' :
                            'Database error. Check server logs.'
            });
        }
        // ========== STEP 6: CLEANUP ==========
        console.log('\n✓ Step 6: Cleaning up temporary files...');
        (0, video_processor_v2_service_1.cleanupFile)(tempFilePath);
        if (thumbnailPath)
            (0, video_processor_v2_service_1.cleanupFile)(thumbnailPath);
        console.log('✓ Cleanup complete');
        // ========== SUCCESS ==========
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ ========== UPLOAD SUCCESSFUL (${totalTime}s) ==========\n`);
        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully to Cloudflare R2',
            video: {
                id: video.id,
                title: video.title,
                storageId: videoUploadResult.fileId,
                fileSize: videoUploadResult.size,
                thumbnailUrl: thumbnailUploadResult.url,
                videoUrl: video.videoUrl, // Use the streaming endpoint URL
                duration: Math.floor(processed.duration),
            },
            uploadTime: `${totalTime}s`
        });
    }
    catch (error) {
        console.error('\n❌ ========== UNEXPECTED ERROR ==========');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        // Cleanup
        if (tempFilePath)
            (0, video_processor_v2_service_1.cleanupFile)(tempFilePath);
        if (thumbnailPath)
            (0, video_processor_v2_service_1.cleanupFile)(thumbnailPath);
        res.status(500).json({
            error: 'Internal server error',
            step: 'unknown',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
exports.default = router;
