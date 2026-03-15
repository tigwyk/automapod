# [AMP-002] Implement Cloudflare R2 Integration

**Type**: feature
**Priority**: P1 (Blocks E2E tests)
**Status**: In Progress

## Description

Implement Cloudflare R2 storage integration for audio file uploads. This is currently blocking 37/39 E2E tests that cannot proceed past the upload functionality.

## Current Issues

### Missing R2 Module
The upload page tries to import from `@/lib/r2` which doesn't exist:
```typescript
import { uploadToR2, generateEpisodeKey, R2_EPISODES_BUCKET } from '@/lib/r2';
```

Error: `Module not found: Can't resolve '@/lib/r2'`

### Test Failures
- 37/39 E2E tests fail at upload functionality
- Tests cannot proceed to validate episode management, RSS generation, etc.

## Scope

### In Scope
- [ ] Create `src/lib/r2.ts` with R2 client utilities
- [ ] Implement `uploadToR2()` function for file uploads
- [ ] Implement `generateEpisodeKey()` for episode storage paths
- [ ] Set up environment variables for R2 credentials
- [ ] Create bucket if it doesn't exist
- [ ] Implement public URL generation for uploaded files
- [ ] Add error handling for upload failures
- [ ] Test upload functionality with actual audio files

### Out of Scope
- R2 bucket creation (assume bucket exists or create manually)
- CDN configuration (will use R2 default subdomain)
- File deletion/cleanup (can be added later)
- Multi-part uploads for large files (not needed initially)

## Technical Approach

### R2 Client Setup
```typescript
// Using AWS S3 SDK (R2 is S3-compatible)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
```

### Upload Function
```typescript
export async function uploadToR2(
  file: File,
  episodeId: string
): Promise<string> {
  const key = generateEpisodeKey(episodeId, file.name);
  const command = new PutObjectCommand({
    Bucket: R2_EPISODES_BUCKET,
    Key: key,
    Body: file,
    ContentType: file.type,
  });

  await r2Client.send(command);
  return `${R2_PUBLIC_URL}/${key}`;
}
```

### Episode Key Pattern
```
episodes/{year}/{month}/{episodeId}/{filename}
```

## Environment Variables

Add to `.env.example`:
```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=automapod-media
CLOUDFLARE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

## Dependencies

- [ ] Install `@aws-sdk/client-s3` package
- [ ] Set up R2 account and create bucket
- [ ] Generate R2 API tokens

## Definition of Done

- [ ] `src/lib/r2.ts` exists with all required functions
- [ ] Upload page successfully uploads audio files to R2
- [ ] Uploaded files are accessible via public URLs
- [ ] Error handling works for failed uploads
- [ ] Environment variables documented in .env.example
- [ ] At least 30/39 E2E tests passing (upload functionality working)
- [ ] Code reviewed via `/amp-commit`

## Testing

### Manual Testing
1. Upload a small MP3 file via the upload page
2. Verify it appears in R2 bucket
3. Verify it's accessible via public URL
4. Test error handling with invalid credentials

### E2E Testing
- Existing tests should pass once R2 is functional
- Tests cover: upload, episode listing, playback, deletion

## Security Considerations

- R2 credentials should be server-side only (never in client code)
- Public URLs should be used for playback (no signed URLs initially)
- Validate file types before upload (audio only)
- Limit file sizes to prevent abuse (e.g., 500MB max)

## Related

- Blocks: Most E2E tests (37/39 failures)
- Dependencies: AMP-001 (must be merged first for auth)
- Skills: amp-hosting (RSS/media hosting), amp-audio (audio processing)

## Notes

- R2 is S3-compatible, so we can use AWS SDK
- No additional CDN needed (R2 provides public URLs)
- Costs: $0.015/GB storage, free for egress (first 10GB/month)
