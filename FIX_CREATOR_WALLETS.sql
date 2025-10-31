-- Fix creator wallets for existing videos
-- This script updates all videos to have valid Solana wallet addresses

-- First, let's get the actual user wallet addresses from the users table
-- and update videos to use those

UPDATE videos v
SET creator_wallet = u.wallet_address
FROM users u
WHERE v.creator_id = u.id
AND v.creator_wallet IS NULL;

-- For any videos that still don't have a creator wallet (orphaned videos),
-- set a default test wallet
UPDATE videos
SET creator_wallet = '81qpJ8kP4kb1Vf7kgubyEUcJ726dHEEqpFRP4wTFsr1o'
WHERE creator_wallet IS NULL;

-- Verify the update
SELECT id, title, creator_id, creator_wallet, price_usdc
FROM videos
ORDER BY created_at DESC
LIMIT 10;
