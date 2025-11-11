-- ⚠️  EMERGENCY VIDEO DELETION SQL
-- Run this in your Supabase SQL Editor to delete the "TEST TEST" video
-- This bypasses any RLS policies

-- Step 1: Delete video_access records
DELETE FROM video_access WHERE video_id = 'video_1762030786954_f8f5r';

-- Step 2: Delete payment records
DELETE FROM payments WHERE video_id = 'video_1762030786954_f8f5r';

-- Step 3: Delete the video itself
DELETE FROM videos WHERE id = 'video_1762030786954_f8f5r';

-- Verify deletion
SELECT id, title FROM videos WHERE id = 'video_1762030786954_f8f5r';
-- Should return 0 rows if deletion was successful
