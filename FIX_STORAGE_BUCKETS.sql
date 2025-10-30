-- ===============================================
-- FIX STORAGE BUCKETS - DISABLE RLS ON STORAGE
-- ===============================================
-- This fixes the "new row violates row-level security policy" error
-- when uploading videos and thumbnails

-- Step 1: Make the 'videos' bucket public for uploads
UPDATE storage.buckets
SET public = true
WHERE name = 'videos';

-- Step 2: Make the 'thumbnails' bucket public for uploads
UPDATE storage.buckets
SET public = true
WHERE name = 'thumbnails';

-- Step 3: Drop all existing storage policies on 'videos' bucket
DROP POLICY IF EXISTS "Anyone can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read videos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Step 4: Create permissive storage policies for 'videos' bucket
CREATE POLICY "Allow public video uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow public video reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Step 5: Create permissive storage policies for 'thumbnails' bucket
CREATE POLICY "Allow public thumbnail uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Allow public thumbnail reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Step 6: Grant permissions to anon and authenticated roles on storage
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;

-- Verify the fix
SELECT
    name,
    public,
    id
FROM storage.buckets
WHERE name IN ('videos', 'thumbnails');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Storage buckets are now public';
    RAISE NOTICE '✅ Upload policies created';
    RAISE NOTICE '✅ You can now upload videos without RLS errors!';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 TRY UPLOADING AGAIN - IT SHOULD WORK NOW!';
END $$;
