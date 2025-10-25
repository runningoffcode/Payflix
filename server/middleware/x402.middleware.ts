import { Response, NextFunction } from 'express';
import { AuthRequest, X402Challenge } from '../types';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import { solanaService } from '../services/solana.service';

/**
 * X402 Protocol Middleware
 *
 * Implements HTTP 402 Payment Required status for video content
 * Flow:
 * 1. User requests video without payment
 * 2. Server responds with 402 + payment details
 * 3. Client sends payment via Solana
 * 4. Server verifies and grants access
 */

/**
 * Generate X402 challenge for a video
 */
export function generateX402Challenge(
  videoId: string,
  priceUsdc: number,
  creatorWallet: string
): X402Challenge {
  return {
    videoId,
    priceUsdc,
    creatorWallet,
    platformWallet: solanaService.getPlatformWalletAddress(),
    timestamp: Date.now(),
    nonce: uuidv4(),
  };
}

/**
 * X402 Payment Required Response
 * Returns HTTP 402 with payment challenge
 */
export function send402Response(
  res: Response,
  challenge: X402Challenge
): void {
  res.status(402).json({
    error: 'Payment Required',
    protocol: 'x402',
    version: '1.0',
    challenge: {
      videoId: challenge.videoId,
      price: {
        amount: challenge.priceUsdc,
        currency: 'USDC',
        network: 'Solana',
        decimals: 6,
      },
      recipient: {
        creator: challenge.creatorWallet,
        platform: challenge.platformWallet,
      },
      split: {
        creator: config.fees.creatorPercentage,
        platform: config.fees.platformPercentage,
      },
      timestamp: challenge.timestamp,
      nonce: challenge.nonce,
    },
    instructions: {
      step1: 'Connect your Solana wallet',
      step2: `Send ${challenge.priceUsdc} USDC to ${challenge.creatorWallet}`,
      step3: 'Submit transaction signature to /api/videos/:id/verify-payment',
      step4: 'Video will unlock immediately after verification',
    },
    message: `This video costs ${challenge.priceUsdc} USDC. Payment is instant with no popups.`,
  });
}

/**
 * Middleware to check video access
 * If user hasn't paid, returns 402 response
 */
export async function checkVideoAccess(
  videoId: string,
  priceUsdc: number,
  creatorWallet: string,
  userWallet: string | undefined,
  hasAccess: boolean
) {
  if (hasAccess) {
    return { allowed: true };
  }

  // Generate payment challenge
  const challenge = generateX402Challenge(videoId, priceUsdc, creatorWallet);

  return {
    allowed: false,
    challenge,
  };
}

/**
 * Validate X402 payment proof
 */
export function validatePaymentProof(
  proof: any
): { valid: boolean; error?: string } {
  if (!proof.transactionSignature) {
    return { valid: false, error: 'Missing transaction signature' };
  }

  if (!proof.userWallet) {
    return { valid: false, error: 'Missing user wallet address' };
  }

  if (!proof.videoId) {
    return { valid: false, error: 'Missing video ID' };
  }

  // Validate Solana transaction signature format
  const signatureRegex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  if (!signatureRegex.test(proof.transactionSignature)) {
    return { valid: false, error: 'Invalid transaction signature format' };
  }

  // Validate Solana wallet address format
  const walletRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!walletRegex.test(proof.userWallet)) {
    return { valid: false, error: 'Invalid wallet address format' };
  }

  return { valid: true };
}

/**
 * X402 Error Response
 */
export function sendX402Error(
  res: Response,
  message: string,
  statusCode: number = 400
): void {
  res.status(statusCode).json({
    error: message,
    protocol: 'x402',
    timestamp: Date.now(),
  });
}
