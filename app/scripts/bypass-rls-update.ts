/**
 * Bypass RLS and Update Creator Wallets
 * Uses PostgreSQL client to execute raw SQL with service role
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const TEST_WALLET = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';

// Parse Supabase connection string or build from parts
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

// Extract database connection info from Supabase URL
// Supabase URL format: https://[project-ref].supabase.co
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
const dbHost = `db.${projectRef}.supabase.co`;
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

// Note: You may need to get the direct database password from Supabase Dashboard > Settings > Database
console.log('🔧 Attempting to update creator wallets via direct PostgreSQL connection...\n');
console.log(`Target wallet: ${TEST_WALLET}\n`);

if (!dbPassword) {
  console.log('⚠️  Direct database password not found.');
  console.log('\nTo update wallets, please run this SQL in Supabase SQL Editor:');
  console.log('(Go to: Supabase Dashboard > SQL Editor > New Query)\n');
  console.log('---SQL START---');
  console.log(`
-- Temporarily disable RLS
ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY;

-- Update all videos
UPDATE public.videos
SET creator_wallet = '${TEST_WALLET}'
WHERE creator_wallet IS NULL
   OR creator_wallet = 'SampleCreator1ABC123456789'
   OR creator_wallet != '${TEST_WALLET}';

-- Re-enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT id, title, creator_wallet FROM public.videos LIMIT 5;
  `);
  console.log('---SQL END---\n');
  console.log('After running the SQL, restart your dev server to see the changes.');
  process.exit(0);
}

async function bypassRLSUpdate() {
  const client = new Client({
    host: dbHost,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log(`Connecting to database: ${dbHost}...`);
    await client.connect();
    console.log('✅ Connected\n');

    // Disable RLS
    console.log('Disabling RLS on videos table...');
    await client.query('ALTER TABLE public.videos DISABLE ROW LEVEL SECURITY');
    console.log('✅ RLS disabled\n');

    // Update videos
    console.log('Updating creator wallets...');
    const result = await client.query(`
      UPDATE public.videos
      SET creator_wallet = $1
      WHERE creator_wallet IS NULL
         OR creator_wallet = 'SampleCreator1ABC123456789'
         OR creator_wallet != $1
      RETURNING id, title
    `, [TEST_WALLET]);

    console.log(`✅ Updated ${result.rowCount} videos\n`);

    // Re-enable RLS
    console.log('Re-enabling RLS...');
    await client.query('ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY');
    console.log('✅ RLS re-enabled\n');

    // Verify
    console.log('🔍 Verifying updates...');
    const verify = await client.query(`
      SELECT id, title, creator_wallet
      FROM public.videos
      LIMIT 5
    `);

    console.log('\nSample videos:');
    verify.rows.forEach(v => {
      const isCorrect = v.creator_wallet === TEST_WALLET;
      console.log(`${isCorrect ? '✅' : '❌'} ${v.title}`);
      console.log(`   Wallet: ${v.creator_wallet}`);
    });

    // Count
    const count = await client.query(`
      SELECT COUNT(*) as total
      FROM public.videos
      WHERE creator_wallet = $1
    `, [TEST_WALLET]);

    console.log(`\n✅ Total videos with correct wallet: ${count.rows[0].total}`);
    console.log('\n✅ Update complete! Restart your dev server to see changes.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\nPlease run the SQL manually in Supabase SQL Editor (see above).');
  } finally {
    await client.end();
  }
}

bypassRLSUpdate();
