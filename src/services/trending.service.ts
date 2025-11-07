export interface TrendingCreatorHighlight {
  walletAddress: string;
  username: string | null;
  profilePictureUrl: string | null;
  bio: string | null;
  score: number;
  stats: {
    revenue24h: number;
    views24h: number;
    subscribers24h: number;
  };
}

export interface TrendingVideoHighlight {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  priceUsdc: number;
  creatorWallet: string | null;
  score: number;
  stats: {
    revenue24h: number;
    views24h: number;
    comments24h: number;
  };
}

export interface TrendingHighlightsResponse {
  refreshedAt: string;
  creators: TrendingCreatorHighlight[];
  videos: TrendingVideoHighlight[];
}

export async function fetchTrendingHighlights(): Promise<TrendingHighlightsResponse | null> {
  try {
    const response = await fetch('/api/analytics/trending');
    if (!response.ok) {
      throw new Error('Failed to fetch trending analytics');
    }
    return response.json();
  } catch (error) {
    console.error('Error loading trending highlights:', error);
    return null;
  }
}
