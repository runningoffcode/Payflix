import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';

/**
 * Account Page - User Profile, Purchase History, and Subscriptions
 * Shows:
 * - Profile info (name, picture, wallet)
 * - Videos purchased
 * - Creators subscribed to
 */

interface UserProfile {
  name: string;
  profilePicture: string | null;
  wallet: string;
}

interface PurchasedVideo {
  id: string;
  title: string;
  thumbnail: string;
  creator: string;
  price: number;
  purchasedAt: string;
}

interface Subscription {
  id: string;
  creatorName: string;
  creatorWallet: string;
  creatorAvatar: string | null;
  subscribedAt: string;
  videoCount: number;
}

export default function Account() {
  const { publicKey, connected } = useWallet();

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    profilePicture: null,
    wallet: publicKey?.toBase58() || '',
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Purchased videos state
  const [purchasedVideos, setPurchasedVideos] = useState<PurchasedVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Mock subscriptions (will be replaced with Supabase data)
  const [subscriptions] = useState<Subscription[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'profile' | 'purchases' | 'subscriptions'>('profile');

  useEffect(() => {
    const loadProfile = async () => {
      if (publicKey) {
        const walletAddress = publicKey.toBase58();
        setProfile(prev => ({ ...prev, wallet: walletAddress }));

        try {
          // Load profile from backend API
          const response = await fetch('/api/users/profile', {
            headers: {
              'x-wallet-address': walletAddress,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setProfile({
              name: data.user.username || 'anon',
              profilePicture: data.user.profile_picture_url,
              wallet: walletAddress,
            });
          } else {
            // Profile not found, keep default
            console.log('Profile not found, using defaults');
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    };

    loadProfile();
  }, [publicKey]);

  // Fetch purchased videos
  useEffect(() => {
    const fetchPurchasedVideos = async () => {
      if (publicKey) {
        setLoadingVideos(true);
        try {
          const response = await fetch('/api/users/purchased-videos', {
            headers: {
              'x-wallet-address': publicKey.toBase58(),
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('📦 Raw purchased videos data:', data);
            // Map backend video data to frontend format
            const videos = data.videos.map((video: any) => ({
              id: video.id,
              title: video.title,
              thumbnail: video.thumbnailUrl || video.thumbnail_url || '/placeholder-video.jpg',
              creator: video.creatorName || 'Unknown Creator',
              price: video.priceUsdc || video.price_usdc || 0,
              purchasedAt: video.createdAt || video.created_at || new Date().toISOString(),
            }));
            setPurchasedVideos(videos);
            console.log('✅ Loaded', videos.length, 'purchased videos');
          }
        } catch (error) {
          console.error('Error fetching purchased videos:', error);
        } finally {
          setLoadingVideos(false);
        }
      }
    };

    fetchPurchasedVideos();
  }, [publicKey]);

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && publicKey) {
      try {
        const formData = new FormData();
        formData.append('profilePicture', file);

        // Update profile picture on backend
        const response = await fetch('/api/users/update-profile', {
          method: 'PUT',
          headers: {
            'x-wallet-address': publicKey.toBase58(),
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setProfile({
            name: data.user.username || 'anon',
            profilePicture: data.user.profile_picture_url,
            wallet: data.user.wallet_address,
          });
          console.log('✅ Profile picture updated');

          // Notify other components (like Sidebar) to refresh
          window.dispatchEvent(new CustomEvent('profileUpdated'));
        } else {
          const errorData = await response.json();
          console.error('Failed to update profile picture:', errorData.error);
          alert(errorData.error || 'Failed to update profile picture. Please try again.');
        }
      } catch (error) {
        console.error('Error updating profile picture:', error);
        alert('Failed to update profile picture. Please try again.');
      }
    }
  };

  const handleNameSave = async () => {
    if (!publicKey || !tempName.trim()) {
      return;
    }

    try {
      // Update username on backend
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          username: tempName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.user.username || 'anon',
          profilePicture: data.user.profile_picture_url,
          wallet: data.user.wallet_address,
        });
        setIsEditingName(false);
        console.log('✅ Username updated');

        // Notify other components (like Sidebar) to refresh
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      } else {
        const errorData = await response.json();
        console.error('Failed to update username:', errorData.message);
        alert(errorData.error || 'Failed to update username. Please try again.');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      alert('Failed to update username. Please try again.');
    }
  };

  const handleNameEdit = () => {
    setTempName(profile.name);
    setIsEditingName(true);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-flix-dark flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-flix-text-secondary mb-8">
            Please connect your wallet to view your account
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-flix-dark pt-20 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">My Account</h1>
          <p className="text-flix-text-secondary">
            Manage your profile, view purchase history, and track subscriptions
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8 border-b border-flix-light-gray">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'profile'
                ? 'text-flix-cyan border-b-2 border-flix-cyan'
                : 'text-flix-text-secondary hover:text-white'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'purchases'
                ? 'text-flix-cyan border-b-2 border-flix-cyan'
                : 'text-flix-text-secondary hover:text-white'
            }`}
          >
            Purchase History
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'subscriptions'
                ? 'text-flix-cyan border-b-2 border-flix-cyan'
                : 'text-flix-text-secondary hover:text-white'
            }`}
          >
            Subscriptions
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-flix-light-gray rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>

              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Picture */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-flix-cyan to-purple-500 p-1">
                      <div className="w-full h-full rounded-full bg-flix-dark flex items-center justify-center overflow-hidden">
                        {profile.profilePicture ? (
                          <img
                            src={profile.profilePicture}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-5xl">👤</span>
                        )}
                      </div>
                    </div>
                    <label
                      htmlFor="profile-picture-upload"
                      className="absolute bottom-0 right-0 bg-flix-cyan text-white p-2 rounded-full cursor-pointer hover:bg-cyan-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                    <input
                      id="profile-picture-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureUpload}
                    />
                  </div>
                  <p className="text-flix-text-secondary text-sm mt-4 text-center">
                    Click camera to upload
                  </p>
                </div>

                {/* Profile Details */}
                <div className="flex-1 space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-flix-text-secondary mb-2">
                      Display Name
                    </label>
                    {isEditingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="flex-1 bg-flix-dark text-white px-4 py-2 rounded-lg border border-flix-light-gray focus:border-flix-cyan focus:outline-none"
                          placeholder="Enter your name"
                          autoFocus
                        />
                        <button
                          onClick={handleNameSave}
                          className="px-4 py-2 bg-flix-cyan text-white rounded-lg hover:bg-cyan-400 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="px-4 py-2 bg-flix-dark text-white rounded-lg border border-flix-light-gray hover:bg-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <span className="text-white text-lg">
                          {profile.name || 'anon'}
                        </span>
                        <button
                          onClick={handleNameEdit}
                          className="text-flix-cyan hover:text-cyan-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Wallet Address */}
                  <div>
                    <label className="block text-sm font-medium text-flix-text-secondary mb-2">
                      Wallet Address
                    </label>
                    <div className="flex items-center gap-2 bg-flix-dark px-4 py-2 rounded-lg border border-flix-light-gray">
                      <code className="text-white text-sm flex-1 overflow-x-auto">
                        {profile.wallet}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(profile.wallet)}
                        className="text-flix-cyan hover:text-cyan-400 transition-colors"
                        title="Copy to clipboard"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Purchase History Tab */}
        {activeTab === 'purchases' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-flix-light-gray rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Purchase History</h2>

              {loadingVideos ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flix-cyan mx-auto mb-4"></div>
                  <p className="text-flix-text-secondary">Loading your videos...</p>
                </div>
              ) : purchasedVideos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📹</div>
                  <p className="text-flix-text-secondary text-lg mb-4">
                    No purchases yet
                  </p>
                  <p className="text-flix-text-secondary mb-8">
                    Start exploring and unlock premium content
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-flix-cyan text-white rounded-lg hover:bg-cyan-400 transition-colors font-semibold"
                  >
                    Browse Videos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {purchasedVideos.map((video) => (
                    <motion.div
                      key={video.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-flix-dark rounded-lg overflow-hidden border border-flix-light-gray"
                    >
                      <Link to={`/video/${video.id}`}>
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-40 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </Link>
                      <div className="p-4">
                        <h3 className="text-white font-semibold mb-1 line-clamp-2">
                          {video.title}
                        </h3>
                        <p className="text-flix-text-secondary text-sm mb-3">
                          by {video.creator}
                        </p>
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-flix-cyan">${video.price.toFixed(2)}</span>
                          <span className="text-flix-text-secondary">
                            {new Date(video.purchasedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Link
                          to={`/video/${video.id}`}
                          className="block w-full text-center px-4 py-2 bg-gradient-to-r from-flix-cyan to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity font-semibold"
                        >
                          Watch Now
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-flix-light-gray rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">My Subscriptions</h2>

              {subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⭐</div>
                  <p className="text-flix-text-secondary text-lg mb-4">
                    No subscriptions yet
                  </p>
                  <p className="text-flix-text-secondary mb-8">
                    Follow your favorite creators to get notified of new content
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-flix-cyan text-white rounded-lg hover:bg-cyan-400 transition-colors font-semibold"
                  >
                    Discover Creators
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subscriptions.map((sub) => (
                    <motion.div
                      key={sub.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-flix-dark rounded-lg p-6 border border-flix-light-gray"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-flix-cyan to-purple-500 p-1">
                          <div className="w-full h-full rounded-full bg-flix-dark flex items-center justify-center overflow-hidden">
                            {sub.creatorAvatar ? (
                              <img
                                src={sub.creatorAvatar}
                                alt={sub.creatorName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">👤</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">
                            {sub.creatorName}
                          </h3>
                          <p className="text-flix-text-secondary text-sm mb-2">
                            {sub.videoCount} videos
                          </p>
                          <p className="text-flix-text-secondary text-xs">
                            Subscribed {new Date(sub.subscribedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">
                          Unsubscribe
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
