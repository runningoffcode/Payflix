import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

async function checkPolicies() {
  console.log('\n🔍 Checking RLS policies on videos table...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query pg_policies to see what policies exist
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'videos');

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('Policies on videos table:', JSON.stringify(data, null, 2));
  }

  process.exit(0);
}

checkPolicies();
