-- ========================================
-- COMPLETE RLS DISABLE FOR PAYFLIX
-- Run this entire script in Supabase SQL Editor
-- ========================================

-- 1. DISABLE RLS ON ALL TABLES
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.video_access DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (prevents conflicts)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;

    -- Drop all policies on videos table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'videos') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.videos';
    END LOOP;

    -- Drop all policies on payments table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payments';
    END LOOP;

    -- Drop all policies on video_access table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'video_access') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.video_access';
    END LOOP;
END $$;

-- 3. GRANT FULL PERMISSIONS TO ANON AND AUTHENTICATED USERS
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.videos TO anon, authenticated;
GRANT ALL ON public.payments TO anon, authenticated;
GRANT ALL ON public.video_access TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. VERIFY RLS IS DISABLED
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'videos', 'payments', 'video_access');

-- Expected output: rls_enabled should be 'false' for all tables

-- 5. STORAGE BUCKET POLICIES (Make buckets public)
-- Note: Run these separately if needed in Storage settings
-- Or use the Supabase Dashboard to make buckets public

SELECT 'RLS has been completely disabled. All tables are now accessible.' as status;
