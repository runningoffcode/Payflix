-- ============================================
-- PAYFLIX DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  bio TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  price_usdc DECIMAL(10, 2) NOT NULL DEFAULT 0,
  arweave_tx_id TEXT,
  arweave_url TEXT,
  thumbnail_url TEXT,
  category TEXT,
  tags TEXT[],
  duration INTEGER,
  views INTEGER DEFAULT 0,
  is_promoted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_usdc DECIMAL(10, 2) NOT NULL,
  transaction_signature TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_wallet TEXT NOT NULL,
  subscriber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, creator_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_videos_price ON videos(price_usdc);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_video ON purchases(video_id);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_wallet);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_wallet);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON videos;
DROP POLICY IF EXISTS "Creators can insert own videos" ON videos;
DROP POLICY IF EXISTS "Creators can update own videos" ON videos;
DROP POLICY IF EXISTS "Creators can delete own videos" ON videos;
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert purchases" ON purchases;
DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON subscriptions;

-- RLS Policies for users (anyone can read, anyone can insert/update for now)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (true);

-- RLS Policies for videos (anyone can read/write for now)
CREATE POLICY "Videos are viewable by everyone" ON videos
  FOR SELECT USING (true);

CREATE POLICY "Creators can insert own videos" ON videos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can update own videos" ON videos
  FOR UPDATE USING (true);

CREATE POLICY "Creators can delete own videos" ON videos
  FOR DELETE USING (true);

-- RLS Policies for purchases (open for now)
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (true);

CREATE POLICY "Users can insert purchases" ON purchases
  FOR INSERT WITH CHECK (true);

-- RLS Policies for subscriptions (open for now)
CREATE POLICY "Subscriptions are viewable by everyone" ON subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (true);
