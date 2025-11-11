-- ===============================================
-- FIX VIDEOS TABLE RLS - ALLOW PUBLIC READS
-- ===============================================
-- This enables anyone to read videos from the videos table

-- Enable RLS on videos table (if not already enabled)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to videos" ON public.videos;
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;

-- Create policy to allow anyone to read videos
CREATE POLICY "Anyone can view videos"
ON public.videos
FOR SELECT
TO public
USING (true);

-- Create policy to allow authenticated users to insert videos
CREATE POLICY "Authenticated users can insert videos"
ON public.videos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow creators to update their own videos
CREATE POLICY "Creators can update their own videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
WITH CHECK (creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Also allow anonymous inserts (for testing)
CREATE POLICY "Anonymous users can insert videos"
ON public.videos
FOR INSERT
TO anon
WITH CHECK (true);

-- Verify policies
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'videos';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Videos table RLS policies updated';
    RAISE NOTICE '✅ Anyone can now read videos';
    RAISE NOTICE '✅ Authenticated users can insert videos';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 VIDEOS SHOULD NOW BE VISIBLE!';
END $$;
