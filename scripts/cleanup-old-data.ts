import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupOldData() {
  console.log('🧹 Starting cleanup of UUID-format users and their data...\n');

  // Get all users with UUID-format IDs
  const { data: users, error } = await supabase
    .from('users')
    .select('id, wallet_address');

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('✅ No users found in database');
    return;
  }

  // Filter UUID-format users
  const uuidUsers = users.filter(user => user.id.includes('-'));

  if (uuidUsers.length === 0) {
    console.log('✅ No UUID-format users found. Database is clean!');
    return;
  }

  console.log(`Found ${uuidUsers.length} UUID-format users to clean up:\n`);
  uuidUsers.forEach(user => {
    console.log(`  - ${user.id} | ${user.wallet_address}`);
  });

  console.log('\n🗑️  Deleting related data and users...\n');

  for (const user of uuidUsers) {
    console.log(`Processing user: ${user.id}`);

    // Delete videos first (they have foreign keys to users)
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('creator_id', user.id);

    if (videos && videos.length > 0) {
      console.log(`   Found ${videos.length} videos`);

      for (const video of videos) {
        // Delete video_access, payments, transactions, video_unlocks, video_views
        await supabase.from('video_access').delete().eq('video_id', video.id);
        await supabase.from('payments').delete().eq('video_id', video.id);
        await supabase.from('transactions').delete().eq('video_id', video.id);
        await supabase.from('video_unlocks').delete().eq('video_id', video.id);
        await supabase.from('video_views').delete().eq('video_id', video.id);
      }

      // Delete videos
      const { error: videosError } = await supabase
        .from('videos')
        .delete()
        .eq('creator_id', user.id);

      if (videosError) {
        console.error(`   ❌ Error deleting videos: ${videosError.message}`);
      } else {
        console.log(`   ✅ Deleted ${videos.length} videos and related data`);
      }
    }

    // Delete creator_stats
    const { error: statsError } = await supabase
      .from('creator_stats')
      .delete()
      .eq('creator_id', user.id);

    if (statsError && statsError.code !== 'PGRST116') {
      console.error(`   ❌ Error deleting creator_stats: ${statsError.message}`);
    } else {
      console.log(`   ✅ Deleted creator_stats`);
    }

    // Delete sessions
    await supabase.from('sessions').delete().eq('user_id', user.id);

    // Delete video_access for this user
    await supabase.from('video_access').delete().eq('user_id', user.id);

    // Delete payments for this user
    await supabase.from('payments').delete().eq('user_id', user.id);

    // Delete transactions for this user
    await supabase.from('transactions').delete().eq('user_id', user.id);
    await supabase.from('transactions').delete().eq('creator_id', user.id);

    // Delete video_unlocks for this user
    await supabase.from('video_unlocks').delete().eq('user_id', user.id);

    // Delete video_views for this user
    await supabase.from('video_views').delete().eq('user_id', user.id);

    // Finally, delete the user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (userError) {
      console.error(`   ❌ Error deleting user: ${userError.message}\n`);
    } else {
      console.log(`   ✅ Deleted user\n`);
    }
  }

  console.log('✅ Cleanup complete!');
  console.log('   Now refresh your browser and log in with your wallet.');
  console.log('   A new user with TEXT-format ID will be created automatically.');
}

// Run the script
cleanupOldData().catch(console.error);
