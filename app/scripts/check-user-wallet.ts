import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const walletAddress = 'J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY';
  
  console.log('🔍 Searching for wallet:', walletAddress);
  
  // Try exact match
  const { data: exactMatch, error: exactError } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress);
  
  console.log('\n📊 Exact match result:', exactMatch);
  if (exactError) console.log('❌ Exact error:', exactError);
  
  // Try case-insensitive match
  const { data: ilikeMatch, error: ilikeError } = await supabase
    .from('users')
    .select('*')
    .ilike('wallet_address', walletAddress);
  
  console.log('\n📊 ilike match result:', ilikeMatch);
  if (ilikeError) console.log('❌ ilike error:', ilikeError);
  
  // Get all users to see what's in there
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, wallet_address, username, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n📋 All users (most recent 10):');
  allUsers?.forEach((u: any) => {
    console.log(`  ${u.wallet_address} | ${u.username || 'no username'} | ${u.id}`);
  });
}

checkUser().catch(console.error);
