-- ===============================================
-- FIX STORAGE SIZE LIMITS - INCREASE FILE SIZE
-- ===============================================
-- This fixes the "object exceeded the maximum allowed size" error
-- when uploading videos

-- Step 1: Update the 'videos' bucket to allow larger files (5GB limit)
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5368709120  -- 5GB in bytes (5 * 1024 * 1024 * 1024)
WHERE name = 'videos';

-- Step 2: Update the 'thumbnails' bucket (100MB limit is enough for thumbnails)
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 104857600  -- 100MB in bytes (100 * 1024 * 1024)
WHERE name = 'thumbnails';

-- Step 3: Verify the changes
SELECT
    name,
    public,
    file_size_limit,
    file_size_limit / 1024 / 1024 as "size_limit_mb",
    file_size_limit / 1024 / 1024 / 1024 as "size_limit_gb"
FROM storage.buckets
WHERE name IN ('videos', 'thumbnails');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Storage bucket size limits updated';
    RAISE NOTICE '✅ Videos bucket: 5GB max file size';
    RAISE NOTICE '✅ Thumbnails bucket: 100MB max file size';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 TRY UPLOADING YOUR VIDEO AGAIN!';
END $$;
