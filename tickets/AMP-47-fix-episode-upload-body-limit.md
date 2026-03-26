# AMP-47: Fix Episode Upload Failing with 1 MB Body Size Limit

**Type**: bugfix
**Priority**: P0 — blocks core functionality
**Status**: Open

## Error

```
Uncaught Exception: Error: Body exceeded 1 MB limit.
To configure the body size limit for Server Actions, see:
https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit
    at Transform.transform [as _transform] (next-server/app-page.runtime.prod.js)
```

## Root Cause

The episode upload form at `/podcasts/[id]/episodes/new` submits the audio
file via a Next.js **Server Action** (`'use server'`). Next.js applies a
default `bodySizeLimit` of **1 MB** to all Server Actions. Any audio file
larger than 1 MB — which is essentially every real podcast episode — hits
this limit and throws before the action can run.

**File**: `app/src/app/podcasts/[id]/episodes/new/page.tsx`
The `uploadEpisode` Server Action receives `formData` containing the raw
audio file blob, which is streamed through the Next.js server.

## Two Possible Fixes

### Option A — Quick fix: raise `bodySizeLimit` in `next.config.ts`

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',  // match stated 500MB upload limit
    },
  },
};
```

**Pros**: One-line change, unblocks uploads immediately.
**Cons**: Routes every audio upload (up to 500 MB) through the Next.js
server process and Vercel's function runtime. This means:
- Higher memory usage per upload
- Ties up a serverless function slot for the full upload duration
- Vercel functions have a 4.5 MB request body limit on hobby plans, and
  a 4 GB limit on Pro — but streaming to R2 still traverses the function

### Option B — Proper fix: presigned URL direct-to-R2 upload (recommended)

Upload flow becomes:
1. Client calls `POST /api/r2/presign` with `filename` and `contentType`
   → returns a presigned PUT URL (signed with R2 credentials, 15-min TTL)
2. Client uploads the file **directly to R2** via `fetch(presignedUrl, { method: 'PUT', body: file })`
   — Next.js server is never in the data path
3. On upload completion, client calls the Server Action with just the
   returned R2 key + episode metadata (title, description)
   → Server Action creates the database record and redirects

**Pros**:
- Audio bytes never transit the Next.js server
- No body size limit issue — upload goes browser → R2 directly
- Scales to large files without tying up serverless function memory
- Upload progress can be reported to the user (XHR/fetch with progress events)

**Cons**: More implementation work (new API route + client-side fetch logic).

## Recommendation

Implement **Option B**. Option A is a stopgap that will run into Vercel
function constraints at meaningful file sizes and degrades performance.
The presigned URL pattern is standard for audio/video hosting platforms.

If a fast unblock is needed before Option B is complete, ship Option A
first as a separate commit, then replace it with Option B.

## Files to Change

### Option A only
- `app/next.config.ts` — add `serverActions.bodySizeLimit`

### Option B
- `app/src/app/api/r2/presign/route.ts` — new presign endpoint
- `app/src/components/simple-upload-form.tsx` — replace form submit with
  two-phase (presign → direct upload → server action)
- `app/src/app/podcasts/[id]/episodes/new/page.tsx` — server action now
  receives R2 key instead of file bytes
- `app/next.config.ts` — no longer needs a raised limit

## Acceptance Criteria

- [ ] Episodes up to 500 MB upload without error in production
- [ ] Upload progress is shown to the user (Option B enables this)
- [ ] Failed R2 upload shows a user-friendly error message
- [ ] No regression in episode creation flow (DB record created, redirect works)
- [ ] Existing E2E upload tests pass

## Notes

- The standalone `/episodes/new` page has the same Server Action pattern —
  check if it shares the same component or needs the same fix applied
- Vercel Pro plan function body limit is 4.5 MB on hobby, ~250 MB streaming
  on Pro — Option A may not even work reliably without a plan upgrade
- R2 presigned URLs use `@aws-sdk/s3-request-presigner` which is already
  in the R2 library (`app/src/lib/r2.ts`) — check if `getSignedUrl` is
  already imported/available
