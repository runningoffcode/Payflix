/**
 * Migration: Add comments table and comment settings to videos
 * Run this with: npx ts-node scripts/migrate-add-comments.ts
 */

import { createClient } from '@supabase/supabase-js';

async function runMigration() {
  console.log('\n🚀 Starting migration: Add comments table and comment settings\n');

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Add comment settings columns to videos table
    console.log('📝 Step 1: Adding comment settings to videos table...');

    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS comment_price DECIMAL(10, 2) DEFAULT 0;
      `
    });

    if (alterError) {
      // Try alternative approach using direct SQL
      console.log('   Trying alternative approach...');
      const { error: altError } = await supabase.from('videos').select('comments_enabled').limit(1);

      if (altError && altError.message.includes('column')) {
        console.log('   ⚠️  Note: You may need to run this SQL manually in Supabase SQL Editor:');
        console.log(`
        ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS comment_price DECIMAL(10, 2) DEFAULT 0;
        `);
      } else {
        console.log('   ✅ Columns may already exist');
      }
    } else {
      console.log('   ✅ Comment settings columns added to videos table');
    }

    // Step 2: Create comments table
    console.log('\n📝 Step 2: Creating comments table...');

    console.log('   ⚠️  Run this SQL in Supabase SQL Editor:\n');
    console.log(`
-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL,
  username TEXT,
  profile_picture_url TEXT,
  content TEXT NOT NULL,
  payment_id TEXT REFERENCES payments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments table
-- Anyone can read comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- Users can create comments (payment verification happens in backend)
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_wallet = current_setting('request.jwt.claim.wallet_address', true));

-- Creators can delete comments on their videos
CREATE POLICY "Creators can delete comments on their videos"
  ON comments FOR DELETE
  USING (
    video_id IN (
      SELECT id FROM videos
      WHERE creator_id = (
        SELECT id FROM users
        WHERE wallet_address = current_setting('request.jwt.claim.wallet_address', true)
      )
    )
  );
    `);

    console.log('\n✅ Migration instructions provided!');
    console.log('   Please run the SQL above in your Supabase SQL Editor.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
