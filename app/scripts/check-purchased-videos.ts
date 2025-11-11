/**
 * Check what videos users have purchased
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function checkPurchasedVideos() {
  console.log('🔍 Checking video access records...\n');

  // Get all video access records with user and video details
  const { data: videoAccess, error } = await supabase
    .from('video_access')
    .select(`
      user_id,
      video_id,
      created_at,
      expires_at,
      users:user_id (
        wallet_address,
        username
      ),
      videos:video_id (
        title,
        price
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error fetching video access:', error);
    return;
  }

  console.log(`Found ${videoAccess?.length || 0} video access records:\n`);

  videoAccess?.forEach((access: any, index: number) => {
    console.log(`${index + 1}. User: ${access.users?.username || 'Unknown'} (${access.users?.wallet_address?.slice(0, 8)}...)`);
    console.log(`   Video: ${access.videos?.title || 'Unknown'}`);
    console.log(`   Purchased: ${new Date(access.created_at).toLocaleString()}`);
    console.log(`   Expires: ${access.expires_at ? new Date(access.expires_at).toLocaleString() : 'Never'}`);
    console.log('');
  });

  if (videoAccess?.length === 0) {
    console.log('⚠️  No video access records found. User may not have purchased any videos yet.');
  }
}

checkPurchasedVideos().then(() => process.exit(0));
