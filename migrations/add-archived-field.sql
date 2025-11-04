-- Add archived field to videos table
-- This enables web3-aligned video archiving:
-- - Videos with purchases cannot be deleted (permanence)
-- - Instead they can be archived (hidden from public)
-- - Buyers still have access to archived videos

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_archived ON videos(archived);

-- Update getAllVideos query to exclude archived by default
COMMENT ON COLUMN videos.archived IS 'If true, video is hidden from public listings but accessible to buyers (web3 permanence)';
