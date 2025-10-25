import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import VideoCard from '../components/VideoCard';

interface UserProfile {
  user: {
    id: string;
    walletAddress: string;
    username?: string;
    isCreator: boolean;
  };
  stats: {
    videosOwned: number;
    totalSpent: number;
    videosCreated: number;
    totalEarnings: number;
  };
  purchasedVideos: string[];
}

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

export default function Profile() {
  const { walletAddress, isConnected, connectWallet } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchProfile();
      fetchPurchasedVideos();
    } else {
      setLoading(false);
    }
  }, [isConnected, walletAddress]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/profile', {
        headers: {
          'x-wallet-address': walletAddress!,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchPurchasedVideos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/purchased-videos', {
        headers: {
          'x-wallet-address': walletAddress!,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Failed to fetch purchased videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to view your profile and library
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
        {/* Profile Header */}
        <div className="glass-effect rounded-xl p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
              <p className="text-gray-400 font-mono text-sm">
                {walletAddress}
              </p>
              {profile?.user.username && (
                <p className="text-flix-primary mt-1">@{profile.user.username}</p>
              )}
            </div>

            {!profile?.user.isCreator && (
              <Link
                to="/creator"
                className="gradient-bg px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition"
              >
                Become a Creator
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-flix-primary">
                {profile?.stats.videosOwned || 0}
              </div>
              <div className="text-sm text-gray-400 mt-1">Videos Owned</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-flix-secondary">
                {profile?.stats.totalSpent.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-400 mt-1">USDC Spent</div>
            </div>

            {profile?.user.isCreator && (
              <>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {profile.stats.videosCreated || 0}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Videos Created</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {profile.stats.totalEarnings.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">USDC Earned</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* My Library */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">My Library</h2>

          {videos.length === 0 ? (
            <div className="glass-effect rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-400 mb-6">
                You haven't purchased any videos yet
              </p>
              <Link
                to="/"
                className="gradient-bg px-6 py-3 rounded-lg text-white font-medium inline-block hover:opacity-90 transition"
              >
                Browse Videos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} isPurchased={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
