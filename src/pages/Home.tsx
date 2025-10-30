import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletConnectButton from '../components/WalletConnectButton';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  priceUsdc: number;
  creatorWallet: string;
  createdAt: string;
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { connected } = useWallet();

  const categories = ['All', 'Entertainment', 'Gaming', 'Music', 'Education', 'Technology', 'Lifestyle'];

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/videos');
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
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

  // Mock video data if no videos from API
  const mockVideos = [
    {
      id: '1',
      title: 'Amazing Web3 Tutorial for Beginners',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop',
      duration: 754,
      views: 1200000,
      priceUsdc: 0.01,
      creatorWallet: 'Sample',
      creatorName: 'Creator Name',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'How to Build Your First NFT Platform',
      thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop',
      duration: 495,
      views: 850000,
      priceUsdc: 0.01,
      creatorWallet: 'Sample',
      creatorName: 'Tech Creator',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'Cryptocurrency Trading Strategies 2024',
      thumbnailUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop',
      duration: 942,
      views: 2500000,
      priceUsdc: 0.01,
      creatorWallet: 'Sample',
      creatorName: 'Finance Guru',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'Music Production in the Metaverse',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?w=800&h=450&fit=crop',
      duration: 1208,
      views: 500000,
      priceUsdc: 0.01,
      creatorWallet: 'Sample',
      creatorName: 'Music Producer',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      title: 'Future of Decentralized Gaming',
      thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=450&fit=crop',
      duration: 629,
      views: 3100000,
      priceUsdc: 0.01,
      creatorWallet: 'Sample',
      creatorName: 'Gaming Pro',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '6',
      title: 'Smart Contracts Explained Simply',
      thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=450&fit=crop',
      duration: 1135,
      views: 1800000,
      priceUsdc: 0.01,
      creatorWallet: 'Sample',
      creatorName: 'Blockchain Dev',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const displayVideos = videos.length > 0 ? videos : mockVideos;

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
                  placeholder="Search videos..."
                  className="w-64 lg:w-96 px-4 py-2 pl-10 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Link to="/creator-studio" className="w-9 h-9 flex items-center justify-center rounded-lg bg-neutral-800/50 border border-neutral-700/50 text-neutral-200 hover:bg-neutral-700/50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Link>
              <WalletConnectButton />
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="sticky top-[73px] z-10 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800/50 px-4 md:px-8 py-3">
          <div className="flex items-center gap-3 overflow-x-auto max-w-[1800px] mx-auto scrollbar-hide">
            {categories.map((category) => (
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
            ))}
          </div>
        </div>

        {/* Video Grid */}
        <div className="px-4 md:px-8 py-6 max-w-[1800px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {displayVideos.map((video: any) => (
                <div key={video.id} className="group cursor-pointer">
                  <Link to={`/video/${video.id}`}>
                    <div className="relative mb-3 rounded-xl overflow-hidden bg-neutral-800/50 aspect-video">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium">
                        {formatDuration(video.duration)}
                      </div>
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="flex flex-col items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-neutral-900 rounded-lg font-medium text-sm transition-colors">
                          <div className="flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 533 530" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path opacity="0.7" d="M520.858 245.866C536.403 253.587 536.403 275.762 520.858 283.482L30.4678 527.04C11.1866 536.616 -8.30134 514.434 3.67803 496.547L151.138 276.36C155.874 269.289 155.874 260.06 151.138 252.989L3.67801 32.802C-8.30136 14.9145 11.1866 -7.26763 30.4678 2.30859L520.858 245.866Z" fill="#171717"/>
                            </svg>
                            <span>Unlock</span>
                          </div>
                          <span className="text-xs text-neutral-600">{video.priceUsdc.toFixed(2)} USDC</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-purple-400 transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-xs text-neutral-400">{video.creatorName || 'Creator'}</p>
                        <p className="text-xs text-neutral-400">
                          {formatViews(video.views)} views • {formatTimeAgo(video.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
