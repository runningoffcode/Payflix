import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { GradientButton } from '@/components/ui/GradientButton';
import UsdcIcon from '@/components/icons/UsdcIcon';

interface UserProfile {
  id: string;
  wallet_address: string;
  username: string;
  profile_picture_url: string | null;
  is_creator: boolean;
  created_at: string;
}

interface ProfileStats {
  videosOwned: number;
  totalSpent: number;
  videosCreated: number;
  totalEarnings: number;
}

interface OwnedVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  creatorName: string;
  priceUsdc: number;
  createdAt: string;
}

export default function Profile() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [ownedVideos, setOwnedVideos] = useState<OwnedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editUsername, setEditUsername] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      fetchProfile();
      fetchOwnedVideos();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchProfile = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const walletAddress = publicKey.toBase58();

      const response = await fetch('http://localhost:5001/api/users/profile', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setStats(data.stats);
        setEditUsername(data.user.username || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnedVideos = async () => {
    if (!publicKey) return;

    setLoadingVideos(true);
    try {
      const walletAddress = publicKey.toBase58();

      const response = await fetch('/api/users/purchased-videos', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const videos = data.videos.map((video: any) => ({
          id: video.id,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl || video.thumbnail_url || '/placeholder-video.jpg',
          creatorName: video.creatorName || 'Unknown Creator',
          priceUsdc: video.priceUsdc || video.price_usdc || 0,
          createdAt: video.createdAt || video.created_at || new Date().toISOString(),
        }));
        setOwnedVideos(videos);
        console.log('✅ Loaded', videos.length, 'owned videos');
      }
    } catch (error) {
      console.error('Failed to fetch owned videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setProfilePictureFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!publicKey) return;

    setSaving(true);
    try {
      const walletAddress = publicKey.toBase58();
      const formData = new FormData();

      formData.append('username', editUsername);

      if (profilePictureFile) {
        formData.append('profilePicture', profilePictureFile);
      }

      const response = await fetch('http://localhost:5001/api/users/update-profile', {
        method: 'PUT',
        headers: {
          'x-wallet-address': walletAddress,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setIsEditing(false);
        setProfilePictureFile(null);
        setProfilePicturePreview(null);
        alert('Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditUsername(profile?.username || '');
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
  };

  if (!connected) {
    return (
      <main className="flex items-center justify-center h-full relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-neutral-400 mb-8">
            Connect your wallet to view and manage your profile
          </p>
          <GradientButton onClick={() => setVisible(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Connect Wallet
          </GradientButton>
        </motion.div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center h-full relative z-10">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
      </main>
    );
  }

  const currentProfilePicture = profilePicturePreview || profile?.profile_picture_url;

  return (
    <main className="flex flex-col overflow-y-auto h-full relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 w-full">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </motion.div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start gap-8">
            {/* Profile Picture */}
            <div className="relative">
              {currentProfilePicture ? (
                <img
                  src={currentProfilePicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-purple-500/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold">
                  {(profile?.username || publicKey?.toBase58() || 'U')[0].toUpperCase()}
                </div>
              )}

              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full max-w-md px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                      Wallet Address
                    </label>
                    <p className="text-neutral-500 font-mono text-sm">
                      {publicKey?.toBase58()}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <GradientButton
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="min-w-[120px]"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </GradientButton>

                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {profile?.username || 'Anonymous User'}
                  </h1>
                  <p className="text-neutral-400 font-mono text-sm mb-4">
                    {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                  </p>

                  {profile?.is_creator && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Creator
                    </span>
                  )}

                  <div className="flex gap-3 mt-6">
                    <GradientButton onClick={() => setIsEditing(true)}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </GradientButton>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          {!isEditing && stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-neutral-700/50">
              <div>
                <div className="text-3xl font-bold text-purple-400 mb-1">
                  {stats.videosOwned}
                </div>
                <div className="text-sm text-neutral-400">Paid-Views</div>
              </div>

              <div>
                <div className="text-3xl font-bold text-pink-400 mb-1 flex items-center gap-2">
                  ${stats.totalSpent.toFixed(2)}
                  <UsdcIcon size={16} />
                </div>
                <div className="text-sm text-neutral-400">Total Spent</div>
              </div>

              {profile?.is_creator && (
                <>
                  <div>
                    <div className="text-3xl font-bold text-green-400 mb-1">
                      {stats.videosCreated}
                    </div>
                    <div className="text-sm text-neutral-400">Videos Created</div>
                  </div>

                  <div>
                    <div className="text-3xl font-bold text-green-400 mb-1 flex items-center gap-2">
                      ${stats.totalEarnings.toFixed(2)}
                      <UsdcIcon size={16} />
                    </div>
                    <div className="text-sm text-neutral-400">Total Earnings</div>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* My Library Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-white mb-6">My Library</h2>

          {loadingVideos ? (
            <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-neutral-400">Loading your videos...</p>
            </div>
          ) : ownedVideos.length === 0 ? (
            <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-12 text-center">
              <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-neutral-400 mb-8">
                You haven't purchased any videos yet
              </p>
              <GradientButton asChild>
                <Link to="/">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Browse Videos
                </Link>
              </GradientButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {ownedVideos.map((video) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.05 }}
                  className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl overflow-hidden group cursor-pointer"
                >
                  <Link to={`/video/${video.id}`} className="block">
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-neutral-400 text-sm mb-3">
                        {video.creatorName}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-400 font-medium flex items-center gap-1">
                          ${video.priceUsdc.toFixed(2)}
                          <UsdcIcon size={14} />
                        </span>
                        <span className="text-neutral-500">
                          Purchased {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
