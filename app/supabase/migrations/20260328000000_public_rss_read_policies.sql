-- Allow public (anon) read access to podcasts and episodes for RSS feed generation.
-- The RSS route uses the anon Supabase client (no auth) so RLS must permit anon SELECT.

-- Podcasts: allow public SELECT (RSS feed looks up podcasts by rss_slug without auth)
CREATE POLICY "Public can view podcasts"
  ON podcasts FOR SELECT
  TO anon
  USING (true);

-- Episodes: allow public SELECT for episodes belonging to any podcast (RSS feed content)
CREATE POLICY "Public can view podcast episodes"
  ON episodes FOR SELECT
  TO anon
  USING (podcast_id IS NOT NULL);
