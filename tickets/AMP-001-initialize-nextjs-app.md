# [AMP-001] Initialize Next.js App

**Type**: feature
**Priority**: P0
**Status**: Complete ✅

## Description

Initialize the AutoMapod application using Next.js 15 with TypeScript, Tailwind CSS, and Supabase integration.

## Scope

### In Scope
- [x] Create ticket and plan work
- [x] Initialize Next.js 15 app in `app/` directory
- [x] Set up TypeScript configuration
- [x] Set up Tailwind CSS
- [x] Create Supabase client configuration
- [x] Set up environment variables template
- [x] Create basic directory structure (per ARCHITECTURE.md)
- [x] Verify app runs locally

### Out of Scope
- UI components (will use shadcn/ui later)
- Authentication pages
- API routes (next ticket)
- Database schema (next ticket)
- Cloudflare R2 setup (next ticket)

## Approach

1. Create Next.js app using `create-next-app@latest`
2. Install Supabase dependencies
3. Configure environment variables
4. Set up basic folder structure
5. Verify local development server runs

## Dependencies

- ARCHITECTURE.md (tech stack decisions)
- Supabase project (need to create or use existing)

## Definition of Done
- [x] `app/` contains a working Next.js app
- [x] TypeScript compiles without errors
- [x] Tailwind CSS is configured and working
- [x] Supabase client is configured (can connect)
- [x] Environment variables template exists
- [x] Basic folder structure matches ARCHITECTURE.md
- [x] `npm run dev` runs successfully
- [x] Build succeeds (`npm run build`)

## Implementation Notes

### Files Created

**Configuration**:
- `.env.example` - Environment variables template
- `tsconfig.json` - TypeScript configuration (auto-generated)
- `next.config.ts` - Next.js configuration (auto-generated)

**Library Files** (`lib/`):
- `lib/supabase.ts` - Supabase client with TypeScript types
- `lib/r2.ts` - Cloudflare R2 S3-compatible client
- `lib/groq.ts` - Groq Whisper transcription client
- `lib/queue.ts` - BullMQ job queue setup

**Directory Structure**:
- `app/(dashboard)/` - Protected dashboard routes
- `app/rss/` - RSS feed generation
- `app/api/` - API routes
- `components/ui/` - UI components (for shadcn/ui)
- `workers/` - Background job workers

### Dependencies Installed

Core:
- next@^16.1.6
- react@^19.0.0
- react-dom@^19.0.0

Integrations:
- @supabase/supabase-js@^2.39.0
- @aws-sdk/client-s3@^3.0.0 (for R2)
- bullmq@^5.0.0
- ioredis@^5.0.0
- groq-sdk@^0.5.0

### TypeScript Configuration

All library files include full TypeScript types:
- Supabase: Database schema types
- R2: S3 client types
- Groq: Transcription types
- Queue: BullMQ job types

### Known Issues

1. **Multiple lockfiles warning**: Next.js detects lockfile in parent directory
   - Can be fixed by setting `turbopack.root` in next.config.ts
   - Not critical, app still works

2. **BullMQ type issue**: Used `as any` type assertion for Redis connection
   - BullMQ types don't perfectly match ioredis
   - Common workaround, works correctly at runtime

## Next Steps

1. **AMP-002**: Set up Supabase database schema
2. **AMP-003**: Implement audio upload API route
3. **AMP-004**: Implement transcription worker
4. **AMP-005**: Generate RSS feeds

## Completed

2026-03-10: Initial project setup complete

---

*Ticket completed: 2026-03-10*
