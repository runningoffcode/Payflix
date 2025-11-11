"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateDigitalIdCache = invalidateDigitalIdCache;
exports.buildPublicPayload = buildPublicPayload;
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const db_factory_1 = require("../database/db-factory");
const session_payment_service_1 = require("../services/session-payment.service");
const telemetry_service_1 = require("../services/telemetry.service");
const router = (0, express_1.Router)();
const PUBLIC_CACHE_TTL_MS = 5 * 1000;
const publicCache = new Map();
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseClient = supabaseUrl && supabaseServiceKey ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey) : null;
router.get('/:walletAddress', async (req, res) => {
    try {
        const startedAt = Date.now();
        const walletParam = req.params.walletAddress?.trim();
        if (!walletParam) {
            return res.status(400).json({ error: 'Wallet address required' });
        }
        const cacheKey = walletParam.toLowerCase();
        let publicPayload = getCachedPayload(cacheKey);
        if (!publicPayload) {
            publicPayload = await buildPublicPayload(walletParam);
            cachePublicPayload(cacheKey, publicPayload);
        }
        const viewerWalletHeader = req.headers['x-wallet-address'];
        const viewerWallet = typeof viewerWalletHeader === 'string' && viewerWalletHeader.trim().length > 0
            ? viewerWalletHeader.trim()
            : null;
        const videoId = typeof req.query.videoId === 'string' ? req.query.videoId : undefined;
        const viewerContext = viewerWallet
            ? await buildViewerContext(viewerWallet, videoId)
            : null;
        const responsePayload = {
            ...publicPayload,
            viewerContext,
            refreshedAt: new Date().toISOString(),
        };
        (0, telemetry_service_1.recordDigitalIdRequest)({
            walletAddress: walletParam,
            durationMs: Date.now() - startedAt,
            success: true,
        });
        res.json(responsePayload);
    }
    catch (error) {
        (0, telemetry_service_1.recordDigitalIdRequest)({
            walletAddress: req.params.walletAddress || 'unknown',
            durationMs: 0,
            success: false,
        });
        if (error?.statusCode === 404) {
            return res.status(404).json({ error: 'Creator not found' });
        }
        console.error('Error building Digital ID payload:', error);
        res.status(500).json({ error: 'Failed to load digital identity' });
    }
});
function getCachedPayload(walletKey) {
    const entry = publicCache.get(walletKey);
    if (entry && entry.expiresAt > Date.now()) {
        return entry.data;
    }
    if (entry) {
        publicCache.delete(walletKey);
    }
    return null;
}
function cachePublicPayload(walletKey, data) {
    publicCache.set(walletKey, {
        data,
        expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS,
    });
}
function invalidateDigitalIdCache(walletAddress) {
    if (!walletAddress)
        return;
    publicCache.delete(walletAddress.toLowerCase());
}
async function buildPublicPayload(walletAddress) {
    const user = await db_factory_1.db.getUserByWallet(walletAddress);
    if (!user) {
        const err = new Error('Creator not found');
        err.statusCode = 404;
        throw err;
    }
    const [videosRaw, subscriberCount, paymentsRaw] = await Promise.all([
        user.isCreator ? db_factory_1.db.getVideosByCreator(user.id) : [],
        db_factory_1.db.getSubscriberCount(walletAddress),
        db_factory_1.db.getPaymentsByCreatorWallet(walletAddress, 50),
    ]);
    const videos = videosRaw || [];
    const payments = paymentsRaw || [];
    await backfillVerifiedTimestamps(payments);
    const videoLookup = new Map();
    videos.forEach((video) => videoLookup.set(video.id, video));
    const recentPayments = payments.slice(0, 5).map((payment) => {
        const video = videoLookup.get(payment.videoId);
        return {
            id: payment.id,
            amount: payment.amount,
            creatorAmount: payment.creatorAmount,
            platformAmount: payment.platformAmount,
            signature: payment.transactionSignature,
            verifiedAt: payment.verifiedAt ? payment.verifiedAt.toISOString() : null,
            video: video
                ? {
                    id: video.id,
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl || null,
                }
                : null,
        };
    });
    const lifetimeEarnings = payments.reduce((sum, payment) => sum + (payment.creatorAmount || 0), 0);
    const averagePrice = videos.length > 0
        ? videos.reduce((sum, video) => sum + (video.priceUsdc || 0), 0) / videos.length
        : 0;
    const latestPayment = payments.length
        ? payments
            .slice()
            .sort((a, b) => {
            const aTime = (a.verifiedAt ?? a.createdAt).getTime();
            const bTime = (b.verifiedAt ?? b.createdAt).getTime();
            return bTime - aTime;
        })[0]
        : null;
    const stats = {
        totalVideos: videos.length,
        totalSubscribers: subscriberCount,
        lifetimeEarnings,
        averagePrice,
        lastPublishedAt: videos.length
            ? new Date(Math.max(...videos.map((video) => new Date(video.createdAt).getTime()))).toISOString()
            : null,
    };
    const analytics24h = await computeCreatorAnalyticsSnapshot(walletAddress, payments);
    let finalRecentPayments = recentPayments;
    let finalLatestPayment = latestPayment;
    const hasVerifiedPayments = payments.some((payment) => payment.status === 'verified' && payment.verifiedAt);
    if (process.env.DIGITAL_ID_DEV_MOCK === 'true' &&
        (!recentPayments.length || !hasVerifiedPayments)) {
        const sourcePayments = recentPayments.length > 0
            ? recentPayments
            : videos.slice(0, 3).map((video, index) => ({
                id: `mock-${video.id}-${index}`,
                amount: Number((video.priceUsdc ?? 2.5).toFixed(2)),
                creatorAmount: Number(((video.priceUsdc ?? 2.5) * 0.97).toFixed(2)),
                platformAmount: Number(((video.priceUsdc ?? 2.5) * 0.03).toFixed(2)),
                signature: `mock_signature_${video.id}-${index}`,
                verifiedAt: null,
                video: video
                    ? {
                        id: video.id,
                        title: video.title,
                        thumbnailUrl: video.thumbnailUrl || null,
                    }
                    : null,
            }));
        finalRecentPayments = sourcePayments.slice(0, 5).map((payment, index) => ({
            ...payment,
            signature: payment.signature || `mock_signature_${index}`,
            verifiedAt: payment.verifiedAt ||
                new Date(Date.now() - index * 10 * 60 * 1000).toISOString(),
        }));
        if (!finalLatestPayment && finalRecentPayments.length) {
            finalLatestPayment = {
                id: finalRecentPayments[0].id,
                videoId: finalRecentPayments[0].video?.id || 'mock-video',
                creatorWallet: walletAddress,
                userId: 'mock-user',
                userWallet: 'mock-wallet',
                amount: finalRecentPayments[0].amount,
                creatorAmount: finalRecentPayments[0].creatorAmount,
                platformAmount: finalRecentPayments[0].platformAmount,
                transactionSignature: finalRecentPayments[0].signature,
                status: 'verified',
                verifiedAt: new Date(finalRecentPayments[0].verifiedAt),
                createdAt: new Date(finalRecentPayments[0].verifiedAt),
            };
        }
    }
    return {
        walletAddress,
        creator: {
            walletAddress,
            username: user.username || null,
            profilePictureUrl: user.profilePictureUrl || null,
            bio: user.bio || null,
            isCreator: user.isCreator,
            joinedAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        },
        stats,
        analytics24h,
        recentPayments: finalRecentPayments,
        highlights: {
            hasVerifiedPayments: hasVerifiedPayments || process.env.DIGITAL_ID_DEV_MOCK === 'true',
            latestPaymentAt: finalLatestPayment
                ? (finalLatestPayment.verifiedAt ?? finalLatestPayment.createdAt).toISOString()
                : null,
        },
        refreshedAt: new Date().toISOString(),
    };
}
async function computeCreatorAnalyticsSnapshot(walletAddress, fallbackPayments) {
    const base = { revenue: 0, views: 0, subscribers: 0 };
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('creator_analytics')
                .select('revenue, views, subscribers')
                .eq('creator_wallet', walletAddress)
                .gte('date', since.toISOString().split('T')[0]);
            if (!error && data && data.length) {
                return data.reduce((acc, row) => ({
                    revenue: acc.revenue + Number(row.revenue || 0),
                    views: acc.views + Number(row.views || 0),
                    subscribers: acc.subscribers + Number(row.subscribers || 0),
                }), base);
            }
        }
        catch (error) {
            console.warn('Digital ID analytics snapshot fallback:', error);
        }
    }
    // Fallback: approximate revenue using payment history
    const fallback = fallbackPayments.filter((payment) => {
        const timestamp = (payment.verifiedAt ?? payment.createdAt).getTime();
        return timestamp >= since.getTime();
    });
    return {
        revenue: fallback.reduce((sum, payment) => sum + (payment.amount || 0), 0),
        views: fallback.length, // Approximate 1 paid view per payment
        subscribers: 0,
    };
}
async function buildViewerContext(viewerWallet, videoId) {
    const session = await session_payment_service_1.sessionPaymentService.getSessionBalance(viewerWallet);
    let streaming = null;
    if (videoId) {
        const activeSession = await db_factory_1.db.getActiveStreamingSession(viewerWallet, videoId);
        streaming = activeSession
            ? {
                isActive: true,
                expiresAt: activeSession.expires_at
                    ? new Date(activeSession.expires_at).toISOString()
                    : null,
            }
            : { isActive: false };
    }
    return {
        session,
        streaming,
    };
}
async function backfillVerifiedTimestamps(payments) {
    const missing = payments.filter((payment) => payment.status === 'verified' && !payment.verifiedAt);
    if (!missing.length) {
        return;
    }
    await Promise.all(missing.map((payment) => db_factory_1.db.updatePayment(payment.id, {
        verifiedAt: payment.createdAt,
    })));
    missing.forEach((payment) => {
        payment.verifiedAt = payment.createdAt;
    });
}
exports.default = router;
