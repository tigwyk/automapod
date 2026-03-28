# AMP-53 Commit Supabase CLI config

**Type**: chore
**Priority**: P3
**Status**: In Progress

## Description

The Supabase CLI was linked during the billing session but `supabase/config.toml` is either missing or not committed. Without it, `supabase migration list` and `supabase db push` won't work for other contributors or CI. Also, future migrations won't be trackable.

## Scope

### In Scope
- [ ] Confirm `supabase/config.toml` exists
- [ ] Redact any secrets from config.toml before committing
- [ ] Commit config.toml and the `.temp/` gitignore entry
- [ ] Verify `supabase migration list` shows all 5 migrations as applied

### Out of Scope
- Setting up CI migration runs (future work)

## Definition of Done
- [ ] `supabase/config.toml` committed (secrets redacted or absent)
- [ ] `supabase/.temp/` added to `.gitignore`
- [ ] `supabase migration list` works without error
