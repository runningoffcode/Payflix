import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  priceUsdc: number;
  duration: number;
  views: number;
  createdAt: string;
}

interface FlixVideoCardProps {
  video: Video;
}

/**
 * YouTube-style Video Card Component
 * Clean, modern design with smooth hover effects
 */
export default function FlixVideoCard({ video }: FlixVideoCardProps) {
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

  return (
    <Link to={`/video/${video.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-flix-gray rounded-xl overflow-hidden mb-3">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-semibold text-white">
            {formatDuration(video.duration)}
          </div>

          {/* Price Tag */}
          <div className="absolute top-2 right-2 bg-flix-cyan px-2 py-1 rounded text-xs font-bold text-black">
            ${video.priceUsdc}
          </div>

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1 }}
              className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm"
            >
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Video Info */}
        <div className="flex gap-3">
          {/* Creator Avatar */}
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-cyan"></div>
          </div>

          {/* Title & Stats */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm line-clamp-2 mb-1 group-hover:text-flix-cyan transition-colors">
              {video.title}
            </h3>
            <p className="text-flix-text-secondary text-xs">Creator Name</p>
            <p className="text-flix-text-secondary text-xs">
              {formatViews(video.views)} views • {formatTimeAgo(video.createdAt)}
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
