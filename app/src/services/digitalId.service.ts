export interface DigitalIdPayment {
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
}

export interface DigitalIdAnalytics {
  revenue: number;
  views: number;
  subscribers: number;
}

export interface DigitalIdStats {
  totalVideos: number;
  totalSubscribers: number;
  lifetimeEarnings: number;
  averagePrice: number;
  lastPublishedAt: string | null;
}

export interface DigitalIdViewerContext {
  session?: {
    hasSession: boolean;
    approvedAmount?: number;
    spentAmount?: number;
    remainingAmount?: number;
  };
  streaming?: {
    isActive: boolean;
    expiresAt?: string | null;
  };
}

export interface DigitalIdResponse {
  walletAddress: string;
  creator: {
    walletAddress: string;
    username: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
    isCreator: boolean;
    joinedAt: string | null;
  };
  stats: DigitalIdStats;
  analytics24h: DigitalIdAnalytics;
  recentPayments: DigitalIdPayment[];
  highlights: {
    hasVerifiedPayments: boolean;
    latestPaymentAt: string | null;
  };
  viewerContext: DigitalIdViewerContext | null;
  refreshedAt: string;
}

export async function fetchDigitalId(
  creatorWallet: string,
  options: { viewerWallet?: string | null; videoId?: string } = {}
): Promise<DigitalIdResponse> {
  const params = new URLSearchParams();
  if (options.videoId) {
    params.set('videoId', options.videoId);
  }

  const response = await fetch(`/api/digital-id/${creatorWallet}${params.toString() ? `?${params.toString()}` : ''}`, {
    headers: options.viewerWallet
      ? {
          'x-wallet-address': options.viewerWallet,
        }
      : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load digital identity');
  }

  return response.json();
}
