-- Update all videos to use test creator wallet
-- Test wallet: 7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu

-- Update all videos with the test wallet
UPDATE videos
SET creator_wallet = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu'
WHERE creator_wallet IS NULL
   OR creator_wallet = 'SampleCreator1ABC123456789'
   OR creator_wallet != '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';

-- Verify the update
SELECT id, title, creator_wallet, price_usdc
FROM videos
ORDER BY created_at DESC
LIMIT 10;
