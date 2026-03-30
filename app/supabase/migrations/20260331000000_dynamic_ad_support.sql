-- Dynamic Ad Support Migration
-- Adds schema for ad campaigns, creatives, placements, and silence detection

-- ============================================
-- Ad Campaigns Table
-- ============================================
-- Manages advertising campaigns (host-read, pre-recorded, network)

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('host_read', 'pre_recorded', 'network')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  budget_cents INTEGER DEFAULT 0 CHECK (budget_cents >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaign queries
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user_id ON ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_date_range ON ad_campaigns(start_date, end_date);

-- ============================================
-- Ad Creatives Table
-- ============================================
-- Individual ad audio files within a campaign

CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  transcript TEXT,
  click_through_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for creative queries
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id ON ad_creatives(campaign_id);

-- ============================================
-- Ad Placements Table
-- ============================================
-- Links ads to specific episodes at specific positions

CREATE TABLE IF NOT EXISTS ad_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  creative_id UUID NOT NULL REFERENCES ad_creatives(id) ON DELETE CASCADE,
  position_ms INTEGER NOT NULL CHECK (position_ms >= 0),
  type TEXT NOT NULL CHECK (type IN ('pre_roll', 'mid_roll', 'post_roll', 'dynamic')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'placed', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for placement queries
CREATE INDEX IF NOT EXISTS idx_ad_placements_episode_id ON ad_placements(episode_id);
CREATE INDEX IF NOT EXISTS idx_ad_placements_creative_id ON ad_placements(creative_id);
CREATE INDEX IF NOT EXISTS idx_ad_placements_status ON ad_placements(status);

-- ============================================
-- Silence Markers Table
-- ============================================
-- Detected silence gaps in episodes for suggested ad placement

CREATE TABLE IF NOT EXISTS silence_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
  end_ms INTEGER NOT NULL CHECK (end_ms > start_ms),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  confidence FLOAT DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  is_suggested_placement BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for silence marker queries
CREATE INDEX IF NOT EXISTS idx_silence_markers_episode_id ON silence_markers(episode_id);
CREATE INDEX IF NOT EXISTS idx_silence_markers_suggested ON silence_markers(episode_id, is_suggested_placement);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS on all ad tables
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE silence_markers ENABLE ROW LEVEL SECURITY;

-- Ad Campaigns Policies
-- Users can see their own campaigns
CREATE POLICY "Users can view their own campaigns"
  ON ad_campaigns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create campaigns for themselves
CREATE POLICY "Users can create campaigns"
  ON ad_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own campaigns
CREATE POLICY "Users can update their own campaigns"
  ON ad_campaigns FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own campaigns
CREATE POLICY "Users can delete their own campaigns"
  ON ad_campaigns FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Ad Creatives Policies
-- Users can view creatives for their campaigns
CREATE POLICY "Users can view their campaign creatives"
  ON ad_creatives FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM ad_campaigns WHERE user_id = auth.uid()
    )
  );

-- Users can create creatives for their campaigns
CREATE POLICY "Users can create creatives for their campaigns"
  ON ad_creatives FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM ad_campaigns WHERE user_id = auth.uid()
    )
  );

-- Users can delete creatives from their campaigns
CREATE POLICY "Users can delete creatives from their campaigns"
  ON ad_creatives FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM ad_campaigns WHERE user_id = auth.uid()
    )
  );

-- Ad Placements Policies
-- Users can view placements for their episodes
CREATE POLICY "Users can view placements for their episodes"
  ON ad_placements FOR SELECT
  TO authenticated
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Users can create placements for their episodes
CREATE POLICY "Users can create placements for their episodes"
  ON ad_placements FOR INSERT
  TO authenticated
  WITH CHECK (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Users can update placements for their episodes
CREATE POLICY "Users can update placements for their episodes"
  ON ad_placements FOR UPDATE
  TO authenticated
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Users can delete placements from their episodes
CREATE POLICY "Users can delete placements from their episodes"
  ON ad_placements FOR DELETE
  TO authenticated
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Silence Markers Policies
-- Users can view silence markers for their episodes
CREATE POLICY "Users can view silence markers for their episodes"
  ON silence_markers FOR SELECT
  TO authenticated
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- System can insert silence markers (via service role)
-- This would be done by a background worker with service role key

-- Users can delete silence markers for their episodes
CREATE POLICY "Users can delete silence markers for their episodes"
  ON silence_markers FOR DELETE
  TO authenticated
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Update updated_at timestamp on campaigns
CREATE OR REPLACE FUNCTION update_ad_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_campaigns_updated_at();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE ad_campaigns IS 'Advertising campaigns (host-read, pre-recorded, network ads)';
COMMENT ON TABLE ad_creatives IS 'Individual ad audio files within campaigns';
COMMENT ON TABLE ad_placements IS 'Links ads to episodes at specific positions';
COMMENT ON TABLE silence_markers IS 'Detected silence gaps for suggested ad placement';

COMMENT ON COLUMN ad_campaigns.type IS 'Campaign type: host_read (recorded by host), pre_recorded (uploaded audio), network (managed ads)';
COMMENT ON COLUMN ad_campaigns.status IS 'Campaign status: draft, active, paused, completed';
COMMENT ON COLUMN ad_placements.type IS 'Placement type: pre_roll (before), mid_roll (during), post_roll (after), dynamic (AI-suggested)';
COMMENT ON COLUMN ad_placements.position_ms IS 'Position in milliseconds from start of episode';
COMMENT ON COLUMN silence_markers.confidence IS 'Confidence score (0-1) that this is actually a good placement point';
COMMENT ON COLUMN silence_markers.is_suggested_placement IS 'Whether this silence is recommended for ad insertion';
