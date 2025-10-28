import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export default function Sidebar() {
  const location = useLocation();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // USDC Mint Address on Devnet
  const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

  useEffect(() => {
    if (connected && publicKey) {
      fetchUSDCBalance();
    } else {
      setUsdcBalance(0);
    }
  }, [connected, publicKey]);

  const fetchUSDCBalance = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // Get associated token account for USDC
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: USDC_MINT,
      });

      if (tokenAccounts.value.length > 0) {
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        setUsdcBalance(balance || 0);
      } else {
        setUsdcBalance(0);
      }
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      setUsdcBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/market', icon: 'market', label: 'Market' },
    { path: '/bids', icon: 'bids', label: 'Active Bids' },
  ];

  const profileItems = [
    { path: '/profile', icon: 'portfolio', label: 'My Portfolio' },
    { path: '/wallet', icon: 'wallet', label: 'Wallet' },
    { path: '/favourites', icon: 'heart', label: 'Favourites' },
    { path: '/history', icon: 'history', label: 'History' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ];

  return (
    <aside className="fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 bg-white border-r border-gray-100 flex flex-col">
      <div className="flex-1 px-4 py-6 space-y-8">
        {/* Main Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                isActive(item.path)
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.icon === 'dashboard' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
              {item.icon === 'market' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
              {item.icon === 'bids' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Profile Section */}
        <div>
          <h3 className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Profile
          </h3>
          <nav className="space-y-1">
            {profileItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  isActive(item.path)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.icon === 'portfolio' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                {item.icon === 'wallet' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
                {item.icon === 'heart' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
                {item.icon === 'history' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {item.icon === 'settings' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Light/Dark Mode Toggle */}
      <div className="px-4 py-6 border-t border-gray-100">
        <button className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-gray-50 transition">
          <span className="text-gray-600 font-medium text-sm">Light Mode</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
        </button>

        {/* Balance Card */}
        <div className="mt-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="text-sm opacity-90 mb-2">Your Balance</div>
          {connected ? (
            <>
              <div className="text-3xl font-bold mb-4">
                {loading ? (
                  <div className="animate-pulse">Loading...</div>
                ) : (
                  <>{usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                )}
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="#2775CA"/>
                    <text x="12" y="16" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">$</text>
                  </svg>
                </div>
                <span className="text-sm">USDC</span>
              </div>
              <button
                onClick={fetchUSDCBalance}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm py-3 rounded-xl font-medium transition flex items-center justify-between px-4"
              >
                <span>Refresh Balance</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold mb-4">0.00</div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="#2775CA"/>
                    <text x="12" y="16" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">$</text>
                  </svg>
                </div>
                <span className="text-sm">USDC</span>
              </div>
              <div className="w-full bg-white/20 py-3 rounded-xl font-medium text-center text-sm opacity-75">
                Connect wallet to view balance
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
