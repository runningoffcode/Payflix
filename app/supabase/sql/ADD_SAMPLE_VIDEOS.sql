-- ===============================================
-- ADD SAMPLE VIDEOS TO PAYFLIX
-- ===============================================
-- Run this in your Supabase SQL Editor to add sample videos

-- First, create a sample creator user if one doesn't exist
INSERT INTO public.users (wallet_address, username, email, is_creator, created_at, updated_at)
VALUES
  ('SampleCreator1ABC123456789', 'CryptoCreator', 'creator@flix.demo', true, NOW(), NOW())
ON CONFLICT (wallet_address) DO NOTHING;

-- Get the creator ID (we'll use it for the videos)
-- Replace with actual ID after running the above

-- Add sample videos
INSERT INTO public.videos (
  id,
  creator_id,
  creator_wallet,
  title,
  description,
  price_usdc,
  thumbnail_url,
  video_url,
  video_path,
  duration,
  views,
  earnings,
  category,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE wallet_address = 'SampleCreator1ABC123456789' LIMIT 1),
    'SampleCreator1ABC123456789',
    'Introduction to Web3 Development',
    'Learn the basics of building decentralized applications on Solana. This comprehensive tutorial covers wallet integration, smart contracts, and more!',
    2.99,
    'https://picsum.photos/seed/video1/640/360',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    '/videos/intro-web3-dev.mp4',
    634,
    1250,
    45.50,
    'Education',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE wallet_address = 'SampleCreator1ABC123456789' LIMIT 1),
    'SampleCreator1ABC123456789',
    'Solana Smart Contract Tutorial',
    'Deep dive into building and deploying smart contracts on Solana. Includes live coding examples and best practices.',
    4.99,
    'https://picsum.photos/seed/video2/640/360',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    '/videos/solana-smart-contracts.mp4',
    853,
    890,
    38.20,
    'Technology',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE wallet_address = 'SampleCreator1ABC123456789' LIMIT 1),
    'SampleCreator1ABC123456789',
    'NFT Marketplace Development',
    'Build your own NFT marketplace from scratch. Learn about metadata, token standards, and marketplace mechanics.',
    5.99,
    'https://picsum.photos/seed/video3/640/360',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    '/videos/nft-marketplace.mp4',
    900,
    2100,
    89.75,
    'Technology',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE wallet_address = 'SampleCreator1ABC123456789' LIMIT 1),
    'SampleCreator1ABC123456789',
    'DeFi Protocols Explained',
    'Understanding decentralized finance protocols, liquidity pools, and yield farming strategies.',
    3.99,
    'https://picsum.photos/seed/video4/640/360',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    '/videos/defi-explained.mp4',
    720,
    1560,
    62.40,
    'Education',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE wallet_address = 'SampleCreator1ABC123456789' LIMIT 1),
    'SampleCreator1ABC123456789',
    'Crypto Trading Strategies',
    'Advanced trading strategies for cryptocurrency markets. Technical analysis, risk management, and portfolio diversification.',
    7.99,
    'https://picsum.photos/seed/video5/640/360',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    '/videos/crypto-trading.mp4',
    1200,
    3400,
    156.30,
    'Entertainment',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE wallet_address = 'SampleCreator1ABC123456789' LIMIT 1),
    'SampleCreator1ABC123456789',
    'Building Decentralized Apps',
    'Full stack dApp development tutorial. Connect frontend to blockchain, handle transactions, and manage state.',
    4.49,
    'https://picsum.photos/seed/video6/640/360',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    '/videos/building-dapps.mp4',
    980,
    780,
    29.50,
    'Technology',
    NOW(),
    NOW()
  );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Sample videos added successfully!';
    RAISE NOTICE '📺 Added 6 videos with prices ranging from $2.99 to $7.99';
    RAISE NOTICE '🎬 Videos are ready to test the payment flow!';
END $$;
