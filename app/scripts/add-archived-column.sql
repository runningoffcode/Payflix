-- Add archived column to videos table
-- This allows creators to hide videos from public view while keeping them accessible to purchasers

-- Add the column (if it doesn't already exist)
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

-- Set existing videos to not archived
UPDATE videos SET archived = false WHERE archived IS NULL;

-- Create index for better query performance on archived status
CREATE INDEX IF NOT EXISTS idx_videos_archived ON videos(archived);

-- Create index for combined query (non-archived videos sorted by date)
CREATE INDEX IF NOT EXISTS idx_videos_not_archived_created ON videos(archived, created_at DESC) WHERE archived = false;

COMMENT ON COLUMN videos.archived IS 'When true, video is hidden from public listings but accessible to purchasers';
