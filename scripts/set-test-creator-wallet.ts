/**
 * Set Test Creator Wallet
 * Updates all videos to use the provided test wallet address
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// User's test wallet address
const TEST_WALLET = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';

async function setTestCreatorWallet() {
  console.log(`🔧 Setting all videos to use test wallet: ${TEST_WALLET}\n`);

  try {
    // First get all videos
    const { data: allVideos, error: fetchError } = await supabase
      .from('videos')
      .select('id, title, creator_wallet');

    if (fetchError) {
      throw new Error(`Failed to fetch videos: ${fetchError.message}`);
    }

    console.log(`Found ${allVideos?.length || 0} total videos`);

    // Update each video individually
    const updates = [];
    for (const video of allVideos || []) {
      const { error } = await supabase
        .from('videos')
        .update({ creator_wallet: TEST_WALLET })
        .eq('id', video.id);

      if (error) {
        console.error(`❌ Failed to update ${video.title}: ${error.message}`);
      } else {
        console.log(`✅ Updated: ${video.title}`);
        updates.push(video);
      }
    }

    const data = updates;

    if (error) {
      throw new Error(`Failed to update videos: ${error.message}`);
    }

    console.log(`✅ Updated ${data?.length || 0} videos\n`);

    if (data && data.length > 0) {
      console.log('Updated videos:');
      data.slice(0, 5).forEach(v => {
        console.log(`   - ${v.title}`);
      });
      if (data.length > 5) {
        console.log(`   ... and ${data.length - 5} more`);
      }
    }

    // Verify
    const { data: sampleVideos } = await supabase
      .from('videos')
      .select('id, title, creator_wallet')
      .limit(3);

    console.log(`\n🔍 Verification - Sample videos:`);
    sampleVideos?.forEach(v => {
      console.log(`   - ${v.title}`);
      console.log(`     Wallet: ${v.creator_wallet}`);
    });

    console.log(`\n✅ All videos now use wallet: ${TEST_WALLET}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setTestCreatorWallet();
