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
      return res.status(400).json({
        error: 'Missing method',
      });
    }

    switch (method) {
      case 'payflix.getCreatorStats': {
        const wallet = params?.wallet?.trim();
        if (!wallet) {
          return res.status(400).json({ error: 'wallet parameter required' });
        }
        const payload = await buildPublicPayload(wallet);
        return res.json({ success: true, result: payload });
      }
      case 'payflix.listVideos': {
        const videos = await db.getAllVideos();
        return res.json({ success: true, result: videos });
      }
      case 'payflix.getSessionBalance': {
        const wallet = params?.userWallet?.trim();
        if (!wallet) {
          return res.status(400).json({ error: 'userWallet parameter required' });
        }
        const balance = await sessionPaymentService.getSessionBalance(wallet);
        return res.json({ success: true, result: balance });
      }
      case 'payflix.listCreatorVideos': {
        const wallet = params?.wallet?.trim();
        if (!wallet) {
          return res.status(400).json({ error: 'wallet parameter required' });
        }
        const user = await db.getUserByWallet(wallet);
        if (!user || !user.isCreator) {
          return res.status(404).json({ error: 'Creator not found' });
        }
        const videos = await db.getVideosByCreator(user.id);
        return res.json({ success: true, result: videos });
      }
      case 'payflix.getRecentPayouts': {
        const wallet = params?.wallet?.trim();
        if (!wallet) {
          return res.status(400).json({ error: 'wallet parameter required' });
        }
        const payload = await buildPublicPayload(wallet);
        return res.json({ success: true, result: payload.recentPayments });
      }
      case 'payflix.unlockVideo': {
        const videoId = params?.videoId;
        const userWallet = params?.userWallet;
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
      return res.status(error.status).json(error.payload);
    }
    console.error('MCP handler error:', error);
    return res.status(500).json({
      error: 'MCP Error',
      message: error.message || 'Unexpected error handling MCP request',
    });
  }
});

export default router;
