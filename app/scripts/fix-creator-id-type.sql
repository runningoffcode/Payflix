-- Fix user ID and all related foreign key column types
-- This changes them from UUID to TEXT to support non-UUID user IDs

-- Step 1: Drop ALL foreign key constraints that reference users.id and videos.id
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_creator_id_fkey;
ALTER TABLE creator_stats DROP CONSTRAINT IF EXISTS creator_stats_creator_id_fkey;
ALTER TABLE video_access DROP CONSTRAINT IF EXISTS video_access_user_id_fkey;
ALTER TABLE video_access DROP CONSTRAINT IF EXISTS video_access_video_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_video_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_creator_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_video_id_fkey;
ALTER TABLE video_unlocks DROP CONSTRAINT IF EXISTS video_unlocks_user_id_fkey;
ALTER TABLE video_unlocks DROP CONSTRAINT IF EXISTS video_unlocks_video_id_fkey;
ALTER TABLE video_views DROP CONSTRAINT IF EXISTS video_views_user_id_fkey;
ALTER TABLE video_views DROP CONSTRAINT IF EXISTS video_views_video_id_fkey;

-- Step 2: Change users.id and videos.id from UUID to TEXT
ALTER TABLE users
ALTER COLUMN id TYPE TEXT USING id::TEXT;

ALTER TABLE videos
ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 3: Change all related foreign key columns from UUID to TEXT
ALTER TABLE videos
ALTER COLUMN creator_id TYPE TEXT USING creator_id::TEXT;

ALTER TABLE creator_stats
ALTER COLUMN creator_id TYPE TEXT USING creator_id::TEXT;

ALTER TABLE video_access
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
ALTER COLUMN video_id TYPE TEXT USING video_id::TEXT;

ALTER TABLE payments
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
ALTER COLUMN video_id TYPE TEXT USING video_id::TEXT;

ALTER TABLE sessions
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE transactions
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
ALTER COLUMN creator_id TYPE TEXT USING creator_id::TEXT,
ALTER COLUMN video_id TYPE TEXT USING video_id::TEXT;

ALTER TABLE video_unlocks
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
ALTER COLUMN video_id TYPE TEXT USING video_id::TEXT;

ALTER TABLE video_views
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
ALTER COLUMN video_id TYPE TEXT USING video_id::TEXT;

-- Step 4: Re-add all foreign key constraints
ALTER TABLE videos
ADD CONSTRAINT videos_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES users(id);

ALTER TABLE creator_stats
ADD CONSTRAINT creator_stats_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES users(id);

ALTER TABLE video_access
ADD CONSTRAINT video_access_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE video_access
ADD CONSTRAINT video_access_video_id_fkey
FOREIGN KEY (video_id) REFERENCES videos(id);

ALTER TABLE payments
ADD CONSTRAINT payments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE payments
ADD CONSTRAINT payments_video_id_fkey
FOREIGN KEY (video_id) REFERENCES videos(id);

ALTER TABLE sessions
ADD CONSTRAINT sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE transactions
ADD CONSTRAINT transactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE transactions
ADD CONSTRAINT transactions_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES users(id);

ALTER TABLE transactions
ADD CONSTRAINT transactions_video_id_fkey
FOREIGN KEY (video_id) REFERENCES videos(id);

ALTER TABLE video_unlocks
ADD CONSTRAINT video_unlocks_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE video_unlocks
ADD CONSTRAINT video_unlocks_video_id_fkey
FOREIGN KEY (video_id) REFERENCES videos(id);

ALTER TABLE video_views
ADD CONSTRAINT video_views_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE video_views
ADD CONSTRAINT video_views_video_id_fkey
FOREIGN KEY (video_id) REFERENCES videos(id);

-- Step 5: Verify the changes
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name IN ('id', 'creator_id', 'user_id', 'video_id')
  AND table_name IN ('users', 'videos', 'creator_stats', 'video_access', 'payments', 'sessions', 'transactions', 'video_unlocks', 'video_views')
ORDER BY table_name, column_name;
