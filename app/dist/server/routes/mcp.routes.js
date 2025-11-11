"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const digital_id_routes_1 = require("./digital-id.routes");
const db_factory_1 = require("../database/db-factory");
const payment_orchestrator_service_1 = require("../services/payment-orchestrator.service");
const session_payment_service_1 = require("../services/session-payment.service");
const router = (0, express_1.Router)();
const MCP_API_KEY = process.env.MCP_API_KEY || '';
const MCP_RATE_LIMIT = parseInt(process.env.MCP_RATE_LIMIT || '60', 10);
const MCP_RATE_WINDOW_MS = 60000;
const mcpRateMap = new Map();
function sanitizeWallet(value, field) {
    if (typeof value !== 'string' || !value.trim()) {
        throw { status: 400, error: `${field} parameter required` };
    }
    return value.trim();
}
function sanitizeVideoId(value) {
    if (typeof value !== 'string' || !value.trim()) {
        throw { status: 400, error: 'videoId parameter required' };
    }
    return value.trim();
}
function enforceRateLimit(key) {
    if (!MCP_RATE_LIMIT)
        return;
    const now = Date.now();
    const entry = mcpRateMap.get(key) || { count: 0, resetAt: now + MCP_RATE_WINDOW_MS };
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + MCP_RATE_WINDOW_MS;
    }
    entry.count += 1;
    mcpRateMap.set(key, entry);
    if (entry.count > MCP_RATE_LIMIT) {
        throw {
            status: 429,
            error: 'Rate limit exceeded',
            message: 'Too many MCP requests. Please retry shortly.',
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        };
    }
}
router.post('/', async (req, res) => {
    try {
        if (!MCP_API_KEY) {
            return res.status(503).json({
                error: 'MCP disabled',
                message: 'Server missing MCP_API_KEY',
            });
        }
        const apiKey = req.headers['x-mcp-api-key'];
        if (!apiKey || apiKey !== MCP_API_KEY) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid MCP credentials',
            });
        }
        const { method, params } = req.body || {};
        if (!method) {
            return res.status(400).json({ error: 'Missing method' });
        }
        const keySuffix = typeof apiKey === 'string' ? apiKey.slice(-6) : 'unknown';
        enforceRateLimit(String(apiKey));
        const logContext = { method, key: keySuffix };
        switch (method) {
            case 'payflix.getCreatorStats': {
                const wallet = sanitizeWallet(params?.wallet, 'wallet');
                const payload = await (0, digital_id_routes_1.buildPublicPayload)(wallet);
                return res.json({ success: true, result: payload });
            }
            case 'payflix.listVideos': {
                const videos = await db_factory_1.db.getAllVideos();
                return res.json({ success: true, result: videos });
            }
            case 'payflix.getSessionBalance': {
                const wallet = sanitizeWallet(params?.userWallet, 'userWallet');
                const balance = await session_payment_service_1.sessionPaymentService.getSessionBalance(wallet);
                return res.json({ success: true, result: balance });
            }
            case 'payflix.listCreatorVideos': {
                const wallet = sanitizeWallet(params?.wallet, 'wallet');
                const user = await db_factory_1.db.getUserByWallet(wallet);
                if (!user || !user.isCreator) {
                    return res.status(404).json({ error: 'Creator not found' });
                }
                const videos = await db_factory_1.db.getVideosByCreator(user.id);
                return res.json({ success: true, result: videos });
            }
            case 'payflix.getRecentPayouts': {
                const wallet = sanitizeWallet(params?.wallet, 'wallet');
                const payload = await (0, digital_id_routes_1.buildPublicPayload)(wallet);
                return res.json({ success: true, result: payload.recentPayments });
            }
            case 'payflix.unlockVideo': {
                const videoId = sanitizeVideoId(params?.videoId);
                const userWallet = sanitizeWallet(params?.userWallet, 'userWallet');
                const result = await (0, payment_orchestrator_service_1.processSeamlessVideoUnlock)({ videoId, userWallet });
                return res.json({ success: true, result });
            }
            default:
                return res.status(501).json({
                    error: 'Not Implemented',
                    message: `Method ${method} not supported`,
                });
        }
    }
    catch (error) {
        if (error instanceof payment_orchestrator_service_1.SeamlessPaymentError) {
            console.warn('MCP payment error', { status: error.status, payload: error.payload });
            return res.status(error.status).json(error.payload);
        }
        if (error?.status && error?.error) {
            console.warn('MCP validation error', error);
            return res.status(error.status).json(error);
        }
        console.error('MCP handler error:', error);
        return res.status(500).json({
            error: 'MCP Error',
            message: error.message || 'Unexpected error handling MCP request',
        });
    }
});
exports.default = router;
