import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { unsubscribeFromCreator } from '@/services/subscriptions.service';
import { useToastContext } from '@/contexts/ToastContext';
import { GradientButton } from '@/components/ui/GradientButton';

export default function SubscriptionsPage() {
  const { connected, publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const { setVisible } = useWalletModal();
  const { subscriptions, loading } = useSubscriptions(connected);
  const { showToast } = useToastContext();

  const handleUnsubscribe = useCallback(
    async (creatorWallet: string) => {
      if (!walletAddress) {
        setVisible(true);
        return;
      }

      try {
        await unsubscribeFromCreator(walletAddress, creatorWallet);
        showToast({
          title: 'Subscription updated',
          description: 'You will no longer receive updates from this creator.',
          variant: 'success',
        });
      } catch (error: any) {
        showToast({
          title: 'Unable to unsubscribe',
          description: error.message || 'Please try again.',
          variant: 'error',
        });
      }
    },
    [walletAddress, setVisible, showToast]
  );

  if (!connected) {
    return (
      <main className="flex items-center justify-center min-h-[70vh] px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center space-y-6"
        >
          <h1 className="text-3xl font-semibold text-white">Connect your wallet</h1>
          <p className="text-neutral-400">
            Sign in with your wallet to follow creators and build your personalized feed.
          </p>
          <GradientButton onClick={() => setVisible(true)}>Connect Wallet</GradientButton>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative z-10 min-h-screen overflow-y-auto px-4 py-10 md:px-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.3em] text-white/60"
          >
            Following
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-4xl md:text-5xl font-semibold"
          >
            Your Creators
          </motion.h1>
          <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
            Stay close to the studios, storytellers, and streamers you support. Subscribe to unlock
            instant notifications, private drops, and frictionless pay-per-view access.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <h2 className="text-2xl font-semibold">No subscriptions yet</h2>
            <p className="text-neutral-400">
              Discover trending creators on the home page and tap subscribe to add them here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-black font-semibold"
            >
              Browse creators
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {subscriptions.map((subscription) => (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 flex flex-col gap-6"
              >
                <div className="flex items-center gap-4">
                  {subscription.creator?.profilePictureUrl ? (
                    <img
                      src={subscription.creator.profilePictureUrl}
                      alt={subscription.creator.username || subscription.creator.walletAddress}
                      className="h-16 w-16 rounded-2xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                      {(subscription.creator?.username ||
                        subscription.creator?.walletAddress ||
                        subscription.creatorWallet)[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {subscription.creator?.username || 'Unnamed Creator'}
                    </h3>
                    <p className="text-sm text-neutral-400 font-mono">
                      {subscription.creator?.walletAddress || subscription.creatorWallet}
                    </p>
                    {subscription.creator?.bio && (
                      <p className="text-sm text-neutral-300 mt-2 line-clamp-2">
                        {subscription.creator.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs uppercase tracking-[0.4em] text-white/60">
                    Since {new Date(subscription.subscribedAt).toLocaleDateString()}
                  </span>

                  <div className="flex gap-3">
                    <Link
                      to={`/profile/${subscription.creator?.walletAddress || subscription.creatorWallet}`}
                      className="px-4 py-2 rounded-full border border-white/10 text-sm text-white/80 hover:bg-white/10 transition"
                    >
                      View profile
                    </Link>
                    <button
                      onClick={() => handleUnsubscribe(subscription.creatorWallet)}
                      className="px-4 py-2 rounded-full bg-white/10 text-sm text-white hover:bg-white/20 transition"
                    >
                      Unsubscribe
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
