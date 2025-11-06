import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { motion, AnimatePresence } from 'framer-motion';
import SessionCreationModal from './SessionCreationModal';
import UsdcIcon from './icons/UsdcIcon';
import TokenIcon from './icons/TokenIcon';
import { useAuth } from '../contexts/AuthContext';
import { queueRPCRequest, RPC_PRIORITY } from '../services/rpc-queue.service';
import { usdcMintPublicKey } from '../config/solana';

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sessionBalance, setSessionBalance] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [allTokenBalances, setAllTokenBalances] = useState<{ mint: string; balance: number; symbol: string }[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [fetchingTokens, setFetchingTokens] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { connected, publicKey } = useWallet();
  const { logout } = useAuth();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  // USDC Mint Address - Uses environment variable or defaults to devnet USDC
  const USDC_MINT = usdcMintPublicKey();

  // Derive wallet address from publicKey
  const walletAddress = publicKey?.toBase58();

  useEffect(() => {
    if (connected && walletAddress) {
      // Fetch immediately for fast loading
      fetchWalletBalance();
      fetchUserProfile();
      fetchSessionBalance();
    } else {
      // Clear state immediately on disconnect
      setSessionBalance(0);
      setWalletBalance(0);
      setHasActiveSession(false);
      setProfilePicture(null);
      setUsername(null);
    }
  }, [connected, walletAddress]);

  // Poll balances every 60 seconds to avoid rate limits (reduced from 10s)
  useEffect(() => {
    if (connected && walletAddress) {
      const interval = setInterval(() => {
        fetchSessionBalance();
        fetchWalletBalance();
      }, 60000); // Changed from 10000 (10s) to 60000 (60s)
      return () => clearInterval(interval);
    }
  }, [connected, walletAddress]);

  // Listen for profile updates from other components (like Account page)
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (connected && walletAddress) {
        fetchUserProfile();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [connected, walletAddress]);

  const fetchSessionBalance = async () => {
    if (!walletAddress || !publicKey) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/payments/session/balance?userWallet=${walletAddress}`);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Balance API Response:', data);
        setSessionBalance(data.remainingAmount || 0);
        setHasActiveSession(data.hasSession || false); // FIXED: was data.hasActiveSession
      } else {
        setSessionBalance(0);
        setHasActiveSession(false);
      }
    } catch (error) {
      console.error('Error fetching session balance:', error);
      setSessionBalance(0);
      setHasActiveSession(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!walletAddress || !publicKey) return;

    console.log(`💰 Fetching wallet USDC balance (queued)...`);
    console.log(`   Wallet: ${walletAddress.slice(0, 8)}...`);
    console.log(`   USDC Mint: ${USDC_MINT.toBase58()}`);

    try {
      // Queue the RPC request with MEDIUM priority
      const tokenAccounts = await queueRPCRequest(
        () => connection.getParsedTokenAccountsByOwner(publicKey, {
          mint: USDC_MINT,
        }),
        RPC_PRIORITY.MEDIUM
      );

      console.log(`   Found ${tokenAccounts.value.length} USDC token account(s)`);

      if (tokenAccounts.value.length > 0) {
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        console.log(`   ✅ Balance: ${balance} USDC`);
        setWalletBalance(balance || 0);
      } else {
        console.log(`   ⚠️ No USDC token account found - balance is 0`);
        setWalletBalance(0);
      }
    } catch (error: any) {
      console.error(`   ❌ Error fetching wallet balance:`, error?.message || error);
      setWalletBalance(0);
    }
  };

  const fetchUserProfile = async () => {
    if (!walletAddress || !publicKey) return;

    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfilePicture(data.user.profile_picture_url);
        setUsername(data.user.username);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchAllTokenBalances = async () => {
    if (!walletAddress || !publicKey || !connected) return;

    console.log('🔵 Fetching all token balances (queued)...');
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

      const tokens: { mint: string; balance: number; symbol: string }[] = [];

      for (const { account } of tokenAccounts.value) {
        const parsedInfo = account.data.parsed.info;
        const balance = parsedInfo.tokenAmount.uiAmount;

        if (balance > 0) {
          const mint = parsedInfo.mint;
          let symbol = 'UNKNOWN';

          // Check for known USDC tokens (devnet)
          const correctUsdcMint = USDC_MINT.toBase58();
          if (mint === correctUsdcMint) {
            symbol = 'USDC';
          } else if (mint === 'DRXxfmg3PEk5Ad6DKuGSfa93ZLHDzXJKxcnjaAUGmW3z') {
            symbol = 'USDC (Devnet)';
          } else {
            symbol = mint.slice(0, 4) + '...';
          }

          tokens.push({
            mint,
            balance,
            symbol,
          });
        }
      }

      setAllTokenBalances(tokens);
      console.log('🔵 Found', tokens.length, 'tokens and', solBal / LAMPORTS_PER_SOL, 'SOL');
    } catch (error: any) {
      // Handle rate limit errors gracefully
      if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
        console.warn('⚠️ Rate limit reached when fetching all tokens. Using last known data.');
        // Don't clear token data on rate limit - keep showing what we have
      } else {
        console.error('Error fetching all token balances:', error);
      }
    } finally {
      setFetchingTokens(false);
    }
  };

  // Fetch all token balances when dropdown opens
  useEffect(() => {
    if (showWalletDropdown && connected && walletAddress) {
      fetchAllTokenBalances();
    }
  }, [showWalletDropdown, connected, walletAddress]);

  useEffect(() => {
    const handleSessionUpdated = () => {
      if (connected && walletAddress) {
        fetchSessionBalance();
        fetchWalletBalance();
      }
    };

    window.addEventListener('sessionUpdated', handleSessionUpdated);
    return () => window.removeEventListener('sessionUpdated', handleSessionUpdated);
  }, [connected, walletAddress]);

  const navItems = [
    { path: '/', icon: 'home', label: 'Home' },
    { path: '/payflix', icon: 'sparkles', label: 'Why PayFlix' },
    { path: '/creator-dashboard', icon: 'video', label: 'Creator Dashboard' },
  ];

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      logout();
      setShowProfileMenu(false);
      closeMobileMenu();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const handleOpenWithdrawModal = () => {
    setWithdrawAmount(sessionBalance.toFixed(2)); // Default to full balance
    setShowWithdrawModal(true);
  };

  const handleWithdrawCredits = async () => {
    if (!walletAddress || !publicKey || !hasActiveSession) return;

    const amount = parseFloat(withdrawAmount);

    // Validation
    if (isNaN(amount) || amount <= 0) {
      alert('⚠️ Please enter a valid amount greater than 0');
      return;
    }

    if (amount > sessionBalance) {
      alert(`⚠️ Insufficient balance. You have ${sessionBalance.toFixed(2)} USDC available`);
      return;
    }

    setWithdrawing(true);
    try {
      const response = await fetch('/api/sessions/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWallet: walletAddress,
          amount: amount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const message = data.sessionClosed
          ? `✅ Successfully withdrawn ${data.withdrawnAmount.toFixed(2)} USDC!\nSession closed.`
          : `✅ Successfully withdrawn ${data.withdrawnAmount.toFixed(2)} USDC!\nRemaining: ${data.newRemainingBalance.toFixed(2)} USDC`;

        alert(message);

        // Close modal and refresh balances
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        await fetchSessionBalance();
        await fetchWalletBalance();
      } else {
        alert(`❌ Failed to withdraw: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error withdrawing credits:', error);
      alert('❌ Failed to withdraw credits. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-800/80 backdrop-blur-sm border border-neutral-700 text-neutral-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobileOpen || window.innerWidth >= 768 ? 0 : '-100%',
          width: isExpanded || isMobileOpen ? 300 : 60
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onMouseEnter={() => window.innerWidth >= 768 && setIsExpanded(true)}
        onMouseLeave={() => {
          if (window.innerWidth >= 768) {
            setIsExpanded(false);
            setShowWalletDropdown(false);
            setShowProfileMenu(false);
          }
        }}
        className="fixed md:relative h-full md:h-auto md:min-h-screen bg-neutral-800 z-40 flex flex-col pt-4 pb-4"
      >
        {/* Close button for mobile */}
        <button
          onClick={closeMobileMenu}
          className="md:hidden absolute right-4 top-4 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo */}
        <div className="px-4 mb-8">
          <div className="w-10 h-10 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 533 530" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M520.858 245.866C536.403 253.587 536.403 275.762 520.858 283.482L30.4678 527.04C11.1866 536.616 -8.30137 514.434 3.678 496.547L151.138 276.36C155.874 269.289 155.874 260.06 151.138 252.989L3.67798 32.802C-8.30139 14.9145 11.1865 -7.26763 30.4677 2.30859L520.858 245.866Z" fill="#C56BCE"/>
            </svg>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex-1 flex flex-col px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
                location.pathname === item.path
                  ? 'bg-purple-500/10 text-purple-500'
                  : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{ opacity: isExpanded || isMobileOpen ? 1 : 0 }}
                className="text-sm whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col px-2 space-y-1 mt-auto">
          {!connected ? (
            <button
              onClick={handleConnectWallet}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/30 transition-colors group"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <motion.span
                initial={false}
                animate={{ opacity: isExpanded || isMobileOpen ? 1 : 0 }}
                className="text-sm whitespace-nowrap font-medium truncate"
              >
                Connect Wallet
              </motion.span>
            </button>
          ) : (
            <div className="relative" ref={walletDropdownRef}>
              <button
                onClick={() => {
                  console.log('🔵 Wallet button clicked! Dropdown state:', showWalletDropdown);
                  setShowWalletDropdown(!showWalletDropdown);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/30 transition-colors group"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <motion.span
                  initial={false}
                  animate={{ opacity: isExpanded || isMobileOpen ? 1 : 0 }}
                  className="text-sm whitespace-nowrap font-medium truncate flex-1 text-left"
                >
                  {`${publicKey?.toString().slice(0, 4)}...${publicKey?.toString().slice(-4)}`}
                </motion.span>
                <motion.svg
                  initial={false}
                  animate={{ rotate: showWalletDropdown ? 180 : 0, opacity: isExpanded || isMobileOpen ? 1 : 0 }}
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {/* Wallet Dropdown */}
              <AnimatePresence>
                {showWalletDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden max-h-96 overflow-y-auto"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3">
                      <div className="text-[10px] font-medium opacity-80 mb-1">Wallet Address</div>
                      <div className="font-mono text-xs break-all text-white">
                        {publicKey?.toBase58()}
                      </div>
                    </div>

                    {/* Token Balances */}
                    <div className="p-3">
                      <div className="text-xs font-semibold text-white mb-2">All Balances</div>

                      {fetchingTokens ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* SOL Balance */}
                          <div className="flex items-center justify-between p-2 bg-neutral-700/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <TokenIcon
                                mint="So11111111111111111111111111111111111111112"
                                symbol="SOL"
                                className="w-6 h-6"
                              />
                              <div>
                                <div className="text-xs font-semibold text-white">SOL</div>
                                <div className="text-[10px] text-neutral-400">Solana</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold text-white">
                                {solBalance.toFixed(4)}
                              </div>
                              <div className="text-[10px] text-neutral-400">SOL</div>
                            </div>
                          </div>

                          {/* SPL Token Balances */}
                          {allTokenBalances.map((token) => (
                            <div
                              key={token.mint}
                              className="flex items-center justify-between p-2 bg-neutral-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <TokenIcon
                                  mint={token.mint}
                                  symbol={token.symbol}
                                  className="w-6 h-6"
                                />
                                <div>
                                  <div className="text-xs font-semibold text-white">
                                    {token.symbol}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 truncate max-w-[100px]">
                                    {token.mint.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-semibold text-white">
                                  {token.balance.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-neutral-400">{token.symbol}</div>
                              </div>
                            </div>
                          ))}

                          {allTokenBalances.length === 0 && !fetchingTokens && (
                            <div className="text-center py-4 text-neutral-500 text-xs">
                              No tokens found
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-neutral-700 p-3 space-y-2">
                      <button
                        onClick={async () => {
                          setShowWalletDropdown(false);
                          try {
                            // Disconnect wallet and clear all app state
                            logout();

                            // Clear wallet adapter localStorage to force reselection
                            const keysToRemove = [];
                            for (let i = 0; i < localStorage.length; i++) {
                              const key = localStorage.key(i);
                              if (key && (key.includes('walletName') || key.includes('wallet-adapter'))) {
                                keysToRemove.push(key);
                              }
                            }
                            keysToRemove.forEach(key => localStorage.removeItem(key));

                            console.log('🔵 Cleared wallet adapter cache, waiting before reconnect...');

                            // Wait for full disconnect and cache clear
                            setTimeout(() => {
                              handleConnectWallet();
                            }, 800);
                          } catch (error) {
                            console.error('Error changing wallet:', error);
                            handleConnectWallet();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Change Wallet
                      </button>
                      <button
                        onClick={() => {
                          setShowWalletDropdown(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors"
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
          )}

          {/* Balances Display (when expanded and connected) */}
          <AnimatePresence>
            {(isExpanded || isMobileOpen) && connected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {/* Session Credits Balance */}
                <div className="px-3 py-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <div className="text-xs text-purple-300 font-medium">💰 Credits</div>
                      {hasActiveSession && (
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Active Session" />
                      )}
                    </div>
                    <div className="flex gap-1">
                      {hasActiveSession && sessionBalance > 0 && (
                        <button
                          onClick={handleOpenWithdrawModal}
                          disabled={withdrawing}
                          className="text-[10px] px-2 py-0.5 rounded bg-red-500/30 hover:bg-red-500/50 text-red-200 transition-colors disabled:opacity-50"
                          title="Withdraw credits"
                        >
                          Withdraw
                        </button>
                      )}
                      <button
                        onClick={() => setShowDepositModal(true)}
                        className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 transition-colors"
                        title="Add more credits"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {loading ? (
                      <span className="animate-pulse text-sm">Loading...</span>
                    ) : hasActiveSession ? (
                      <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-1.5">
                        ${sessionBalance.toFixed(2)}
                        <UsdcIcon size={16} />
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-400">No deposit</span>
                    )}
                  </div>
                </div>

                {/* Wallet USDC Balance */}
                <div className="px-3 py-2 bg-neutral-700/50 rounded-lg border border-neutral-600/50">
                  <div className="text-xs text-neutral-400 mb-1">Wallet USDC</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1">
                    {loading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      <>
                        ${walletBalance.toFixed(2)}
                        <UsdcIcon size={14} />
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {connected && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 transition-colors group"
              >
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-5 h-5 rounded-full object-cover border border-neutral-700 flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(username || publicKey?.toBase58() || 'U')[0].toUpperCase()}
                  </div>
                )}
                <motion.span
                  initial={false}
                  animate={{ opacity: isExpanded || isMobileOpen ? 1 : 0 }}
                  className="text-sm whitespace-nowrap"
                >
                  {username || 'Profile'}
                </motion.span>
              </button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <Link
                      to="/profile"
                      onClick={() => {
                        setShowProfileMenu(false);
                        closeMobileMenu();
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-neutral-700 hover:text-red-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Deposit Modal */}
      <SessionCreationModal
        isOpen={showDepositModal}
        onClose={() => {
          setShowDepositModal(false);
        }}
        onSessionCreated={() => {
          // Don't close modal - let user add more credits
          // Just refresh balances
          fetchSessionBalance();
          fetchWalletBalance();
        }}
        hasExistingSession={hasActiveSession}
      />

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !withdrawing && setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-800 rounded-2xl border border-neutral-700 p-6 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Withdraw Credits</h2>
              <p className="text-sm text-neutral-400 mb-6 flex items-center gap-1">
                Available balance: <span className="text-purple-400 font-semibold flex items-center gap-1">${sessionBalance.toFixed(2)}<UsdcIcon size={14} /></span>
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Withdrawal Amount (USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="0"
                    max={sessionBalance}
                    step="0.01"
                    placeholder="0.00"
                    disabled={withdrawing}
                    className="w-full pl-8 pr-4 py-3 bg-neutral-900 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setWithdrawAmount((sessionBalance * 0.25).toFixed(2))}
                    disabled={withdrawing}
                    className="flex-1 text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors disabled:opacity-50"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((sessionBalance * 0.5).toFixed(2))}
                    disabled={withdrawing}
                    className="flex-1 text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors disabled:opacity-50"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((sessionBalance * 0.75).toFixed(2))}
                    disabled={withdrawing}
                    className="flex-1 text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors disabled:opacity-50"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount(sessionBalance.toFixed(2))}
                    disabled={withdrawing}
                    className="flex-1 text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors disabled:opacity-50"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                  }}
                  disabled={withdrawing}
                  className="flex-1 px-4 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawCredits}
                  disabled={withdrawing}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium transition-all disabled:opacity-50"
                >
                  {withdrawing ? 'Withdrawing...' : 'Confirm Withdraw'}
                </button>
              </div>

              <p className="text-xs text-neutral-500 mt-4 text-center">
                {parseFloat(withdrawAmount || '0') >= sessionBalance
                  ? 'Withdrawing all credits will close your session'
                  : 'Your session will remain active with the remaining balance'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Simple icon component
function Icon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    home: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    sparkles: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    ),
    video: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}
