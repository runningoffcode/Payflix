import { motion } from 'framer-motion';
import UsdcIcon from './icons/UsdcIcon';

interface UnlockButtonProps {
  price: number;
  onClick: () => void;
  loading?: boolean;
}

/**
 * Unlock Button Component
 * Beautiful play button that shows the price and unlocks videos on click
 */
export default function UnlockButton({ price, onClick, loading = false }: UnlockButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="relative group"
      aria-label={`Unlock video for $${price}`}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/50 to-pink-500/50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Button container */}
      <div className="relative flex flex-col items-center gap-4">
        {/* Play/Unlock SVG Icon */}
        <div className="relative">
          {loading ? (
            <div className="w-32 h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-24 w-24 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : (
            <svg
              width="133"
              height="130"
              viewBox="0 0 533 530"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-32 h-32 drop-shadow-2xl transform transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]"
            >
              <path
                opacity="0.9"
                d="M520.858 245.866C536.403 253.587 536.403 275.762 520.858 283.482L30.4678 527.04C11.1866 536.616 -8.30134 514.434 3.67803 496.547L151.138 276.36C155.874 269.289 155.874 260.06 151.138 252.989L3.67801 32.802C-8.30136 14.9145 11.1866 -7.26763 30.4678 2.30859L520.858 245.866Z"
                fill="url(#gradient)"
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>

        {/* Price Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-white font-bold text-lg flex items-center gap-1.5">
              {loading ? 'Processing...' : (
                <>
                  Unlock for ${price.toFixed(2)}
                  <UsdcIcon size={18} />
                </>
              )}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
}
