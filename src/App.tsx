import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Profile from './pages/Profile';
import CreatorDashboard from './pages/CreatorDashboard';

function App() {
  return (
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
  );
}

export default App;
