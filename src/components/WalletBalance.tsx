import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { queueRPCRequest, RPC_PRIORITY } from '../services/rpc-queue.service';
import { usdcMintPublicKey } from '../config/solana';

/**
 * Wallet Balance Display - Bottom Left
 * Shows connected wallet balance with USDC and SOL
 */
export default function WalletBalance() {
  const { user: privyUser, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=84db05e3-e9ad-479e-923e-80be54938a18', 'confirmed');

  // Get Solana wallet address from Privy (connected wallet OR embedded wallet)
  const getWalletAddress = (): string | null => {
    if (!privyUser) return null;

    // Try to get address from connected Solana wallets first
    const solanaWallets = wallets?.filter((w: any) => w.walletClientType === 'solana' || w.chainType === 'solana');
    if (solanaWallets && solanaWallets.length > 0) {
      return solanaWallets[0].address;
    }

    // Fallback to embedded wallet from linkedAccounts
    const embeddedWallet = privyUser.linkedAccounts?.find(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana'
    );
    if (embeddedWallet) {
      return embeddedWallet.address;
    }

    return null;
  };

  const walletAddress = getWalletAddress();
  const publicKey = walletAddress ? new PublicKey(walletAddress) : null;
  const connected = authenticated && !!walletAddress;
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // USDC Mint Address (Devnet)
  const USDC_MINT = usdcMintPublicKey();

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalances();

      // Refresh every 60 seconds to avoid rate limits (reduced from 10s)
      const interval = setInterval(fetchBalances, 60000);
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  const fetchBalances = async () => {
    if (!publicKey) return;

    console.log('🔵 WalletBalance: Fetching balances (queued - BACKGROUND priority)...');
    setLoading(true);
    try {
      // Queue SOL balance fetch with BACKGROUND priority (lowest priority for polling widgets)
      const balance = await queueRPCRequest(
        () => connection.getBalance(publicKey),
        RPC_PRIORITY.BACKGROUND
      );
      setSolBalance(balance / LAMPORTS_PER_SOL);

      // Queue USDC balance fetch with BACKGROUND priority
      try {
        const tokenAccounts = await queueRPCRequest(
          () => connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: USDC_MINT,
          }),
          RPC_PRIORITY.BACKGROUND
        );

        if (tokenAccounts.value.length > 0) {
          const usdcAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          setUsdcBalance(usdcAmount || 0);
        } else {
          setUsdcBalance(0);
        }
      } catch (error: any) {
        console.log('No USDC account found');
        setUsdcBalance(0);
      }
    } catch (error: any) {
      console.error('❌ WalletBalance: Error fetching balances:', error);
      // Keep showing last known balance instead of clearing it
    } finally {
      setLoading(false);
    }
  };

  if (!connected) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-6 z-40"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-flix-light-gray border border-flix-gray rounded-xl p-4 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-center space-x-3">
            {/* Wallet Icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-flix-cyan to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>

            {/* Balances */}
            <div className="flex flex-col">
              <div className="text-xs text-flix-text-secondary mb-1">Wallet Balance</div>

              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-flix-cyan border-t-transparent"></div>
                  <span className="text-sm text-white">Loading...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* USDC Balance */}
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-white">
                      ${usdcBalance.toFixed(2)}
                    </span>
                    <span className="text-xs text-flix-text-secondary bg-flix-gray px-2 py-0.5 rounded">
                      USDC
                    </span>
                  </div>

                  {/* SOL Balance */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-flix-text-secondary">
                      {solBalance.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              )}

              {/* Wallet Address (truncated) */}
              {publicKey && (
                <div className="text-xs text-flix-text-secondary mt-2">
                  {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <motion.button
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={fetchBalances}
              className="w-8 h-8 flex items-center justify-center bg-flix-gray hover:bg-flix-cyan rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
