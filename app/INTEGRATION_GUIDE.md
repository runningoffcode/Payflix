# Integration Guide: Connecting Supabase Backend to Flix Frontend

This guide shows how to integrate the new Supabase backend with your existing YouTube-style Flix frontend.

## Overview

You now have:
- ✅ **Frontend**: YouTube-style React UI with Tailwind CSS
- ✅ **Backend**: Complete Supabase infrastructure
- 🔄 **Next Step**: Connect them together

---

## Step 1: Update Home Page to Use Real Data

Replace mock data with real videos from Supabase.

### Before (Mock Data):
```typescript
// src/pages/Home.tsx
import { videos } from '../data/mockData';
```

### After (Real Data):
```typescript
// src/pages/Home.tsx
import { useTrendingVideos } from '../hooks/useVideos';

export default function Home() {
  const { videos, loading, error } = useTrendingVideos(50);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-white">Loading videos...</div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-flix-dark">
      {/* Category pills */}
      <div className="sticky top-16 z-40 bg-flix-dark border-b border-flix-light-gray">
        {/* ... existing category code ... */}
      </div>

      {/* Video Grid */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <FlixVideoCard video={video} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Step 2: Add Authentication to Navbar

Replace the WalletMultiButton with Supabase Auth.

### Update FlixNavbar.tsx:
```typescript
// src/components/FlixNavbar.tsx
import { useAuth } from '../hooks/useAuth';

export default function FlixNavbar() {
  const { user, signOut, isAuthenticated } = useAuth();

  return (
    <motion.nav className="fixed top-0 left-0 right-0 z-50 bg-flix-dark border-b border-flix-light-gray">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <PlayCircle className="w-8 h-8 text-flix-cyan" />
            <span className="text-2xl font-bold text-white">Flix</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-2xl mx-8">
            {/* ... existing search code ... */}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link to="/upload" className="text-flix-text-secondary hover:text-white">
                  <Upload className="w-6 h-6" />
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-white">
                    <img 
                      src={user.profile_image_url || '/default-avatar.png'} 
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                  </button>
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-flix-light-gray rounded-lg shadow-lg hidden group-hover:block">
                    <Link to="/dashboard" className="block px-4 py-2 text-white hover:bg-flix-gray">
                      {user.role === 'creator' ? 'Creator Dashboard' : 'My Account'}
                    </Link>
                    <button onClick={signOut} className="block w-full text-left px-4 py-2 text-white hover:bg-flix-gray">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/signin" className="bg-flix-cyan text-black px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
```

---

## Step 3: Create Sign In/Sign Up Pages

### Create src/pages/SignIn.tsx:
```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn(email, password);
    
    if (!result.error) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-flix-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-flix-light-gray p-8 rounded-lg shadow-xl max-w-md w-full"
      >
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Sign In to Flix
        </h2>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-500 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-flix-gray text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-flix-cyan"
              required
            />
          </div>

          <div>
            <label className="block text-white mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-flix-gray text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-flix-cyan"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-flix-cyan text-black font-semibold py-3 rounded hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-flix-text-secondary text-center mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-flix-cyan hover:underline">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
```

### Create src/pages/SignUp.tsx:
```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'creator' | 'viewer'>('viewer');
  const { signUp, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signUp(email, password, { username, role });
    
    if (!result.error) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-flix-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-flix-light-gray p-8 rounded-lg shadow-xl max-w-md w-full"
      >
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Create Your Flix Account
        </h2>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-500 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-flix-gray text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-flix-cyan"
              required
            />
          </div>

          <div>
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-flix-gray text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-flix-cyan"
              required
            />
          </div>

          <div>
            <label className="block text-white mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-flix-gray text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-flix-cyan"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-white mb-2">I want to...</label>
            <div className="flex space-x-4">
              <label className="flex items-center text-white">
                <input
                  type="radio"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={(e) => setRole(e.target.value as 'viewer')}
                  className="mr-2"
                />
                Watch Videos
              </label>
              <label className="flex items-center text-white">
                <input
                  type="radio"
                  value="creator"
                  checked={role === 'creator'}
                  onChange={(e) => setRole(e.target.value as 'creator')}
                  className="mr-2"
                />
                Create Content
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-flix-cyan text-black font-semibold py-3 rounded hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-flix-text-secondary text-center mt-4">
          Already have an account?{' '}
          <Link to="/signin" className="text-flix-cyan hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
```

---

## Step 4: Update App.tsx with Auth Routes

```typescript
// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FlixNavbar from './components/FlixNavbar';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import { SolanaWalletProvider } from './contexts/SolanaWalletProvider';

function App() {
  return (
    <SolanaWalletProvider>
      <Router>
        <div className="bg-flix-dark min-h-screen">
          <FlixNavbar />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SolanaWalletProvider>
  );
}

export default App;
```

---

## Step 5: Update FlixVideoCard to Handle Real Data

Make sure the video card component works with Supabase data:

```typescript
// src/components/FlixVideoCard.tsx
interface FlixVideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string;
    duration: number; // in seconds
    views: number;
    price: number;
    created_at: string;
    creator: {
      username: string;
      profile_image_url: string | null;
    };
  };
}

export default function FlixVideoCard({ video }: FlixVideoCardProps) {
  // Convert duration from seconds to MM:SS format
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format view count
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  // Calculate time ago
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-flix-light-gray rounded-xl overflow-hidden mb-3">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.duration)}
        </div>

        {/* Price tag (if not free) */}
        {video.price > 0 && (
          <div className="absolute top-2 right-2 bg-flix-cyan text-black text-xs font-bold px-2 py-1 rounded">
            ${video.price.toFixed(2)}
          </div>
        )}

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <PlayCircle className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>

      {/* Video info */}
      <div className="flex space-x-3">
        <img
          src={video.creator.profile_image_url || '/default-avatar.png'}
          alt={video.creator.username}
          className="w-9 h-9 rounded-full flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold line-clamp-2 group-hover:text-flix-cyan transition-colors">
            {video.title}
          </h3>
          <p className="text-flix-text-secondary text-sm mt-1">
            {video.creator.username}
          </p>
          <p className="text-flix-text-secondary text-sm">
            {formatViews(video.views)} views • {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## Quick Checklist

Before going live, ensure:

- [ ] Supabase project created and schema deployed
- [ ] Storage buckets created (videos, thumbnails, profile-images)
- [ ] `.env.local` configured with Supabase credentials
- [ ] Auth pages created (SignIn, SignUp)
- [ ] Navbar updated with auth buttons
- [ ] Home page using `useTrendingVideos()` hook
- [ ] Video cards formatted for Supabase data
- [ ] Routes added to App.tsx

---

## Testing the Integration

1. **Sign Up**: Create a creator account
2. **Sign In**: Log in with your credentials
3. **View Videos**: Should see "No videos yet" or existing videos
4. **Upload**: Use the upload functionality (to be built)
5. **Dashboard**: View creator stats

---

## Next Steps

After integration:
1. Build video upload page
2. Create creator dashboard
3. Implement video player with unlock
4. Add search functionality
5. Build trending page

You're all set! 🚀
