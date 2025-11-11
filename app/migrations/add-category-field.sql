-- Add category field to videos table
-- Enables category-based filtering on the platform
-- Categories: All, Entertainment, Gaming, Music, Education, Technology, Lifestyle

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Entertainment';

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);

-- Add check constraint for valid categories
ALTER TABLE videos
ADD CONSTRAINT check_valid_category
CHECK (category IN ('Entertainment', 'Gaming', 'Music', 'Education', 'Technology', 'Lifestyle'));

COMMENT ON COLUMN videos.category IS 'Video category for filtering and organization';
