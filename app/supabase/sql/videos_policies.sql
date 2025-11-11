-- =======================================================
-- Videos table RLS policies (canonical configuration)
-- Re-run this script if videos stop appearing due to RLS
-- =======================================================

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid duplicates
DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Anonymous users can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can update their own videos" ON public.videos;

-- Public read access
CREATE POLICY "Anyone can view videos"
ON public.videos
FOR SELECT
TO public
USING (true);

-- Authenticated inserts (creators)
CREATE POLICY "Authenticated users can insert videos"
ON public.videos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Optional anon inserts (dev/test)
CREATE POLICY "Anonymous users can insert videos"
ON public.videos
FOR INSERT
TO anon
WITH CHECK (true);

-- Creators can update their own videos
CREATE POLICY "Creators can update their own videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (
    creator_wallet = (
        current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
)
WITH CHECK (
    creator_wallet = (
        current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
);
