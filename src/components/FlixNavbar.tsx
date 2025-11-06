import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet, useConnection } from '../hooks/useWallet';
import { WalletMultiButton } from '../hooks/useWallet';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchTokenMetadata } from '../services/helius-token-metadata.service';
import { queueRPCRequest, RPC_PRIORITY } from '../services/rpc-queue.service';

/**
 * YouTube-style Navbar for Flix
 * Modern, minimal design with smooth interactions
 */
export default function FlixNavbar() {
  const location = useLocation();
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [balances, setBalances] = useState<{ mint: string; balance: number; symbol: string; name: string; logo?: string }[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // DEBUG: Verify new code is loaded
  console.log('🔵 FlixNavbar loaded with dropdown functionality - Version 2.0');

  const isActive = (path: string) => location.pathname === path;

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

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

  // Fetch wallet balances with RPC queue (prevents rate limiting)
  const fetchBalances = async () => {
    if (!publicKey || !connected) return;

    console.log('🔵 FlixNavbar: Fetching balances (queued)...');
    setLoading(true);
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

      setBalances(tokens);
      console.log('🔵 FlixNavbar: Found', tokens.length, 'tokens with balances');
    } catch (error: any) {
      console.error('❌ FlixNavbar: Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch balances when dropdown opens
  useEffect(() => {
    if (showDropdown && connected) {
      fetchBalances();
    }
  }, [showDropdown, connected]);


  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === 'undefined') {
      return;
    }

    const isMobileViewport = window.matchMedia('(max-width: 1023px)').matches;
    if (!isMobileViewport) {
      return;
    }

    event.preventDefault();
    window.dispatchEvent(new CustomEvent('toggleSidebar'));
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/payflix', label: 'PayFlix', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { path: '/creator', label: 'Creator Studio', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { path: '/account', label: 'My Account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-flix-dark border-b border-flix-light-gray"
    >
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center group" onClick={handleLogoClick}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <img
                src="/payflix-official-logo.svg"
                alt="PayFlix Icon"
                className="h-12 w-auto object-contain"
              />
              <img
                src="/payflix-text.svg"
                alt="PayFlix"
                className="h-8 w-auto object-contain"
              />
            </motion.div>
          </Link>

          {/* Center: Search */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="w-full h-10 px-4 pr-12 bg-flix-gray border border-flix-light-gray rounded-full text-white placeholder-flix-text-secondary focus:outline-none focus:border-flix-cyan transition-colors"
              />
              <button className="absolute right-0 top-0 h-10 w-12 flex items-center justify-center bg-flix-light-gray rounded-r-full border-l border-flix-gray hover:bg-flix-cyan transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Navigation & Wallet */}
          <div className="flex items-center space-x-6">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                    isActive(link.path)
                      ? 'text-flix-cyan bg-flix-gray'
                      : 'text-flix-text-secondary hover:text-white hover:bg-flix-gray'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                  </svg>
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Wallet Button */}
            {!connected ? (
              <WalletMultiButton className="!bg-flix-cyan hover:!bg-opacity-80 !rounded-lg !h-10 !px-4 !text-sm !font-medium !transition" />
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    console.log('🔵 Wallet button clicked! Current dropdown state:', showDropdown);
                    setShowDropdown(!showDropdown);
                  }}
                  className="bg-flix-cyan hover:bg-opacity-80 rounded-lg px-4 h-10 text-sm font-medium transition text-white flex items-center space-x-2"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>{publicKey ? shortenAddress(publicKey.toBase58()) : 'Unknown'}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-flix-dark border border-flix-light-gray rounded-xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-flix-cyan to-flix-purple p-4 text-white">
                      <div className="text-xs font-medium opacity-80 mb-1">Wallet Address</div>
                      <div className="font-mono text-sm break-all">
                        {publicKey?.toBase58()}
                      </div>
                    </div>

                    {/* Balances */}
                    <div className="p-4">
                      <div className="text-sm font-semibold text-white mb-3">Token Balances</div>

                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-flix-cyan border-t-transparent"></div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {/* SOL Balance */}
                          <div className="flex items-center justify-between p-3 bg-flix-gray rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">◎</span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-white">SOL</div>
                                <div className="text-xs text-flix-text-secondary">Solana</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-white">
                                {solBalance.toFixed(4)}
                              </div>
                              <div className="text-xs text-flix-text-secondary">SOL</div>
                            </div>
                          </div>

                          {/* Token Balances */}
                          {balances.map((token) => (
                            <div
                              key={token.mint}
                              className="flex items-center justify-between p-3 bg-flix-gray rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-flix-cyan to-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {token.symbol.slice(0, 1)}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    {token.symbol}
                                  </div>
                                  <div className="text-xs text-flix-text-secondary truncate max-w-[120px]">
                                    {token.mint.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-white">
                                  {token.balance.toLocaleString()}
                                </div>
                                <div className="text-xs text-flix-text-secondary">{token.symbol}</div>
                              </div>
                            </div>
                          ))}

                          {balances.length === 0 && !loading && (
                            <div className="text-center py-6 text-flix-text-secondary text-sm">
                              No tokens found
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-flix-light-gray p-4">
                      <button
                        onClick={() => {
                          disconnect();
                          setShowDropdown(false);
                        }}
                        className="w-full bg-red-500 bg-opacity-10 hover:bg-opacity-20 text-red-400 font-medium py-2.5 rounded-lg transition flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex overflow-x-auto pb-2 space-x-4 scrollbar-hide">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                isActive(link.path)
                  ? 'text-flix-cyan bg-flix-gray'
                  : 'text-flix-text-secondary hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
              </svg>
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
