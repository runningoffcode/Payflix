import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Link } from 'react-router-dom';

interface CreatorStats {
  creator: {
    walletAddress: string;
    username?: string;
  };
  stats: {
    totalVideos: number;
    totalEarnings: number;
    totalViews: number;
    totalSales: number;
    averageVideoPrice: number;
  };
  videos: Array<{
    id: string;
    title: string;
    priceUsdc: number;
    views: number;
    earnings: number;
    createdAt: string;
  }>;
}

export default function CreatorDashboard() {
  const { walletAddress, isConnected, isCreator, becomeCreator, connectWallet } = useWallet();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    priceUsdc: '',
  });

  useEffect(() => {
    if (isConnected && isCreator && walletAddress) {
      fetchCreatorStats();
    } else {
      setLoading(false);
    }
  }, [isConnected, isCreator, walletAddress]);

  const fetchCreatorStats = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/analytics/creator/${walletAddress}`,
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch creator stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVideo.title || !newVideo.priceUsdc) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const response = await fetch('http://localhost:5000/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newVideo.title,
          description: newVideo.description,
          priceUsdc: parseFloat(newVideo.priceUsdc),
          creatorWallet: walletAddress,
        }),
      });

      if (!response.ok) throw new Error('Failed to upload video');

      alert('Video uploaded successfully!');
      setShowUploadForm(false);
      setNewVideo({ title: '', description: '', priceUsdc: '' });
      fetchCreatorStats();
    } catch (error) {
      console.error('Failed to upload video:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold text-white mb-4">Creator Dashboard</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access creator features
          </p>
          <button
            onClick={connectWallet}
            className="gradient-bg px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-white mb-4">Become a Creator</h2>
          <p className="text-gray-400 mb-6">
            Start earning 97.65% of every sale instantly. Upload your videos and get paid
            directly in USDC on Solana.
          </p>
          <button
            onClick={becomeCreator}
            className="gradient-bg px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition w-full"
          >
            Upgrade to Creator Account
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-flix-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Creator Studio</h1>
            <p className="text-gray-400 mt-1">Manage your content and earnings</p>
          </div>

          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="gradient-bg px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition"
          >
            {showUploadForm ? 'Cancel' : '+ Upload Video'}
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="glass-effect rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Upload New Video</h2>
            <form onSubmit={handleUploadVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                  placeholder="Enter video title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                  placeholder="Enter video description"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price (USDC) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newVideo.priceUsdc}
                  onChange={(e) => setNewVideo({ ...newVideo, priceUsdc: e.target.value })}
                  className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll receive 97.65% ({((parseFloat(newVideo.priceUsdc) || 0) * 0.9765).toFixed(2)} USDC)
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="gradient-bg px-6 py-3 rounded-lg text-white font-medium w-full hover:opacity-90 transition disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-effect p-6 rounded-xl">
            <div className="text-sm text-gray-400 mb-1">Total Earnings</div>
            <div className="text-3xl font-bold text-green-400">
              {stats?.stats.totalEarnings.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-gray-500 mt-1">USDC</div>
          </div>

          <div className="glass-effect p-6 rounded-xl">
            <div className="text-sm text-gray-400 mb-1">Total Videos</div>
            <div className="text-3xl font-bold text-flix-primary">
              {stats?.stats.totalVideos || 0}
            </div>
          </div>

          <div className="glass-effect p-6 rounded-xl">
            <div className="text-sm text-gray-400 mb-1">Total Views</div>
            <div className="text-3xl font-bold text-flix-secondary">
              {stats?.stats.totalViews.toLocaleString() || 0}
            </div>
          </div>

          <div className="glass-effect p-6 rounded-xl">
            <div className="text-sm text-gray-400 mb-1">Total Sales</div>
            <div className="text-3xl font-bold text-white">
              {stats?.stats.totalSales || 0}
            </div>
          </div>
        </div>

        {/* Videos List */}
        <div className="glass-effect rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Your Videos</h2>

          {!stats?.videos || stats.videos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎥</div>
              <p className="text-gray-400 mb-4">You haven't uploaded any videos yet</p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="text-flix-primary hover:underline"
              >
                Upload your first video
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-4 bg-flix-dark rounded-lg hover:bg-flix-dark/80 transition"
                >
                  <div className="flex-1">
                    <Link
                      to={`/video/${video.id}`}
                      className="text-white font-medium hover:text-flix-primary transition"
                    >
                      {video.title}
                    </Link>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                      <span>👁️ {video.views} views</span>
                      <span>💰 {video.priceUsdc} USDC</span>
                      <span>Earned: {video.earnings.toFixed(2)} USDC</span>
                    </div>
                  </div>

                  <Link
                    to={`/video/${video.id}`}
                    className="text-flix-primary hover:underline text-sm"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
