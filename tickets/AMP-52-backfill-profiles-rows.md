# AMP-52 Backfill profiles rows for existing users

**Type**: chore
**Priority**: P2
**Status**: In Progress

## Description

The `profiles` migration (AMP-48) was applied after users already existed. The `handle_new_user` trigger only fires for new sign-ups, so existing users have no `profiles` row. The app handles this gracefully (null fallback → free tier defaults), but subscription data won't persist for them until an upsert is triggered.

## Scope

### In Scope
- [ ] Run backfill SQL in Supabase SQL editor
- [ ] Verify existing test user has a profiles row after backfill

### Out of Scope
- Changing the trigger or migration (already correct for future users)

## Approach

Run via Supabase dashboard SQL editor:

```sql
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

## Definition of Done
- [ ] All existing `auth.users` have a corresponding row in `profiles`
- [ ] No data loss (ON CONFLICT DO NOTHING preserves existing rows)
