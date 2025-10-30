import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SolanaWalletProvider } from './contexts/SolanaWalletProvider';
import { AuthProvider } from './contexts/AuthContext';
import ShaderBackground from './components/ShaderBackground';
import SplashScreen from './components/SplashScreen';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Profile from './pages/Profile';
import CreatorStudio from './pages/CreatorStudio';
import Account from './pages/Account';
import PayFlix from './pages/PayFlix';
import ButtonDemo from './pages/ButtonDemo';

/**
 * PAYFLIX - Web3 Video Platform
 * Modern UI with Three.js background and seamless navigation
 */

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

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

      {/* Main Content */}
      {!showSplash && (
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
                <Route path="/creator-studio" element={<CreatorStudio />} />
                <Route path="/button-demo" element={<ButtonDemo />} />
              </Routes>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <SolanaWalletProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </SolanaWalletProvider>
  );
}

export default App;
