-- ============================================
-- FLIX BACKEND - SUPABASE DATABASE SCHEMA
-- ============================================
-- Production-ready schema for YouTube-style creator platform
-- Features: Auth, Videos, Analytics, Payments, Trending

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Extends Supabase auth.users with profile data
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('creator', 'viewer')),
  profile_image_url TEXT,
  wallet_address TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX users_username_idx ON public.users(username);
CREATE INDEX users_wallet_address_idx ON public.users(wallet_address);
CREATE INDEX users_role_idx ON public.users(role);

-- ============================================
-- VIDEOS TABLE
-- ============================================
-- Core video metadata and content
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  is_promoted BOOLEAN DEFAULT FALSE, -- for trending algorithm
  category TEXT,
  tags TEXT[], -- array of tags for search
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
-- Real-time analytics for creators
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
-- Payment and unlock tracking
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT, -- 'stripe', 'solana', 'usdc', etc.
  transaction_hash TEXT, -- for blockchain payments
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
-- Track which users have access to which videos
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
-- VIEWS TRACKING TABLE
-- ============================================
-- Track individual video views for analytics
CREATE TABLE public.video_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  watched_duration INTEGER, -- seconds watched
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

-- Trigger: Initialize creator stats when user becomes creator
CREATE OR REPLACE FUNCTION initialize_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'creator' THEN
    INSERT INTO public.creator_stats (creator_id)
    VALUES (NEW.id)
    ON CONFLICT (creator_id) DO NOTHING;
  END IF;
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
    -- Update video clicks
    UPDATE public.videos
    SET clicks = clicks + 1
    WHERE id = NEW.video_id;

    -- Update creator revenue
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Users: Can read all, update own profile
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Videos: Public read, creators can manage their own
CREATE POLICY "Anyone can view videos" ON public.videos
  FOR SELECT USING (true);

CREATE POLICY "Creators can insert own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own videos" ON public.videos
  FOR DELETE USING (auth.uid() = creator_id);

-- Creator Stats: Public read, only owner can update
CREATE POLICY "Anyone can view creator stats" ON public.creator_stats
  FOR SELECT USING (true);

CREATE POLICY "Creators can view own stats" ON public.creator_stats
  FOR UPDATE USING (auth.uid() = creator_id);

-- Transactions: Users can view own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Users can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Video Unlocks: Users can view own unlocks
CREATE POLICY "Users can view own unlocks" ON public.video_unlocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create unlocks" ON public.video_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Video Views: Anyone can insert views
CREATE POLICY "Anyone can insert video views" ON public.video_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own viewing history" ON public.video_views
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get trending videos (promoted + high engagement)
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

-- Function: Check if user has access to video
CREATE OR REPLACE FUNCTION has_video_access(user_uuid UUID, video_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  video_price DECIMAL;
  is_creator BOOLEAN;
  has_unlock BOOLEAN;
BEGIN
  -- Check if user is the video creator
  SELECT EXISTS(
    SELECT 1 FROM public.videos
    WHERE id = video_uuid AND creator_id = user_uuid
  ) INTO is_creator;

  IF is_creator THEN
    RETURN true;
  END IF;

  -- Check if video is free
  SELECT price INTO video_price FROM public.videos WHERE id = video_uuid;

  IF video_price = 0 THEN
    RETURN true;
  END IF;

  -- Check if user has unlocked it
  SELECT EXISTS(
    SELECT 1 FROM public.video_unlocks
    WHERE user_id = user_uuid AND video_id = video_uuid
  ) INTO has_unlock;

  RETURN has_unlock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- This section can be removed in production
-- Uncomment to populate with sample data for testing

/*
-- Sample users will be created through Supabase Auth
-- Sample videos, stats, etc. can be added here for testing
*/
