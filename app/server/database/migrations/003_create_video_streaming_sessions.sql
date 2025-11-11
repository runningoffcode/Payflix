-- Migration: Create video_streaming_sessions table
-- Purpose: Track active video streaming sessions to prevent URL sharing
-- Date: 2025-11-01

CREATE TABLE IF NOT EXISTS video_streaming_sessions (
  id TEXT PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by session token
CREATE INDEX IF NOT EXISTS idx_video_streaming_sessions_token
  ON video_streaming_sessions(session_token);

-- Index for fast lookups by user wallet and video
CREATE INDEX IF NOT EXISTS idx_video_streaming_sessions_user_video
  ON video_streaming_sessions(user_wallet, video_id);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_video_streaming_sessions_expires
  ON video_streaming_sessions(expires_at);

-- Comments
COMMENT ON TABLE video_streaming_sessions IS 'Tracks active video streaming sessions with wallet binding to prevent URL sharing';
COMMENT ON COLUMN video_streaming_sessions.session_token IS 'Unique token that ties streaming URL to specific user';
COMMENT ON COLUMN video_streaming_sessions.user_wallet IS 'Wallet address of user who initiated the session';
COMMENT ON COLUMN video_streaming_sessions.expires_at IS 'When this session expires (typically 1 hour)';
