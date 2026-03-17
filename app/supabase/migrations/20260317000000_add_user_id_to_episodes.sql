-- Add user_id column to episodes for ownership tracking
-- This allows standalone episodes (podcast_id IS NULL) to have an owner

-- Add the column as nullable first (for existing rows)
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for efficient ownership queries
CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON episodes(user_id);

-- For existing episodes that have a podcast, set the user_id from the podcast
UPDATE episodes
SET user_id = (
  SELECT p.user_id
  FROM podcasts p
  WHERE p.id = episodes.podcast_id
)
WHERE podcast_id IS NOT NULL AND user_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN episodes.user_id IS 'Owner of the episode. Required for standalone episodes, optional for episodes with a podcast (ownership can be inferred from podcast)';

-- ============================================================
-- RLS POLICIES FOR DEFENSE-IN-DEPTH
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies WHERE tablename = 'episodes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON episodes', policy_name);
  END LOOP;
END $$;

-- SELECT: Users can read episodes they own directly OR through their podcasts
CREATE POLICY "Users can view their episodes"
  ON episodes FOR SELECT
  TO authenticated
  USING (
    -- Direct ownership (standalone episodes)
    user_id = auth.uid()
    OR
    -- Ownership through podcast
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  );

-- INSERT: Users can create episodes. Allow setting user_id or associating with owned podcast.
CREATE POLICY "Users can insert their episodes"
  ON episodes FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must set user_id to current user (for standalone episodes)
    user_id = auth.uid()
    OR
    -- OR associate with a podcast they own
    (podcast_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM podcasts WHERE id = episodes.podcast_id AND user_id = auth.uid()
    ))
  );

-- UPDATE: Users can update episodes they own
CREATE POLICY "Users can update their episodes"
  ON episodes FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  );

-- DELETE: Users can delete episodes they own
CREATE POLICY "Users can delete their episodes"
  ON episodes FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  );

-- Add comment documenting the security model
COMMENT ON POLICY "Users can view their episodes" ON episodes IS 'Users can see episodes they own directly (user_id) or through their podcasts (podcast.user_id)';
COMMENT ON POLICY "Users can insert their episodes" ON episodes IS 'Users can create episodes, either standalone (requires user_id) or attached to their podcast';
COMMENT ON POLICY "Users can update their episodes" ON episodes IS 'Users can modify episodes they own';
COMMENT ON POLICY "Users can delete their episodes" ON episodes IS 'Users can delete episodes they own';
