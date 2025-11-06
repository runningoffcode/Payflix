import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import AnalyticsDashboard from '../components/creator/AnalyticsDashboard';
import VideoManagement from '../components/creator/VideoManagement';
import UsdcIcon from '../components/icons/UsdcIcon';

interface CreatorStats {
  creator: {
    walletAddress: string;
    username?: string;
  };
  stats: {
    totalVideos: number;
    totalEarnings: number;
    totalViews: number;
    totalSales: number;
    totalComments: number;
    averageVideoPrice: number;
  };
  videos: Array<{
    id: string;
    title: string;
    priceUsdc: number;
    views: number;
    earnings: number;
    commentCount: number;
    createdAt: string;
  }>;
}

type DashboardTab = 'overview' | 'analytics' | 'videos' | 'upload';

export default function CreatorDashboard() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { user, token, isLoading: isAuthLoading, login } = useAuth();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    category: 'Entertainment',
    priceUsdc: '',
    commentsEnabled: true,
    commentPrice: '0',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const walletAddress = publicKey?.toBase58() || null;
  const isConnected = connected;
  const isCreator = user?.isCreator || false;

  useEffect(() => {
    console.log('CreatorDashboard - Wallet State:', { isConnected, walletAddress, user });
    // Everyone is automatically a creator, just wait for user to load
    if (isConnected && user && walletAddress) {
      fetchCreatorStats();
    } else {
      setLoading(false);
    }
  }, [isConnected, walletAddress, user]);

  const fetchCreatorStats = async () => {
    console.log('Fetching creator stats for:', walletAddress);
    try {
      const response = await fetch(
        `/api/analytics/creator/${walletAddress}`,
      );

      console.log('Creator stats response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Creator stats data:', data);
        setStats(data);
      } else {
        console.error('Failed to fetch stats, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to fetch creator stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVideo.title || !newVideo.priceUsdc || !videoFile) {
      alert('Please fill in all required fields and select a video file');
      return;
    }

    // Verify wallet is connected and user is authenticated
    if (!walletAddress || !user) {
      alert('Please connect your wallet and wait for authentication to complete before uploading');
      return;
    }

    // Verify JWT token exists (use token from AuthContext)
    if (!token) {
      alert('⚠️ Authentication in progress. Please wait a moment and try again.\n\nIf you just switched wallets, the app is re-authenticating with your new wallet.');
      return;
    }

    // Verify the authenticated user matches the connected wallet
    if (user.walletAddress !== walletAddress) {
      console.error('⚠️ Wallet mismatch detected!');
      console.error('   Connected wallet:', walletAddress);
      console.error('   Authenticated user wallet:', user.walletAddress);

      // Trigger automatic re-authentication with the new wallet
      const shouldReauth = window.confirm(
        '⚠️ Wallet Change Detected!\n\n' +
        `Old wallet: ${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-6)}\n` +
        `New wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}\n\n` +
        'Click OK to sign in with your new wallet.'
      );

      if (shouldReauth) {
        console.log('🔄 Triggering re-authentication...');
        try {
          await login();
          alert('✅ Successfully authenticated with new wallet!\n\nYou can now upload your video.');
        } catch (error) {
          console.error('❌ Re-authentication failed:', error);
          alert('❌ Authentication failed. Please try refreshing the page.');
        }
      }

      return;
    }

    console.log('🎬 Starting video upload...');
    console.log('   Connected wallet:', walletAddress);
    console.log('   Authenticated as:', user.username || user.walletAddress);
    console.log('   User ID:', user.id);

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', newVideo.title);
      formData.append('description', newVideo.description);
      formData.append('category', newVideo.category);
      formData.append('priceUsdc', newVideo.priceUsdc);
      formData.append('creatorWallet', walletAddress || '');
      formData.append('commentsEnabled', String(newVideo.commentsEnabled));
      formData.append('commentPrice', newVideo.commentPrice);
      formData.append('video', videoFile);

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error('Upload failed'));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      });

      xhr.open('POST', '/api/upload/video');

      // Add JWT authentication token
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.send(formData);

      await uploadPromise;

      alert('Video uploaded successfully!');
      setShowUploadForm(false);
      setNewVideo({ title: '', description: '', category: 'Entertainment', priceUsdc: '', commentsEnabled: true, commentPrice: '0' });
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress(0);
      fetchCreatorStats();
    } catch (error) {
      console.error('Failed to upload video:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold text-white mb-4">Creator Dashboard</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access creator features
          </p>
          <button
            onClick={() => setVisible(true)}
            className="gradient-bg px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Show loading while user data is being fetched
  // Everyone is automatically a creator, so we just need to wait for auth to complete
  // Add timeout detection for stuck authentication
  const [authTimeout, setAuthTimeout] = React.useState(false);

  React.useEffect(() => {
    if (!user && isConnected) {
      // Set timeout after 10 seconds
      const timer = setTimeout(() => {
        setAuthTimeout(true);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setAuthTimeout(false);
    }
  }, [user, isConnected]);

  if (!user && isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 mb-2">Loading creator dashboard...</p>
          <p className="text-xs text-gray-500">Authenticating your wallet...</p>

          {authTimeout && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm mb-3">
                Authentication is taking longer than expected
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}

          {!authTimeout && (
            <p className="text-xs text-gray-600 mt-4">
              This should only take a few seconds...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-flix-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Creator Studio</h1>
            <p className="text-gray-400 mt-1">Manage your content and earnings</p>
          </div>

          <button
            onClick={() => {
              setActiveTab('upload');
              setShowUploadForm(true);
            }}
            className="gradient-bg px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition"
          >
            + Upload Video
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'videos', label: 'Videos', icon: '🎬' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as DashboardTab);
                if (tab.id !== 'upload') setShowUploadForm(false);
              }}
              className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'gradient-bg text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="glass-effect p-6 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">Total Earnings</div>
                <div className="text-3xl font-bold text-green-400 flex items-center gap-2">
                  ${stats?.stats.totalEarnings.toFixed(2) || '0.00'}
                  <UsdcIcon size={16} />
                </div>
                <div className="text-xs text-gray-500 mt-1">USDC</div>
              </div>

              <div className="glass-effect p-6 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">Total Videos</div>
                <div className="text-3xl font-bold text-flix-primary">
                  {stats?.stats.totalVideos || 0}
                </div>
              </div>

              <div className="glass-effect p-6 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">Total Views</div>
                <div className="text-3xl font-bold text-flix-secondary">
                  {stats?.stats.totalViews.toLocaleString() || 0}
                </div>
              </div>

              <div className="glass-effect p-6 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">Total Sales</div>
                <div className="text-3xl font-bold text-white">
                  {stats?.stats.totalSales || 0}
                </div>
              </div>

              <div className="glass-effect p-6 rounded-xl">
                <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                  Total Comments
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-blue-400">
                  {stats?.stats.totalComments || 0}
                </div>
              </div>
            </div>

            {/* Recent Videos */}
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Recent Videos</h2>
                <button
                  onClick={() => setActiveTab('videos')}
                  className="text-flix-primary hover:underline text-sm"
                >
                  View all →
                </button>
              </div>

              {!stats?.videos || stats.videos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎥</div>
                  <p className="text-gray-400 mb-4">You haven't uploaded any videos yet</p>
                  <button
                    onClick={() => {
                      setActiveTab('upload');
                      setShowUploadForm(true);
                    }}
                    className="text-flix-primary hover:underline"
                  >
                    Upload your first video
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.videos.slice(0, 5).map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-4 bg-flix-dark rounded-lg hover:bg-flix-dark/80 transition"
                    >
                      <div className="flex-1">
                        <Link
                          to={`/video/${video.id}`}
                          className="text-white font-medium hover:text-flix-primary transition"
                        >
                          {video.title}
                        </Link>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                          <span>👁️ {video.views} views</span>
                          <span className="flex items-center gap-1">
                            💰 ${video.priceUsdc}
                            <UsdcIcon size={14} />
                          </span>
                          <span className="text-green-400 flex items-center gap-1">
                            Earned: ${video.earnings.toFixed(2)}
                            <UsdcIcon size={14} />
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/video/${video.id}`}
                        className="text-flix-primary hover:underline text-sm"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'analytics' && walletAddress && (
          <AnalyticsDashboard creatorWallet={walletAddress} />
        )}

        {activeTab === 'videos' && walletAddress && (
          <VideoManagement
            creatorWallet={walletAddress}
            onVideoUpdated={fetchCreatorStats}
          />
        )}

        {(activeTab === 'upload' || showUploadForm) && (
          <div className="glass-effect rounded-xl p-6 max-h-[80vh] overflow-y-auto pb-8">
            <h2 className="text-xl font-bold text-white mb-4">Upload New Video</h2>
            <form onSubmit={handleUploadVideo} className="space-y-4 pb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Video File *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="video-upload"
                    required
                  />
                  <label
                    htmlFor="video-upload"
                    className="flex items-center justify-center w-full px-4 py-8 bg-flix-dark border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-flix-primary transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {videoFile ? (
                        <p className="text-sm text-white">{videoFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-400">Click to upload video</p>
                          <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI up to 5GB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Thumbnail (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className="flex items-center justify-center w-full px-4 py-6 bg-flix-dark border border-white/10 rounded-lg cursor-pointer hover:border-flix-primary transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {thumbnailFile ? (
                        <p className="text-sm text-white">{thumbnailFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-400">Click to upload thumbnail</p>
                          <p className="text-xs text-gray-500 mt-1">If not provided, one will be generated automatically</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                  placeholder="Enter video title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                  placeholder="Enter video description"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={newVideo.category}
                  onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                  className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                  required
                >
                  <option value="Entertainment">Entertainment</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Music">Music</option>
                  <option value="Education">Education</option>
                  <option value="Technology">Technology</option>
                  <option value="Lifestyle">Lifestyle</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Your video will appear in this category and in "All" videos
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-300 mb-2">
                  Price (USDC) *
                  <UsdcIcon size={14} />
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newVideo.priceUsdc}
                  onChange={(e) => setNewVideo({ ...newVideo, priceUsdc: e.target.value })}
                  className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  You'll receive 97.15% (${((parseFloat(newVideo.priceUsdc) || 0) * 0.9715).toFixed(2)}
                  <UsdcIcon size={12} />)
                </p>
              </div>

              {/* Comment Settings */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Comment Settings
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Enable Comments</label>
                    <p className="text-xs text-gray-500 mt-0.5">Allow viewers to comment on this video</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewVideo({ ...newVideo, commentsEnabled: !newVideo.commentsEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      newVideo.commentsEnabled ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newVideo.commentsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {newVideo.commentsEnabled && (
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-300 mb-2">
                      Comment Price (USDC)
                      <UsdcIcon size={14} />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={newVideo.commentPrice}
                      onChange={(e) => setNewVideo({ ...newVideo, commentPrice: e.target.value })}
                      className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {parseFloat(newVideo.commentPrice) > 0
                        ? `💰 Viewers will pay $${newVideo.commentPrice} USDC per comment (seamlessly via session keys)`
                        : '✨ Comments are free for this video'}
                    </p>
                  </div>
                )}
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-flix-dark rounded-full h-2">
                    <div
                      className="gradient-bg h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Wallet mismatch warning */}
              {user && walletAddress && user.walletAddress !== walletAddress && !isAuthLoading && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-400 text-sm font-medium mb-2">Wallet Change Detected!</p>
                      <p className="text-red-300 text-xs mb-3">
                        You're authenticated with <span className="font-mono">{user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}</span> but connected to <span className="font-mono">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          console.log('🔄 Re-authenticating with new wallet...');
                          try {
                            await login();
                            alert('✅ Successfully authenticated with new wallet!');
                          } catch (error) {
                            console.error('❌ Re-authentication failed:', error);
                            alert('❌ Authentication failed. Please try refreshing the page.');
                          }
                        }}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                      >
                        Sign in with new wallet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Authentication status indicator */}
              {(isAuthLoading || !token) && connected && !user && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm text-center flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating with your wallet...
                  </p>
                </div>
              )}

              {/* Re-authentication in progress */}
              {isAuthLoading && user && walletAddress && user.walletAddress !== walletAddress && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-sm text-center flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in with new wallet...
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || isAuthLoading || !token || (user && walletAddress && user.walletAddress !== walletAddress)}
                className="gradient-bg px-6 py-3 rounded-lg text-white font-medium w-full hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? `Uploading... ${uploadProgress.toFixed(0)}%` :
                 isAuthLoading || !token ? 'Authenticating...' :
                 (user && walletAddress && user.walletAddress !== walletAddress) ? 'Wallet Mismatch - Sign in Again' :
                 'Upload Video'}
              </button>

              {!token && connected && !isAuthLoading && (
                <p className="text-xs text-yellow-400 mt-2 text-center">
                  If authentication doesn't complete, try refreshing the page
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
