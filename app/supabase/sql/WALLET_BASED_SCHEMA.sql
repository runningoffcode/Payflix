-- ============================================
-- PAYFLIX - WALLET-BASED SCHEMA
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS public.video_views CASCADE;
DROP TABLE IF EXISTS public.video_unlocks CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.creator_stats CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- USERS TABLE - Wallet-Based Auth
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'viewer')),
  profile_image_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX users_wallet_address_idx ON public.users(wallet_address);
CREATE INDEX users_username_idx ON public.users(username);
CREATE INDEX users_role_idx ON public.users(role);

-- ============================================
-- VIDEOS TABLE
-- ============================================
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  is_promoted BOOLEAN DEFAULT FALSE,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX videos_creator_id_idx ON public.videos(creator_id);
CREATE INDEX videos_is_promoted_idx ON public.videos(is_promoted);
CREATE INDEX videos_created_at_idx ON public.videos(created_at DESC);
CREATE INDEX videos_views_idx ON public.videos(views DESC);
CREATE INDEX videos_category_idx ON public.videos(category);

-- ============================================
-- CREATOR STATS TABLE
-- ============================================
CREATE TABLE public.creator_stats (
  creator_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_videos INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'solana',
  transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transaction queries
CREATE INDEX transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX transactions_video_id_idx ON public.transactions(video_id);
CREATE INDEX transactions_creator_id_idx ON public.transactions(creator_id);
CREATE INDEX transactions_status_idx ON public.transactions(status);
CREATE INDEX transactions_created_at_idx ON public.transactions(created_at DESC);

-- ============================================
-- VIDEO UNLOCKS TABLE
-- ============================================
CREATE TABLE public.video_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Indexes for unlock checks
CREATE INDEX video_unlocks_user_id_idx ON public.video_unlocks(user_id);
CREATE INDEX video_unlocks_video_id_idx ON public.video_unlocks(video_id);

-- ============================================
-- VIDEO VIEWS TABLE
-- ============================================
CREATE TABLE public.video_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  watched_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for view analytics
CREATE INDEX video_views_video_id_idx ON public.video_views(video_id);
CREATE INDEX video_views_user_id_idx ON public.video_views(user_id);
CREATE INDEX video_views_created_at_idx ON public.video_views(created_at DESC);

-- ============================================
-- AUTOMATED TRIGGERS
-- ============================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_stats_updated_at BEFORE UPDATE ON public.creator_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Initialize creator stats when user is created
CREATE OR REPLACE FUNCTION initialize_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.creator_stats (creator_id)
  VALUES (NEW.id)
  ON CONFLICT (creator_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_creator_stats_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION initialize_creator_stats();

-- Trigger: Update creator stats when video is added
CREATE OR REPLACE FUNCTION update_creator_stats_on_video_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.creator_stats
  SET
    total_videos = total_videos + 1,
    updated_at = NOW()
  WHERE creator_id = NEW.creator_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_creator_video_count
  AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_creator_stats_on_video_insert();

-- Trigger: Update creator stats when video is deleted
CREATE OR REPLACE FUNCTION update_creator_stats_on_video_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.creator_stats
  SET
    total_videos = GREATEST(0, total_videos - 1),
    updated_at = NOW()
  WHERE creator_id = OLD.creator_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_creator_video_count
  AFTER DELETE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_creator_stats_on_video_delete();

-- Trigger: Update stats when transaction is completed
CREATE OR REPLACE FUNCTION update_stats_on_transaction_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.videos
    SET clicks = clicks + 1
    WHERE id = NEW.video_id;

    UPDATE public.creator_stats
    SET
      total_clicks = total_clicks + 1,
      total_revenue = total_revenue + NEW.amount,
      updated_at = NOW()
    WHERE creator_id = NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_on_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_stats_on_transaction_complete();

-- Trigger: Update view counts
CREATE OR REPLACE FUNCTION increment_video_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.videos
  SET views = views + 1
  WHERE id = NEW.video_id;

  UPDATE public.creator_stats
  SET
    total_views = total_views + 1,
    updated_at = NOW()
  WHERE creator_id = (SELECT creator_id FROM public.videos WHERE id = NEW.video_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_views_on_video_view
  AFTER INSERT ON public.video_views
  FOR EACH ROW EXECUTE FUNCTION increment_video_views();

-- ============================================
-- ROW LEVEL SECURITY (Open for Wallet Auth)
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for wallet-based authentication
CREATE POLICY "users_allow_all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "videos_allow_all" ON public.videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "creator_stats_allow_all" ON public.creator_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "transactions_allow_all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "video_unlocks_allow_all" ON public.video_unlocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "video_views_allow_all" ON public.video_views FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get trending videos
CREATE OR REPLACE FUNCTION get_trending_videos(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  price DECIMAL,
  views INTEGER,
  clicks INTEGER,
  category TEXT,
  creator_id UUID,
  creator_username TEXT,
  creator_profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.thumbnail_url,
    v.duration,
    v.price,
    v.views,
    v.clicks,
    v.category,
    v.creator_id,
    u.username AS creator_username,
    u.profile_image_url AS creator_profile_image,
    v.created_at
  FROM public.videos v
  JOIN public.users u ON v.creator_id = u.id
  WHERE v.is_promoted = true
  ORDER BY v.views DESC, v.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get top videos by views
CREATE OR REPLACE FUNCTION get_top_videos(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  price DECIMAL,
  views INTEGER,
  clicks INTEGER,
  category TEXT,
  creator_id UUID,
  creator_username TEXT,
  creator_profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.thumbnail_url,
    v.duration,
    v.price,
    v.views,
    v.clicks,
    v.category,
    v.creator_id,
    u.username AS creator_username,
    u.profile_image_url AS creator_profile_image,
    v.created_at
  FROM public.videos v
  JOIN public.users u ON v.creator_id = u.id
  ORDER BY v.views DESC, v.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS (Run these separately)
-- ============================================
-- After running this SQL, create these storage buckets manually:
-- 1. videos (public)
-- 2. thumbnails (public)
-- 3. profile-images (public)
