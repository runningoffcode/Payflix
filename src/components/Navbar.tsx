import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

export default function Navbar() {
  const { walletAddress, isConnected, connectWallet, disconnectWallet } = useWallet();

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Nftq.</div>
              <div className="text-xs text-gray-500 -mt-1">NFT Marketplace</div>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search Item, Collection and Account.."
                className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 text-gray-700"
              />
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-6">
            <button className="text-gray-600 hover:text-indigo-600 transition font-medium">
              User
            </button>
            <button className="text-gray-600 hover:text-indigo-600 transition font-medium">
              Creator
            </button>

            {/* Notification */}
            <button className="relative p-2 hover:bg-gray-50 rounded-lg transition">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Profile */}
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full"></div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-indigo-600 px-6 py-2.5 rounded-lg text-white font-medium hover:bg-indigo-700 transition"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
