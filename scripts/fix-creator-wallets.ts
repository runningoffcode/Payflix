/**
 * Fix Creator Wallets Script
 * Updates all videos in Supabase to have valid creator wallet addresses
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCreatorWallets() {
  console.log('🔧 Fixing creator wallets for videos...\n');

  try {
    // Step 1: Get all videos without creator wallets
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, creator_id, creator_wallet')
      .is('creator_wallet', null);

    if (videosError) {
      throw new Error(`Failed to fetch videos: ${videosError.message}`);
    }

    console.log(`Found ${videos?.length || 0} videos without creator wallets\n`);

    if (!videos || videos.length === 0) {
      console.log('✅ All videos already have creator wallets!');
      return;
    }

    // Step 2: Get all users with their wallet addresses
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, wallet_address');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`Found ${users?.length || 0} users\n`);

    // Create a map of user IDs to wallet addresses
    const userWallets = new Map(users?.map(u => [u.id, u.wallet_address]) || []);

    // Step 3: Update each video with its creator's wallet
    let updated = 0;
    let skipped = 0;

    for (const video of videos) {
      const creatorWallet = userWallets.get(video.creator_id);

      if (creatorWallet) {
        const { error: updateError } = await supabase
          .from('videos')
          .update({ creator_wallet: creatorWallet })
          .eq('id', video.id);

        if (updateError) {
          console.error(`❌ Failed to update video ${video.title}: ${updateError.message}`);
          skipped++;
        } else {
          console.log(`✅ Updated "${video.title}" with wallet ${creatorWallet.slice(0, 8)}...`);
          updated++;
        }
      } else {
        console.log(`⚠️  No wallet found for creator of "${video.title}" - using platform wallet`);

        // Use platform wallet as fallback
        const { error: updateError } = await supabase
          .from('videos')
          .update({ creator_wallet: '81qpJ8kP4kb1Vf7kgubyEUcJ726dHEEqpFRP4wTFsr1o' })
          .eq('id', video.id);

        if (updateError) {
          console.error(`❌ Failed to update video: ${updateError.message}`);
          skipped++;
        } else {
          updated++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Skipped: ${skipped}`);

    // Step 4: Verify the fix
    const { data: updatedVideos, error: verifyError } = await supabase
      .from('videos')
      .select('id, title, creator_wallet')
      .limit(5);

    if (!verifyError && updatedVideos) {
      console.log(`\n🔍 Sample updated videos:`);
      updatedVideos.forEach(v => {
        console.log(`   - ${v.title}: ${v.creator_wallet?.slice(0, 12)}...`);
      });
    }

    console.log('\n✅ Creator wallets fixed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCreatorWallets();
