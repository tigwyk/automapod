# AMP-43: Analytics Navigation + Overview Page

**Type**: feature
**Priority**: P1
**Status**: In Progress

## Description

Podcast creators can't currently navigate to analytics from anywhere in the app. The per-episode analytics page exists at `/analytics/episode/[id]` but is only reachable via the episode detail page. There's no top-level entry point, no account-wide summary, and the nav bar on every page lacks an Analytics link.

This ticket adds the missing analytics layer: a top-level overview page showing all podcasts with their download counts, and an Analytics nav link across all authenticated pages.

## Scope

### In Scope
- [ ] `GET /api/analytics/overview` — returns total downloads per podcast for the authenticated user
- [ ] `/analytics` page — account-level overview (stats row + per-podcast table)
- [ ] Add "Analytics" link to nav on: dashboard, podcasts list, podcast detail, episode detail, episode analytics pages
- [ ] Add Analytics quick-action card to dashboard page

### Out of Scope
- Podcast-level analytics page (AMP-44)
- Date range filtering (future)
- Export/CSV (future)
- Geographic analytics (future)

## Approach

### API: `GET /api/analytics/overview`
Fetch `podcasts`, `episodes`, and `episode_downloads` rows for the authenticated user and aggregate counts in-memory in JavaScript. Suitable for current scale; migrate to a SQL aggregate query (RPC / DB-level COUNT) via AMP-46 if download volume becomes a concern.

```typescript
// Response shape
{
  totalDownloads: number,
  totalUniqueDownloads: number,
  podcasts: Array<{
    id: string,
    title: string,
    episodeCount: number,
    totalDownloads: number,
    uniqueDownloads: number
  }>
}
```

For unique downloads per podcast: count distinct `ip_hash` values across all episodes in the podcast. Use a Supabase RPC (postgres function) to avoid N+1 queries.

### Page: `/analytics`
- Match existing app design patterns (same nav, card-elevated, btn styles)
- Stats row: 3 cards — Total Downloads, Unique Downloads, Total Episodes
- Podcasts table: title, episodes, total downloads, unique downloads, link to `/analytics/podcast/[id]` (stub — AMP-44 implements the target page)
- Empty state: friendly message + link to create a podcast if user has none
- Auth guard: redirect to `/login` if unauthenticated

### Nav Update
All authenticated pages share the same inline nav pattern. Add "Analytics" link after "Podcasts" in the nav on:
1. `app/src/app/dashboard/page.tsx`
2. `app/src/app/podcasts/[id]/page.tsx`
3. `app/src/app/podcasts/[id]/episodes/page.tsx`
4. `app/src/app/podcasts/[id]/episodes/[episodeId]/page.tsx`
5. `app/src/app/analytics/episode/[id]/page.tsx`

Also add Analytics quick-action card to dashboard alongside "Create Podcast" and "Manage Podcasts".

## Dependencies
- `episode_downloads` table — ✅ exists
- `episodes` table — ✅ exists
- `podcasts` table — ✅ exists
- Per-episode analytics API — ✅ exists
- AMP-44 (podcast-level analytics page) — to follow

## Definition of Done
- [ ] `GET /api/analytics/overview` returns correct aggregate counts
- [ ] `/analytics` page loads for authenticated users
- [ ] "Analytics" link present in nav on all authenticated pages
- [ ] Analytics quick-action card on dashboard
- [ ] Unauthenticated access redirects to `/login`
- [ ] Empty state handled (no podcasts)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] E2E tests pass (`npm run test:e2e`)
