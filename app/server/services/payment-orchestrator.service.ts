import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db-factory';
import { sessionPaymentService } from './session-payment.service';
import {
  recordCreatorAnalyticsDelta,
  recordVideoAnalyticsDelta,
} from './analytics-upsert.service';
import { invalidateDigitalIdCache } from '../routes/digital-id.routes';

export class SeamlessPaymentError extends Error {
  status: number;
  payload: any;

  constructor(status: number, payload: any) {
    super(payload?.message || 'Payment processing error');
    this.status = status;
    this.payload = payload;
  }
}

interface SeamlessPaymentParams {
  videoId: string;
  userWallet: string;
}

export interface SeamlessPaymentResult {
  success: boolean;
  alreadyPaid?: boolean;
  signature?: string;
  message: string;
  payment?: {
    amount: number;
    signature: string;
    videoId: string;
  };
}

export async function processSeamlessVideoUnlock({
  videoId,
  userWallet,
}: SeamlessPaymentParams): Promise<SeamlessPaymentResult> {
  if (!videoId || !userWallet) {
    throw new SeamlessPaymentError(400, {
      error: 'Missing required fields',
      message: 'videoId and userWallet are required',
    });
  }

  const video = await db.getVideoById(videoId);
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

  let user = await db.getUserByWallet(userWallet);
  if (!user) {
    user = await db.createUser({
      walletAddress: userWallet,
      username: `User ${userWallet.substring(0, 8)}`,
      email: null,
      profilePicture: null,
    });
  }

  const existingPayment = await db.getUserPaymentForVideo(user.id, videoId);
  if (existingPayment && existingPayment.status === 'verified') {
    return {
      success: true,
      alreadyPaid: true,
      signature: existingPayment.transactionSignature,
      message: 'You already have access to this video',
    };
  }

  const hasSession = await sessionPaymentService.hasActiveSession(userWallet);
  if (!hasSession) {
    throw new SeamlessPaymentError(402, {
      error: 'No Active Session',
      message: 'Please deposit USDC to start watching videos',
      requiresSession: true,
    });
  }

  const sessionBalance = await sessionPaymentService.getSessionBalance(userWallet);
  if (sessionBalance.remainingAmount && sessionBalance.remainingAmount < video.priceUsdc) {
    throw new SeamlessPaymentError(402, {
      error: 'Insufficient Balance',
      message: `Your balance: $${sessionBalance.remainingAmount} USDC. Required: $${video.priceUsdc} USDC. Please deposit more to continue watching.`,
      requiresTopUp: true,
      remaining: sessionBalance.remainingAmount,
      required: video.priceUsdc,
    });
  }

  const result = await sessionPaymentService.processSessionPayment({
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

  const paymentId = uuidv4();
  const paymentRecord = await db.createPayment({
    id: paymentId,
    videoId: video.id,
    userId: user.id,
    userWallet,
    creatorWallet: video.creatorWallet,
    amount: video.priceUsdc,
    creatorAmount,
    platformAmount,
    transactionSignature: result.signature!,
    status: 'verified',
  });

  await db.updatePayment(paymentRecord.id, {
    status: 'verified',
    verifiedAt: new Date(),
  });

  await db.grantVideoAccess({
    userId: user.id,
    videoId: video.id,
    paymentId,
    grantedAt: new Date(),
    expiresAt: new Date('2099-12-31'),
  });

  await db.incrementVideoViews(videoId);

  const analyticsDelta = {
    views: 1,
    revenue: video.priceUsdc,
  };

  await Promise.all([
    recordVideoAnalyticsDelta(video.id, analyticsDelta),
    recordCreatorAnalyticsDelta(video.creatorWallet, analyticsDelta),
  ]);

  const nextEarnings = (video.earnings || 0) + creatorAmount;
  await db.updateVideo(video.id, { earnings: nextEarnings });

  invalidateDigitalIdCache(video.creatorWallet);

  return {
    success: true,
    signature: result.signature,
    message: 'Payment successful! Enjoy your video.',
    payment: {
      amount: video.priceUsdc,
      signature: result.signature!,
      videoId,
    },
  };
}
