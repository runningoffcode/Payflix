import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

async function forceDeleteVideo() {
  console.log('\n🧪 Force deleting video with cascade...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  const videoId = 'video_1761985577326_fe4322';

  console.log(`Deleting video: ${videoId}\n`);

  // First, delete related records manually
  console.log('Step 1: Deleting video_access records...');
  const { error: accessError } = await supabase
    .from('video_access')
    .delete()
    .eq('video_id', videoId);

  if (accessError) {
    console.log('  Error:', accessError.message);
  } else {
    console.log('  ✅ Deleted video_access records');
  }

  console.log('\nStep 2: Deleting video record...');
  const { data, error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId);

  console.log('  Data:', data);
  console.log('  Error:', error);

  // Check if video still exists
  const { data: checkData } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId);

  console.log('\nPost-delete check:');
  console.log('  Video still exists?', checkData && checkData.length > 0 ? 'YES - DELETE FAILED' : 'NO - Delete SUCCESS!');

  process.exit(0);
}

forceDeleteVideo();
