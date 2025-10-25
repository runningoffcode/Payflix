import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SolanaWalletProvider } from './contexts/SolanaWalletProvider';
import { WalletProvider } from './contexts/WalletContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Profile from './pages/Profile';
import CreatorDashboard from './pages/CreatorDashboard';

/**
 * Flix App v2.0
 * Features:
 * - Real Solana wallet integration (Phantom/Solflare/Backpack/Glow)
 * - X402 payment protocol
 * - Arweave decentralized storage
 * - JWT authentication
 * - AI-powered payment verification
 */
function App() {
  return (
    <SolanaWalletProvider>
      <WalletProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-flix-darker">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/video/:id" element={<VideoPlayer />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/creator" element={<CreatorDashboard />} />
            </Routes>
          </div>
        </BrowserRouter>
      </WalletProvider>
    </SolanaWalletProvider>
  );
}

export default App;
