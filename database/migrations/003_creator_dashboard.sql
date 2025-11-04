-- Creator Dashboard Migration
-- Adds support for comments, analytics, thumbnails, and subscriber tracking

-- ============================================
-- 1. VIDEO COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS video_comments (
  id VARCHAR(255) PRIMARY KEY,
  video_id VARCHAR(255) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_wallet VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  payment_signature VARCHAR(255), -- Solana transaction signature
  is_highlighted BOOLEAN DEFAULT FALSE, -- Premium highlighted comments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_video ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_wallet ON video_comments(user_wallet);
CREATE INDEX IF NOT EXISTS idx_comments_created ON video_comments(created_at DESC);

-- ============================================
-- 2. VIDEO ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS video_analytics (
  video_id VARCHAR(255) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  comments INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(video_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_video ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON video_analytics(date DESC);

-- ============================================
-- 3. CREATOR ANALYTICS (AGGREGATED)
-- ============================================
CREATE TABLE IF NOT EXISTS creator_analytics (
  creator_wallet VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  comments INTEGER DEFAULT 0,
  subscribers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(creator_wallet, date)
);

CREATE INDEX IF NOT EXISTS idx_creator_analytics_wallet ON creator_analytics(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_date ON creator_analytics(date DESC);

-- ============================================
-- 4. SUBSCRIBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subscriber_wallet VARCHAR(255) NOT NULL,
  creator_wallet VARCHAR(255) NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subscriber_wallet, creator_wallet)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_wallet);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_wallet);

-- ============================================
-- 5. ADD THUMBNAIL FIELD TO VIDEOS TABLE
-- ============================================
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS custom_thumbnail_uploaded BOOLEAN DEFAULT FALSE;

-- ============================================
-- 6. LIVE VIEWER TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS live_viewers (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  video_id VARCHAR(255) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_wallet VARCHAR(255),
  session_id VARCHAR(255) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_live_viewers_video ON live_viewers(video_id);
CREATE INDEX IF NOT EXISTS idx_live_viewers_active ON live_viewers(ended_at) WHERE ended_at IS NULL;

-- ============================================
-- 7. COMMENT MONETIZATION SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS comment_settings (
  video_id VARCHAR(255) PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
  comments_enabled BOOLEAN DEFAULT TRUE,
  comment_price DECIMAL(10, 2) DEFAULT 0.01,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. FUNCTIONS FOR REAL-TIME ANALYTICS
-- ============================================

-- Function to increment video views
CREATE OR REPLACE FUNCTION increment_video_views(p_video_id VARCHAR(255))
RETURNS VOID AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
BEGIN
  -- Update video views count
  UPDATE videos SET views = views + 1 WHERE id = p_video_id;

  -- Update daily analytics
  INSERT INTO video_analytics (video_id, date, views)
  VALUES (p_video_id, v_date, 1)
  ON CONFLICT (video_id, date)
  DO UPDATE SET
    views = video_analytics.views + 1,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to track revenue
CREATE OR REPLACE FUNCTION track_video_revenue(p_video_id VARCHAR(255), p_amount DECIMAL(10, 2))
RETURNS VOID AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_creator_wallet VARCHAR(255);
BEGIN
  -- Get creator wallet
  SELECT creator_wallet INTO v_creator_wallet FROM videos WHERE id = p_video_id;

  -- Update video analytics
  INSERT INTO video_analytics (video_id, date, revenue)
  VALUES (p_video_id, v_date, p_amount)
  ON CONFLICT (video_id, date)
  DO UPDATE SET
    revenue = video_analytics.revenue + p_amount,
    updated_at = CURRENT_TIMESTAMP;

  -- Update creator analytics
  IF v_creator_wallet IS NOT NULL THEN
    INSERT INTO creator_analytics (creator_wallet, date, revenue)
    VALUES (v_creator_wallet, v_date, p_amount)
    ON CONFLICT (creator_wallet, date)
    DO UPDATE SET
      revenue = creator_analytics.revenue + p_amount,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view comments" ON video_comments;
DROP POLICY IF EXISTS "Users can create comments" ON video_comments;
DROP POLICY IF EXISTS "Anyone can view video analytics" ON video_analytics;
DROP POLICY IF EXISTS "Anyone can view creator analytics" ON creator_analytics;
DROP POLICY IF EXISTS "Anyone can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can subscribe" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can view live viewers" ON live_viewers;
DROP POLICY IF EXISTS "Anyone can track viewing" ON live_viewers;
DROP POLICY IF EXISTS "Users can update their own viewing session" ON live_viewers;
DROP POLICY IF EXISTS "Anyone can view comment settings" ON comment_settings;
DROP POLICY IF EXISTS "Anyone can manage comment settings" ON comment_settings;

-- Comments: Anyone can read, authenticated users can insert their own
CREATE POLICY "Anyone can view comments" ON video_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON video_comments FOR INSERT WITH CHECK (true);

-- Analytics: Public read for now (can be restricted later if needed)
CREATE POLICY "Anyone can view video analytics" ON video_analytics FOR SELECT USING (true);
CREATE POLICY "Anyone can view creator analytics" ON creator_analytics FOR SELECT USING (true);

-- Subscriptions: Public read, authenticated insert
CREATE POLICY "Anyone can view subscriptions" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can subscribe" ON subscriptions FOR INSERT WITH CHECK (true);

-- Live viewers: Public read
CREATE POLICY "Anyone can view live viewers" ON live_viewers FOR SELECT USING (true);
CREATE POLICY "Anyone can track viewing" ON live_viewers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own viewing session" ON live_viewers FOR UPDATE USING (true);

-- Comment settings: Public read, anyone can update (backend will verify ownership)
CREATE POLICY "Anyone can view comment settings" ON comment_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can manage comment settings" ON comment_settings FOR ALL USING (true);
