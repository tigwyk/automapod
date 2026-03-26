# AMP-49: Wire Tier Enforcement

**Type**: feature
**Priority**: P0 — billing gates must work before launch
**Status**: In Progress

## Description

Activate the subscription tier system built in AMP-48. The helpers and components
exist but nothing enforces them yet. This ticket wires them into every place a
user can hit a limit.

## Scope

### In Scope

#### Shared Nav Component
- [ ] `src/components/app-nav.tsx` — server component replacing the duplicated
      inline `<nav>` in every authenticated page. Includes:
  - Dashboard / Podcasts / Analytics / Billing nav links
  - User email + Sign Out
  - `TrialBanner` rendered above the nav when `status === 'trialing'`
- [ ] Replace inline nav in: `dashboard/page.tsx`, `podcasts/page.tsx`,
      `analytics/page.tsx`, `episodes/page.tsx`, podcast detail + episode pages,
      `settings/billing/page.tsx`

#### API Enforcement
- [ ] `POST /api/r2/presign` — call `canUploadEpisode()` before issuing the
      presigned URL (counts existing episodes + checks storage). Return 403 with
      `{ error, upgradeRequired: true }` if blocked.
- [ ] `POST /api/transcribe` — call `canTranscribe()`. Return 403 with
      `{ error, upgradeRequired: true }` if blocked.
- [ ] `GET /api/analytics/overview` and `GET /api/analytics/podcast/[id]` —
      pass `getAnalyticsWindowDays()` to the query so free users only see 7 days.

#### UI Enforcement
- [ ] Upload form (`simple-upload-form.tsx`) — handle `upgradeRequired: true`
      in the presign response; render `<UpgradePrompt>` instead of the error
      string.
- [ ] Episode detail page — handle `upgradeRequired: true` on transcription
      request; render `<UpgradePrompt>`.
- [ ] Analytics pages — show a banner when analytics are restricted to 7 days.

### Out of Scope
- E2E tests for billing gates (separate ticket)
- Podcast count gate on `POST /api/podcasts` (no podcast create API yet)
- Storage tracking (no storage column yet — use episode count only for now)

## Approach

### AppNav server component
```tsx
// src/components/app-nav.tsx
// Server component — fetches subscription internally using user.id
export async function AppNav({ user }: { user: User }) {
  const subscription = await getUserSubscription(user.id);
  return (
    <>
      {subscription.status === 'trialing' && subscription.trialEndsAt && (
        <TrialBanner trialEndsAt={subscription.trialEndsAt} />
      )}
      <nav>...</nav>  {/* billing link included */}
    </>
  );
}
```

### Episode limit check in presign route
Fetch `COUNT(*)` of existing episodes for the podcast (or user), compare
against `TIER_LIMITS[tier].episodes`, return 403 if over.

### Analytics window
Pass `windowDays` from `getAnalyticsWindowDays()` to the analytics queries
as a `WHERE created_at >= NOW() - INTERVAL '{n} days'` clause. When `null`
(pro/business), no date filter is applied.

## Dependencies
- AMP-48 (Stripe billing foundation) — complete ✅
- `lib/subscription.ts` — `canUploadEpisode`, `canTranscribe`, `getAnalyticsWindowDays`
- `lib/get-user-subscription.ts` — `getUserSubscription`
- `components/trial-banner.tsx`, `components/upgrade-prompt.tsx`

## Definition of Done
- [ ] Free tier user uploading an 11th episode sees `UpgradePrompt` (not a JS error)
- [ ] Free tier user clicking "Transcribe" sees `UpgradePrompt`
- [ ] Trial banner appears on every authenticated page during trial
- [ ] `/settings/billing` reachable from nav on every authenticated page
- [ ] Free tier analytics restricted to 7 days in API response
- [ ] `tsc --noEmit` clean
