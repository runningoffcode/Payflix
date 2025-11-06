import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
import Landing from './pages/Landing';

/**
 * PAYFLIX - Web3 Video Platform
 * Modern UI with Three.js background and seamless navigation
 */

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLanding, setShowLanding] = useState(false);
  const [landingDismissed, setLandingDismissed] = useState(false);
  const { publicKey, connected } = useWallet();
  const location = useLocation();

  // Use wallet address as key to force remount when wallet changes
  // This ensures all component state (like form inputs) is completely reset
  const walletAddress = publicKey?.toBase58();
  const walletKey = walletAddress || 'no-wallet';

  const handleEnter = () => {
    setShowSplash(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hostname = window.location.hostname.toLowerCase();
    const isLandingDomain = hostname === 'payflix.fun' || hostname === 'www.payflix.fun';

    if (isLandingDomain && location.pathname === '/' && !landingDismissed) {
      setShowLanding(true);
    } else {
      setShowLanding(false);
    }
  }, [landingDismissed, location.pathname]);

  const handleMobileLogoClick = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('toggleSidebar'));
  }, []);

  const isVideoRoute = location.pathname.startsWith('/video/');
  const topOffset = 'calc(env(safe-area-inset-top, 0px) + 1.033rem)';
  const sideOffset = 'calc(env(safe-area-inset-left, 0px) + 0.9rem)';
  const sideOffsetRight = 'calc(env(safe-area-inset-right, 0px) + 0.9rem)';

  if (showLanding) {
    return <Landing onEnter={() => setLandingDismissed(true)} />;
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
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

          {/* Mobile Sidebar Trigger */}
          <button
            type="button"
            onClick={handleMobileLogoClick}
            className="md:hidden fixed z-30 flex items-center justify-center bg-transparent border-0 p-2"
            aria-label="Open navigation menu"
            style={{
              top: topOffset,
              left: isVideoRoute ? undefined : sideOffset,
              right: isVideoRoute ? sideOffsetRight : undefined,
            }}
          >
            <img
              src="/payflix-text-flat.svg"
              alt="PayFlix"
              className="h-10 w-auto object-contain"
            />
          </button>

          <div className="flex min-h-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Pages Container */}
            <div className="flex-1 relative min-h-screen overflow-y-auto">
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
