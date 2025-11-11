-- Clean up all old UUID-format user data
-- Run this in your Supabase SQL Editor

-- First, delete all videos and related data for UUID users
DELETE FROM video_views WHERE video_id IN (SELECT id FROM videos WHERE creator_id LIKE '%-%');
DELETE FROM video_unlocks WHERE video_id IN (SELECT id FROM videos WHERE creator_id LIKE '%-%');
DELETE FROM transactions WHERE video_id IN (SELECT id FROM videos WHERE creator_id LIKE '%-%');
DELETE FROM payments WHERE video_id IN (SELECT id FROM videos WHERE creator_id LIKE '%-%');
DELETE FROM video_access WHERE video_id IN (SELECT id FROM videos WHERE creator_id LIKE '%-%');

-- Delete videos themselves
DELETE FROM videos WHERE creator_id LIKE '%-%';

-- Delete user-related data
DELETE FROM creator_stats WHERE creator_id LIKE '%-%';
DELETE FROM sessions WHERE user_id LIKE '%-%';
DELETE FROM video_access WHERE user_id LIKE '%-%';
DELETE FROM payments WHERE user_id LIKE '%-%';
DELETE FROM transactions WHERE user_id LIKE '%-%' OR creator_id LIKE '%-%';
DELETE FROM video_unlocks WHERE user_id LIKE '%-%';
DELETE FROM video_views WHERE user_id LIKE '%-%';

-- Finally, delete the users themselves
DELETE FROM users WHERE id LIKE '%-%';

-- Verify cleanup
SELECT 'Remaining users:' as status, COUNT(*) as count FROM users;
SELECT 'Remaining videos:' as status, COUNT(*) as count FROM videos;
