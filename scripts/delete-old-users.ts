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

async function deleteOldUsers() {
  console.log('🔍 Looking for users with UUID-format IDs...\n');

  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, wallet_address, username, email, created_at');

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('✅ No users found in database');
    return;
  }

  console.log(`Found ${users.length} users:\n`);

  // Filter users with UUID-format IDs (contains dashes)
  const uuidUsers = users.filter(user => user.id.includes('-'));
  const textUsers = users.filter(user => !user.id.includes('-'));

  console.log('UUID-format users (old):');
  uuidUsers.forEach(user => {
    console.log(`  - ${user.id} | ${user.wallet_address}`);
  });

  console.log('\nTEXT-format users (new):');
  textUsers.forEach(user => {
    console.log(`  - ${user.id} | ${user.wallet_address}`);
  });

  if (uuidUsers.length > 0) {
    console.log(`\n⚠️  Found ${uuidUsers.length} users with UUID-format IDs`);
    console.log('These users should be deleted to avoid foreign key conflicts.\n');

    // Delete UUID-format users
    for (const user of uuidUsers) {
      console.log(`🗑️  Deleting user: ${user.id} (${user.wallet_address})...`);

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        console.error(`   ❌ Error deleting user: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Deleted successfully`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log('   Now you can log in with your wallet to create a new user with TEXT-format ID.');
  } else {
    console.log('\n✅ All users already have TEXT-format IDs. No cleanup needed.');
  }
}

// Run the script
deleteOldUsers().catch(console.error);
