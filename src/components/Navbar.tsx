import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

export default function Navbar() {
  const { walletAddress, isConnected, connectWallet, disconnectWallet, isCreator, becomeCreator } = useWallet();

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <nav className="glass-effect border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="gradient-bg w-10 h-10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎬</span>
            </div>
            <span className="text-2xl font-bold text-white">Flix</span>
            <span className="text-xs bg-flix-primary/20 text-flix-primary px-2 py-1 rounded">
              x402
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-300 hover:text-white transition">
              Videos
            </Link>
            {isConnected && (
              <>
                <Link to="/profile" className="text-gray-300 hover:text-white transition">
                  My Library
                </Link>
                {isCreator && (
                  <Link to="/creator" className="text-gray-300 hover:text-white transition">
                    Creator Studio
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                {!isCreator && (
                  <button
                    onClick={becomeCreator}
                    className="px-4 py-2 bg-flix-secondary/20 text-flix-secondary rounded-lg hover:bg-flix-secondary/30 transition"
                  >
                    Become Creator
                  </button>
                )}
                <div className="flex items-center space-x-2 glass-effect px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-white">{shortenAddress(walletAddress!)}</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-gray-400 hover:text-white transition"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                className="gradient-bg px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isConnected && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 space-x-4">
          <Link to="/" className="text-gray-300 hover:text-white transition text-sm">
            Videos
          </Link>
          <Link to="/profile" className="text-gray-300 hover:text-white transition text-sm">
            My Library
          </Link>
          {isCreator && (
            <Link to="/creator" className="text-gray-300 hover:text-white transition text-sm">
              Creator Studio
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
