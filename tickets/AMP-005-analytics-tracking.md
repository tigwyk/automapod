# [AMP-005] Analytics & Download Tracking

**Type**: feature
**Priority**: P1
**Status**: In Progress

## Description

Build privacy-first analytics system for tracking podcast downloads and listener metrics. Uses pixel tracking method with IP hashing for GDPR/CCPA compliance.

## Scope

### In Scope (MVP)
- [ ] Create ticket and plan work
- [ ] Download tracking endpoint (1x1 pixel GIF)
- [ ] IP hashing for privacy (SHA-256)
- [ ] User-Agent parsing for platform detection
- [ ] episode_downloads database table
- [ ] Download tracking API endpoint
- [ ] Analytics queries (counts per episode)
- [ ] Basic analytics dashboard
- [ ] E2E tests for tracking endpoint

### Out Scope (Future)
- [ ] Real-time analytics
- [ ] Geographic location tracking
- [ ] Listen duration tracking
- [ ] Completion rate tracking
- [ ] A/B testing capabilities

## Approach

### Download Tracking Method

**Pixel Method** (recommended for MVP):
```typescript
// GET /api/track/download?episodeId=xxx
// Returns 1x1 transparent GIF
// Records download in database asynchronously
```

**Why pixel method:**
- Works in all podcast apps
- No JavaScript required
- Cache-busting with timestamps
- Simple and reliable

### Privacy Design

**IP Hashing:**
```typescript
import { createHash } from 'crypto';

const ipHash = createHash('sha256')
  .update(clientIp + salt)
  .digest('hex');
```

**Why IP hashing:**
- GDPR/CCPA compliant (no raw IPs stored)
- Prevents duplicate counting from same IP
- Salt prevents rainbow table attacks
- Still allows aggregate analytics

### Database Schema

```sql
CREATE TABLE episode_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  platform TEXT, -- 'ios', 'android', 'web', 'other'
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_episode_downloads_episode_id ON episode_downloads(episode_id);
CREATE INDEX idx_episode_downloads_date ON episode_downloads(downloaded_at DESC);
```

### Platform Detection

```typescript
function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('android')) return 'android';
  if (ua.includes('apple-coremedia')) return 'ios'; // Podcast app
  if (ua.includes('overcast')) return 'ios';
  if (ua.includes('downcast')) return 'ios';
  if (ua.includes('podcastaddict')) return 'android';
  if (ua.includes('podcast')) return 'other';

  return 'web';
}
```

## API Endpoints

### GET /api/track/download
**Query params:**
- `episodeId` (required): UUID of episode

**Response:**
- 1x1 transparent GIF (43 bytes)
- Content-Type: image/gif
- Cache-Control: no-cache

**Headers captured:**
- X-Forwarded-For (client IP)
- User-Agent

### GET /api/analytics/episodes/:id
**Response:**
```json
{
  "episodeId": "uuid",
  "totalDownloads": 1234,
  "uniqueDownloads": 456,
  "platformBreakdown": {
    "ios": 234,
    "android": 123,
    "web": 56,
    "other": 43
  },
  "downloadsOverTime": [
    { "date": "2026-03-14", "count": 45 },
    { "date": "2026-03-15", "count": 67 }
  ]
}
```

## Dependencies

- Database migration for episode_downloads table
- Supabase client access
- Crypto module for hashing
- Node.js Request object for headers

## Definition of Done
- [ ] episode_downloads table created
- [ ] Download tracking endpoint working
- [ ] IP hashing implemented
- [ ] Platform detection working
- [ ] Analytics endpoint returns data
- [ ] Basic dashboard shows download counts
- [ ] Tests pass
- [ ] RSS feeds include tracking pixel

## Technical Details

### 1x1 Transparent GIF

```typescript
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);
```

### RSS Feed Integration

```xml
<enclosure url="https://cdn.automapod.app/episode.mp3?track=1"
  length="12345678" type="audio/mpeg"/>
```

Or use tracking prefix:
```xml
<enclosure url="https://automapod.app/api/track/download?episodeId=uuid&redirect=1"
  length="12345678" type="audio/mpeg"/>
```

### Analytics Query

```typescript
const { data } = await supabase
  .from('episode_downloads')
  .select('platform, downloaded_at')
  .eq('episode_id', episodeId);

const uniqueDownloads = new Set(data.map(d => d.ip_hash)).size;
const platformBreakdown = data.reduce((acc, d) => {
  acc[d.platform] = (acc[d.platform] || 0) + 1;
  return acc;
}, {});
```

## Notes

- Privacy-first design is critical for user trust
- Consider adding opt-out mechanism
- May want to add bot detection later
- Salt for IP hashing should be in env var

---

*Created: 2026-03-15*
