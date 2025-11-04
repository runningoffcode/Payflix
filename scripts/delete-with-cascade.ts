import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

async function deleteWithCascade() {
  console.log('\n🗑️  Deleting video with cascade...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);
  const videoId = 'video_1761985577326_fe4322';

  // Step 1: Delete related payments
  console.log('Step 1: Deleting related payments...');
  const { error: paymentsError } = await supabase
    .from('payments')
    .delete()
    .eq('video_id', videoId);

  if (paymentsError) {
    console.log('  Error:', paymentsError);
  } else {
    console.log('  ✅ Payments deleted');
  }

  // Step 2: Delete video_access records
  console.log('\nStep 2: Deleting video_access records...');
  const { error: accessError } = await supabase
    .from('video_access')
    .delete()
    .eq('video_id', videoId);

  if (accessError) {
    console.log('  Error:', accessError);
  } else {
    console.log('  ✅ Video access records deleted');
  }

  // Step 3: Delete the video
  console.log('\nStep 3: Deleting video...');
  const { data, error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .select();

  if (error) {
    console.log('  ❌ Error:', error);
  } else {
    console.log('  ✅ Video deleted!');
    console.log('  Rows deleted:', data?.length || 0);
  }

  // Step 4: Verify
  console.log('\nStep 4: Verifying...');
  const { data: check } = await supabase
    .from('videos')
    .select('id')
    .eq('id', videoId);

  if (check && check.length > 0) {
    console.log('  ❌ FAILED - Video still exists');
  } else {
    console.log('  ✅ SUCCESS - Video completely removed!');
  }

  process.exit(0);
}

deleteWithCascade();
