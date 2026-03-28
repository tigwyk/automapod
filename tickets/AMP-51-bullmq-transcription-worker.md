# AMP-51 BullMQ transcription worker — deploy as standalone process

**Type**: feature
**Priority**: P1
**Status**: In Progress

## Description

The transcription queue uses BullMQ + Redis but the worker that processes jobs is either running in-process (inside Next.js serverless) or not deployed at all. This needs to run as a persistent standalone process separate from the Next.js app.

## Scope

### In Scope
- [ ] Locate or create the BullMQ worker entry point
- [ ] Ensure worker runs standalone via `bun run worker`
- [ ] Add `worker` script to `package.json`
- [ ] Document how to start the worker in dev and production
- [ ] Verify `REDIS_URL` is in `.env.example`

### Out of Scope
- Deployment infrastructure for the worker (separate concern)
- Changing the queue logic itself

## Approach

1. Find existing worker code (likely `src/lib/queue.ts` or `src/workers/`)
2. Create `src/workers/transcription-worker.ts` entry point if needed
3. Add `bun run worker` script
4. Test locally: upload an episode, confirm transcription job is picked up

## Dependencies
- Redis must be running locally
- `REDIS_URL` env var configured

## Definition of Done
- [ ] `bun run worker` starts the worker process
- [ ] Worker picks up jobs from the queue and processes them
- [ ] `REDIS_URL` documented in `.env.example`
- [ ] Dev instructions added (brief comment or README note)
