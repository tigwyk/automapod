# [AMP-002] Set Up Database Schema

**Type**: feature
**Priority**: P0
**Status**: Complete ✅

## Description

Create the database schema in Supabase for podcasts, episodes, and analytics. Set up Row Level Security (RLS) policies to protect user data.

## Scope

### In Scope
- [x] Create ticket and plan work
- [x] Create SQL migration for podcasts table
- [x] Create SQL migration for episodes table
- [x] Create SQL migration for episode_downloads table
- [x] Set up Row Level Security policies
- [x] Create indexes for performance
- [x] Test schema in Supabase SQL editor

### Out of Scope
- Authentication (Supabase Auth is built-in)
- Database triggers (future enhancement)
- Foreign key constraints to auth.users (complex, defer)

## Approach

1. Create SQL migration files
2. Run migrations in Supabase SQL editor
3. Enable RLS on all tables
4. Create policies for data isolation
5. Add indexes for common queries

## Dependencies

- Supabase project (✅ created)
- AMP-001 (✅ complete - Next.js app initialized)

## Definition of Done
- [x] All tables created in Supabase
- [x] RLS enabled on all tables
- [x] Security policies created
- [x] Indexes created for performance
- [x] Schema matches ARCHITECTURE.md design
- [x] Can query tables via Supabase client

## Implementation

### Migration Files Created

1. **001_create_podcasts_table.sql**
   - Table: podcasts
   - Columns: id, user_id, title, description, cover_image_url, rss_slug, timestamps
   - RLS: Users can only CRUD own podcasts
   - Indexes: rss_slug (unique), user_id, updated_at

2. **002_create_episodes_table.sql**
   - Table: episodes
   - Columns: id, podcast_id, title, description, audio_url, duration_seconds
   - transcript, transcript_status, published_at, created_at
   - RLS: Users can only access episodes from own podcasts
   - Foreign key: podcast_id → podcasts(id) ON DELETE CASCADE
   - Indexes: podcast_id, published_at, transcript_status, created_at

3. **003_create_episode_downloads_table.sql**
   - Table: episode_downloads
   - Columns: id, episode_id, downloaded_at, ip_hash, user_agent
   - RLS: Public can insert, users can view own analytics
   - Foreign key: episode_id → episodes(id) ON DELETE CASCADE
   - Indexes: episode_id, downloaded_at, ip_hash

4. **004_create_functions.sql**
   - Function: update_updated_at_column()
   - Trigger: Auto-updates podcasts.updated_at on row modification

### Test Results

```
✅ All database tests passed!

1. Testing connection... ✓
2. Checking podcasts table... ✓
3. Checking episodes table... ✓
4. Checking episode_downloads table... ✓
5. Testing RLS... ✓ (insert blocked as expected)
```

### Files Created

**Migrations**:
- `app/supabase/migrations/001_create_podcasts_table.sql`
- `app/supabase/migrations/002_create_episodes_table.sql`
- `app/supabase/migrations/003_create_episode_downloads_table.sql`
- `app/supabase/migrations/004_create_functions.sql`
- `app/supabase/migrations/README.md`

**Test Script**:
- `app/scripts/test-db.ts`

**Dependencies**:
- Added `dotenv` for environment variable loading

## Notes

- Using UUIDs for primary keys (Supabase default)
- timestamps with TIMESTAMPTZ for timezone awareness
- RLS ensures users can only access their own data
- Cascade deletes ensure data integrity
- IP addresses hashed for privacy (SHA-256)

## Completed

2026-03-10: Database schema created, RLS configured, tests passing

---

*Ticket completed: 2026-03-10*
