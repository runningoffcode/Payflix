/**
 * Set Valid Creator Wallets
 * Updates videos to use the actual user wallet addresses or generates test wallets
 */

import { createClient } from '@supabase/supabase-js';
import { Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test wallet addresses for creators (Devnet)
const TEST_CREATOR_WALLETS = [
  'GJJyxN8yDKQHvXqhMVEqVVVVAZqQhJ4sJNx5pXCk8Lpx', // Test creator 1
  '8xFp4bUQ3x2V5s7M9pQ3kTDj6Hx8Fz9vR5Wp7VzNxQpL', // Test creator 2
  'BvDGmFw2xSvJ4Y8kJ9xZzQh3Tx6Rp5Yt8Nm4Lx7Kp9Vw', // Test creator 3
];

async function setValidCreatorWallets() {
  console.log('🔧 Setting valid creator wallets...\n');

  try {
    // Get all videos with invalid creator wallets
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, creator_id, creator_wallet')
      .or('creator_wallet.is.null,creator_wallet.eq.SampleCreator1ABC123456789');

    if (videosError) {
      throw new Error(`Failed to fetch videos: ${videosError.message}`);
    }

    console.log(`Found ${videos?.length || 0} videos with invalid creator wallets\n`);

    if (!videos || videos.length === 0) {
      console.log('✅ All videos have valid creator wallets!');
      return;
    }

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, wallet_address');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Create wallet map
    const userWallets = new Map(users?.map(u => [u.id, u.wallet_address]) || []);

    let updated = 0;
    let walletIndex = 0;

    for (const video of videos) {
      let walletAddress = userWallets.get(video.creator_id);

      // If no wallet found or it's invalid, use a test wallet
      if (!walletAddress || walletAddress === 'SampleCreator1ABC123456789') {
        walletAddress = TEST_CREATOR_WALLETS[walletIndex % TEST_CREATOR_WALLETS.length];
        walletIndex++;
      }

      const { error: updateError } = await supabase
        .from('videos')
        .update({ creator_wallet: walletAddress })
        .eq('id', video.id);

      if (updateError) {
        console.error(`❌ Failed to update "${video.title}": ${updateError.message}`);
      } else {
        console.log(`✅ Updated "${video.title}" → ${walletAddress.slice(0, 12)}...`);
        updated++;
      }
    }

    console.log(`\n📊 Summary: ${updated} videos updated with valid creator wallets`);

    // Verify
    const { data: sampleVideos } = await supabase
      .from('videos')
      .select('id, title, creator_wallet')
      .limit(5);

    if (sampleVideos) {
      console.log(`\n🔍 Sample videos:`);
      sampleVideos.forEach(v => {
        console.log(`   - ${v.title}: ${v.creator_wallet}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setValidCreatorWallets();
