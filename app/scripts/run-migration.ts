import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  // Extract Postgres connection string from Supabase URL
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Missing VITE_SUPABASE_URL environment variable');
    console.log('');
    console.log('⚠️  Alternative: Run the SQL manually in Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Copy and run the SQL from:');
    console.log('      server/database/migrations/003_create_video_streaming_sessions.sql');
    process.exit(1);
  }

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'server', 'database', 'migrations', '003_create_video_streaming_sessions.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🔧 Running migration: 003_create_video_streaming_sessions\n');

  // Parse Supabase project ref from URL (e.g., https://abc123.supabase.co)
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    console.error('❌ Could not parse Supabase project ref from URL');
    process.exit(1);
  }

  // Construct direct Postgres connection string
  // Note: This requires database password or service role key
  const connectionString = process.env.DATABASE_URL ||
    `postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

  if (connectionString.includes('[PASSWORD]')) {
    console.log('⚠️  Database connection requires password');
    console.log('');
    console.log('   Option 1: Set DATABASE_URL environment variable');
    console.log('   Get it from: Supabase Dashboard → Settings → Database → Connection string');
    console.log('');
    console.log('   Option 2: Run the SQL manually:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(migrationSQL);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('   Copy the SQL above to Supabase SQL Editor and run it.');
    process.exit(0);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase database');

    // Run the migration
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully!');
    console.log('');
    console.log('📊 Table created: video_streaming_sessions');
    console.log('   - Tracks streaming sessions with wallet binding');
    console.log('   - Prevents unauthorized URL sharing');
    console.log('   - Includes automatic expiration');

  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists - migration skipped');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.log('');
      console.log('📄 Please run this SQL manually in Supabase Dashboard:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(migrationSQL);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
