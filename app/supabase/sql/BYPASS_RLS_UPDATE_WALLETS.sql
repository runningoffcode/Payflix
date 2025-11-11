-- Temporarily disable RLS to update creator wallets
-- Run this in Supabase SQL Editor with your service role key

-- Disable RLS temporarily
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;

-- Update all videos to use test wallet
UPDATE public.videos
SET creator_wallet = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu'
WHERE creator_wallet IS NULL
   OR creator_wallet = 'SampleCreator1ABC123456789'
   OR creator_wallet != '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';

-- Re-enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Verify the update
SELECT id, title, creator_wallet, price_usdc
FROM public.videos
ORDER BY created_at DESC
LIMIT 10;

-- Count how many videos were updated
SELECT
  COUNT(*) as total_videos,
  COUNT(DISTINCT creator_wallet) as unique_wallets
FROM public.videos;
