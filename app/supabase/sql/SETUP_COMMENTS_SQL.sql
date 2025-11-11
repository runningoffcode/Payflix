-- =====================================================
-- COMMENTS SYSTEM SETUP SQL
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Add comment settings to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS comment_price DECIMAL(10, 2) DEFAULT 0;

-- Step 2: Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL,
  username TEXT,
  profile_picture_url TEXT,
  content TEXT NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Step 4: Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies

-- Anyone can read comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- Users can create comments (payment verification happens in backend)
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_wallet = current_setting('request.jwt.claim.wallet_address', true));

-- Creators can delete comments on their videos
CREATE POLICY "Creators can delete comments on their videos"
  ON comments FOR DELETE
  USING (
    video_id IN (
      SELECT id FROM videos
      WHERE creator_id = (
        SELECT id FROM users
        WHERE wallet_address = current_setting('request.jwt.claim.wallet_address', true)
      )
    )
  );

-- Verify the setup
SELECT 'Setup complete! 🎉' AS status;
