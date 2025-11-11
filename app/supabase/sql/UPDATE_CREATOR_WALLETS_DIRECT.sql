-- Direct update of all videos to have valid creator wallets
-- Run this in your Supabase SQL Editor

-- First, let's see what we have
SELECT id, title, creator_wallet FROM videos LIMIT 3;

-- Update all videos to use valid test wallets (rotates through 3 wallets)
UPDATE videos
SET creator_wallet = CASE
    WHEN MOD(CAST(SUBSTRING(id, 1, 8) AS INTEGER), 3) = 0 THEN 'GJJyxN8yDKQHvXqhMVEqVVVVAZqQhJ4sJNx5pXCk8Lpx'
    WHEN MOD(CAST(SUBSTRING(id, 1, 8) AS INTEGER), 3) = 1 THEN '8xFp4bUQ3x2V5s7M9pQ3kTDj6Hx8Fz9vR5Wp7VzNxQpL'
    ELSE 'BvDGmFw2xSvJ4Y8kJ9xZzQh3Tx6Rp5Yt8Nm4Lx7Kp9Vw'
END
WHERE creator_wallet = 'SampleCreator1ABC123456789' OR creator_wallet IS NULL;

-- Verify the update
SELECT id, title, creator_wallet FROM videos LIMIT 5;

-- Count updated
SELECT COUNT(*) as total_videos,
       COUNT(DISTINCT creator_wallet) as unique_wallets
FROM videos;
