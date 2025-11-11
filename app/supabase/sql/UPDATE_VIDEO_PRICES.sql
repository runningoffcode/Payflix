-- Update all video prices to be much cheaper (0.01 - 0.50 USDC)
-- Temporarily disable RLS to allow updates
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;

-- Update videos with random prices between 0.01 and 0.50 USDC
UPDATE public.videos
SET price_usdc = CASE
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 0) THEN 0.05
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 1) THEN 0.10
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 2) THEN 0.15
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 3) THEN 0.20
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 4) THEN 0.25
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 5) THEN 0.30
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 6) THEN 0.35
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 7) THEN 0.40
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 8) THEN 0.45
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 9) THEN 0.50
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 10) THEN 0.01
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 11) THEN 0.02
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 12) THEN 0.03
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 13) THEN 0.08
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 14) THEN 0.12
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 15) THEN 0.18
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 16) THEN 0.22
    WHEN id = (SELECT id FROM public.videos ORDER BY id LIMIT 1 OFFSET 17) THEN 0.28
    ELSE 0.10  -- Default price
END;

-- Re-enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Verify the update
SELECT title, price_usdc FROM public.videos ORDER BY price_usdc;
