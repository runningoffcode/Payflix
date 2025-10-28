-- ============================================
-- SIMPLE RLS FIX - Only Update Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can insert own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can delete own videos" ON public.videos;

DROP POLICY IF EXISTS "Anyone can view creator stats" ON public.creator_stats;
DROP POLICY IF EXISTS "Creators can view own stats" ON public.creator_stats;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view own unlocks" ON public.video_unlocks;
DROP POLICY IF EXISTS "Users can create unlocks" ON public.video_unlocks;

DROP POLICY IF EXISTS "Anyone can insert video views" ON public.video_views;
DROP POLICY IF EXISTS "Users can view own viewing history" ON public.video_views;

-- Create new permissive policies for wallet-based auth
CREATE POLICY "users_allow_all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "videos_allow_all" ON public.videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "creator_stats_allow_all" ON public.creator_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "transactions_allow_all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "video_unlocks_allow_all" ON public.video_unlocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "video_views_allow_all" ON public.video_views FOR ALL USING (true) WITH CHECK (true);
