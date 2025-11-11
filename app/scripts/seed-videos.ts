import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from root directory
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedVideos() {
  console.log('🌱 Starting video seeding process...\n');

  try {
    // Step 1: Create sample creator user
    console.log('📝 Step 1: Creating sample creator user...');
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', 'SampleCreator1ABC123456789')
      .single();

    let creatorId: string;

    if (existingUser) {
      console.log('✅ Sample creator already exists:', existingUser.username);
      creatorId = existingUser.id;
    } else {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([
          {
            wallet_address: 'SampleCreator1ABC123456789',
            username: 'CryptoCreator',
            email: 'creator@flix.demo',
            is_creator: true,
          },
        ])
        .select()
        .single();

      if (userError) {
        console.error('❌ Error creating user:', userError);
        throw userError;
      }

      console.log('✅ Created sample creator:', newUser.username);
      creatorId = newUser.id;
    }

    // Step 2: Add sample videos
    console.log('\n📹 Step 2: Adding sample videos...');

    const sampleVideos = [
      {
        creator_id: creatorId,
        creator_wallet: 'SampleCreator1ABC123456789',
        title: 'Introduction to Web3 Development',
        description:
          'Learn the basics of building decentralized applications on Solana. This comprehensive tutorial covers wallet integration, smart contracts, and more!',
        price_usdc: 2.99,
        thumbnail_url: 'https://picsum.photos/seed/video1/640/360',
        video_url:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        video_path: '/videos/intro-web3-dev.mp4',
        duration: 634,
        views: 1250,
        earnings: 45.5,
        category: 'Education',
      },
      {
        creator_id: creatorId,
        creator_wallet: 'SampleCreator1ABC123456789',
        title: 'Solana Smart Contract Tutorial',
        description:
          'Deep dive into building and deploying smart contracts on Solana. Includes live coding examples and best practices.',
        price_usdc: 4.99,
        thumbnail_url: 'https://picsum.photos/seed/video2/640/360',
        video_url:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        video_path: '/videos/solana-smart-contracts.mp4',
        duration: 853,
        views: 890,
        earnings: 38.2,
        category: 'Technology',
      },
      {
        creator_id: creatorId,
        creator_wallet: 'SampleCreator1ABC123456789',
        title: 'NFT Marketplace Development',
        description:
          'Build your own NFT marketplace from scratch. Learn about metadata, token standards, and marketplace mechanics.',
        price_usdc: 5.99,
        thumbnail_url: 'https://picsum.photos/seed/video3/640/360',
        video_url:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        video_path: '/videos/nft-marketplace.mp4',
        duration: 900,
        views: 2100,
        earnings: 89.75,
        category: 'Technology',
      },
      {
        creator_id: creatorId,
        creator_wallet: 'SampleCreator1ABC123456789',
        title: 'DeFi Protocols Explained',
        description:
          'Understanding decentralized finance protocols, liquidity pools, and yield farming strategies.',
        price_usdc: 3.99,
        thumbnail_url: 'https://picsum.photos/seed/video4/640/360',
        video_url:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        video_path: '/videos/defi-explained.mp4',
        duration: 720,
        views: 1560,
        earnings: 62.4,
        category: 'Education',
      },
      {
        creator_id: creatorId,
        creator_wallet: 'SampleCreator1ABC123456789',
        title: 'Crypto Trading Strategies',
        description:
          'Advanced trading strategies for cryptocurrency markets. Technical analysis, risk management, and portfolio diversification.',
        price_usdc: 7.99,
        thumbnail_url: 'https://picsum.photos/seed/video5/640/360',
        video_url:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        video_path: '/videos/crypto-trading.mp4',
        duration: 1200,
        views: 3400,
        earnings: 156.3,
        category: 'Entertainment',
      },
      {
        creator_id: creatorId,
        creator_wallet: 'SampleCreator1ABC123456789',
        title: 'Building Decentralized Apps',
        description:
          'Full stack dApp development tutorial. Connect frontend to blockchain, handle transactions, and manage state.',
        price_usdc: 4.49,
        thumbnail_url: 'https://picsum.photos/seed/video6/640/360',
        video_url:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        video_path: '/videos/building-dapps.mp4',
        duration: 980,
        views: 780,
        earnings: 29.5,
        category: 'Technology',
      },
    ];

    // Check if videos already exist
    const { data: existingVideos, error: checkError } = await supabase
      .from('videos')
      .select('title')
      .eq('creator_wallet', 'SampleCreator1ABC123456789');

    if (checkError) {
      console.error('❌ Error checking existing videos:', checkError);
      throw checkError;
    }

    if (existingVideos && existingVideos.length > 0) {
      console.log(
        `⚠️  Found ${existingVideos.length} existing videos from sample creator`
      );
      console.log('   Deleting existing sample videos first...');

      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('creator_wallet', 'SampleCreator1ABC123456789');

      if (deleteError) {
        console.error('❌ Error deleting existing videos:', deleteError);
        throw deleteError;
      }

      console.log('✅ Deleted existing sample videos');
    }

    // Insert all videos
    const { data: insertedVideos, error: insertError } = await supabase
      .from('videos')
      .insert(sampleVideos)
      .select();

    if (insertError) {
      console.error('❌ Error inserting videos:', insertError);
      throw insertError;
    }

    console.log(`\n✅ Successfully added ${insertedVideos.length} sample videos!\n`);

    // Display added videos
    console.log('📺 Added Videos:');
    insertedVideos.forEach((video, index) => {
      console.log(
        `   ${index + 1}. ${video.title} - $${video.price_usdc} (${video.category})`
      );
    });

    console.log('\n🎉 Seeding complete!');
    console.log('💡 Refresh your home page at http://localhost:3000 to see the videos\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seedVideos();
