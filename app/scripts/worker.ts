/**
 * Transcription worker entry point.
 *
 * Run with:
 *   bun run worker
 *
 * Requires:
 *   REDIS_URL                — Redis connection (default: redis://localhost:6379)
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key for direct DB writes
 *   GROQ_API_KEY             — Groq Whisper API key
 */

import { createTranscriptionWorker } from '../src/lib/queue/workers/transcription-worker';

createTranscriptionWorker();
console.log('[transcription] worker started, waiting for jobs...');
