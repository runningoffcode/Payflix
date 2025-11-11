import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

async function testDelete() {
  console.log('\n🧪 Testing video deletion...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Try to delete video_1761985577326_fe4322
  const videoId = 'video_1761985577326_fe4322';

  console.log(`Attempting to delete: ${videoId}\n`);

  const { data, error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .select();

  console.log('Delete result:');
  console.log('  Data:', data);
  console.log('  Error:', error);
  console.log('  Data length:', data?.length);
  console.log('');

  // Check if video still exists
  const { data: checkData } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId);

  console.log('Post-delete check:');
  console.log('  Video still exists?', checkData && checkData.length > 0 ? 'YES - DELETE FAILED' : 'NO - Delete worked');

  process.exit(0);
}

testDelete();
