import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SolanaWalletProvider } from './contexts/SolanaWalletProvider';
import { WalletProvider } from './contexts/WalletContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Profile from './pages/Profile';
import CreatorDashboard from './pages/CreatorDashboard';

/**
 * Nftq. - NFT Marketplace
 * Video NFT platform with instant monetization
 */
function App() {
  return (
    <SolanaWalletProvider>
      <WalletProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Sidebar />
            <main className="ml-64 mt-20 p-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/video/:id" element={<VideoPlayer />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/creator" element={<CreatorDashboard />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </WalletProvider>
    </SolanaWalletProvider>
  );
}

export default App;
