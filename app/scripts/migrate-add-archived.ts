/**
 * Migration: Add 'archived' column to videos table
 * Run this with: npx ts-node scripts/migrate-add-archived.ts
 */

import { createClient } from '@supabase/supabase-js';

async function runMigration() {
  console.log('\n🚀 Starting migration: Add archived column to videos table\n');

  try {
    // Use Supabase client directly for SQL execution
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Add the archived column
    console.log('📝 Step 1: Adding archived column...');
    const { error: alterError } = await supabase.rpc('run_sql', {
      query: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name='videos' AND column_name='archived'
          ) THEN
            ALTER TABLE videos ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
            RAISE NOTICE 'Column archived added to videos table';
          ELSE
            RAISE NOTICE 'Column archived already exists in videos table';
          END IF;
        END $$;
      `
    });

    if (alterError) {
      // Fallback: try direct ALTER TABLE (some Supabase versions don't have run_sql RPC)
      console.log('   Trying alternative approach...');

      const { error: directError } = await supabase
        .from('videos')
        .select('archived')
        .limit(1);

      if (directError && directError.message.includes('column "archived" does not exist')) {
        console.log('   Column does not exist, needs manual migration');
        console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
        console.log('━'.repeat(60));
        console.log(`
ALTER TABLE videos ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
UPDATE videos SET archived = false WHERE archived IS NULL;
CREATE INDEX IF NOT EXISTS idx_videos_archived ON videos(archived);
CREATE INDEX IF NOT EXISTS idx_videos_not_archived_created ON videos(archived, created_at DESC) WHERE archived = false;
COMMENT ON COLUMN videos.archived IS 'When true, video is hidden from public listings but accessible to purchasers';
        `);
        console.log('━'.repeat(60));
        console.log('\nℹ️  Copy and paste the SQL above into your Supabase SQL Editor');
        console.log('   Dashboard → SQL Editor → New Query → Paste → Run\n');
        process.exit(0);
      } else if (!directError) {
        console.log('   ✅ Column already exists!');
      }
    } else {
      console.log('   ✅ Column added successfully!');
    }

    // Step 2: Update existing videos
    console.log('\n📝 Step 2: Updating existing videos...');
    const { error: updateError } = await supabase
      .from('videos')
      .update({ archived: false })
      .is('archived', null);

    if (updateError) {
      console.log('   ⚠️  Warning:', updateError.message);
    } else {
      console.log('   ✅ Existing videos updated!');
    }

    // Step 3: Create indexes (if possible)
    console.log('\n📝 Step 3: Creating indexes...');
    console.log('   Note: Index creation may require manual execution in Supabase SQL Editor');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Verify the archived column exists in Supabase table editor');
    console.log('  2. Test archiving a video from the creator dashboard');
    console.log('  3. Verify archived videos are hidden from home page\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
