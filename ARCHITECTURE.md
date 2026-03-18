# AutomaPod Architecture

**Last updated**: 2026-03-10
**Status**: Tech stack locked, MVP planning in progress

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) | You know it, great DX, API routes simplify backend |
| **Database** | Supabase (PostgreSQL) | You know it, built-in auth, real-time, storage |
| **Object Storage** | Cloudflare R2 | S3-compatible, 90% cheaper than S3, no egress fees |
| **Transcription** | Groq (Whisper) | Fast, accurate, ~$0.006/minute |
| **Job Queue** | BullMQ + Redis | Proven, handles async audio processing |
| **Deployment** | Vercel | First-class Next.js support, you have an account |

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@aws-sdk/client-s3": "^3.0.0",  // For R2
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0",
    "groq-sdk": "^0.5.0"
  }
}
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (Next.js 15 + Tailwind)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │  API Routes   │
                    │  (Next.js)    │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼──────┐  ┌────────▼────────┐
│   Supabase     │  │  BullMQ      │  │  Cloudflare R2  │
│  (PostgreSQL)  │  │  + Redis     │  │  (Object Store) │
│                │  │              │  │                 │
│ - Users        │  │ - Transcribe │  │ - Audio files   │
│ - Podcasts     │  │ - Process    │  │ - Assets        │
│ - Episodes     │  │ - Cleanup    │  │ - RSS feeds     │
│ - Analytics    │  │              │  │                 │
└────────────────┘  └──────┬───────┘  └─────────────────┘
                           │
                    ┌──────▼────────┐
                    │   Groq        │
                    │  (Whisper)    │
                    └───────────────┘
```

---

## Data Model

### Core Tables

```sql
-- Podcasts
CREATE TABLE podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  rss_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Episodes
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  transcript_status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics (basic)
CREATE TABLE episode_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT
);
```

---

## Core Features

### 1. Audio Upload
```
User uploads file → Next.js API route → Stream to R2
                   ↓
                Create episode record (status: pending)
                   ↓
                Queue transcription job
```

**Why this works**:
- Streaming upload avoids memory issues with large files
- R2 handles large files (podcasts are 50-200MB typically)
- Job queue ensures transcription doesn't block upload

### 2. Transcription
```
BullMQ worker picks up job
  ↓
Download audio from R2
  ↓
Send to Groq Whisper API
  ↓
Store transcript in Supabase
  ↓
Update episode status
```

**Why Groq**:
- Much faster than OpenAI (real-time possible)
- Same Whisper model quality
- Lower latency for long episodes

### 3. RSS Feed Generation
```
GET /rss/:slug → Query Supabase for podcast + episodes
                 ↓
                Generate XML (RSS 2.0 + iTunes tags)
                 ↓
                Cache for 5 minutes
```

**RSS Fields**:
- Podcast title, description, cover art
- Episode audio URLs (from R2)
- Duration, pubDate, transcript link
- iTunes:author, iTunes:explicit, etc.

### 4. Analytics
```
Episode download → Edge function logs to Supabase
                  ↓
                 Aggregate queries (downloads per episode)
                  ↓
                 Display in dashboard
```

**Privacy-first**: IP hashing, no personal data stored

---

## Directory Structure

```
automapod-business/app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── podcasts/
│   │   │   │   ├── page.tsx                # Podcast list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # Podcast detail
│   │   │   │       └── episodes/
│   │   │   │           ├── page.tsx        # Episode list
│   │   │   │           └── new/page.tsx    # Upload episode
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── rss/
│   │   │   └── [slug]/route.ts             # RSS feed
│   │   ├── api/
│   │   │   ├── upload/route.ts             # Audio upload
│   │   │   ├── transcribe/route.ts         # Transcription webhook
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                        # Landing page
│   ├── components/
│   │   ├── ui/                             # Shadcn/ui components
│   │   ├── audio-uploader.tsx
│   │   ├── episode-list.tsx
│   │   └── transcript-viewer.tsx
│   ├── lib/
│   │   ├── supabase.ts                     # Supabase client
│   │   ├── r2.ts                           # Cloudflare R2 client
│   │   ├── queue.ts                        # BullMQ setup
│   │   └── groq.ts                         # Groq Whisper client
│   └── workers/
│       └── transcribe.ts                   # Background worker
├── public/
│   └── rss.xsl                             # RSS stylesheet
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## API Routes

### POST /api/upload
**Purpose**: Upload audio file
**Auth**: Required
**Body**: FormData with `file` and `podcast_id`

```typescript
// Returns
{
  episodeId: string,
  audioUrl: string,
  status: 'pending'
}
```

### POST /api/transcribe
**Purpose**: Trigger transcription (webhook from BullMQ)
**Auth**: Internal only

```typescript
// Returns
{
  success: true,
  transcript: string
}
```

### GET /rss/:slug
**Purpose**: Public RSS feed for podcast apps
**Auth**: Public
**Response**: RSS XML

---

## Security Considerations

### Authentication
- Supabase Auth for user management
- Row Level Security (RLS) on all tables
- API routes verify user identity

### File Upload
- Max file size: 500MB
- Allowed types: audio/mpeg, audio/m4a, audio/wav
- Virus scanning via ClamAV (optional)

### R2 Configuration
- Public read access for audio files
- Signed URLs for uploads
- Custom domain for RSS feeds

### API Security
- Rate limiting on upload endpoint
- CORS restricted to automapod.com
- Webhook signature verification

---

## Deployment Architecture

### Vercel (Frontend + API Routes)
```
- Automatic deployments from git
- Edge functions for RSS feeds
- Environment variables via dashboard
- Custom domain: automapod.com
```

### Supabase (Database + Auth)
```
- Free tier to start
- Automatic backups
- Edge functions for webhooks (optional)
```

### Cloudflare R2 (Storage)
```
- Custom domain: audio.automapod.com
- Public bucket for RSS accessibility
- Lifecycle rules for old episodes (optional)
```

### Redis + BullMQ Worker
```
- Options: Upstash Redis (serverless) or Railway
- Worker runs as separate service
- Could use Vercel Cron Jobs for worker
```

---

## Cost Estimates (Monthly)

| Service | Free Tier | Paid (at scale) |
|---------|-----------|-----------------|
| Vercel | Yes (hobby) | $20+ (pro) |
| Supabase | 500MB DB | $25+ |
| Cloudflare R2 | 10GB storage | $15/TB |
| Groq | Limited | ~$0.006/min |
| Redis | - | $10-20 (Upstash) |

**MVP Cost**: ~$0/month (all on free tiers)
**At 100 episodes/month**: ~$50-100/month

---

## Performance Considerations

### Streaming Uploads
- Use `FormData` with streaming
- Avoid loading entire file in memory
- Progress feedback to user

### RSS Feed Caching
- Cache generated RSS for 5 minutes
- Revalidate on episode publish
- Edge location caching via Vercel

### Database Queries
- Index on `podcast_id`, `published_at`
- Limit episodes in RSS (latest 100)
- Pagination for episode lists

### Transcription
- Process in background, don't block
- Queue prioritization (pro users first)
- Retry logic for failures

---

## Next Steps

1. **Set up project**: Initialize Next.js with Supabase
2. **Configure R2**: Set up Cloudflare R2 bucket
3. **Build MVP**: Upload → Transcribe → RSS flow
4. **Test**: End-to-end with real podcast
5. **Deploy**: Push to Vercel, test production

---

## Open Questions

- **Redis hosting**: Upstash (serverless) or Railway (traditional)?
- **Audio processing**: Do we need normalization/enhancement?
- **Analytics depth**: Basic download counts or full listener analytics?
- **Transcript editing**: Allow users to edit transcripts?
- **Multi-language**: Support for multiple podcast languages?

---

*This architecture is designed for rapid MVP development with clear upgrade paths.*
