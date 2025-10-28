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
      <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 rounded-3xl p-12 mb-8">
        <div className="max-w-4xl text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Discover, Create and<br />Sell Your Own NFT.
          </h1>
          <div className="flex space-x-4">
            <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition">
              Discover
            </button>
            <button className="bg-white/20 backdrop-blur-sm text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/30 transition">
              Create
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6">
          <div className="text-sm text-gray-500 mb-2">Revenue</div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
            </svg>
            <span className="text-2xl font-bold text-gray-900">5.00 <span className="text-sm text-gray-500">ETH</span></span>
          </div>
          <div className="text-xs text-green-600 mt-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            12.3%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6">
          <div className="text-sm text-gray-500 mb-2">Spending</div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
            </svg>
            <span className="text-2xl font-bold text-gray-900">2.00 <span className="text-sm text-gray-500">ETH</span></span>
          </div>
          <div className="text-xs text-green-600 mt-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            8.1%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6">
          <div className="text-sm text-gray-500 mb-2">ROI</div>
          <div className="text-2xl font-bold text-gray-900">+14.02 <span className="text-sm text-gray-500">%</span></div>
          <div className="text-xs text-red-600 mt-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            5.3%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6">
          <div className="text-sm text-gray-500 mb-2">Estimated</div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
            </svg>
            <span className="text-2xl font-bold text-gray-900">7.00 <span className="text-sm text-gray-500">ETH</span></span>
          </div>
          <div className="text-xs text-green-600 mt-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            3.2%
          </div>
        </div>
      </div>

      {/* Trending Auctions Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Trending Auctions</h2>
          <div className="flex space-x-4 text-sm">
            <button className="text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1">Art</button>
            <button className="text-gray-500 hover:text-gray-700">Music</button>
            <button className="text-gray-500 hover:text-gray-700">Collectibles</button>
            <button className="text-gray-500 hover:text-gray-700">Utility</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600">No videos available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.slice(0, 2).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {/* More Auctions */}
      {videos.length > 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.slice(2).map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
