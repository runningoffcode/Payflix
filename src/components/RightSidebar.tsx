import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

/**
 * Right Sidebar - Shows Top Creators and Top Videos
 * Displays trending content and popular creators
 * Only visible on home page
 */

interface TopVideo {
  id: string;
  title: string;
  thumbnail: string;
  creator: string;
  totalPaid: number;
  views: number;
}

interface TopCreator {
  wallet: string;
  name: string;
  avatar: string | null;
  totalRevenue: number;
  subscribers: number;
}

export default function RightSidebar() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Mock top videos (sorted by total revenue)
  const topVideos: TopVideo[] = [
    // Will be replaced with real Supabase data
  ];

  // Mock top creators (sorted by total revenue)
  const topCreators: TopCreator[] = [
    // Will be replaced with real Supabase data
  ];

  // Don't render if not on home page
  if (!isHomePage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          duration: 0.5
        }}
        className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-flix-light-gray border-l border-flix-light-gray overflow-y-auto hidden xl:block shadow-2xl"
      >
        <div className="p-4 space-y-6">
        {/* Top Creators Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl">⭐</div>
            <h2 className="text-xl font-bold text-white">Top Creators</h2>
          </div>

          {topCreators.length === 0 ? (
            <div className="bg-flix-dark rounded-lg p-6 text-center">
              <p className="text-flix-text-secondary text-sm">
                No creators yet. Be the first to upload!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCreators.slice(0, 5).map((creator, index) => (
                <motion.div
                  key={creator.wallet}
                  whileHover={{ scale: 1.02 }}
                  className="bg-flix-dark rounded-lg p-3 cursor-pointer hover:border hover:border-flix-cyan transition-all"
                >
                  <Link to={`/profile/${creator.wallet}`} className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-flix-light-gray text-white'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-flix-cyan to-purple-500 p-1 flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-flix-dark flex items-center justify-center overflow-hidden">
                        {creator.avatar ? (
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">👤</span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-sm font-semibold truncate">
                        {creator.name || 'Anonymous'}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-flix-text-secondary">
                        <span>${creator.totalRevenue.toFixed(0)}</span>
                        <span>•</span>
                        <span>{creator.subscribers} subs</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-flix-light-gray"></div>

        {/* Top Videos Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl">🔥</div>
            <h2 className="text-xl font-bold text-white">Top Videos</h2>
          </div>

          {topVideos.length === 0 ? (
            <div className="bg-flix-dark rounded-lg p-6 text-center">
              <p className="text-flix-text-secondary text-sm">
                No videos yet. Upload your first video!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topVideos.slice(0, 5).map((video, index) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-flix-dark rounded-lg overflow-hidden cursor-pointer hover:border hover:border-flix-cyan transition-all"
                >
                  <Link to={`/video/${video.id}`}>
                    <div className="flex gap-2">
                      {/* Rank Badge */}
                      <div className="flex items-center justify-center w-8 bg-gradient-to-br from-flix-cyan to-purple-500">
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      </div>

                      {/* Thumbnail */}
                      <div className="relative w-24 h-16 flex-shrink-0">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        {/* Revenue Badge */}
                        <div className="absolute bottom-0 right-0 bg-green-500 text-white text-xs px-1 py-0.5 font-bold">
                          ${video.totalPaid}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-1 pr-2">
                        <h3 className="text-white text-sm font-semibold line-clamp-2 mb-1">
                          {video.title}
                        </h3>
                        <p className="text-flix-text-secondary text-xs truncate">
                          {video.creator}
                        </p>
                        <p className="text-flix-text-secondary text-xs">
                          {video.views.toLocaleString()} views
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* View All Link */}
        <Link
          to="/trending"
          className="block text-center text-flix-cyan hover:text-cyan-400 transition-colors text-sm font-semibold"
        >
          View All Trending →
        </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
