import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import SessionCreationModal from './SessionCreationModal';

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
  const location = useLocation();
  const { connected, publicKey, disconnect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  // USDC Mint Address
  const USDC_MINT = new PublicKey(import.meta.env.VITE_USDC_MINT_ADDRESS || 'DRXxfmg3PEk5Ad6DKuGSfa93ZLHDzXJKxcnjaAUGmW3z');

  useEffect(() => {
    if (connected && publicKey) {
      fetchSessionBalance();
      fetchWalletBalance();
      fetchUserProfile();
    } else {
      setSessionBalance(0);
      setWalletBalance(0);
      setHasActiveSession(false);
      setProfilePicture(null);
      setUsername(null);
    }
  }, [connected, publicKey]);

  // Poll balances every 10 seconds to keep them updated
  useEffect(() => {
    if (connected && publicKey) {
      const interval = setInterval(() => {
        fetchSessionBalance();
        fetchWalletBalance();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  const fetchSessionBalance = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const walletAddress = publicKey.toBase58();
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
    if (!publicKey) return;

    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: USDC_MINT,
      });

      if (tokenAccounts.value.length > 0) {
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        setWalletBalance(balance || 0);
      } else {
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    }
  };

  const fetchUserProfile = async () => {
    if (!publicKey) return;

    try {
      const walletAddress = publicKey.toBase58();
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

  const navItems = [
    { path: '/', icon: 'home', label: 'Home' },
    { path: '/payflix', icon: 'sparkles', label: 'Why PayFlix' },
    { path: '/creator-studio', icon: 'video', label: 'Creator Dashboard' },
  ];

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await disconnect();
      setShowProfileMenu(false);
      closeMobileMenu();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
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
        onMouseLeave={() => window.innerWidth >= 768 && setIsExpanded(false)}
        className="fixed md:relative h-full bg-neutral-800 z-40 flex flex-col pt-4 pb-4"
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
              {connected ? `${publicKey?.toString().slice(0, 4)}...${publicKey?.toString().slice(-4)}` : 'Connect Wallet'}
            </motion.span>
          </button>

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
                    <button
                      onClick={() => setShowDepositModal(true)}
                      className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 transition-colors"
                      title="Add more credits"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {loading ? (
                      <span className="animate-pulse text-sm">Loading...</span>
                    ) : hasActiveSession ? (
                      <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ${sessionBalance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-400">No deposit</span>
                    )}
                  </div>
                </div>

                {/* Wallet USDC Balance */}
                <div className="px-3 py-2 bg-neutral-700/50 rounded-lg border border-neutral-600/50">
                  <div className="text-xs text-neutral-400 mb-1">Wallet USDC</div>
                  <div className="text-sm font-semibold text-white">
                    {loading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      `$${walletBalance.toFixed(2)}`
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
          setShowDepositModal(false);
          // Refresh balances after deposit
          fetchSessionBalance();
          fetchWalletBalance();
        }}
      />
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
