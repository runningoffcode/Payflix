import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import UnlockButton from '../components/UnlockButton';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  priceUsdc: number;
  duration: number;
  views: number;
  creatorId: string;
  creatorWallet?: string;
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

// USDC Mint Address on Devnet
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

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
    if (connected && publicKey && id) {
      checkAccess();
    }
  }, [connected, publicKey, id]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/videos/${id}`);
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
    if (!publicKey || !id) return;

    const walletAddress = publicKey.toBase58();

    try {
      // Try to access the video stream
      const response = await fetch(`http://localhost:5001/api/videos/${id}/stream`, {
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
    if (!publicKey || !video) return;

    setPaying(true);

    try {
      console.log('\n=== X402 Payment Flow ===');
      console.log('1. Creating USDC transfer transaction...');
      console.log(`   Amount: ${video.priceUsdc} USDC`);
      console.log(`   To: ${video.creatorWallet || 'Creator'}`);

      // Get creator wallet address
      const creatorWallet = video.creatorWallet || 'SampleCreator1ABC123456789';
      const creatorPublicKey = new PublicKey(creatorWallet);

      // Convert USDC amount to smallest unit (6 decimals for USDC)
      const usdcAmount = Math.floor(video.priceUsdc * 1_000_000);

      // Get token accounts for sender and recipient
      const fromTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        creatorPublicKey
      );

      // Create transfer instruction
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          usdcAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('2. Sending transaction...');

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('   Transaction sent:', signature);

      console.log('3. Confirming transaction...');

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('4. Verifying payment with backend...');

      // Verify payment with backend
      const response = await fetch(
        `http://localhost:5001/api/videos/${id}/verify-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionSignature: signature,
            userWallet: publicKey.toBase58(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      console.log('5. Payment verified!');
      console.log(`   Transaction: ${signature}`);
      console.log('=== Payment Complete ===\n');

      setPaymentSuccess(true);
      setHasAccess(true);
      setChallenge(null);

      // Show success message
      setTimeout(() => setPaymentSuccess(false), 3000);
    } catch (error: any) {
      console.error('Payment failed:', error);

      let errorMessage = 'Payment failed. Please try again.';

      if (error.message?.includes('Token account not found')) {
        errorMessage = 'USDC token account not found. Please ensure you have USDC in your wallet.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient USDC balance. Please add USDC to your wallet.';
      } else if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected.';
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
          {hasAccess ? (
            // Video player (when user has access)
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-12 h-12 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-white text-xl font-semibold mb-2">Video Player</p>
                  <p className="text-neutral-400 text-sm">
                    In production, video stream would play here
                  </p>
                </motion.div>
              </div>
            </div>
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
              <p className="text-purple-400 font-semibold text-lg">${video.priceUsdc.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-neutral-300 mb-4 leading-relaxed">{video.description}</p>

          {/* Creator Info */}
          <div className="flex items-center gap-3 pt-4 border-t border-neutral-700/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
            <div>
              <p className="text-sm text-neutral-400">Creator</p>
              <p className="text-white font-medium">
                {video.creatorWallet
                  ? `${video.creatorWallet.slice(0, 4)}...${video.creatorWallet.slice(-4)}`
                  : 'Anonymous'}
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
      </div>
    </main>
  );
}
