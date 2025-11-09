import { Router } from 'express';
import { buildPublicPayload } from './digital-id.routes';
import { db } from '../database/db-factory';
import {
  processSeamlessVideoUnlock,
  SeamlessPaymentError,
} from '../services/payment-orchestrator.service';
import { sessionPaymentService } from '../services/session-payment.service';

const router = Router();

const MCP_API_KEY = process.env.MCP_API_KEY || '';
const MCP_RATE_LIMIT = parseInt(process.env.MCP_RATE_LIMIT || '60', 10);
const MCP_RATE_WINDOW_MS = 60_000;
const mcpRateMap = new Map<string, { count: number; resetAt: number }>();

function sanitizeWallet(value: any, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw { status: 400, error: `${field} parameter required` };
  }
  return value.trim();
}

function sanitizeVideoId(value: any) {
  if (typeof value !== 'string' || !value.trim()) {
    throw { status: 400, error: 'videoId parameter required' };
  }
  return value.trim();
}

function enforceRateLimit(key: string) {
  if (!MCP_RATE_LIMIT) return;
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
        const payload = await buildPublicPayload(wallet);
        return res.json({ success: true, result: payload });
      }
      case 'payflix.listVideos': {
        const videos = await db.getAllVideos();
        return res.json({ success: true, result: videos });
      }
      case 'payflix.getSessionBalance': {
        const wallet = sanitizeWallet(params?.userWallet, 'userWallet');
        const balance = await sessionPaymentService.getSessionBalance(wallet);
        return res.json({ success: true, result: balance });
      }
      case 'payflix.listCreatorVideos': {
        const wallet = sanitizeWallet(params?.wallet, 'wallet');
        const user = await db.getUserByWallet(wallet);
        if (!user || !user.isCreator) {
          return res.status(404).json({ error: 'Creator not found' });
        }
        const videos = await db.getVideosByCreator(user.id);
        return res.json({ success: true, result: videos });
      }
      case 'payflix.getRecentPayouts': {
        const wallet = sanitizeWallet(params?.wallet, 'wallet');
        const payload = await buildPublicPayload(wallet);
        return res.json({ success: true, result: payload.recentPayments });
      }
      case 'payflix.unlockVideo': {
        const videoId = sanitizeVideoId(params?.videoId);
        const userWallet = sanitizeWallet(params?.userWallet, 'userWallet');
        const result = await processSeamlessVideoUnlock({ videoId, userWallet });
        return res.json({ success: true, result });
      }
      default:
        return res.status(501).json({
          error: 'Not Implemented',
          message: `Method ${method} not supported`,
        });
    }
  } catch (error: any) {
    if (error instanceof SeamlessPaymentError) {
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

export default router;
