import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log('🔍 Testing Supabase query...\n');

  // Test 1: Count videos
  const { count, error: countError } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Count error:', countError);
  } else {
    console.log(`✅ Total videos in database: ${count}`);
  }

  // Test 2: Get all videos
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Query error:', error);
  } else {
    console.log(`✅ Query returned ${data.length} videos`);
    if (data.length > 0) {
      console.log('\n📺 Sample video:');
      console.log('   ID:', data[0].id);
      console.log('   Title:', data[0].title);
      console.log('   Price:', data[0].price_usdc);
      console.log('   Creator:', data[0].creator_wallet);
    }
  }

  // Test 3: Check table structure
  console.log('\n🔍 Checking table columns...');
  if (data && data.length > 0) {
    console.log('   Columns:', Object.keys(data[0]).join(', '));
  }
}

testQuery();
