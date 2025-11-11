"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeamlessPaymentError = void 0;
exports.processSeamlessVideoUnlock = processSeamlessVideoUnlock;
const uuid_1 = require("uuid");
const db_factory_1 = require("../database/db-factory");
const session_payment_service_1 = require("./session-payment.service");
const analytics_upsert_service_1 = require("./analytics-upsert.service");
const digital_id_routes_1 = require("../routes/digital-id.routes");
class SeamlessPaymentError extends Error {
    constructor(status, payload) {
        super(payload?.message || 'Payment processing error');
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payload", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.status = status;
        this.payload = payload;
    }
}
exports.SeamlessPaymentError = SeamlessPaymentError;
async function processSeamlessVideoUnlock({ videoId, userWallet, }) {
    if (!videoId || !userWallet) {
        throw new SeamlessPaymentError(400, {
            error: 'Missing required fields',
            message: 'videoId and userWallet are required',
        });
    }
    const video = await db_factory_1.db.getVideoById(videoId);
    if (!video) {
        throw new SeamlessPaymentError(404, {
            error: 'Video not found',
        });
    }
    if (!video.creatorWallet) {
        throw new SeamlessPaymentError(400, {
            error: 'Invalid video configuration',
            message: 'Video does not have a creator wallet configured',
        });
    }
    let user = await db_factory_1.db.getUserByWallet(userWallet);
    if (!user) {
        user = await db_factory_1.db.createUser({
            walletAddress: userWallet,
            username: `User ${userWallet.substring(0, 8)}`,
            email: null,
            profilePicture: null,
        });
    }
    const existingPayment = await db_factory_1.db.getUserPaymentForVideo(user.id, videoId);
    if (existingPayment && existingPayment.status === 'verified') {
        return {
            success: true,
            alreadyPaid: true,
            signature: existingPayment.transactionSignature,
            message: 'You already have access to this video',
        };
    }
    const hasSession = await session_payment_service_1.sessionPaymentService.hasActiveSession(userWallet);
    if (!hasSession) {
        throw new SeamlessPaymentError(402, {
            error: 'No Active Session',
            message: 'Please deposit USDC to start watching videos',
            requiresSession: true,
        });
    }
    const sessionBalance = await session_payment_service_1.sessionPaymentService.getSessionBalance(userWallet);
    if (sessionBalance.remainingAmount && sessionBalance.remainingAmount < video.priceUsdc) {
        throw new SeamlessPaymentError(402, {
            error: 'Insufficient Balance',
            message: `Your balance: $${sessionBalance.remainingAmount} USDC. Required: $${video.priceUsdc} USDC. Please deposit more to continue watching.`,
            requiresTopUp: true,
            remaining: sessionBalance.remainingAmount,
            required: video.priceUsdc,
        });
    }
    const result = await session_payment_service_1.sessionPaymentService.processSessionPayment({
        userWallet,
        videoId,
        amount: video.priceUsdc,
        creatorWallet: video.creatorWallet,
    });
    if (!result.success) {
        throw new SeamlessPaymentError(500, {
            error: 'Payment Failed',
            message: result.error || 'Failed to process payment',
        });
    }
    const platformFeePercent = 2.85;
    const platformAmount = video.priceUsdc * (platformFeePercent / 100);
    const creatorAmount = video.priceUsdc - platformAmount;
    const paymentId = (0, uuid_1.v4)();
    const paymentRecord = await db_factory_1.db.createPayment({
        id: paymentId,
        videoId: video.id,
        userId: user.id,
        userWallet,
        creatorWallet: video.creatorWallet,
        amount: video.priceUsdc,
        creatorAmount,
        platformAmount,
        transactionSignature: result.signature,
        status: 'verified',
    });
    await db_factory_1.db.updatePayment(paymentRecord.id, {
        status: 'verified',
        verifiedAt: new Date(),
    });
    await db_factory_1.db.grantVideoAccess({
        userId: user.id,
        videoId: video.id,
        paymentId,
        grantedAt: new Date(),
        expiresAt: new Date('2099-12-31'),
    });
    await db_factory_1.db.incrementVideoViews(videoId);
    const analyticsDelta = {
        views: 1,
        revenue: video.priceUsdc,
    };
    await Promise.all([
        (0, analytics_upsert_service_1.recordVideoAnalyticsDelta)(video.id, analyticsDelta),
        (0, analytics_upsert_service_1.recordCreatorAnalyticsDelta)(video.creatorWallet, analyticsDelta),
    ]);
    const nextEarnings = (video.earnings || 0) + creatorAmount;
    await db_factory_1.db.updateVideo(video.id, { earnings: nextEarnings });
    (0, digital_id_routes_1.invalidateDigitalIdCache)(video.creatorWallet);
    return {
        success: true,
        signature: result.signature,
        message: 'Payment successful! Enjoy your video.',
        payment: {
            amount: video.priceUsdc,
            signature: result.signature,
            videoId,
        },
    };
}
