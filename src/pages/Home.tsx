import React, { useEffect, useState } from 'react';
import VideoCard from '../components/VideoCard';
import { useWallet } from '../contexts/WalletContext';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  priceUsdc: number;
  duration: number;
  views: number;
  createdAt: string;
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { isConnected } = useWallet();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/videos');
      const data = await response.json();
      setVideos(data.videos);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="gradient-bg py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Welcome to Flix
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Watch premium videos with instant payments via x402 protocol.
            <br />
            <span className="font-semibold">No ads. No subscriptions. Just pay per video.</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            <div className="glass-effect p-6 rounded-xl">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-white mb-2">Instant Payments</h3>
              <p className="text-sm text-white/80">
                Pay with USDC on Solana. No popups, just click and watch.
              </p>
            </div>

            <div className="glass-effect p-6 rounded-xl">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-white mb-2">Creator First</h3>
              <p className="text-sm text-white/80">
                Creators earn 97.65% instantly. No waiting, no middlemen.
              </p>
            </div>

            <div className="glass-effect p-6 rounded-xl">
              <div className="text-4xl mb-3">🚫</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Ads</h3>
              <p className="text-sm text-white/80">
                Pure viewing experience. Just you and great content.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">All Videos</h2>
          {!isConnected && (
            <div className="text-sm text-gray-400">
              Connect wallet to start watching
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-flix-primary border-t-transparent mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No videos available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      {!isConnected && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="gradient-bg rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Watching?
            </h2>
            <p className="text-white/90 mb-8">
              Connect your Solana wallet and enjoy instant access to premium content
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-white text-flix-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
