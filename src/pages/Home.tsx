import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import WalletConnectButton from '../components/WalletConnectButton';
import UsdcIcon from '../components/icons/UsdcIcon';
import { useToastContext } from '@/contexts/ToastContext';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { subscribeToCreator, unsubscribeFromCreator } from '@/services/subscriptions.service';
import { useTrendingHighlights } from '@/hooks/useTrendingHighlights';

const RESULTS_PER_PAGE = 24;

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  priceUsdc: number;
  category: string;
  creatorWallet: string;
  creatorName: string;
  creatorProfilePicture: string | null;
  createdAt: string;
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ownedVideoIds, setOwnedVideoIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { connected, publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const { setVisible } = useWalletModal();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { subscribedWallets } = useSubscriptions(connected);
  const [subscriptionBusy, setSubscriptionBusy] = useState<string | null>(null);
  const { data: trendingHighlights } = useTrendingHighlights();
  const highlightedVideo = trendingHighlights?.videos?.[0];
  const highlightedCreator = trendingHighlights?.creators?.[0];

  const categories = ['All', 'Entertainment', 'Gaming', 'Music', 'Education', 'Technology', 'Lifestyle'];
  const hasTrending = Boolean(highlightedVideo || highlightedCreator);

  const renderTrendingChips = () => (
    <>
      {highlightedVideo && (
        <TrendingChip
          key={`video-${highlightedVideo.id}`}
          label="Top Video"
          linkTarget={
            highlightedVideo.id ? `/video/${highlightedVideo.id}` : '/#top-video'
          }
          heading={highlightedVideo.title}
          subheading={`${formatCurrency(highlightedVideo.stats.revenue24h)} • ${highlightedVideo.stats.views24h.toLocaleString()} views`}
          stats={[
            `Revenue 24h: ${formatCurrency(highlightedVideo.stats.revenue24h)}`,
            `Views 24h: ${highlightedVideo.stats.views24h.toLocaleString()}`,
            `Comments 24h: ${highlightedVideo.stats.comments24h.toLocaleString()}`,
          ]}
          thumbnailUrl={highlightedVideo.thumbnailUrl}
          type="video"
        />
      )}

      {highlightedCreator && (
        <TrendingChip
          key={`creator-${highlightedCreator.walletAddress}`}
          label="Top Creator"
          linkTarget={
            highlightedCreator.walletAddress
              ? `/profile/${highlightedCreator.walletAddress}`
              : '/#top-creator'
          }
          heading={
            highlightedCreator.username ||
            (highlightedCreator.walletAddress
              ? `${highlightedCreator.walletAddress.slice(0, 4)}...${highlightedCreator.walletAddress.slice(-4)}`
              : 'Creator')
          }
          subheading={`${formatCurrency(highlightedCreator.stats.revenue24h)} • ${highlightedCreator.stats.subscribers24h.toLocaleString()} subs`}
          stats={[
            `Revenue 24h: ${formatCurrency(highlightedCreator.stats.revenue24h)}`,
            `Subs gained: ${highlightedCreator.stats.subscribers24h.toLocaleString()}`,
            `Views 24h: ${highlightedCreator.stats.views24h.toLocaleString()}`,
          ]}
          thumbnailUrl={highlightedCreator.profilePictureUrl || undefined}
          type="creator"
          fallbackInitial={
            highlightedCreator.username?.[0]?.toUpperCase() ||
            highlightedCreator.walletAddress?.[0]?.toUpperCase() ||
            'C'
          }
        />
      )}
    </>
  );

  const categoryButtons = categories.map((category) => (
    <button
      key={category}
      onClick={() => setSelectedCategory(category)}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
        selectedCategory === category
          ? 'bg-purple-500 text-white'
          : 'bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 hover:bg-neutral-700/50'
      }`}
    >
      {category}
    </button>
  ));

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (connected && walletAddress) {
      // Fetch immediately for fast loading
      fetchOwnedVideoIds();
    } else {
      setOwnedVideoIds([]);
    }
  }, [connected, walletAddress]);

  const fetchVideos = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', String(RESULTS_PER_PAGE));

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      if (selectedCategory && selectedCategory !== 'All') {
        params.set('category', selectedCategory);
      }

      try {
        const response = await fetch(`/api/videos?${params.toString()}`, { signal });

        if (!response.ok) {
          throw new Error(`Failed to fetch videos (${response.status})`);
        }

        const data = await response.json();
        setVideos(data.videos || []);

      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        console.error('Error fetching videos:', err);
        setError(err.message || 'Failed to fetch videos');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [debouncedSearch, selectedCategory]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchVideos(controller.signal);
    return () => controller.abort();
  }, [fetchVideos]);

  const fetchOwnedVideoIds = async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch('/api/users/owned-video-ids', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOwnedVideoIds(data.videoIds || []);
        console.log('✅ Loaded owned video IDs:', data.videoIds);
      }
    } catch (error) {
      console.error('Error fetching owned video IDs:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatCurrency = (value: number) => {
    if (!Number.isFinite(value)) return '$0.00';
    return `$${value.toFixed(2)}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  const handleCreatorNavigate = useCallback(
    (event: React.MouseEvent, wallet: string) => {
      event.preventDefault();
      event.stopPropagation();
      navigate(`/profile/${wallet}`);
    },
    [navigate]
  );

  const handleToggleSubscription = useCallback(
    async (event: React.MouseEvent, creatorWallet: string) => {
      event.preventDefault();
      event.stopPropagation();
      if (!creatorWallet) return;

      if (!walletAddress) {
        setVisible(true);
        return;
      }

      setSubscriptionBusy(creatorWallet);
      try {
        if (subscribedWallets.has(creatorWallet)) {
          await unsubscribeFromCreator(walletAddress, creatorWallet);
          showToast({
            title: 'Unsubscribed',
            description: 'Removed from your subscriptions.',
            variant: 'success',
          });
        } else {
          await subscribeToCreator(walletAddress, creatorWallet);
          showToast({
            title: 'Subscribed',
            description: 'Creator added to your subscriptions.',
            variant: 'success',
          });
        }
      } catch (error: any) {
        showToast({
          title: 'Subscription error',
          description: error.message || 'Please try again.',
          variant: 'error',
        });
      } finally {
        setSubscriptionBusy(null);
      }
    },
    [walletAddress, subscribedWallets, setVisible, showToast]
  );


  return (
    <main className="flex flex-col overflow-y-auto h-full relative">
      <div className="z-10 w-full">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800/50 px-4 md:px-8 py-4">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            <svg width="120" height="56" viewBox="0 0 1968 919" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
              <g filter="url(#filter0_d_3_76)">
                <path d="M1735 83.1698L1963 83.1698L1635 835.812L1422.35 835.812L1735 83.1698Z" fill="#C56BCE"></path>
              </g>
              <g filter="url(#filter1_d_3_76)">
                <path d="M1751 843.17L1947 843.17L1633.28 73.7996L1433.28 73.7997L1751 843.17Z" fill="#C56BCE"></path>
              </g>
              <g filter="url(#filter2_d_3_76)">
                <rect x="1242" y="367.17" width="156" height="465" fill="#C56BCE"></rect>
              </g>
              <g filter="url(#filter3_d_3_76)">
                <rect x="1242" y="63.1698" width="156" height="156" fill="#C56BCE"></rect>
              </g>
              <g filter="url(#filter4_d_3_76)">
                <path d="M760 63.1698H916V836.17H760V63.1698Z" fill="#C56BCE"></path>
                <path d="M760 523.17V367.17H1091V523.17H760Z" fill="#C56BCE"></path>
                <path d="M760 219.17V63.1698H1203V219.17H760Z" fill="#C56BCE"></path>
              </g>
              <g filter="url(#filter5_d_3_76)">
                <path d="M4 63.1698H160V836.17H4V63.1698Z" fill="#C56BCE"></path>
                <path d="M63 63.1698H645V195.17H63V63.1698Z" fill="#C56BCE"></path>
                <path d="M646.583 69.6306L644.999 523.271L513 522.81L514.584 69.1698L646.583 69.6306Z" fill="#C56BCE"></path>
                <path d="M63 391.17H645V523.17H63V391.17Z" fill="#C56BCE"></path>
              </g>
              <g filter="url(#filter6_d_3_76)">
                <path d="M192 547.17H280V836.17H192V547.17Z" fill="#C56BCE"></path>
                <path d="M393 547.17H481V836.17H393V547.17Z" fill="#C56BCE"></path>
                <path d="M192 635.17V547.17H481V635.17H192Z" fill="#C56BCE"></path>
                <path d="M192 763.17V675.17H481V763.17H192Z" fill="#C56BCE"></path>
              </g>
              <g filter="url(#filter7_d_3_76)">
                <path d="M955 547.17H1043V836.17H955V547.17Z" fill="#C56BCE"></path>
                <path d="M982 836.17V748.17H1203V836.17H982Z" fill="#C56BCE"></path>
              </g>
              <g filter="url(#filter8_d_3_76)">
                <path d="M506 547.17H594V675.17H506V547.17Z" fill="#C56BCE"></path>
                <path d="M633 547.17H721V675.17H633V547.17Z" fill="#C56BCE"></path>
                <path d="M569 691.17H657V836.17H569V691.17Z" fill="#C56BCE"></path>
                <path d="M506 763.17V675.17H721V763.17H506Z" fill="#C56BCE"></path>
              </g>
            </svg>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="w-64 lg:w-96 px-4 py-2 pl-10 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Link to="/creator-dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg bg-neutral-800/50 border border-neutral-700/50 text-neutral-200 hover:bg-neutral-700/50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Link>
              <WalletConnectButton />
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="sticky top-[73px] z-10 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800/50 px-4 md:px-8 py-3 md:py-4">
          {/* Mobile layout: trending (if any) first, categories second */}
          <div className="space-y-3 md:hidden">
            {hasTrending && (
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                {renderTrendingChips()}
              </div>
            )}
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              {categoryButtons}
            </div>
          </div>

          {/* Desktop layout: categories left, trending right */}
          <div className="hidden md:flex items-center gap-3 max-w-[1800px] mx-auto">
            <div className="flex items-center gap-3 flex-1">{categoryButtons}</div>
            {hasTrending && (
              <div className="flex items-center gap-3 ml-6">{renderTrendingChips()}</div>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="px-4 md:px-8 py-6 max-w-[1800px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-red-400">
              <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
              <p className="text-sm text-red-300 max-w-md">{error}</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-200 mb-2">
                {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No videos yet'}
              </h3>
              <p className="text-neutral-400 mb-6 max-w-md">
                {debouncedSearch
                  ? 'Try refining your keywords or explore another category.'
                  : 'Be the first creator to upload content to the platform!'}
              </p>
              <Link
                to="/creator-dashboard"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-white hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Start Creating
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {videos
                .filter((video: any) => selectedCategory === 'All' || video.category === selectedCategory)
                .map((video: any) => {
                const isOwned = ownedVideoIds.includes(video.id);
                const isSubscribedCreator = video.creatorWallet
                  ? subscribedWallets.has(video.creatorWallet)
                  : false;
                return (
                  <div key={video.id} className="group cursor-pointer">
                    <Link to={`/video/${video.id}`}>
                      <div className="relative mb-3 rounded-xl overflow-hidden bg-neutral-800/50 aspect-video">
                        {video.thumbnailUrl && video.thumbnailUrl.startsWith('/api/') ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="flex items-center justify-center h-full bg-white/5"><span class="text-6xl">🎬</span></div>';
                              }
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-white/5">
                            <span className="text-6xl">🎬</span>
                          </div>
                        )}
                        {isOwned && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                            OWNED
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium">
                          {formatDuration(video.duration)}
                        </div>
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className={`flex flex-col items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isOwned
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                              : 'bg-white/90 hover:bg-white text-neutral-900'
                          }`}>
                            <div className="flex items-center gap-2">
                              <svg width="20" height="20" viewBox="0 0 533 530" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path opacity="0.7" d="M520.858 245.866C536.403 253.587 536.403 275.762 520.858 283.482L30.4678 527.04C11.1866 536.616 -8.30134 514.434 3.67803 496.547L151.138 276.36C155.874 269.289 155.874 260.06 151.138 252.989L3.67801 32.802C-8.30136 14.9145 11.1866 -7.26763 30.4678 2.30859L520.858 245.866Z" fill={isOwned ? '#ffffff' : '#171717'}/>
                              </svg>
                              <span>{isOwned ? 'Play' : 'Unlock'}</span>
                            </div>
                            {!isOwned && (
                              <span className="text-xs text-neutral-600 flex items-center gap-1">
                                {Number(video.priceUsdc ?? 0).toFixed(2)}
                                <UsdcIcon size={12} />
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    <div className="flex gap-3">
                      {video.creatorProfilePicture ? (
                        <img
                          src={video.creatorProfilePicture}
                          alt={video.creatorName}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-purple-400 transition-colors flex-1">
                            {video.title}
                          </h3>
                          <div className="flex items-center gap-1 text-xs font-medium text-purple-400 flex-shrink-0">
                            {Number(video.priceUsdc ?? 0).toFixed(2)}
                            <UsdcIcon size={14} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <button
                            type="button"
                            onClick={(event) =>
                              video.creatorWallet && handleCreatorNavigate(event, video.creatorWallet)
                            }
                            className="text-left hover:text-white transition-colors"
                          >
                            {video.creatorName || 'Creator'}
                          </button>
                          {connected && video.creatorWallet && (
                            <button
                              type="button"
                              onClick={(event) => handleToggleSubscription(event, video.creatorWallet)}
                              disabled={subscriptionBusy === video.creatorWallet}
                              className={`p-1.5 rounded-full transition ${
                                isSubscribedCreator
                                  ? 'text-purple-400 bg-white/10'
                                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {subscriptionBusy === video.creatorWallet ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                  />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400">
                          {formatViews(video.views)} views • {formatTimeAgo(video.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

interface TrendingChipProps {
  label: string;
  heading: string;
  subheading: string;
  stats: string[];
  linkTarget: string;
  thumbnailUrl?: string | null;
  type: 'video' | 'creator';
  fallbackInitial?: string;
}

function TrendingChip({
  label,
  heading,
  subheading,
  stats,
  linkTarget,
  thumbnailUrl,
  type,
  fallbackInitial = 'T',
}: TrendingChipProps) {
  return (
    <div className="relative group flex-shrink-0">
      <Link
        to={linkTarget}
        className="flex items-center gap-3 px-4 py-2 rounded-2xl text-white shadow-lg backdrop-blur-sm transition transform hover:-translate-y-0.5 live-chip"
      >
        <div className="relative">
          {thumbnailUrl ? (
            <div
              className={`${
                type === 'video' ? 'w-14 h-10 rounded-lg' : 'w-10 h-10 rounded-full'
              } overflow-hidden border border-white/20 shadow-lg`}
            >
              <img
                src={thumbnailUrl}
                alt={heading}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 text-sm font-semibold border border-white/20">
              {fallbackInitial}
            </div>
          )}
          <span className="live-glow" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.35em] text-white/70 flex items-center gap-2">
            <span className="live-dot" />
            {label}
          </span>
          <span className="text-sm font-semibold line-clamp-1">{heading}</span>
          <span className="text-xs text-white/80 md:hidden">{subheading}</span>
        </div>
      </Link>
      <div className="hidden md:block pointer-events-none absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-black/85 p-4 text-sm text-white/80 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 z-20">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-2">{label}</p>
        <p className="text-sm font-semibold mb-3">{heading}</p>
        <ul className="space-y-1 text-xs">
          {stats.map((stat) => (
            <li key={stat} className="flex items-center gap-2 text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
              {stat}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
