# AMP-54 RSS Feed Link UI

**Type**: feature
**Priority**: P1
**Status**: In Progress

## Description

The RSS feed endpoint `/rss/{slug}` is already implemented and tested. Users need a way to discover and copy their podcast RSS feed URL so they can submit it to directories like Spotify and Apple Podcasts.

## Scope

### In Scope
- [ ] Display RSS feed URL prominently on the podcast detail page
- [ ] Copy-to-clipboard button for the RSS URL
- [ ] Submission links for Apple Podcasts and Spotify

### Out of Scope
- Building or modifying the RSS feed endpoint itself (already done)
- Podcast directory submission automation
- Feed validation UI

## Approach

Add an "RSS Feed" section to the podcast detail page (`/podcasts/[id]/page.tsx`):
- Show the full public RSS URL: `{origin}/rss/{podcast.rss_slug}`
- Client-side copy button using `navigator.clipboard`
- Links to Apple Podcasts Connect and Spotify for Podcasters submission pages

## Dependencies

- Existing RSS endpoint at `/rss/[slug]`
- `rss_slug` field on podcasts table

## Definition of Done

- [ ] RSS feed URL visible on podcast detail page
- [ ] Copy button works
- [ ] Submission links to Apple Podcasts and Spotify present
- [ ] Tests pass
