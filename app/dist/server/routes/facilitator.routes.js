"use strict";
/**
 * X402 Facilitator API Routes
 * Implements the standard facilitator endpoints for X402 protocol
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const x402_facilitator_service_1 = require("../services/x402-facilitator.service");
const daydreamsKey = process.env.DAYDREAMS_API_KEY;
const daydreamsSpendCap = parseFloat(process.env.DAYDREAMS_FACILITATOR_CAP_USDC || '0');
const daydreamsRateLimit = parseInt(process.env.DAYDREAMS_PROXY_RATE_LIMIT || '30', 10);
let daydreamsSpendTotal = 0;
const proxyRateMap = new Map();
function enforceProxyRateLimit(key) {
    if (!daydreamsRateLimit)
        return;
    const now = Date.now();
    const entry = proxyRateMap.get(key) || { count: 0, resetAt: now + 60000 };
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + 60000;
    }
    entry.count += 1;
    proxyRateMap.set(key, entry);
    if (entry.count > daydreamsRateLimit) {
        throw {
            status: 429,
            error: 'Rate limit exceeded',
            message: 'Too many facilitator proxy calls. Please retry shortly.',
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        };
    }
}
const router = (0, express_1.Router)();
/**
 * GET /api/facilitator/supported
 * Returns facilitator capabilities and configuration
 */
router.get('/supported', (req, res) => {
    try {
        const config = x402_facilitator_service_1.x402Facilitator.getSupportedConfig();
        res.json(config);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to get facilitator configuration',
            message: error.message,
        });
    }
});
/**
 * POST /api/facilitator/verify
 * Verifies a payment transaction without broadcasting it
 *
 * Body:
 * {
 *   transaction: string (base58 encoded Solana transaction)
 *   network: string (e.g., "devnet")
 *   token: string (USDC mint address)
 *   amount: number (USDC amount in units, e.g., 0.01)
 *   recipient: string (creator wallet address)
 * }
 */
router.post('/verify', async (req, res) => {
    try {
        const { transaction, network, token, amount, recipient } = req.body;
        // Validate required fields
        if (!transaction || !network || !token || !amount || !recipient) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['transaction', 'network', 'token', 'amount', 'recipient'],
            });
        }
        // Verify payment
        const result = await x402_facilitator_service_1.x402Facilitator.verifyPayment({
            transaction,
            network,
            token,
            amount,
            recipient,
        });
        if (result.valid) {
            res.json({
                valid: true,
                message: 'Payment verified successfully',
                details: result.details,
            });
        }
        else {
            res.status(400).json({
                valid: false,
                reason: result.reason,
                details: result.details,
            });
        }
    }
    catch (error) {
        console.error('Facilitator verify error:', error);
        res.status(500).json({
            error: 'Verification failed',
            message: error.message,
        });
    }
});
/**
 * POST /api/facilitator/settle
 * Settles a payment by signing and broadcasting the transaction
 *
 * Body: Same as /verify
 */
router.post('/settle', async (req, res) => {
    try {
        const { transaction, network, token, amount, recipient } = req.body;
        // Validate required fields
        if (!transaction || !network || !token || !amount || !recipient) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['transaction', 'network', 'token', 'amount', 'recipient'],
            });
        }
        // Settle payment
        const result = await x402_facilitator_service_1.x402Facilitator.settlePayment({
            transaction,
            network,
            token,
            amount,
            recipient,
        });
        if (result.success) {
            res.json({
                success: true,
                signature: result.signature,
                message: 'Payment settled successfully',
                explorer: `https://explorer.solana.com/tx/${result.signature}?cluster=${network}`,
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: result.error,
            });
        }
    }
    catch (error) {
        console.error('Facilitator settle error:', error);
        res.status(500).json({
            error: 'Settlement failed',
            message: error.message,
        });
    }
});
/**
 * GET /api/facilitator/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    const config = x402_facilitator_service_1.x402Facilitator.getSupportedConfig();
    res.json({
        status: 'ok',
        facilitator: 'PayFlix X402 Facilitator',
        version: config.version,
        feePayer: config.feePayer ? 'configured' : 'not configured',
        network: config.network,
        supportedTokens: config.supportedTokens.length,
    });
});
router.post('/proxy/:action', async (req, res) => {
    try {
        if (!daydreamsKey) {
            return res.status(503).json({
                error: 'Proxy disabled',
                message: 'DAYDREAMS_API_KEY not configured',
            });
        }
        const apiKey = req.headers['x-daydreams-key'];
        if (!apiKey || apiKey !== daydreamsKey) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid Daydreams key',
            });
        }
        const { action } = req.params;
        const { transaction, network, token, amount, recipient } = req.body || {};
        try {
            enforceProxyRateLimit(String(apiKey));
        }
        catch (rateErr) {
            return res.status(rateErr.status || 429).json(rateErr);
        }
        if (!transaction || !network || !token || !amount || !recipient) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['transaction', 'network', 'token', 'amount', 'recipient'],
            });
        }
        if (action === 'verify') {
            const result = await x402_facilitator_service_1.x402Facilitator.verifyPayment({
                transaction,
                network,
                token,
                amount,
                recipient,
            });
            if (!result.valid) {
                return res.status(400).json({ valid: false, reason: result.reason });
            }
            return res.json({ valid: true, details: result.details });
        }
        if (action === 'settle') {
            const spend = Number(amount) || 0;
            if (daydreamsSpendCap && daydreamsSpendTotal + spend > daydreamsSpendCap) {
                return res.status(429).json({
                    error: 'Spend cap exceeded',
                    message: 'Daydreams facilitator allowance exhausted',
                });
            }
            const result = await x402_facilitator_service_1.x402Facilitator.settlePayment({
                transaction,
                network,
                token,
                amount,
                recipient,
            });
            if (!result.success) {
                return res.status(400).json({ success: false, error: result.error });
            }
            daydreamsSpendTotal += spend;
            return res.json({
                success: true,
                signature: result.signature,
                remainingAllowance: daydreamsSpendCap > 0 ? Math.max(daydreamsSpendCap - daydreamsSpendTotal, 0) : null,
            });
        }
        return res.status(404).json({ error: 'Unknown proxy action' });
    }
    catch (error) {
        console.error('Facilitator proxy error:', error);
        return res.status(500).json({
            error: 'Proxy failure',
            message: error.message || 'Unexpected facilitator proxy error',
        });
    }
});
exports.default = router;
