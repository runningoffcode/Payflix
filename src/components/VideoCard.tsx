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

  return (
    <Link to={`/video/${video.id}`} className="group">
      <div className="glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />

          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
            {formatDuration(video.duration)}
          </div>

          {/* Price Badge */}
          <div className="absolute top-2 right-2 gradient-bg px-3 py-1 rounded-lg text-sm font-semibold text-white">
            {isPurchased ? (
              <span className="flex items-center space-x-1">
                <span>✓</span>
                <span>Owned</span>
              </span>
            ) : (
              <span>{video.priceUsdc} USDC</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white group-hover:text-flix-primary transition line-clamp-2">
            {video.title}
          </h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {video.description}
          </p>

          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <span>{video.views.toLocaleString()} views</span>
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
