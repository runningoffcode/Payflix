import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

async function debugDelete() {
  console.log('\n🔍 Debugging deletion issue...\n');
  console.log('Using key role:', JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString()).role);
  console.log('');

  const supabase = createClient(supabaseUrl, supabaseKey);

  const videoId = 'video_1761985577326_fe4322';

  // Step 1: Check if video exists
  console.log('Step 1: Checking if video exists...');
  const { data: video, error: selectError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (selectError) {
    console.log('  ❌ Error:', selectError);
    console.log('\n⚠️  Video does not exist! Cannot delete.');
    process.exit(0);
  }
  
  console.log('  ✅ Video found:');
  console.log('     ID:', video.id);
  console.log('     Title:', video.title);
  console.log('     Creator:', video.creator_wallet);

  // Step 2: Attempt DELETE
  console.log('\nStep 2: Attempting DELETE...');
  const { data: deleteData, error: deleteError } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .select();

  console.log('  Delete result:');
  console.log('    Data:', deleteData);
  console.log('    Error:', deleteError);
  console.log('    Rows deleted:', deleteData?.length || 0);

  // Step 3: Verify if still exists
  console.log('\nStep 3: Verifying deletion...');
  const { data: stillExists } = await supabase
    .from('videos')
    .select('id')
    .eq('id', videoId);

  if (stillExists && stillExists.length > 0) {
    console.log('  ❌ FAILED - Video still exists in database');
    console.log('  🔍 This means RLS is STILL blocking the delete');
    console.log('  💡 Check if you created the RLS policy correctly');
  } else {
    console.log('  ✅ SUCCESS - Video was deleted!');
  }

  process.exit(0);
}

debugDelete();
