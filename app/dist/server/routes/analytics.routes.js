"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_factory_1 = require("../database/db-factory");
const ai_agent_service_1 = require("../services/ai-agent.service");
const supabase_js_1 = require("@supabase/supabase-js");
const router = (0, express_1.Router)();
// Initialize Supabase client for comment queries
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
/**
 * GET /api/analytics/platform
 * Get platform-wide analytics
 */
router.get('/platform', async (req, res) => {
    try {
        const videos = await db_factory_1.db.getAllVideos();
        const allPayments = [];
        for (const video of videos) {
            const payments = await db_factory_1.db.getPaymentsByVideo(video.id);
            allPayments.push(...payments);
        }
        const metrics = await ai_agent_service_1.aiAgentService.calculatePlatformMetrics(allPayments);
        res.json({
            metrics: {
                totalVideos: videos.length,
                totalViews: videos.reduce((sum, v) => sum + v.views, 0),
                totalRevenue: metrics.totalRevenue,
                platformRevenue: metrics.platformRevenue,
                creatorRevenue: metrics.creatorRevenue,
                totalTransactions: metrics.totalTransactions,
                averageVideoPrice: videos.reduce((sum, v) => sum + v.priceUsdc, 0) / videos.length,
            },
            recentVideos: videos.slice(0, 5),
        });
    }
    catch (error) {
        console.error('Error fetching platform analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
/**
 * GET /api/analytics/creator/:walletAddress
 * Get creator analytics
 */
router.get('/creator/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const user = await db_factory_1.db.getUserByWallet(walletAddress);
        if (!user || !user.isCreator) {
            return res.status(404).json({ error: 'Creator not found' });
        }
        const videos = await db_factory_1.db.getVideosByCreator(user.id);
        const allPayments = [];
        const videoEarningsMap = new Map();
        const videoCommentCountMap = new Map();
        // Calculate earnings for each video from verified payments
        for (const video of videos) {
            const payments = await db_factory_1.db.getPaymentsByVideo(video.id);
            const verifiedPayments = payments.filter((p) => p.status === 'verified' || p.status === 'confirmed');
            allPayments.push(...verifiedPayments);
            const earnings = verifiedPayments.reduce((sum, p) => sum + (p.creatorAmount || p.amount || 0), 0);
            videoEarningsMap.set(video.id, earnings);
            // Get comment count for this video
            try {
                const { count } = await supabase
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('video_id', video.id);
                videoCommentCountMap.set(video.id, count || 0);
            }
            catch (error) {
                console.error(`Error fetching comments for video ${video.id}:`, error);
                videoCommentCountMap.set(video.id, 0);
            }
        }
        const totalEarnings = allPayments.reduce((sum, p) => sum + (p.creatorAmount || p.amount || 0), 0);
        const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
        const totalComments = Array.from(videoCommentCountMap.values()).reduce((sum, count) => sum + count, 0);
        res.json({
            creator: {
                walletAddress: user.walletAddress,
                username: user.username,
            },
            stats: {
                totalVideos: videos.length,
                totalEarnings,
                totalViews,
                totalSales: allPayments.length,
                totalComments,
                averageVideoPrice: videos.reduce((sum, v) => sum + v.priceUsdc, 0) / (videos.length || 1),
            },
            videos: videos.map((v) => ({
                id: v.id,
                title: v.title,
                priceUsdc: v.priceUsdc,
                views: v.views,
                earnings: videoEarningsMap.get(v.id) || 0,
                commentCount: videoCommentCountMap.get(v.id) || 0,
                createdAt: v.createdAt,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching creator analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
const TRENDING_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let trendingCache = {
    payload: null,
    expiresAt: 0,
};
router.get('/trending', async (_req, res) => {
    try {
        if (trendingCache.payload && trendingCache.expiresAt > Date.now()) {
            return res.json(trendingCache.payload);
        }
        let creatorWindow = 24;
        let videoWindow = 24;
        let creatorSource = 'analytics';
        let videoSource = 'analytics';
        let creatorHighlights = await computeTrendingCreators(creatorWindow);
        if (!creatorHighlights.length) {
            creatorWindow = 24 * 7;
            creatorHighlights = await computeTrendingCreators(creatorWindow);
        }
        if (!creatorHighlights.length) {
            creatorHighlights = await fallbackTrendingCreatorsFromVideos();
            creatorSource = 'fallback';
            creatorWindow = 0;
        }
        let videoHighlights = await computeTrendingVideos(videoWindow);
        if (!videoHighlights.length) {
            videoWindow = 24 * 7;
            videoHighlights = await computeTrendingVideos(videoWindow);
        }
        if (!videoHighlights.length) {
            videoHighlights = await fallbackTrendingVideosFromVideos();
            videoSource = 'fallback';
            videoWindow = 0;
        }
        const payload = {
            refreshedAt: new Date().toISOString(),
            creators: creatorHighlights,
            videos: videoHighlights,
            windows: {
                creatorsHours: creatorWindow,
                videosHours: videoWindow,
            },
            sources: {
                creators: creatorSource,
                videos: videoSource,
            },
        };
        trendingCache = {
            payload,
            expiresAt: Date.now() + TRENDING_CACHE_TTL_MS,
        };
        res.json(payload);
    }
    catch (error) {
        console.error('Error fetching trending analytics:', error);
        res.status(500).json({ error: 'Failed to fetch trending analytics' });
    }
});
function applyWeightedScore(items, weights) {
    const metrics = Object.keys(weights);
    metrics.forEach((metric) => {
        const values = items.map((item) => item[metric] || 0);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min;
        items.forEach((item) => {
            let normalized = 0;
            if (range === 0) {
                normalized = max > 0 ? 1 : 0;
            }
            else {
                normalized = (item[metric] - min) / range;
            }
            item[`normalized_${metric}`] = normalized;
        });
    });
    items.forEach((item) => {
        let score = 0;
        for (const [metric, weight] of Object.entries(weights)) {
            score += (item[`normalized_${metric}`] || 0) * weight;
        }
        item.score = Number(score.toFixed(4));
    });
}
function toNumber(value) {
    const num = typeof value === 'number' ? value : parseFloat(value || '0');
    return Number.isFinite(num) ? num : 0;
}
function getDateBoundary(hoursBack) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return since.toISOString().split('T')[0];
}
async function computeTrendingCreators(hoursBack) {
    const sinceDate = getDateBoundary(hoursBack);
    const { data, error } = await supabase
        .from('creator_analytics')
        .select('creator_wallet, revenue, views, subscribers, date')
        .gte('date', sinceDate);
    if (error) {
        console.error('Supabase error fetching creator analytics:', error);
        return [];
    }
    const aggregates = new Map();
    for (const row of data || []) {
        if (!row.creator_wallet)
            continue;
        if (!aggregates.has(row.creator_wallet)) {
            aggregates.set(row.creator_wallet, {
                creatorWallet: row.creator_wallet,
                revenue24h: 0,
                views24h: 0,
                subscribers24h: 0,
            });
        }
        const aggregate = aggregates.get(row.creator_wallet);
        aggregate.revenue24h += toNumber(row.revenue);
        aggregate.views24h += toNumber(row.views);
        aggregate.subscribers24h += toNumber(row.subscribers);
    }
    const creatorList = Array.from(aggregates.values());
    if (!creatorList.length)
        return [];
    applyWeightedScore(creatorList, {
        revenue24h: 0.5,
        subscribers24h: 0.3,
        views24h: 0.2,
    });
    const sorted = creatorList.sort((a, b) => b.score - a.score).slice(0, 2);
    const walletAddresses = sorted.map((item) => item.creatorWallet);
    let creatorProfiles = [];
    if (walletAddresses.length) {
        const { data } = await supabase
            .from('users')
            .select('wallet_address, username, profile_image_url, bio')
            .in('wallet_address', walletAddresses);
        creatorProfiles = data;
    }
    return sorted.map((entry) => {
        const profile = creatorProfiles?.find((p) => p.wallet_address === entry.creatorWallet);
        return {
            walletAddress: entry.creatorWallet,
            username: profile?.username || null,
            profilePictureUrl: profile?.profile_image_url || null,
            bio: profile?.bio || null,
            stats: {
                revenue24h: Number(entry.revenue24h.toFixed(2)),
                views24h: entry.views24h,
                subscribers24h: entry.subscribers24h,
            },
            score: entry.score,
        };
    });
}
async function computeTrendingVideos(hoursBack) {
    const sinceDate = getDateBoundary(hoursBack);
    const { data, error } = await supabase
        .from('video_analytics')
        .select('video_id, revenue, views, comments, date')
        .gte('date', sinceDate);
    if (error) {
        console.error('Supabase error fetching video analytics:', error);
        return [];
    }
    const aggregates = new Map();
    for (const row of data || []) {
        if (!row.video_id)
            continue;
        if (!aggregates.has(row.video_id)) {
            aggregates.set(row.video_id, {
                videoId: row.video_id,
                revenue24h: 0,
                views24h: 0,
                comments24h: 0,
            });
        }
        const aggregate = aggregates.get(row.video_id);
        aggregate.revenue24h += toNumber(row.revenue);
        aggregate.views24h += toNumber(row.views);
        aggregate.comments24h += toNumber(row.comments);
    }
    const videoList = Array.from(aggregates.values());
    if (!videoList.length)
        return [];
    applyWeightedScore(videoList, {
        revenue24h: 0.6,
        views24h: 0.3,
        comments24h: 0.1,
    });
    const sorted = videoList.sort((a, b) => b.score - a.score).slice(0, 2);
    const videoIds = sorted.map((item) => item.videoId);
    let videoRecords = [];
    if (videoIds.length) {
        const { data } = await supabase
            .from('videos')
            .select('id, title, thumbnail_url, price_usdc, creator_wallet')
            .in('id', videoIds);
        videoRecords = data;
    }
    return sorted.map((entry) => {
        const video = videoRecords?.find((v) => v.id === entry.videoId);
        return {
            id: entry.videoId,
            title: video?.title || 'Untitled Video',
            thumbnailUrl: video?.thumbnail_url || null,
            priceUsdc: video?.price_usdc || 0,
            creatorWallet: video?.creator_wallet || null,
            stats: {
                revenue24h: Number(entry.revenue24h.toFixed(2)),
                views24h: entry.views24h,
                comments24h: entry.comments24h,
            },
            score: entry.score,
        };
    });
}
async function fallbackTrendingCreatorsFromVideos(limit = 2) {
    const { data, error } = await supabase
        .from('videos')
        .select('creator_wallet, views, earnings')
        .not('creator_wallet', 'is', null)
        .order('views', { ascending: false })
        .limit(100);
    if (error || !data) {
        console.error('Supabase error fetching fallback creator data:', error);
        return [];
    }
    const aggregates = new Map();
    data.forEach((row) => {
        if (!row.creator_wallet) {
            return;
        }
        if (!aggregates.has(row.creator_wallet)) {
            aggregates.set(row.creator_wallet, {
                creatorWallet: row.creator_wallet,
                totalViews: 0,
                totalEarnings: 0,
                videoCount: 0,
            });
        }
        const aggregate = aggregates.get(row.creator_wallet);
        aggregate.totalViews += toNumber(row.views);
        aggregate.totalEarnings += toNumber(row.earnings);
        aggregate.videoCount += 1;
    });
    const list = Array.from(aggregates.values());
    if (!list.length)
        return [];
    applyWeightedScore(list, {
        totalEarnings: 0.6,
        totalViews: 0.3,
        videoCount: 0.1,
    });
    const top = list.sort((a, b) => b.score - a.score).slice(0, limit);
    const wallets = top.map((entry) => entry.creatorWallet);
    let creatorProfiles = [];
    if (wallets.length) {
        const { data: profiles } = await supabase
            .from('users')
            .select('wallet_address, username, profile_image_url, bio')
            .in('wallet_address', wallets);
        creatorProfiles = profiles;
    }
    return top.map((entry) => {
        const profile = creatorProfiles?.find((p) => p.wallet_address === entry.creatorWallet);
        return {
            walletAddress: entry.creatorWallet,
            username: profile?.username || null,
            profilePictureUrl: profile?.profile_image_url || null,
            bio: profile?.bio || null,
            stats: {
                revenue24h: Number(entry.totalEarnings.toFixed(2)),
                views24h: entry.totalViews,
                subscribers24h: 0,
            },
            score: entry.score,
        };
    });
}
async function fallbackTrendingVideosFromVideos(limit = 2) {
    const { data, error } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, price_usdc, creator_wallet, views, earnings')
        .order('views', { ascending: false })
        .limit(20);
    if (error || !data) {
        console.error('Supabase error fetching fallback video data:', error);
        return [];
    }
    return data.slice(0, limit).map((video) => ({
        id: video.id,
        title: video.title || 'Untitled Video',
        thumbnailUrl: video.thumbnail_url || null,
        priceUsdc: video.price_usdc || 0,
        creatorWallet: video.creator_wallet || null,
        stats: {
            revenue24h: Number(toNumber(video.earnings).toFixed(2)),
            views24h: toNumber(video.views),
            comments24h: 0,
        },
        score: toNumber(video.views),
    }));
}
exports.default = router;
