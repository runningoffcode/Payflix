import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SolanaWalletProvider } from './contexts/SolanaWalletProvider';
import FlixNavbar from './components/FlixNavbar';
import WalletBalance from './components/WalletBalance';
import RightSidebar from './components/RightSidebar';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Profile from './pages/Profile';
import CreatorStudio from './pages/CreatorStudio';
import Account from './pages/Account';
import PayFlix from './pages/PayFlix';

/**
 * FLIX - Modern Video Platform
 * YouTube-inspired interface with Web3 monetization
 */

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-flix-dark">
      <FlixNavbar />
      <WalletBalance />
      <RightSidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`pt-16 ${isHomePage ? 'xl:pr-80' : ''}`}
      >
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/payflix" element={<PayFlix />} />
            <Route path="/video/:id" element={<VideoPlayer />} />
            <Route path="/account" element={<Account />} />
            <Route path="/profile/:wallet" element={<Profile />} />
            <Route path="/creator" element={<CreatorStudio />} />
          </Routes>
        </AnimatePresence>
      </motion.main>
    </div>
  );
}

function App() {
  return (
    <SolanaWalletProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </SolanaWalletProvider>
  );
}

export default App;
