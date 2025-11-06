import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';

interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  user_wallet: string;
  username: string | null;
  profile_picture_url: string | null;
  content: string;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CommentSectionProps {
  videoId: string;
  commentsEnabled: boolean;
  commentPrice: number;
}

export default function CommentSection({ videoId, commentsEnabled, commentPrice }: CommentSectionProps) {
  const { publicKey } = useWallet();
  const { user, token } = useAuth();
  const { showToast } = useToastContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCreditsPrompt, setShowAddCreditsPrompt] = useState(false);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [videoId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/comments/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        console.error('Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !user) {
      setError('Please connect your wallet to comment');
      return;
    }

    if (!token) {
      setError('Authentication in progress. Please try again in a moment.');
      return;
    }

    if (!newComment.trim()) {
      setError('Please enter a comment');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoId,
          content: newComment.trim(),
          userWallet: walletAddress,
          username: user.username,
          profilePictureUrl: null, // Can add profile picture support later
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewComment('');
        setShowAddCreditsPrompt(false);
        await fetchComments();

        if (data.balance?.hasSession) {
          window.dispatchEvent(new Event('sessionUpdated'));
        }

        showToast({
          title: 'Comment posted',
          description: commentPrice > 0
            ? `Comment posted! $${commentPrice} USDC deducted from your session balance.`
            : 'Thanks for joining the conversation.',
          variant: 'success',
        });
      } else if (response.status === 402) {
        // Payment required - insufficient session balance
        setError(data.message || 'Insufficient session balance');
        setShowAddCreditsPrompt(true);
      } else if (response.status === 403) {
        // Comments disabled
        setError(data.error || 'Comments are disabled for this video');
      } else {
        setError(data.error || 'Failed to post comment');
        showToast({
          title: 'Failed to post comment',
          description: data.error || 'Something went wrong while posting your comment.',
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      setError('Failed to post comment. Please try again.');
      showToast({
        title: 'Failed to post comment',
        description: 'Please try again.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!publicKey) return;

    const confirmed = window.confirm('Are you sure you want to delete this comment?');
    if (!confirmed) return;

    try {
      const walletAddress = publicKey.toBase58();

      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        // Remove comment from UI
        setComments(comments.filter(c => c.id !== commentId));
      } else {
        const data = await response.json();
        alert(`Failed to delete comment: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!commentsEnabled) {
    return (
      <div className="bg-neutral-800/50 rounded-lg p-6 mt-8">
        <p className="text-neutral-400 text-center">Comments are disabled for this video</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {/* Comment Form */}
      {publicKey && user ? (
        <form onSubmit={handleSubmitComment} className="bg-neutral-800/50 rounded-lg p-4 mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              commentPrice > 0
                ? `Write a comment... ($${commentPrice} USDC per comment)`
                : 'Write a comment...'
            }
            maxLength={1000}
            rows={3}
            disabled={submitting}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 resize-none"
          />

          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
              {showAddCreditsPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    showToast({
                      title: 'Top up required',
                      description: 'Open the sidebar to add credits to your session balance, then try again.',
                      variant: 'info',
                    });
                  }}
                  className="mt-2 text-sm text-purple-400 hover:text-purple-300 underline"
                >
                  Add Credits
                </button>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-neutral-400">
              {newComment.length}/1000 characters
              {commentPrice > 0 && (
                <span className="ml-3 text-purple-400">
                  💰 ${commentPrice} USDC will be deducted from your session balance
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : commentPrice > 0 ? `Post ($${commentPrice})` : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-neutral-800/50 rounded-lg p-4 mb-6 text-center">
          <p className="text-neutral-400">
            {commentPrice > 0
              ? `Connect your wallet and add credits to comment ($${commentPrice} USDC per comment)`
              : 'Connect your wallet to comment'}
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-neutral-800/30 rounded-lg p-8 text-center">
            <p className="text-neutral-400">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-neutral-800/50 rounded-lg p-4 hover:bg-neutral-800/70 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* User Avatar */}
                  {comment.profile_picture_url ? (
                    <img
                      src={comment.profile_picture_url}
                      alt={comment.username || 'User'}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {(comment.username || comment.user_wallet)[0].toUpperCase()}
                    </div>
                  )}

                  {/* Comment Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        {comment.username || `${comment.user_wallet.slice(0, 4)}...${comment.user_wallet.slice(-4)}`}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                      {comment.payment_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-300 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>

                {/* Delete Button (only for comment owner or video creator) */}
                {publicKey && comment.user_wallet === publicKey.toBase58() && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-neutral-500 hover:text-red-400 transition-colors ml-2"
                    title="Delete comment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
