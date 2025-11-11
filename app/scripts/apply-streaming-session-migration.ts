import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 Applying video_streaming_sessions migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'server', 'database', 'migrations', '003_create_video_streaming_sessions.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL:');
  console.log(migrationSQL);
  console.log('\n');

  // Note: Supabase client doesn't support raw SQL execution
  // You need to run this in Supabase SQL Editor or use a PostgreSQL client
  console.log('⚠️  IMPORTANT: Copy the SQL above and run it in your Supabase SQL Editor');
  console.log('   Dashboard → SQL Editor → New Query → Paste and Run');
  console.log('');
  console.log('   Alternatively, use the Supabase CLI:');
  console.log('   npx supabase db push');
  console.log('');

  // Try to verify if table already exists
  try {
    const { data, error } = await supabase
      .from('video_streaming_sessions')
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ Table does not exist yet - please run the migration');
    } else if (error) {
      console.log('⚠️  Error checking table:', error.message);
    } else {
      console.log('✅ Table video_streaming_sessions already exists!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

applyMigration();
