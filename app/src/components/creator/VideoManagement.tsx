import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UsdcIcon from '../icons/UsdcIcon';

interface Video {
  id: string;
  title: string;
  description: string;
  price_usdc: number;
  thumbnail_url?: string;
  custom_thumbnail_uploaded: boolean;
  views: number;
  earnings: number;
  created_at: string;
  comments_enabled: boolean;
  comment_price?: number;
  archived?: boolean; // Whether video is hidden from public view
}

interface VideoManagementProps {
  creatorWallet: string;
  onVideoUpdated?: () => void;
}

export default function VideoManagement({ creatorWallet, onVideoUpdated }: VideoManagementProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState<string | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<Video | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [archivingVideo, setArchivingVideo] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    price_usdc: '',
    comments_enabled: true,
    comment_price: '0.01',
  });

  useEffect(() => {
    fetchVideos();
  }, [creatorWallet]);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/users/creator-videos', {
        headers: {
          'x-wallet-address': creatorWallet,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (video: Video) => {
    setEditingVideo(video.id);
    setEditForm({
      title: video.title,
      description: video.description || '',
      price_usdc: video.price_usdc.toString(),
      comments_enabled: video.comments_enabled,
      comment_price: video.comment_price?.toString() || '0.01',
    });
  };

  const handleCancelEdit = () => {
    setEditingVideo(null);
    setEditForm({
      title: '',
      description: '',
      price_usdc: '',
      comments_enabled: true,
      comment_price: '0.01',
    });
  };

  const handleSaveEdit = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          price_usdc: parseFloat(editForm.price_usdc),
          comments_enabled: editForm.comments_enabled,
          comment_price: editForm.comments_enabled ? parseFloat(editForm.comment_price) : null,
          creator_wallet: creatorWallet,
        }),
      });

      if (!response.ok) throw new Error('Failed to update video');

      await fetchVideos();
      setEditingVideo(null);
      onVideoUpdated?.();
    } catch (error) {
      console.error('Failed to update video:', error);
      alert('Failed to update video. Please try again.');
    }
  };

  const handleThumbnailUpload = async (videoId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingThumbnail(videoId);

    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      formData.append('creator_wallet', creatorWallet);

      const response = await fetch(`/api/videos/${videoId}/thumbnail`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload thumbnail');

      await fetchVideos();
      onVideoUpdated?.();
    } catch (error) {
      console.error('Failed to upload thumbnail:', error);
      alert('Failed to upload thumbnail. Please try again.');
    } finally {
      setUploadingThumbnail(null);
    }
  };

  const handleDeleteClick = (video: Video) => {
    setDeletingVideo(video);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVideo) return;

    console.log('Delete confirmed for video:', deletingVideo.id);
    console.log('Creator wallet:', creatorWallet);

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/videos/${deletingVideo.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creator_wallet: creatorWallet }),
      });

      console.log('DELETE response status:', response.status);

      // Handle response
      if (response.status === 404) {
        // Video already deleted - remove from UI anyway
        console.log('⚠️ Video already deleted from database, removing from UI');
        setVideos(prevVideos => prevVideos.filter(v => v.id !== deletingVideo.id));
        setDeletingVideo(null);
        setIsDeleting(false);

        // Reload to clear from all components
        setTimeout(() => {
          window.location.reload();
        }, 500);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('DELETE failed with error:', errorData);
        throw new Error(errorData.error || 'Failed to delete video');
      }

      console.log('✅ Video deleted successfully from server');

      // Remove video from UI immediately for instant feedback
      setVideos(prevVideos => prevVideos.filter(v => v.id !== deletingVideo.id));

      // Close modal
      setDeletingVideo(null);
      setIsDeleting(false);

      console.log('✅ Video removed from UI instantly');

      // Reload page to ensure video is removed from ALL components (Home page, etc.)
      // Small delay to show the instant UI update first
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error('Failed to delete video:', error);
      setIsDeleting(false);
      alert(`Failed to delete video: ${error.message}`);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingVideo(null);
  };

  const handleArchiveToggle = async (video: Video) => {
    const newArchivedStatus = !video.archived;
    setArchivingVideo(video.id);

    try {
      const response = await fetch(`/api/videos/${video.id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: newArchivedStatus,
          creator_wallet: creatorWallet,
        }),
      });

      if (response.ok) {
        // Update local state
        setVideos(prevVideos =>
          prevVideos.map(v =>
            v.id === video.id ? { ...v, archived: newArchivedStatus } : v
          )
        );
        alert(newArchivedStatus ? 'Video archived - hidden from public view' : 'Video unarchived - now visible to public');
        if (onVideoUpdated) onVideoUpdated();
      } else {
        const errorData = await response.json();
        alert(`Failed to ${newArchivedStatus ? 'archive' : 'unarchive'} video: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to toggle archive status:', error);
      alert('Failed to update video. Please try again.');
    } finally {
      setArchivingVideo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-flix-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Video Management</h2>
        <div className="text-sm text-gray-400">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="glass-effect rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🎥</div>
          <p className="text-gray-400 mb-4">No videos uploaded yet</p>
          <p className="text-sm text-gray-500">
            Upload your first video to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="glass-effect p-6 rounded-xl hover:bg-white/5 transition"
            >
              {editingVideo === video.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (USDC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price_usdc}
                        onChange={(e) => setEditForm({ ...editForm, price_usdc: e.target.value })}
                        className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Comment Price (USDC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.comment_price}
                        onChange={(e) => setEditForm({ ...editForm, comment_price: e.target.value })}
                        disabled={!editForm.comments_enabled}
                        className="w-full px-4 py-2 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`comments-${video.id}`}
                      checked={editForm.comments_enabled}
                      onChange={(e) => setEditForm({ ...editForm, comments_enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-white/10 bg-flix-dark text-flix-primary focus:ring-flix-primary"
                    />
                    <label htmlFor={`comments-${video.id}`} className="text-sm text-gray-300">
                      Enable monetized comments
                    </label>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleSaveEdit(video.id)}
                      className="gradient-bg px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-white/10 px-6 py-2 rounded-lg text-white font-medium hover:bg-white/20 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex space-x-6">
                  {/* Thumbnail */}
                  <div className="relative group">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-48 h-28 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'w-48 h-28 bg-white/5 rounded-lg flex items-center justify-center';
                          fallback.innerHTML = '<span class="text-4xl">🎬</span>';
                          target.parentElement?.appendChild(fallback);
                        }}
                      />
                    ) : (
                      <div className="w-48 h-28 bg-white/5 rounded-lg flex items-center justify-center">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}

                    {/* Upload Thumbnail Overlay */}
                    <label
                      className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      {uploadingThumbnail === video.id ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-xs text-white">Upload Thumbnail</div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleThumbnailUpload(video.id, file);
                        }}
                        disabled={uploadingThumbnail === video.id}
                      />
                    </label>
                  </div>

                  {/* Video Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/video/${video.id}`}
                          className="text-lg font-semibold text-white hover:text-flix-primary transition"
                        >
                          {video.title}
                        </Link>
                        {video.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 mt-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        💰 ${video.price_usdc}
                        <UsdcIcon size={14} />
                      </span>
                      <span>👁️ {video.views} views</span>
                      <span className="text-green-400 flex items-center gap-1">
                        Earned: ${video.earnings.toFixed(2)}
                        <UsdcIcon size={14} />
                      </span>
                      {video.comments_enabled && (
                        <span className="flex items-center gap-1">
                          💬 Comments (${video.comment_price || 0.01}
                          <UsdcIcon size={14} />)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleEditClick(video)}
                          className="text-flix-primary hover:underline text-sm font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <Link
                          to={`/video/${video.id}`}
                          className="text-flix-secondary hover:underline text-sm font-medium"
                        >
                          👁️ View
                        </Link>
                        <button
                          onClick={() => handleArchiveToggle(video)}
                          disabled={archivingVideo === video.id}
                          className={`${
                            video.archived
                              ? 'text-yellow-400 hover:text-yellow-300'
                              : 'text-gray-400 hover:text-gray-300'
                          } hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {archivingVideo === video.id ? '⏳' : video.archived ? '📂 Unarchive' : '📦 Archive'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(video)}
                          className="text-red-400 hover:underline text-sm font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                      {video.archived && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-red-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Video</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete <span className="font-semibold text-white">"{deletingVideo.title}"</span>?
              </p>
              <p className="text-gray-400 text-sm">
                This video will be permanently removed from your account and will no longer be accessible to viewers.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                No, Keep Video
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
