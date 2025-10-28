-- ============================================
-- DISABLE RLS - Quick Fix for Upload Issues
-- Copy and paste this into Supabase SQL Editor
-- ============================================

-- Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_unlocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_stats DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "users_allow_all" ON public.users;
DROP POLICY IF EXISTS "videos_allow_all" ON public.videos;
DROP POLICY IF EXISTS "transactions_allow_all" ON public.transactions;
DROP POLICY IF EXISTS "video_unlocks_allow_all" ON public.video_unlocks;
DROP POLICY IF EXISTS "video_views_allow_all" ON public.video_views;
DROP POLICY IF EXISTS "creator_stats_allow_all" ON public.creator_stats;

-- Drop old restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Creators can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can delete their own videos" ON public.videos;

-- Make sure the id column has a default UUID generator
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.videos ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Success message
SELECT 'RLS has been disabled on all tables. Your uploads should now work!' as message;
