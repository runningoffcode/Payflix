/**
 * Delete a specific video and all associated data
 * Run with: npx ts-node scripts/delete-video.ts <video_id>
 */

import { createClient } from '@supabase/supabase-js';

async function deleteVideo(videoId: string) {
  console.log(`\n🗑️  Deleting video: ${videoId}\n`);

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Delete video_access records
    console.log('📝 Step 1: Deleting video access records...');
    const { error: accessError } = await supabase
      .from('video_access')
      .delete()
      .eq('video_id', videoId);

    if (accessError) {
      console.log(`   ⚠️  Warning: ${accessError.message}`);
    } else {
      console.log('   ✅ Video access records deleted');
    }

    // Step 2: Delete payments
    console.log('\n📝 Step 2: Deleting payment records...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('video_id', videoId);

    if (paymentsError) {
      console.log(`   ⚠️  Warning: ${paymentsError.message}`);
    } else {
      console.log('   ✅ Payment records deleted');
    }

    // Step 3: Delete the video itself
    console.log('\n📝 Step 3: Deleting video record...');
    const { error: videoError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (videoError) {
      console.error(`   ❌ Error: ${videoError.message}`);
      process.exit(1);
    } else {
      console.log('   ✅ Video record deleted');
    }

    console.log('\n✅ Video successfully deleted!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Deletion failed:', error);
    process.exit(1);
  }
}

// Get video ID from command line arguments
const videoId = process.argv[2];

if (!videoId) {
  console.error('❌ Please provide a video ID');
  console.error('   Usage: npx ts-node scripts/delete-video.ts <video_id>');
  process.exit(1);
}

deleteVideo(videoId);
