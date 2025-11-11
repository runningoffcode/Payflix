-- ========================================
-- PAYFLIX DATABASE SCHEMA
-- Complete table creation for Supabase
-- Run this FIRST before COMPLETE_RLS_FIX.sql
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT,
  is_creator BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. VIDEOS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_usdc DECIMAL(10, 2) DEFAULT 0,
  price DECIMAL(10, 2) DEFAULT 0,
  thumbnail_url TEXT,
  video_url TEXT,
  video_path TEXT,
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  earnings DECIMAL(10, 2) DEFAULT 0,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  creator_amount DECIMAL(10, 2) NOT NULL,
  platform_amount DECIMAL(10, 2) NOT NULL,
  transaction_signature TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. VIDEO ACCESS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.video_access (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- ========================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_wallet ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_videos_creator ON public.videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_created ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_video ON public.payments(video_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx ON public.payments(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_video_access_user ON public.video_access(user_id);
CREATE INDEX IF NOT EXISTS idx_video_access_video ON public.video_access(video_id);

-- ========================================
-- 6. CREATE UPDATED_AT TRIGGER
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_videos_updated_at ON public.videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. VERIFY TABLES CREATED
-- ========================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN ('users', 'videos', 'payments', 'video_access')
ORDER BY table_name;

SELECT 'Database schema created successfully!' as status;
