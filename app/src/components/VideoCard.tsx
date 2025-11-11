import React from 'react';
import { Link } from 'react-router-dom';

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

interface VideoCardProps {
  video: Video;
  isPurchased?: boolean;
}

export default function VideoCard({ video, isPurchased = false }: VideoCardProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate random gradient colors for cards
  const gradients = [
    'from-pink-500 to-purple-600',
    'from-lime-400 to-emerald-500',
    'from-cyan-400 to-blue-600',
    'from-orange-400 to-red-500'
  ];
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  return (
    <Link to={`/video/${video.id}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
        {/* Thumbnail with Gradient Overlay */}
        <div className="relative aspect-video overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${randomGradient} opacity-90`}></div>
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover mix-blend-overlay"
          />

          {/* Duration Badge */}
          <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white font-medium flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDuration(video.duration)}</span>
          </div>

          {/* Place a Bid Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="bg-white px-6 py-3 rounded-xl font-semibold text-gray-900 hover:bg-gray-100 transition shadow-lg">
              Place a Bid
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {video.title}
          </h3>

          {/* Creator */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full"></div>
            <span className="text-sm text-gray-600">@creator</span>
          </div>

          {/* Price and Likes */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500 mb-1">Current Bid</div>
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
                </svg>
                <span className="font-bold text-gray-900">{video.priceUsdc}</span>
                <span className="text-sm text-gray-500">ETH</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">{(video.views / 1000).toFixed(1)}K Likes</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
