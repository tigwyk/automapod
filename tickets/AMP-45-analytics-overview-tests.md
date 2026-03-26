# AMP-45: E2E Tests — Analytics Overview Page & Nav

**Type**: test
**Priority**: P2
**Status**: In Progress

## Description

Add E2E test coverage for the analytics overview page (`/analytics`), the
overview API (`/api/analytics/overview`), the analytics nav link, and the
overview → podcast drill-down navigation. The per-episode and per-podcast
analytics pages are already covered in `analytics.spec.ts` and
`podcast-analytics.spec.ts`.

## Scope

### In Scope
- [ ] Nav link: "Analytics" visible in nav after login
- [ ] Overview page: redirects unauthenticated users to `/login`
- [ ] Overview API: returns 401 without auth
- [ ] Overview API: returns expected shape (totalDownloads, podcasts[])
- [ ] Overview page: renders podcast list with download counts
- [ ] Overview page: "View →" link navigates to `/analytics/podcast/[id]`

### Out of Scope
- Episode-level analytics (covered in `analytics.spec.ts`)
- Podcast-level analytics (covered in `podcast-analytics.spec.ts`)
- Download count accuracy (unit/integration concern, not E2E)

## Approach

New file: `e2e/analytics-overview.spec.ts`

Follows same patterns as `podcast-analytics.spec.ts`:
- `beforeEach` login via UI
- Create a test podcast to have a known entity
- Verify API shape and page rendering
- Clean test isolation (timestamp-prefixed names)

## Dependencies

- AMP-43 (merged) — `/analytics` page and nav
- AMP-44 (merged) — `/analytics/podcast/[id]` page

## Definition of Done

- [ ] `analytics-overview.spec.ts` created with all tests passing
- [ ] Nav link test passes
- [ ] Auth guard test passes
- [ ] Overview API shape test passes
- [ ] Page renders podcast list
- [ ] Drill-down navigation test passes
- [ ] `npm run test:e2e` passes (no regressions)
