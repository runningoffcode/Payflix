import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet, useConnection } from '../hooks/useWallet';
import { useWalletModal } from '../hooks/useWallet';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import UnlockButton from '../components/UnlockButton';
import UsdcIcon from '../components/icons/UsdcIcon';
import CommentSection from '../components/CommentSection';
import bs58 from 'bs58';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string;
  priceUsdc: number;
  duration: number;
  views: number;
  creatorId: string;
  creatorWallet?: string;
  commentsEnabled: boolean;
  commentPrice: number;
}

interface CreatorProfile {
  username: string;
  profile_picture_url: string | null;
  wallet_address: string;
}

// USDC Mint Address on Devnet
const USDC_MINT = new PublicKey(import.meta.env.VITE_USDC_MINT_ADDRESS || '9zB1qKtTs7A1rbDpj15fsVrN1MrFxFSyRgBF8hd2fDX2');

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  useEffect(() => {
    if (connected && publicKey && id) {
      checkAccess();
    } else {
      // Not connected or missing data - stop checking
      setCheckingAccess(false);
    }
  }, [connected, publicKey, id]);

  // Auto-fetch video stream URL when access is granted
  useEffect(() => {
    if (hasAccess && !videoStreamUrl) {
      fetchVideoStreamUrl();
    }
  }, [hasAccess]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${id}`);
      if (!response.ok) throw new Error('Video not found');

      const data = await response.json();
      console.log('📹 Video data:', data);
      console.log('👤 Creator wallet:', data.creatorWallet);
      setVideo(data);

      // Fetch creator profile
      if (data.creatorWallet) {
        console.log('🔍 Fetching creator profile for:', data.creatorWallet);
        fetchCreatorProfile(data.creatorWallet);
      } else {
        console.warn('⚠️ No creator wallet found for this video!');
      }
    } catch (error) {
      console.error('Failed to fetch video:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatorProfile = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCreatorProfile(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch creator profile:', error);
    }
  };

  const checkAccess = async () => {
    if (!publicKey || !id) {
      console.log('⚠️ Cannot check access: missing publicKey or id');
      setCheckingAccess(false);
      return;
    }

    setCheckingAccess(true);
    const walletAddress = publicKey.toBase58();
    console.log(`🔍 Checking access for video ${id}...`);

    try {
      // Try to access the video stream
      const response = await fetch(`/api/videos/${id}/stream`, {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      console.log(`📡 Stream endpoint response status: ${response.status}`);

      if (response.status === 402) {
        // HTTP 402 Payment Required - x402 protocol
        setHasAccess(false);
        console.log('💳 HTTP 402 Payment Required - User does NOT have access');
      } else if (response.ok) {
        // Already have access
        setHasAccess(true);
        console.log('✅ Access granted - User OWNS this video! Setting hasAccess = true');

        // Fetch signed URL for direct streaming from R2
        fetchVideoStreamUrl();
      } else {
        console.log(`⚠️ Unexpected response status: ${response.status}`);
        setHasAccess(false);
      }
    } catch (error) {
      console.error('❌ Error checking access:', error);
      setHasAccess(false);
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchVideoStreamUrl = async () => {
    if (!publicKey || !id) return;

    try {
      // Check if video uses local storage
      if (video?.videoUrl && video.videoUrl.startsWith('/api/storage/')) {
        console.log('📂 Using local storage video');
        console.log(`   Video URL: ${video.videoUrl}`);
        setVideoStreamUrl(video.videoUrl);
        return;
      }

      // Otherwise use R2 secure streaming
      console.log('🔗 Fetching secure streaming session...');
      const response = await fetch(`/api/videos/${id}/play-url`, {
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get streaming URL');
      }

      const data = await response.json();
      console.log('✅ Got streaming session!');
      console.log(`   Session token: ${data.sessionToken.substring(0, 20)}...`);
      console.log(`   Expires in: ${data.expiresIn}s`);

      // Store session token
      setSessionToken(data.sessionToken);

      // Use secure streaming endpoint with session token
      // This endpoint validates the session before redirecting to R2
      const secureStreamUrl = `/api/videos/${id}/stream-secure?session=${encodeURIComponent(data.sessionToken)}`;
      setVideoStreamUrl(secureStreamUrl);

      console.log('🔒 Using session-based secure streaming');
      console.log('   URL sharing is now prevented - session is tied to your wallet');
    } catch (error) {
      console.error('❌ Error fetching stream URL:', error);
      // Fallback to proxy streaming
      setVideoStreamUrl(`/api/videos/${id}/play`);
    }
  };

  const handlePayment = async () => {
    if (!publicKey || !video || !connected) {
      console.error('Missing required data:', { publicKey, video, connected });
      return;
    }

    // Optimistic UI: immediately show video player
    setHasAccess(true);
    setPaying(true);

    try {
      console.log('\n=== Seamless X402 Payment (No Popups!) ===');
      console.log(`Amount: ${video.priceUsdc} USDC`);
      console.log(`Video: ${video.title}`);
      console.log(`User Wallet: ${publicKey.toBase58()}`);

      // Send seamless payment request to facilitator
      const response = await fetch('/api/payments/seamless', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: id,
          userWallet: publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Payment failed');
      }

      const data = await response.json();

      if (data.alreadyPaid) {
        console.log('✅ Already paid for this video!');
        return;
      }

      console.log('✅ Payment complete!');
      console.log(`Transaction: ${data.signature}`);
      console.log('=== No Wallet Popup Required! ===\n');

      // Show brief success message
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 1500);
    } catch (error: any) {
      console.error('❌ Payment failed:', error);

      // Revert optimistic UI on error
      setHasAccess(false);

      let errorMessage = 'Payment failed. Please try again.';

      if (error.message?.includes('No Active Session')) {
        errorMessage = '⚠️ Please deposit USDC first to enable seamless payments. Refresh the page to see the deposit modal.';
      } else if (error.message?.includes('Insufficient Balance')) {
        errorMessage = '⚠️ Not enough credits. Please add more USDC to your session. Refresh the page to see the top-up option.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = '⚠️ Insufficient USDC in your wallet. Please add USDC to your wallet first.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center h-full relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-neutral-400 text-lg">Loading video...</p>
        </motion.div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="flex items-center justify-center h-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Video Not Found</h2>
          <p className="text-neutral-400 mb-6">This video doesn't exist or has been removed</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex flex-col overflow-y-auto h-full relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Videos
          </Link>
        </motion.div>

        {/* Video Player Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden mb-6 border border-neutral-800/50"
        >
          {checkingAccess ? (
            // Loading state while checking access
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4 mx-auto"></div>
                <p className="text-neutral-400 text-sm">Checking access...</p>
              </div>
            </div>
          ) : hasAccess ? (
            // Video player (when user has access)
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              {videoStreamUrl ? (
                <video
                  key={videoStreamUrl}
                  controls
                  autoPlay
                  preload="metadata"
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  src={videoStreamUrl}
                  onLoadStart={() => console.log('Video: Load started')}
                  onLoadedMetadata={() => console.log('Video: Metadata loaded')}
                  onLoadedData={() => {
                    console.log('Video: Data loaded');
                    // Auto-play as soon as data is loaded
                    const videoEl = document.querySelector('video');
                    if (videoEl) {
                      videoEl.play().catch(err => console.log('Auto-play prevented:', err));
                    }
                  }}
                  onCanPlay={() => console.log('Video: Can play')}
                  onCanPlayThrough={() => console.log('Video: Can play through')}
                  onWaiting={() => console.log('Video: Waiting/Buffering')}
                  onPlaying={() => console.log('Video: Playing')}
                  onError={(e) => {
                    console.error('Video error:', e);
                    const videoEl = e.target as HTMLVideoElement;
                    if (videoEl.error) {
                      console.error('Error code:', videoEl.error.code);
                      console.error('Error message:', videoEl.error.message);

                      // Error codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
                      // If network error (likely expired signed URL), auto-refresh it
                      if (videoEl.error.code === 2 || videoEl.error.code === 4) {
                        console.log('🔄 Network error - URL may have expired, refreshing...');
                        const currentTime = videoEl.currentTime;

                        // Fetch fresh signed URL
                        fetchVideoStreamUrl().then(() => {
                          console.log('✅ URL refreshed - resuming playback');
                          // Resume from where we left off
                          setTimeout(() => {
                            if (videoEl) {
                              videoEl.currentTime = currentTime;
                              videoEl.play().catch(err => console.error('Resume failed:', err));
                            }
                          }, 100);
                        });
                      }
                    }
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4 mx-auto"></div>
                    <p className="text-neutral-400 text-sm">Loading video...</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            // Payment required screen with UnlockButton
            <div className="w-full h-full flex items-center justify-center relative">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover opacity-10 blur-lg"
              />

              <div className="relative z-10 text-center px-4">
                {!connected ? (
                  // Connect wallet prompt
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-neutral-800/90 backdrop-blur-sm border border-neutral-700/50 p-8 rounded-xl max-w-md mx-auto"
                  >
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Connect Wallet</h3>
                    <p className="text-neutral-300 mb-6">
                      Connect your wallet to unlock this video for ${video.priceUsdc.toFixed(2)}
                    </p>
                    <button
                      onClick={() => setVisible(true)}
                      className="px-8 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-semibold w-full transition-colors"
                    >
                      Connect Wallet to Watch
                    </button>
                  </motion.div>
                ) : (
                  // Unlock button
                  <UnlockButton
                    price={video.priceUsdc}
                    onClick={handlePayment}
                    loading={paying}
                  />
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Payment Success Notification */}
        {paymentSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-24 right-4 bg-green-500 p-4 rounded-lg shadow-2xl z-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Payment Successful!</p>
                <p className="text-white/90 text-sm">Video unlocked</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Video Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 p-6 rounded-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-white mb-2">{video.title}</h1>
              <div className="flex items-center gap-4 text-sm text-neutral-400 mb-4">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {video.views.toLocaleString()} views
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {Math.floor(video.duration / 60)} minutes
                </span>
              </div>
            </div>
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-400 font-semibold text-lg flex items-center gap-1.5">
                ${video.priceUsdc.toFixed(2)}
                <UsdcIcon size={18} />
              </p>
            </div>
          </div>

          <p className="text-neutral-300 mb-4 leading-relaxed">{video.description}</p>

          {/* Creator Info */}
          <div className="flex items-center gap-3 pt-4 border-t border-neutral-700/50">
            {creatorProfile?.profile_picture_url ? (
              <img
                src={creatorProfile.profile_picture_url}
                alt={creatorProfile.username}
                className="w-10 h-10 rounded-full object-cover border border-neutral-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {creatorProfile?.username ? creatorProfile.username[0].toUpperCase() : 'A'}
              </div>
            )}
            <div>
              <p className="text-sm text-neutral-400">Creator</p>
              <p className="text-white font-medium">
                {creatorProfile?.username || (video.creatorWallet
                  ? `${video.creatorWallet.slice(0, 4)}...${video.creatorWallet.slice(-4)}`
                  : 'Anonymous')}
              </p>
            </div>
          </div>

          {hasAccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
            >
              <p className="text-green-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You own this video and have unlimited access
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CommentSection
            videoId={id!}
            commentsEnabled={video?.commentsEnabled ?? true}
            commentPrice={video?.commentPrice ?? 0}
          />
        </motion.div>
      </div>
    </main>
  );
}
