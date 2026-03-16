-- Create episode_downloads table for tracking podcast downloads
-- This table stores privacy-first download analytics using IP hashing

CREATE TABLE IF NOT EXISTS episode_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying downloads by episode (most common query)
CREATE INDEX IF NOT EXISTS idx_episode_downloads_episode_id
  ON episode_downloads(episode_id);

-- Index for time-based queries (downloads over time)
CREATE INDEX IF NOT EXISTS idx_episode_downloads_downloaded_at
  ON episode_downloads(downloaded_at DESC);

-- Index for unique downloads counting (distinct ip_hash per episode)
CREATE INDEX IF NOT EXISTS idx_episode_downloads_episode_ip
  ON episode_downloads(episode_id, ip_hash);

-- RLS Policies
ALTER TABLE episode_downloads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert downloads (tracking endpoint)
-- Uses security definer function to validate episode exists
CREATE OR REPLACE FUNCTION insert_download_if_episode_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if episode exists
  IF NOT EXISTS (SELECT 1 FROM episodes WHERE id = NEW.episode_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_episode_before_download
  BEFORE INSERT ON episode_downloads
  FOR EACH ROW
  EXECUTE FUNCTION insert_download_if_episode_exists();

-- Public insert allowed (for tracking pixel)
CREATE POLICY "Anyone can insert downloads"
  ON episode_downloads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read analytics for their own episodes
CREATE POLICY "Users can read analytics for their episodes"
  ON episode_downloads FOR SELECT
  TO authenticated
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE episode_downloads IS 'Tracks podcast downloads with privacy-first design (IP hashing)';
COMMENT ON COLUMN episode_downloads.ip_hash IS 'SHA-256 hash of client IP + salt for privacy (GDPR/CCPA compliant)';
COMMENT ON COLUMN episode_downloads.platform IS 'Detected platform: ios, android, web, or other';
