/**
 * Update Creator Wallets via Direct SQL
 * Uses raw SQL execution to bypass potential RLS issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_WALLET = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';

async function updateWalletsSQL() {
  console.log(`🔧 Updating all videos to use test wallet: ${TEST_WALLET}\n`);

  try {
    // Execute raw SQL to update all videos
    console.log('Executing SQL UPDATE statement...');
    const { data: updateResult, error: updateError } = await supabase.rpc(
      'exec_sql',
      {
        sql: `UPDATE videos
              SET creator_wallet = '${TEST_WALLET}'
              WHERE creator_wallet IS NULL
                 OR creator_wallet = 'SampleCreator1ABC123456789'
                 OR creator_wallet != '${TEST_WALLET}'
              RETURNING id, title, creator_wallet;`
      }
    );

    if (updateError) {
      console.log('⚠️  RPC function not available, trying direct update...\n');

      // Fallback: Get all videos and update via API
      const { data: videos, error: fetchError } = await supabase
        .from('videos')
        .select('id, title, creator_wallet');

      if (fetchError) {
        throw new Error(`Failed to fetch videos: ${fetchError.message}`);
      }

      console.log(`Found ${videos?.length || 0} videos\n`);

      let updated = 0;
      for (const video of videos || []) {
        if (video.creator_wallet !== TEST_WALLET) {
          const { error } = await supabase
            .from('videos')
            .update({ creator_wallet: TEST_WALLET })
            .eq('id', video.id);

          if (error) {
            console.error(`❌ Failed to update ${video.title}: ${error.message}`);
          } else {
            console.log(`✅ Updated: ${video.title}`);
            updated++;
          }
        } else {
          console.log(`⏭️  Skipped (already correct): ${video.title}`);
        }
      }

      console.log(`\n📊 Updated ${updated} videos`);
    } else {
      console.log('✅ SQL executed successfully');
      console.log(`Updated rows:`, updateResult);
    }

    // Verify the update
    console.log('\n🔍 Verifying updates...');
    const { data: verifyVideos, error: verifyError } = await supabase
      .from('videos')
      .select('id, title, creator_wallet')
      .limit(5);

    if (verifyError) {
      throw new Error(`Failed to verify: ${verifyError.message}`);
    }

    console.log('\nSample videos after update:');
    verifyVideos?.forEach(v => {
      const isCorrect = v.creator_wallet === TEST_WALLET;
      const icon = isCorrect ? '✅' : '❌';
      console.log(`${icon} ${v.title}`);
      console.log(`   Wallet: ${v.creator_wallet}`);
    });

    // Count total videos with correct wallet
    const { count, error: countError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('creator_wallet', TEST_WALLET);

    if (!countError) {
      console.log(`\n✅ Total videos with correct wallet: ${count}`);
    }

    console.log(`\n✅ Update complete!`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateWalletsSQL();
