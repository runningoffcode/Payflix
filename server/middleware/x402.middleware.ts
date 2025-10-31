/**
 * X402 Payment Middleware
 * Handles X402 protocol payment verification for protected routes
 * Integrates with X402 Facilitator service for payment processing
 */

import { Request, Response, NextFunction } from 'express';
import { x402Facilitator } from '../services/x402-facilitator.service';
import { db } from '../database/db-factory';

export interface X402ProtectedRequest extends Request {
  payment?: {
    verified: boolean;
    signature: string;
    amount: number;
    recipient: string;
  };
}

/**
 * Middleware to protect routes with X402 payment requirement
 * Usage: router.get('/video/:id/stream', requireX402Payment(priceUsdc, recipientWallet), handler)
 */
export function requireX402Payment(
  getPaymentInfo: (req: Request) => Promise<{ amount: number; recipient: string; resource: string }>
) {
  return async (req: X402ProtectedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if X-PAYMENT header is present
      const paymentHeader = req.headers['x-payment'] as string;

      if (!paymentHeader) {
        // No payment provided - return 402 Payment Required
        const paymentInfo = await getPaymentInfo(req);

        const headers = x402Facilitator.createPaymentRequiredHeaders(
          paymentInfo.amount,
          paymentInfo.recipient,
          paymentInfo.resource
        );

        return res
          .status(402)
          .set(headers)
          .json({
            error: 'Payment Required',
            message: 'This resource requires payment to access',
            payment: {
              amount: paymentInfo.amount,
              token: 'USDC',
              recipient: paymentInfo.recipient,
              facilitator: headers['X-PAYMENT-FACILITATOR'],
            },
          });
      }

      // Parse payment header
      console.log('📦 Payment header received:', paymentHeader.substring(0, 50) + '...');
      const payload = x402Facilitator.parsePaymentHeader(paymentHeader);

      if (!payload) {
        console.log('❌ Failed to parse payment header');
        return res.status(400).json({
          error: 'Invalid Payment',
          message: 'Could not parse X-PAYMENT header',
        });
      }

      console.log('✅ Payment payload parsed:', {
        network: payload.network,
        token: payload.token,
        amount: payload.amount,
        recipient: payload.recipient.substring(0, 10) + '...',
      });

      // Verify payment with facilitator
      console.log('🔍 Starting payment verification...');
      const verification = await x402Facilitator.verifyPayment(payload);

      if (!verification.valid) {
        console.log('❌ Payment verification failed:', verification.reason);
        return res.status(402).json({
          error: 'Payment Verification Failed',
          message: verification.reason,
          details: verification.details,
        });
      }

      console.log('✅ Payment verified, starting settlement...');
      // Settle payment on-chain
      const settlement = await x402Facilitator.settlePayment(payload);

      if (!settlement.success) {
        console.log('❌ Payment settlement failed:', settlement.error);
        return res.status(500).json({
          error: 'Payment Settlement Failed',
          message: settlement.error,
        });
      }

      console.log('✅ Payment settled! Signature:', settlement.signature);

      // Record payment in database
      const paymentInfo = await getPaymentInfo(req);
      try {
        await recordPayment(req, settlement.signature!, paymentInfo.amount, paymentInfo.recipient);
      } catch (dbError) {
        console.error('Failed to record payment in database:', dbError);
        // Continue anyway - payment succeeded on-chain
      }

      // Attach payment info to request
      req.payment = {
        verified: true,
        signature: settlement.signature!,
        amount: payload.amount,
        recipient: payload.recipient,
      };

      // Payment verified and settled - proceed to route handler
      next();
    } catch (error: any) {
      console.error('X402 middleware error:', error);
      return res.status(500).json({
        error: 'Payment Processing Error',
        message: error.message,
      });
    }
  };
}

/**
 * Record payment in database for analytics and access control
 */
async function recordPayment(
  req: Request,
  transactionSignature: string,
  amount: number,
  creatorWallet: string
) {
  const userWallet = req.headers['x-wallet-address'] as string;
  const videoId = req.params.id;

  if (!userWallet || !videoId) {
    throw new Error('Missing user wallet or video ID');
  }

  // Get user
  const user = await db.getUserByWallet(userWallet);
  if (!user) {
    throw new Error('User not found');
  }

  // Get video and creator
  const video = await db.getVideoById(videoId);
  if (!video) {
    throw new Error('Video not found');
  }

  const creator = await db.getUserByWallet(creatorWallet);
  if (!creator) {
    throw new Error('Creator not found');
  }

  // Calculate platform fee
  const platformFeePercentage = 2.35;
  const platformAmount = amount * (platformFeePercentage / 100);
  const creatorAmount = amount - platformAmount;

  // Record payment
  await db.createPayment({
    videoId: video.id,
    userId: user.id,
    userWallet,
    creatorWallet,
    amount,
    creatorAmount,
    platformAmount,
    transactionSignature,
    status: 'verified',
  });

  // Update video stats
  await db.incrementVideoViews(videoId);

  console.log(`✅ Payment recorded: ${transactionSignature}`);
}

/**
 * Middleware to check if user has already paid for a video
 * This allows repeat access without re-payment
 */
export function checkExistingPayment() {
  return async (req: X402ProtectedRequest, res: Response, next: NextFunction) => {
    try {
      const userWallet = req.headers['x-wallet-address'] as string;
      const videoId = req.params.id;

      if (!userWallet || !videoId) {
        return next();
      }

      // Check if user has already paid for this video
      const user = await db.getUserByWallet(userWallet);
      if (!user) {
        return next();
      }

      const existingPayment = await db.getUserPaymentForVideo(user.id, videoId);

      if (existingPayment && existingPayment.status === 'verified') {
        // User has already paid - grant access without new payment
        req.payment = {
          verified: true,
          signature: existingPayment.transactionSignature,
          amount: existingPayment.amount,
          recipient: existingPayment.creatorWallet,
        };

        console.log(`✅ Existing payment found for user ${userWallet} and video ${videoId}`);
        return next();
      }

      // No existing payment - continue to payment middleware
      next();
    } catch (error) {
      console.error('Error checking existing payment:', error);
      // Continue to payment middleware on error
      next();
    }
  };
}
