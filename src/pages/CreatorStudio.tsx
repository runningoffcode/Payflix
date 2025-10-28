import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../lib/supabase';

/**
 * Creator Studio - Full Dashboard for Content Creators
 * Analytics + Video Upload in one place
 */
export default function CreatorStudio() {
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'analytics' | 'upload'>('analytics');

  // Upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoPrice, setVideoPrice] = useState('');
  const [category, setCategory] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<{ ar: number; usd: number } | null>(null);

  // Mock data for now - will be replaced with real Supabase data
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Mock stats
  const stats = {
    total_revenue: 0,
    total_videos: 0,
    total_views: 0,
    total_clicks: 0,
  };
  const videos: any[] = [];
  const statsLoading = false;
  const videosLoading = false;

  // Mock revenue data over time (last 7 days)
  const revenueData = [
    { date: 'Mon', revenue: 0, views: 0 },
    { date: 'Tue', revenue: 0, views: 0 },
    { date: 'Wed', revenue: 0, views: 0 },
    { date: 'Thu', revenue: 0, views: 0 },
    { date: 'Fri', revenue: 0, views: 0 },
    { date: 'Sat', revenue: 0, views: 0 },
    { date: 'Sun', revenue: 0, views: 0 },
  ];

  const handleVideoUpload = async () => {
    if (!videoFile || !videoTitle || !videoPrice || !publicKey) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadError('');
    setProgress(0);

    try {
      const walletAddress = publicKey.toBase58();

      // Step 1: Check/create user profile
      setStage('Checking user profile...');
      setProgress(10);

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      let userId = existingUser?.id;

      if (!existingUser) {
        // Create user profile
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress,
            username: walletAddress.slice(0, 8),
            email: `${walletAddress.slice(0, 8)}@flix.temp`,
            role: 'creator'
          })
          .select()
          .single();

        if (userError) throw userError;
        userId = newUser.id;
      }

      // Step 2: Upload video file to storage
      setStage('Uploading video to Flix...');
      setProgress(30);

      const videoFileName = `${Date.now()}-${videoFile.name}`;
      const { error: videoUploadError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (videoUploadError) throw videoUploadError;

      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(videoFileName);

      // Step 3: Upload thumbnail (or use default)
      setStage('Uploading thumbnail...');
      setProgress(60);

      let thumbnailUrl = 'https://via.placeholder.com/640x360?text=Flix+Video';

      if (thumbnailFile) {
        const thumbnailFileName = `${Date.now()}-${thumbnailFile.name}`;
        const { error: thumbnailUploadError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, thumbnailFile);

        if (!thumbnailUploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbnailFileName);
          thumbnailUrl = publicUrl;
        }
      }

      // Step 4: Create video record
      setStage('Saving metadata...');
      setProgress(80);

      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          title: videoTitle,
          description: videoDescription || '',
          creator_id: userId,
          creator_wallet: walletAddress,
          price: parseFloat(videoPrice),
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          category: category || 'General',
          duration: 0, // Will be updated when video metadata is extracted
        })
        .select()
        .single();

      if (videoError) throw videoError;

      setProgress(100);
      setStage('Upload complete!');

      // Success!
      alert(`Video "${videoTitle}" uploaded successfully to Flix!`);

      // Reset form
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setVideoPrice('');
      setCategory('');
      setActiveTab('analytics');

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload video');
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-flix-dark flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-flix-text-secondary">Please connect your wallet to access Creator Studio</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-flix-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Creator Studio</h1>
          <p className="text-flix-text-secondary">Manage your content and track your earnings</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-flix-light-gray">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'text-flix-cyan border-b-2 border-flix-cyan'
                : 'text-flix-text-secondary hover:text-white'
            }`}
          >
            📊 Analytics & Revenue
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'upload'
                ? 'text-flix-cyan border-b-2 border-flix-cyan'
                : 'text-flix-text-secondary hover:text-white'
            }`}
          >
            📤 Upload Video
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Revenue"
                value={`$${stats?.total_revenue.toFixed(2) || '0.00'}`}
                icon="💰"
                color="from-green-500 to-emerald-600"
              />
              <StatsCard
                title="Total Videos"
                value={stats?.total_videos.toString() || '0'}
                icon="🎬"
                color="from-blue-500 to-cyan-500"
              />
              <StatsCard
                title="Total Views"
                value={stats?.total_views.toLocaleString() || '0'}
                icon="👁️"
                color="from-purple-500 to-pink-500"
              />
              <StatsCard
                title="Total Clicks"
                value={stats?.total_clicks.toString() || '0'}
                icon="🖱️"
                color="from-orange-500 to-red-500"
              />
            </div>

            {/* Revenue Over Time Graph */}
            <div className="bg-flix-light-gray rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Revenue Over Time</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                    <XAxis
                      dataKey="date"
                      stroke="#A0AEC0"
                      style={{ fontSize: '14px' }}
                    />
                    <YAxis
                      stroke="#A0AEC0"
                      style={{ fontSize: '14px' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A202C',
                        border: '1px solid #2D3748',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'revenue') return [`$${value.toFixed(2)}`, 'Revenue'];
                        return [value, 'Views'];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#A0AEC0' }}
                      formatter={(value) => value === 'revenue' ? 'Revenue ($)' : 'Views'}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#00D9FF"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="views"
                      fill="#8B5CF6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-flix-text-secondary text-sm mt-4 text-center">
                Last 7 days of revenue and views. Data updates in real-time as viewers purchase your content.
              </p>
            </div>

            {/* Your Videos */}
            <div className="bg-flix-light-gray rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Your Videos</h2>

              {videosLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-flix-cyan border-t-transparent mx-auto"></div>
                  <p className="text-flix-text-secondary mt-4">Loading your videos...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-flix-text-secondary text-lg">No videos uploaded yet</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 bg-flix-cyan text-black px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition"
                  >
                    Upload Your First Video
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-flix-light-gray rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Upload New Video</h2>

              {uploadError && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
                  {uploadError}
                </div>
              )}

              {uploading && (
                <div className="mb-6 bg-flix-gray rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{stage}</span>
                    <span className="text-flix-cyan font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-flix-dark rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="bg-gradient-to-r from-flix-cyan to-blue-500 h-2 rounded-full"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Video File */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Video File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full bg-flix-gray text-white px-4 py-3 rounded-lg border border-flix-light-gray focus:border-flix-cyan focus:outline-none"
                  />
                  {videoFile && (
                    <p className="text-sm text-flix-text-secondary mt-2">
                      {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {estimatedCost && (
                    <p className="text-sm text-flix-cyan mt-2">
                      Estimated Arweave cost: {estimatedCost.ar.toFixed(4)} AR (~${estimatedCost.usd.toFixed(2)})
                    </p>
                  )}
                </div>

                {/* Thumbnail */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Thumbnail (Optional - auto-generated if not provided)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="w-full bg-flix-gray text-white px-4 py-3 rounded-lg border border-flix-light-gray focus:border-flix-cyan focus:outline-none"
                  />
                  {thumbnailFile && (
                    <p className="text-sm text-flix-text-secondary mt-2">
                      {thumbnailFile.name}
                    </p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Video Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Enter video title..."
                    className="w-full bg-flix-gray text-white px-4 py-3 rounded-lg border border-flix-light-gray focus:border-flix-cyan focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Describe your video..."
                    rows={4}
                    className="w-full bg-flix-gray text-white px-4 py-3 rounded-lg border border-flix-light-gray focus:border-flix-cyan focus:outline-none resize-none"
                  />
                </div>

                {/* Price & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Price (USDC) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={videoPrice}
                      onChange={(e) => setVideoPrice(e.target.value)}
                      placeholder="4.99"
                      className="w-full bg-flix-gray text-white px-4 py-3 rounded-lg border border-flix-light-gray focus:border-flix-cyan focus:outline-none"
                    />
                    <p className="text-xs text-flix-text-secondary mt-1">
                      Set to 0 for free videos
                    </p>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-flix-gray text-white px-4 py-3 rounded-lg border border-flix-light-gray focus:border-flix-cyan focus:outline-none"
                    >
                      <option value="">Select category</option>
                      <option value="Education">Education</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Music">Music</option>
                      <option value="Technology">Technology</option>
                      <option value="Sports">Sports</option>
                      <option value="News">News</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleVideoUpload}
                  disabled={uploading || !videoFile || !videoTitle || !videoPrice}
                  className="w-full bg-gradient-to-r from-flix-cyan to-blue-500 text-white font-bold py-4 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading to The Flix...' : ' Upload to The Flix'}
                </button>

                <p className="text-sm text-flix-text-secondary text-center">
                  Your video will be stored permanently on The Flix
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-flix-light-gray rounded-xl p-6 border border-flix-gray"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center mb-4 text-2xl`}>
        {icon}
      </div>
      <h3 className="text-flix-text-secondary text-sm mb-1">{title}</h3>
      <p className="text-white text-3xl font-bold">{value}</p>
    </motion.div>
  );
}

// Video Card Component
function VideoCard({ video }: { video: any }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-flix-gray rounded-lg overflow-hidden border border-flix-light-gray"
    >
      <img
        src={video.thumbnail_url}
        alt={video.title}
        className="w-full h-40 object-cover"
      />
      <div className="p-4">
        <h3 className="text-white font-semibold mb-2 line-clamp-2">{video.title}</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-flix-text-secondary">{video.views} views</span>
          <span className="text-flix-cyan font-bold">${video.price}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-flix-text-secondary">
            {new Date(video.created_at).toLocaleDateString()}
          </span>
          <span className="text-xs bg-flix-cyan bg-opacity-20 text-flix-cyan px-2 py-1 rounded">
            {video.category || 'General'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
