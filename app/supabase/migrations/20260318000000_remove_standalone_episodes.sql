-- Remove standalone episodes support
-- All episodes must belong to a podcast

-- First, check for any standalone episodes (podcast_id IS NULL)
-- If any exist, we need to handle them (will fail if there are any)
DO $$
DECLARE
  standalone_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO standalone_count
  FROM episodes
  WHERE podcast_id IS NULL;

  IF standalone_count > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: There are % standalone episodes. Please assign them to a podcast first.', standalone_count;
  END IF;
END $$;

-- Make podcast_id NOT NULL
ALTER TABLE episodes ALTER COLUMN podcast_id SET NOT NULL;

-- Remove user_id column since ownership is now inferred from podcast
-- (all episodes must have a podcast, and podcasts have user_id)
ALTER TABLE episodes DROP COLUMN IF EXISTS user_id;

-- Drop the index that's no longer needed
DROP INDEX IF EXISTS idx_episodes_user_id;

-- Update comment
COMMENT ON COLUMN episodes.podcast_id IS 'Required: Every episode must belong to a podcast';

-- ============================================================
-- UPDATE RLS POLICIES (simplified - no more standalone logic)
-- ============================================================

-- Re-enable RLS (it was disabled in a previous test migration)
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
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

-- SELECT: Users can read episodes from their podcasts only
CREATE POLICY "Users can view their podcast episodes"
  ON episodes FOR SELECT
  TO authenticated
  USING (
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  );

-- INSERT: Users can create episodes in their own podcasts only
CREATE POLICY "Users can insert episodes in their podcasts"
  ON episodes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM podcasts WHERE id = episodes.podcast_id AND user_id = auth.uid()
    )
  );

-- UPDATE: Users can update episodes in their own podcasts only
CREATE POLICY "Users can update their podcast episodes"
  ON episodes FOR UPDATE
  TO authenticated
  USING (
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  );

-- DELETE: Users can delete episodes from their own podcasts only
CREATE POLICY "Users can delete their podcast episodes"
  ON episodes FOR DELETE
  TO authenticated
  USING (
    podcast_id IN (
      SELECT id FROM podcasts WHERE user_id = auth.uid()
    )
  );

-- Add comments documenting the simplified security model
COMMENT ON POLICY "Users can view their podcast episodes" ON episodes IS 'Users can see episodes from podcasts they own (no standalone episodes)';
COMMENT ON POLICY "Users can insert episodes in their podcasts" ON episodes IS 'Users can create episodes only in podcasts they own';
COMMENT ON POLICY "Users can update their podcast episodes" ON episodes IS 'Users can modify episodes in podcasts they own';
COMMENT ON POLICY "Users can delete their podcast episodes" ON episodes IS 'Users can delete episodes from podcasts they own';
