-- TEMPORARY: Disable RLS to test if that's the issue
-- Run this to test, then re-enable with the main migration

ALTER TABLE episodes DISABLE ROW LEVEL SECURITY;

-- To re-enable after testing, run:
-- ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
-- (Then re-run the main migration to create policies)
