/**
 * X402 Facilitator API Routes
 * Implements the standard facilitator endpoints for X402 protocol
 */

import { Router, Request, Response } from 'express';
import { x402Facilitator } from '../services/x402-facilitator.service';

const router = Router();

/**
 * GET /api/facilitator/supported
 * Returns facilitator capabilities and configuration
 */
router.get('/supported', (req: Request, res: Response) => {
  try {
    const config = x402Facilitator.getSupportedConfig();
    res.json(config);
  } catch (error: any) {
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
router.post('/verify', async (req: Request, res: Response) => {
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
    const result = await x402Facilitator.verifyPayment({
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
    } else {
      res.status(400).json({
        valid: false,
        reason: result.reason,
        details: result.details,
      });
    }
  } catch (error: any) {
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
router.post('/settle', async (req: Request, res: Response) => {
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
    const result = await x402Facilitator.settlePayment({
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
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
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
router.get('/health', (req: Request, res: Response) => {
  const config = x402Facilitator.getSupportedConfig();

  res.json({
    status: 'ok',
    facilitator: 'PayFlix X402 Facilitator',
    version: config.version,
    feePayer: config.feePayer ? 'configured' : 'not configured',
    network: config.network,
    supportedTokens: config.supportedTokens.length,
  });
});

export default router;
