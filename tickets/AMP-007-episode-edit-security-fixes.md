# AMP-007 Episode Edit Security Fixes

**Type**: bugfix
**Priority**: P0 (Security)
**Status**: ✅ Complete

## Description
Critical security issues found in episode edit, detail, and list pages. Ownership verification is missing throughout, allowing potential unauthorized access to other users' episodes.

## Scope

### In Scope
- [x] Add ownership verification to `getEpisode` in edit page
- [x] Add ownership verification to `getEpisode` in detail page
- [x] Add ownership verification to `updateEpisode` server action
- [x] Add ownership verification to `deleteEpisode` server action
- [x] Fix episodes list to filter by user ownership
- [x] Add delete confirmation dialog
- [x] Fix minor UI issues (cancel button, form error handling)
- [x] Create database migration to add `user_id` to episodes

### Out of Scope
- RLS policy audit (separate task)
- Full redesign of episode forms

## Bugs Found

### Critical (Security) - ALL FIXED
1. **`getEpisode` (edit page)** - No ownership check, queries by ID only ✅
2. **`getEpisode` (detail page)** - No ownership check ✅
3. **`updateEpisode`** - No ownership verification before update ✅
4. **`deleteEpisode`** - No ownership verification before delete ✅
5. **`episodes/list`** - Returns all episodes, no user filter ✅

### Medium (UX) - ALL FIXED
6. **No delete confirmation** - Immediate deletion is dangerous ✅
7. **No form error handling** - Errors just bubble up, no user feedback ✅
8. **No success feedback** - No confirmation after save ✅

### Minor (UI) - FIXED
9. **Cancel button styling** - Uses `inline-block pt-2` hack instead of proper flex ✅

## Files Modified

### Security Fixes
- `src/app/api/episodes/[id]/route.ts` - Added ownership check to GET, PATCH, DELETE
- `src/app/episodes/[id]/page.tsx` - Added ownership check, converted delete to client component
- `src/app/episodes/[id]/delete-button.tsx` - New: Delete button with confirmation
- `src/app/episodes/[id]/edit/page.tsx` - Converted to client component with error handling
- `src/app/episodes/page.tsx` - Filter by user ownership (direct + via podcast)

### Database Migration
- `supabase/migrations/20260317000000_add_user_id_to_episodes.sql` ✅ Applied
  - Adds `user_id` column to episodes
  - Backfills existing episodes from their podcast's user_id
  - Adds index for efficient queries

### Upload Fix
- `src/app/episodes/new/page.tsx` - Now sets `user_id` on episode creation

## Testing

Tests pass: 7/7 episode edit tests passing

## Resolution

**Commit**: `72a20764` - fix(security): implement episode ownership checks and RLS policies

All security fixes have been implemented and merged to main. The migration has been applied to the database. Episode edit tests (7 tests) are passing.

## Definition of Done
- [x] All ownership checks implemented
- [x] Migration file created
- [x] Migration applied to database
- [x] Tests pass (7/7 episode edit tests)
- [x] Manual testing confirms users cannot access other users' episodes
