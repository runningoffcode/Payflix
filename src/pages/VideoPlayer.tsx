import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  priceUsdc: number;
  duration: number;
  views: number;
  creatorId: string;
}

interface X402Challenge {
  videoId: string;
  price: {
    amount: number;
    currency: string;
    network: string;
  };
  recipient: {
    creator: string;
    platform: string;
  };
  split: {
    creator: number;
    platform: number;
  };
  instructions: any;
  message: string;
}

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { walletAddress, isConnected, connectWallet } = useWallet();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [challenge, setChallenge] = useState<X402Challenge | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  useEffect(() => {
    if (isConnected && id) {
      checkAccess();
    }
  }, [isConnected, id]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/videos/${id}`);
      if (!response.ok) throw new Error('Video not found');

      const data = await response.json();
      setVideo(data);
    } catch (error) {
      console.error('Failed to fetch video:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    if (!walletAddress || !id) return;

    try {
      // Try to access the video stream
      const response = await fetch(`http://localhost:5000/api/videos/${id}/stream`, {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.status === 402) {
        // HTTP 402 Payment Required - x402 protocol
        const data = await response.json();
        setChallenge(data.challenge);
        setHasAccess(false);
        console.log('💳 HTTP 402 Payment Required:', data);
      } else if (response.ok) {
        // Already have access
        setHasAccess(true);
        setChallenge(null);
        console.log('✅ Access granted');
      }
    } catch (error) {
      console.error('Error checking access:', error);
    }
  };

  const handlePayment = async () => {
    if (!walletAddress || !video || !challenge) return;

    setPaying(true);

    try {
      // In a real implementation, this would:
      // 1. Create a Solana transaction to send USDC to creator
      // 2. Sign the transaction with the wallet
      // 3. Submit to blockchain
      // 4. Get transaction signature
      //
      // For demo purposes, we'll simulate this:
      console.log('\n=== X402 Payment Flow ===');
      console.log('1. Creating USDC transfer transaction...');
      console.log(`   Amount: ${challenge.price.amount} USDC`);
      console.log(`   To: ${challenge.recipient.creator}`);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate transaction signature
      const mockSignature = generateMockSignature();
      console.log('2. Transaction signed and submitted');
      console.log(`   Signature: ${mockSignature}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('3. Verifying payment with AI Agent...');

      // Verify payment with backend
      const response = await fetch(
        `http://localhost:5000/api/videos/${id}/verify-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionSignature: mockSignature,
            userWallet: walletAddress,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      console.log('4. Payment verified!');
      console.log(`   Creator receives: ${data.payment.creatorAmount} USDC`);
      console.log(`   Platform receives: ${data.payment.platformAmount} USDC`);
      console.log('=== Payment Complete ===\n');

      setPaymentSuccess(true);
      setHasAccess(true);
      setChallenge(null);

      // Show success message
      setTimeout(() => setPaymentSuccess(false), 3000);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-flix-primary border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-white mb-4">Video not found</p>
          <Link to="/" className="text-flix-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Video Player Area */}
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-6">
          {hasAccess ? (
            // Video player (when user has access)
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-flix-primary/20 to-flix-secondary/20">
              <div className="text-center">
                <div className="text-6xl mb-4">▶️</div>
                <p className="text-white text-xl">Video Player</p>
                <p className="text-gray-400 text-sm mt-2">
                  In production, video would stream here
                </p>
              </div>
            </div>
          ) : (
            // Payment required screen
            <div className="w-full h-full flex items-center justify-center relative">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
              />

              <div className="relative z-10 text-center glass-effect p-8 rounded-xl max-w-md mx-4">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-white mb-2">Payment Required</h3>
                <p className="text-gray-300 mb-6">
                  This video costs {video.priceUsdc} USDC
                </p>

                {!isConnected ? (
                  <button
                    onClick={connectWallet}
                    className="gradient-bg px-8 py-3 rounded-lg text-white font-semibold w-full hover:opacity-90 transition"
                  >
                    Connect Wallet to Watch
                  </button>
                ) : (
                  <>
                    <div className="bg-flix-dark p-4 rounded-lg mb-4 text-sm text-left">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Price:</span>
                        <span className="text-white font-semibold">
                          {video.priceUsdc} USDC
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Creator gets:</span>
                        <span className="text-green-400">
                          {challenge ? challenge.split.creator : 97.65}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Platform fee:</span>
                        <span className="text-gray-400">
                          {challenge ? challenge.split.platform : 2.35}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={paying}
                      className="gradient-bg px-8 py-3 rounded-lg text-white font-semibold w-full hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paying ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin h-5 w-5 mr-2"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing Payment...
                        </span>
                      ) : (
                        `Pay ${video.priceUsdc} USDC & Watch`
                      )}
                    </button>

                    <p className="text-xs text-gray-500 mt-3">
                      ⚡ Instant payment via x402 protocol • No popups
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment Success Notification */}
        {paymentSuccess && (
          <div className="fixed top-20 right-4 gradient-bg p-4 rounded-lg shadow-lg animate-bounce">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-white font-semibold">Payment Successful!</p>
                <p className="text-white/80 text-sm">Video unlocked</p>
              </div>
            </div>
          </div>
        )}

        {/* Video Info */}
        <div className="glass-effect p-6 rounded-xl">
          <h1 className="text-3xl font-bold text-white mb-3">{video.title}</h1>
          <p className="text-gray-300 mb-4">{video.description}</p>

          <div className="flex items-center space-x-6 text-sm text-gray-400">
            <span>👁️ {video.views.toLocaleString()} views</span>
            <span>⏱️ {Math.floor(video.duration / 60)} minutes</span>
            <span>💰 {video.priceUsdc} USDC</span>
          </div>

          {hasAccess && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm flex items-center">
                <span className="mr-2">✓</span>
                You own this video and have unlimited access
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Generate mock Solana transaction signature for demo
function generateMockSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let signature = '';
  for (let i = 0; i < 88; i++) {
    signature += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return signature;
}
