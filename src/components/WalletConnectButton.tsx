import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/solana';
import { useEffect, useState, useRef } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientButton } from './ui/GradientButton';
import TokenIcon from './icons/TokenIcon';
import { useAuth } from '../contexts/AuthContext';
import { fetchTokenMetadata, type TokenMetadata } from '../services/helius-token-metadata.service';
import { queueRPCRequest, RPC_PRIORITY } from '../services/rpc-queue.service';

export default function WalletConnectButton() {
  const { user: privyUser, login, authenticated, ready } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { logout: authLogout } = useAuth();
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
  const connecting = !ready;
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allTokenBalances, setAllTokenBalances] = useState<{ mint: string; balance: number; symbol: string; name: string; logo?: string }[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [fetchingTokens, setFetchingTokens] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all token balances with metadata from Helius
  const fetchAllTokenBalances = async () => {
    if (!publicKey || !connected) return;

    console.log('🔵 WalletConnectButton: Fetching all token balances with metadata (queued)...');
    setFetchingTokens(true);
    try {
      // Queue SOL balance fetch with LOW priority
      const solBal = await queueRPCRequest(
        () => connection.getBalance(publicKey),
        RPC_PRIORITY.LOW
      );
      setSolBalance(solBal / LAMPORTS_PER_SOL);

      // Queue token accounts fetch with LOW priority
      const tokenAccounts = await queueRPCRequest(
        () => connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        RPC_PRIORITY.LOW
      );

      const tokensWithBalance: { mint: string; balance: number }[] = [];

      for (const { account } of tokenAccounts.value) {
        const parsedInfo = account.data.parsed.info;
        const balance = parsedInfo.tokenAmount.uiAmount;

        if (balance > 0) {
          tokensWithBalance.push({
            mint: parsedInfo.mint,
            balance,
          });
        }
      }

      // Fetch metadata for all tokens from Helius
      const mintAddresses = tokensWithBalance.map(t => t.mint);
      const metadata = await fetchTokenMetadata(mintAddresses);

      // Combine balance + metadata
      const tokens = tokensWithBalance.map(({ mint, balance }) => {
        const meta = metadata.get(mint);
        return {
          mint,
          balance,
          symbol: meta?.symbol || mint.slice(0, 4) + '...',
          name: meta?.name || 'Unknown Token',
          logo: meta?.logo,
        };
      });

      setAllTokenBalances(tokens);
      console.log('🔵 WalletConnectButton: Found', tokens.length, 'tokens with metadata and', solBal / LAMPORTS_PER_SOL, 'SOL');
    } catch (error) {
      console.error('Error fetching token balances:', error);
    } finally {
      setFetchingTokens(false);
    }
  };

  // Fetch all token balances when dropdown opens
  useEffect(() => {
    if (showDropdown && connected) {
      fetchAllTokenBalances();
    }
  }, [showDropdown, connected]);

  if (!mounted) return null;

  const handleClick = () => {
    if (connected) {
      console.log('🔵 WalletConnectButton clicked! Dropdown state:', showDropdown);
      setShowDropdown(!showDropdown);
    } else if (authenticated && !walletAddress) {
      // User is logged in with Privy but has no Solana wallet
      console.log('🔵 User authenticated but no Solana wallet - creating one...');
      handleCreateWallet();
    } else {
      login();
    }
  };

  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    try {
      console.log('🔵 Creating Solana embedded wallet...');
      await createWallet({ chainType: 'solana' });
      console.log('✅ Solana wallet created!');
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      alert('Failed to create wallet. Please try again or contact support.');
    } finally {
      setCreatingWallet(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative" ref={dropdownRef}>
        <GradientButton
          onClick={handleClick}
          disabled={connecting}
          className="min-w-[180px]"
        >
          {connecting || creatingWallet ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{creatingWallet ? 'Creating Wallet...' : 'Connecting...'}</span>
            </div>
          ) : authenticated && !walletAddress ? (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create Wallet</span>
            </div>
          ) : connected ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span>{formatAddress(publicKey?.toBase58() || '')}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Connect Wallet</span>
            </div>
          )}
        </GradientButton>

        {/* Wallet Dropdown */}
        <AnimatePresence>
          {showDropdown && connected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                <div className="text-xs font-medium opacity-80 mb-1">Wallet Address</div>
                <div className="font-mono text-xs break-all text-white">
                  {publicKey?.toBase58()}
                </div>
              </div>

              {/* Token Balances */}
              <div className="p-4">
                <div className="text-sm font-semibold text-white mb-3">All Balances</div>

                {fetchingTokens ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {/* SOL Balance */}
                    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TokenIcon
                          mint="So11111111111111111111111111111111111111112"
                          symbol="SOL"
                          className="w-8 h-8"
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">SOL</div>
                          <div className="text-xs text-neutral-400">Solana</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">
                          {solBalance.toFixed(4)}
                        </div>
                        <div className="text-xs text-neutral-400">SOL</div>
                      </div>
                    </div>

                    {/* SPL Token Balances */}
                    {allTokenBalances.map((token) => (
                      <div
                        key={token.mint}
                        className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {token.logo ? (
                            <img
                              src={token.logo}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                // Fallback to TokenIcon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <TokenIcon
                            mint={token.mint}
                            symbol={token.symbol}
                            className={`w-8 h-8 ${token.logo ? 'hidden' : ''}`}
                          />
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {token.symbol}
                            </div>
                            <div className="text-xs text-neutral-400 truncate max-w-[140px]">
                              {token.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">
                            {token.balance.toLocaleString()}
                          </div>
                          <div className="text-xs text-neutral-400">{token.symbol}</div>
                        </div>
                      </div>
                    ))}

                    {allTokenBalances.length === 0 && !fetchingTokens && (
                      <div className="text-center py-6 text-neutral-500 text-sm">
                        No tokens found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-neutral-700 p-4 space-y-2">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // Logout then login again to change wallet
                    authLogout();
                    setTimeout(() => login(), 500);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Change Wallet
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    authLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Disconnect Wallet
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!connected && authenticated && (
        <button
          onClick={() => {
            console.log('🔵 Logging out from Privy...');
            authLogout();
          }}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Logout
        </button>
      )}

      {!connected && !authenticated && (
        <div className="text-sm text-neutral-400">
          <a
            href="https://phantom.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors underline"
          >
            Get Phantom Wallet
          </a>
        </div>
      )}
    </div>
  );
}
