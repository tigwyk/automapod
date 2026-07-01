-- Download tracking for analytics
-- Privacy-first: IPs are hashed, no personal data stored

CREATE TABLE IF NOT EXISTS episode_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL, -- SHA-256 hashed IP for privacy
  user_agent TEXT,
  platform TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate tracking from same IP in short time window
  -- (helps with refresh spam, won't catch everything)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_downloads_episode ON episode_downloads(episode_id);
CREATE INDEX IF NOT EXISTS idx_downloads_date ON episode_downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_ip_episode ON episode_downloads(episode_id, ip_hash, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_platform ON episode_downloads(platform);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_downloads_episode_date
  ON episode_downloads(episode_id, downloaded_at DESC);

-- Enable RLS
ALTER TABLE episode_downloads ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (for tracking endpoint)
CREATE POLICY "Service role can insert downloads"
  ON episode_downloads
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to query downloads for their own episodes
CREATE POLICY "Users can query own episode downloads"
  ON episode_downloads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM episodes
      WHERE episodes.id = episode_downloads.episode_id
      AND episodes.user_id = auth.uid()
    )
  );

-- Comment for documentation
COMMENT ON TABLE episode_downloads IS 'Privacy-first download tracking. IPs are hashed for GDPR compliance.';
COMMENT ON COLUMN episode_downloads.ip_hash IS 'SHA-256 hash of client IP address with salt. Cannot be reversed to identify individuals.';
