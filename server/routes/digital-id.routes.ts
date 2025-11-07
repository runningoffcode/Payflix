import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../database/db-factory';
import { sessionPaymentService } from '../services/session-payment.service';
import { recordDigitalIdRequest } from '../services/telemetry.service';
import type { Payment, Video } from '../types';

const router = Router();

type CachedEntry = {
  expiresAt: number;
  data: DigitalIdPublicPayload;
};

const PUBLIC_CACHE_TTL_MS = 30 * 1000;
const publicCache = new Map<string, CachedEntry>();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseClient = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

interface DigitalIdPublicPayload {
  walletAddress: string;
  creator: {
    walletAddress: string;
    username: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
    isCreator: boolean;
    joinedAt: string | null;
  };
  stats: {
    totalVideos: number;
    totalSubscribers: number;
    lifetimeEarnings: number;
    averagePrice: number;
    lastPublishedAt: string | null;
  };
  analytics24h: {
    revenue: number;
    views: number;
    subscribers: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    creatorAmount: number;
    platformAmount: number;
    signature: string;
    verifiedAt: string | null;
    video: {
      id: string;
      title: string;
      thumbnailUrl: string | null;
    } | null;
  }>;
  highlights: {
    hasVerifiedPayments: boolean;
    latestPaymentAt: string | null;
  };
  refreshedAt: string;
}

router.get('/:walletAddress', async (req: Request, res: Response) => {
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
    const viewerWallet =
      typeof viewerWalletHeader === 'string' && viewerWalletHeader.trim().length > 0
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

    recordDigitalIdRequest({
      walletAddress: walletParam,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    res.json(responsePayload);
  } catch (error: any) {
    recordDigitalIdRequest({
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

function getCachedPayload(walletKey: string): DigitalIdPublicPayload | null {
  const entry = publicCache.get(walletKey);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  if (entry) {
    publicCache.delete(walletKey);
  }
  return null;
}

function cachePublicPayload(walletKey: string, data: DigitalIdPublicPayload) {
  publicCache.set(walletKey, {
    data,
    expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS,
  });
}

async function buildPublicPayload(walletAddress: string): Promise<DigitalIdPublicPayload> {
  const user = await db.getUserByWallet(walletAddress);
  if (!user) {
    const err: any = new Error('Creator not found');
    err.statusCode = 404;
    throw err;
  }

  const [videosRaw, subscriberCount, paymentsRaw] = await Promise.all([
    user.isCreator ? db.getVideosByCreator(user.id) : [],
    db.getSubscriberCount(walletAddress),
    db.getPaymentsByCreatorWallet(walletAddress, 50),
  ]);

  const videos = (videosRaw as Video[]) || [];
  const payments = (paymentsRaw as Payment[]) || [];

  const videoLookup = new Map<string, Video>();
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
  const averagePrice =
    videos.length > 0
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
      ? new Date(
          Math.max(
            ...videos.map((video) => new Date(video.createdAt).getTime())
          )
        ).toISOString()
      : null,
  };

  const analytics24h = await computeCreatorAnalyticsSnapshot(walletAddress, payments);

  let finalRecentPayments = recentPayments;
  let finalLatestPayment = latestPayment;
  let hasVerifiedPayments = payments.length > 0;

  if (
    process.env.DIGITAL_ID_DEV_MOCK === 'true' &&
    (!recentPayments.length || !hasVerifiedPayments)
  ) {
    const mockPayment = {
      id: `mock-${Date.now()}`,
      amount: 4.2,
      creatorAmount: 4.08,
      platformAmount: 0.12,
      signature: 'mock_signature_verified',
      verifiedAt: new Date().toISOString(),
      video: videos.length
        ? {
            id: videos[0].id,
            title: videos[0].title,
            thumbnailUrl: videos[0].thumbnailUrl || null,
          }
        : null,
    };
    finalRecentPayments = [mockPayment, ...recentPayments].slice(0, 5);
    finalLatestPayment = {
      id: mockPayment.id,
      videoId: mockPayment.video?.id || 'mock-video',
      creatorWallet: walletAddress,
      userId: 'mock-user',
      userWallet: 'mock-wallet',
      amount: mockPayment.amount,
      creatorAmount: mockPayment.creatorAmount,
      platformAmount: mockPayment.platformAmount,
      transactionSignature: mockPayment.signature,
      status: 'verified',
      verifiedAt: new Date(mockPayment.verifiedAt),
      createdAt: new Date(mockPayment.verifiedAt),
    } as Payment;
    hasVerifiedPayments = true;
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
      hasVerifiedPayments,
      latestPaymentAt: finalLatestPayment
        ? (finalLatestPayment.verifiedAt ?? finalLatestPayment.createdAt).toISOString()
        : null,
    },
    refreshedAt: new Date().toISOString(),
  };
}

async function computeCreatorAnalyticsSnapshot(
  walletAddress: string,
  fallbackPayments: Payment[]
) {
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
        return data.reduce(
          (acc, row) => ({
            revenue: acc.revenue + Number(row.revenue || 0),
            views: acc.views + Number(row.views || 0),
            subscribers: acc.subscribers + Number(row.subscribers || 0),
          }),
          base
        );
      }
    } catch (error) {
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

async function buildViewerContext(viewerWallet: string, videoId?: string) {
  const session = await sessionPaymentService.getSessionBalance(viewerWallet);

  let streaming = null;
  if (videoId) {
    const activeSession = await db.getActiveStreamingSession(viewerWallet, videoId);
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

export default router;
