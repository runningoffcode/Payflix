import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Creator Dashboard - Modern Design
 * Analytics + Upload in a clean, professional layout
 */
export default function CreatorStudio() {
  const { publicKey, connected } = useWallet();
  const { user, token, login, becomeCreator } = useAuth();

  // Upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoPrice, setVideoPrice] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Mock stats - replace with real data
  const stats = {
    totalVideos: 42,
    totalViews: 2500000,
    totalEarnings: 8426,
    subscribers: 12400,
  };

  const handleVideoUpload = async () => {
    if (!videoTitle || !videoPrice || !publicKey) {
      setUploadError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadError('');
    setProgress(0);

    try {
      let currentToken = token;
      let currentUser = user;

      // Step 0: Authenticate
      if (!currentToken || !currentUser) {
        setStage('Authenticating...');
        setProgress(5);
        await login();
        await new Promise(resolve => setTimeout(resolve, 1500));

        currentToken = localStorage.getItem('flix_auth_token');
        const userStr = localStorage.getItem('flix_user');
        currentUser = userStr ? JSON.parse(userStr) : null;
      }

      // Step 0.5: Become creator if needed
      if (currentUser && !currentUser.isCreator) {
        setStage('Setting up creator account...');
        setProgress(8);
        await becomeCreator();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const walletAddress = publicKey.toBase58();

      if (videoFile) {
        // Full upload with file
        setStage('Uploading to Arweave...');
        setProgress(10);

        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('title', videoTitle);
        formData.append('description', videoDescription || '');
        formData.append('priceUsdc', videoPrice);
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
        if (category) formData.append('category', category);

        const response = await fetch('http://localhost:5001/api/upload/video', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        setProgress(100);
        setStage('✅ Upload complete!');
      } else {
        // Quick listing without file
        setStage('Creating listing...');
        setProgress(30);

        const videoId = `video_${Date.now()}`;
        const thumbnailUrl = thumbnailFile
          ? URL.createObjectURL(thumbnailFile)
          : `https://picsum.photos/seed/${videoId}/640/360`;

        const response = await fetch('http://localhost:5001/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: videoTitle,
            description: videoDescription || '',
            priceUsdc: parseFloat(videoPrice),
            creatorWallet: walletAddress,
            thumbnailUrl,
            videoUrl: `/api/videos/${videoId}/stream`,
            category: category || 'General',
          }),
        });

        if (!response.ok) throw new Error('Failed to create listing');

        setProgress(100);
        setStage('✅ Created successfully!');
      }

      // Reset form
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setVideoPrice('');
      setCategory('');

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!connected) {
    return (
      <main className="flex flex-col overflow-y-auto h-full relative items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10"
        >
          <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-semibold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-neutral-400">Please connect your wallet to access Creator Dashboard</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex flex-col lg:px-16 overflow-y-auto h-full pr-8 pl-8 py-8 relative z-10">
      <div className="max-w-7xl w-full mr-auto ml-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-3">Creator Dashboard</h1>
          <p className="text-neutral-400">Manage your content and track your earnings.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-6 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-green-400 font-medium">+5</span>
            </div>
            <div className="text-2xl font-semibold mb-1">{stats.totalVideos}</div>
            <div className="text-sm text-neutral-400">Total Videos</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-6 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs text-green-400 font-medium">+12.5%</span>
            </div>
            <div className="text-2xl font-semibold mb-1">{(stats.totalViews / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-neutral-400">Total Views</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-6 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="text-xs text-green-400 font-medium">+23.1%</span>
            </div>
            <div className="text-2xl font-semibold mb-1">${stats.totalEarnings.toLocaleString()}</div>
            <div className="text-sm text-neutral-400">Total Earnings</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-6 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs text-green-400 font-medium">+8.2%</span>
            </div>
            <div className="text-2xl font-semibold mb-1">{(stats.subscribers / 1000).toFixed(1)}K</div>
            <div className="text-sm text-neutral-400">Subscribers</div>
          </motion.div>
        </div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Upload New Video</h3>
            <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Video
            </button>
          </div>

          {uploadError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {uploadError}
            </div>
          )}

          {uploading && (
            <div className="mb-6 p-4 bg-neutral-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{stage}</span>
                <span className="text-purple-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-neutral-900 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Video Title *</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Enter video title..."
                className="w-full px-4 py-2 bg-neutral-700/50 border border-neutral-600/50 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Price (USDC) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={videoPrice}
                onChange={(e) => setVideoPrice(e.target.value)}
                placeholder="4.99"
                className="w-full px-4 py-2 bg-neutral-700/50 border border-neutral-600/50 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Describe your video..."
                rows={3}
                className="w-full px-4 py-2 bg-neutral-700/50 border border-neutral-600/50 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-700/50 border border-neutral-600/50 rounded-lg text-white focus:outline-none focus:border-purple-500/50 transition-colors"
              >
                <option value="">Select category</option>
                <option value="Education">Education</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Gaming">Gaming</option>
                <option value="Music">Music</option>
                <option value="Technology">Technology</option>
                <option value="Sports">Sports</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-neutral-700/50 border border-neutral-600/50 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white file:cursor-pointer hover:file:bg-purple-600 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleVideoUpload}
            disabled={uploading || !videoTitle || !videoPrice}
            className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : videoFile ? '🚀 Upload to Arweave' : '📝 Create Listing'}
          </button>
        </motion.div>

        {/* Your Videos Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Your Videos</h3>
          </div>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-neutral-400 mb-4">No videos uploaded yet</p>
            <p className="text-sm text-neutral-500">Upload your first video to start earning</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
