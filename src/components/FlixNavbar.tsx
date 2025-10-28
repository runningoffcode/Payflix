import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

/**
 * YouTube-style Navbar for Flix
 * Modern, minimal design with smooth interactions
 */
export default function FlixNavbar() {
  const location = useLocation();
  const { connected } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (path: string) => location.pathname === path;

  // Embedded logo as base64 data URL
  const flixLogoBase64 = "data:image/png;base64,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";

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
          <Link to="/" className="flex items-center group">
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
            <WalletMultiButton className="!bg-flix-cyan hover:!bg-opacity-80 !rounded-lg !h-10 !px-4 !text-sm !font-medium !transition" />
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
