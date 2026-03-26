# AMP-44: Podcast-Level Analytics Page

**Type**: feature
**Priority**: P1
**Status**: In Progress

## Description

AMP-43 added the account-level analytics overview. This ticket adds the podcast-level drill-down: a page that shows aggregate stats for a single podcast, its top episodes ranked by downloads, platform breakdown, and a 30-day download trend.

Entry points:
- "View →" link on each row in `/analytics` overview table
- "Analytics" quick-action button on podcast detail page (`/podcasts/[id]`)

## Scope

### In Scope
- [ ] `GET /api/analytics/podcast/[id]` — aggregate stats for one podcast
- [ ] `/analytics/podcast/[id]` page — stats row, 30-day chart, platform breakdown, top episodes table
- [ ] "Analytics" quick-action button on `/podcasts/[id]`

### Out of Scope
- Date range selection (future)
- Episode-level chart overlays (future)
- Geographic breakdown (future)

## Approach

### API: `GET /api/analytics/podcast/:id`
Fetches all episodes for the podcast, then all downloads for those episodes in one query. Aggregates in-memory.

```typescript
// Response shape
{
  podcastId: string,
  title: string,
  totalDownloads: number,
  uniqueDownloads: number,
  platformBreakdown: { ios, android, web, other },
  downloadsOverTime: Array<{ date, count }>,   // 30 days, zero-filled
  topEpisodes: Array<{ id, title, totalDownloads, uniqueDownloads }>
}
```

### Page: `/analytics/podcast/[id]`
- Same nav and design pattern as `/analytics` and `/analytics/episode/[id]`
- Layout: stats row (3 cards) → 2-col row (30-day chart + platform breakdown) → episodes table
- Episodes table: ranked 1-N by total downloads, each row links to `/analytics/episode/[id]`
- Breadcrumb: Analytics → {podcast title}

## Dependencies
- AMP-43 (`/analytics` overview) — ✅ done (PR #43)
- `episode_downloads` table — ✅ exists
- Per-episode analytics API — ✅ exists

## Definition of Done
- [ ] `GET /api/analytics/podcast/[id]` returns correct aggregate counts
- [ ] `/analytics/podcast/[id]` renders all sections
- [ ] Top episodes sorted descending by total downloads
- [ ] "View →" per episode links to `/analytics/episode/[id]`
- [ ] Empty episode state handled
- [ ] "Analytics" quick-action on podcast detail page
- [ ] Unauthenticated access → 401 (API) / redirect (page)
- [ ] Non-owner access → 404
- [ ] Build passes, zero TypeScript errors in `src/`
