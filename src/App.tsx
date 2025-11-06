import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaWalletProvider } from './contexts/SolanaWalletProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ShaderBackground from './components/ShaderBackground';
import SplashScreen from './components/SplashScreen';
import Sidebar from './components/Sidebar';
import SessionManager from './components/SessionManager';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Profile from './pages/Profile';
import CreatorDashboard from './pages/CreatorDashboard';
import Account from './pages/Account';
import PayFlix from './pages/PayFlix';
import ButtonDemo from './pages/ButtonDemo';

/**
 * PAYFLIX - Web3 Video Platform
 * Modern UI with Three.js background and seamless navigation
 */

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { publicKey, connected } = useWallet();

  // Use wallet address as key to force remount when wallet changes
  // This ensures all component state (like form inputs) is completely reset
  const walletAddress = publicKey?.toBase58();
  const walletKey = walletAddress || 'no-wallet';

  const handleEnter = () => {
    setShowSplash(false);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white overflow-hidden">
      {/* Three.js Shader Background */}
      <ShaderBackground />

      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen onEnter={handleEnter} />}
      </AnimatePresence>

      {/* Main Content - key prop forces remount when wallet changes */}
      {!showSplash && (
        <div key={walletKey}>
          {/* Session Manager - Prompts deposit on wallet connect */}
          <SessionManager />

          <div className="flex h-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Pages Container */}
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/payflix" element={<PayFlix />} />
                  <Route path="/video/:id" element={<VideoPlayer />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/profile/:wallet" element={<Profile />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/creator-dashboard" element={<CreatorDashboard />} />
                  <Route path="/button-demo" element={<ButtonDemo />} />
                </Routes>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SolanaWalletProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </SolanaWalletProvider>
    </BrowserRouter>
  );
}

export default App;
