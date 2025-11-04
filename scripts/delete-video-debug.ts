/**
 * Delete a specific video and all associated data (with debug logging)
 * Run with: npx ts-node scripts/delete-video-debug.ts <video_id>
 */

import { createClient } from '@supabase/supabase-js';

async function deleteVideo(videoId: string) {
  console.log(`\n🗑️  Deleting video: ${videoId}\n`);

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    console.log('📊 Config check:');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Key length: ${supabaseKey?.length || 0}`);

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, verify the video exists
    console.log('\n🔍 Step 0: Verifying video exists...');
    const { data: videoCheck, error: videoCheckError } = await supabase
      .from('videos')
      .select('id, title')
      .eq('id', videoId)
      .single();

    if (videoCheckError) {
      console.log(`   ❌ Video not found: ${videoCheckError.message}`);
      process.exit(1);
    }

    console.log(`   ✅ Video found: ${videoCheck.title}`);

    // Step 1: Delete video_access records
    console.log('\n📝 Step 1: Deleting video access records...');
    const { data: accessData, error: accessError, count: accessCount } = await supabase
      .from('video_access')
      .delete()
      .eq('video_id', videoId)
      .select();

    if (accessError) {
      console.log(`   ⚠️  Warning: ${accessError.message}`);
    } else {
      console.log(`   ✅ Deleted ${accessData?.length || 0} video access records`);
    }

    // Step 2: Delete payments
    console.log('\n📝 Step 2: Deleting payment records...');
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('video_id', videoId)
      .select();

    if (paymentsError) {
      console.log(`   ⚠️  Warning: ${paymentsError.message}`);
    } else {
      console.log(`   ✅ Deleted ${paymentsData?.length || 0} payment records`);
    }

    // Step 3: Delete the video itself
    console.log('\n📝 Step 3: Deleting video record...');
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .select();

    if (videoError) {
      console.error(`   ❌ Error: ${videoError.message}`);
      console.error('   Full error:', videoError);
      process.exit(1);
    } else {
      console.log(`   ✅ Video record deleted:`, videoData);
    }

    // Step 4: Verify deletion
    console.log('\n🔍 Step 4: Verifying deletion...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('videos')
      .select('id, title')
      .eq('id', videoId)
      .single();

    if (verifyError) {
      console.log('   ✅ Confirmed: Video no longer exists in database');
    } else {
      console.log('   ❌ WARNING: Video still exists!', verifyData);
    }

    console.log('\n✅ Deletion process completed!\n');
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
  console.error('   Usage: npx ts-node scripts/delete-video-debug.ts <video_id>');
  process.exit(1);
}

deleteVideo(videoId);
