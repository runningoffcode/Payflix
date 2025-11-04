import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { PublicKey, Transaction } from '@solana/web3.js';

interface Comment {
  id: string;
  user_wallet: string;
  content: string;
  payment_signature?: string;
  is_highlighted: boolean;
  created_at: string;
  user_display?: string;
}

interface CommentSectionProps {
  videoId: string;
  commentPrice: number;
  enabled: boolean;
  isCreator?: boolean;
}

export default function CommentSection({
  videoId,
  commentPrice,
  enabled,
  isCreator = false,
}: CommentSectionProps) {
  const { publicKey, signTransaction } = useWallet();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [highlightComment, setHighlightComment] = useState(false);

  useEffect(() => {
    fetchComments();

    // Setup real-time comment updates
    const interval = setInterval(fetchComments, 10000);
    return () => clearInterval(interval);
  }, [videoId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet to post a comment');
      return;
    }

    if (!newComment.trim()) {
      alert('Please enter a comment');
      return;
    }

    setPosting(true);

    try {
      // Step 1: Request payment transaction from backend
      const paymentResponse = await fetch('/api/comments/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          user_wallet: publicKey.toBase58(),
          is_highlighted: highlightComment,
        }),
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json();
        throw new Error(error.message || 'Failed to create comment payment');
      }

      const { transaction: transactionBase64 } = await paymentResponse.json();

      // Step 2: Sign the transaction
      const transactionBuffer = Buffer.from(transactionBase64, 'base64');
      const transaction = Transaction.from(transactionBuffer);
      const signedTransaction = await signTransaction(transaction);

      // Step 3: Post comment with signed transaction
      const commentResponse = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          user_wallet: publicKey.toBase58(),
          content: newComment.trim(),
          is_highlighted: highlightComment,
          signed_transaction: Buffer.from(signedTransaction.serialize()).toString('base64'),
        }),
      });

      if (!commentResponse.ok) {
        const error = await commentResponse.json();
        throw new Error(error.message || 'Failed to post comment');
      }

      // Success!
      setNewComment('');
      setHighlightComment(false);
      await fetchComments();
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      alert(error.message || 'Failed to post comment. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator_wallet: publicKey?.toBase58(),
        }),
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      await fetchComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  if (!enabled) {
    return (
      <div className="glass-effect rounded-xl p-8 text-center">
        <div className="text-4xl mb-2">💬</div>
        <p className="text-gray-400">Comments are disabled for this video</p>
      </div>
    );
  }

  const highlightPrice = commentPrice * 5; // Highlighted comments cost 5x

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      {publicKey && (
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Post a Comment</h3>
          <form onSubmit={handlePostComment} className="space-y-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-3 bg-flix-dark border border-white/10 rounded-lg text-white focus:border-flix-primary focus:outline-none resize-none"
              rows={3}
              disabled={posting}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highlightComment}
                    onChange={(e) => setHighlightComment(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-flix-dark text-flix-primary focus:ring-flix-primary"
                    disabled={posting}
                  />
                  <span className="text-sm text-gray-300">
                    Highlight comment ({highlightPrice.toFixed(2)} USDC)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={posting || !newComment.trim()}
                className="gradient-bg px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {posting ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Posting...</span>
                  </span>
                ) : (
                  `Post (${highlightComment ? highlightPrice.toFixed(2) : commentPrice.toFixed(2)} USDC)`
                )}
              </button>
            </div>
          </form>

          <p className="text-xs text-gray-500 mt-3">
            💡 Comments are monetized via X402 protocol. A small payment supports the creator.
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Comments ({comments.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-flix-primary border-t-transparent"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="glass-effect rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-gray-400">No comments yet</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-xl p-4 ${
                  comment.is_highlighted
                    ? 'bg-gradient-to-r from-flix-primary/20 to-flix-secondary/20 border border-flix-primary/30'
                    : 'glass-effect'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-flix-primary to-flix-secondary flex items-center justify-center text-white text-sm font-bold">
                        {comment.user_display?.[0] || comment.user_wallet.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {comment.user_display ||
                            `${comment.user_wallet.substring(0, 4)}...${comment.user_wallet.substring(comment.user_wallet.length - 4)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()} at{' '}
                          {new Date(comment.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      {comment.is_highlighted && (
                        <span className="text-xs bg-flix-primary/20 text-flix-primary px-2 py-1 rounded">
                          ⭐ Highlighted
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">{comment.content}</p>
                  </div>

                  {isCreator && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-400 hover:text-red-300 text-sm ml-4"
                      title="Delete comment"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
