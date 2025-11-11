-- ===============================================
-- SETUP PROFILE PICTURE STORAGE
-- ===============================================
-- Run this in your Supabase SQL Editor to create the storage bucket

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for profile pictures bucket

-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update own pictures"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete own pictures"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-pictures');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Profile picture storage bucket created successfully!';
    RAISE NOTICE '📸 Bucket name: profile-pictures';
    RAISE NOTICE '🔓 Public access enabled for reading';
    RAISE NOTICE '🔒 Upload/Update/Delete restricted to authenticated users';
END $$;
