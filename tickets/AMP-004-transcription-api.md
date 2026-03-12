# [AMP-004] Build Transcription API

**Type**: feature
**Priority**: P1
**Status**: In Progress

## Description

Create a simple API endpoint that transcribes audio using Groq's Whisper API. This is phase 1 - on-demand transcription. Phase 2 will add background queue processing.

## Scope

### In Scope (Phase 1 - MVP)
- [x] Create ticket and plan work
- [ ] Install Groq SDK
- [ ] Create `/api/transcribe` endpoint
- [ ] Download audio from URL (R2 or test URL)
- [ ] Send to Groq Whisper API
- [ ] Save transcript to database
- [ ] Return transcript to caller
- [ ] Basic error handling
- [ ] Test with real audio file

### Out Scope (Phase 2 - Future)
- [ ] BullMQ + Redis queue
- [ ] Background worker process
- [ ] Retry logic
- [ ] Job priority
- [ ] Progress tracking
- [ ] Multiple concurrent jobs

## Approach

### Phase 1: Simple On-Demand Transcription

**API Route**: `POST /api/transcribe`

**Request Body**:
```typescript
{
  episodeId: string  // UUID of episode
}
```

**Flow**:
1. Fetch episode from database
2. Get audio URL from episode record
3. Download audio to temporary file
4. Send to Groq Whisper API
5. Store transcript in database
6. Update `transcript_status` to 'completed'
7. Return transcript text

### Error Handling

**Failures**:
- Episode not found → 404
- Audio download fails → 500, mark status 'failed'
- Groq API error → 500, retry logic (future)
- Transcript too large → truncate or error

## Dependencies

- Groq API key (need to get this)
- Cloudflare R2 (audio storage)
- Episode exists in database
- AMP-002 (database schema) ✅

## Definition of Done
- [ ] Groq SDK installed
- [ ] API endpoint created
- [ ] Can transcribe a test audio file
- [ ] Transcript saved to database
- [ ] Error cases handled gracefully
- [ ] Can call endpoint and get transcript back

## Technical Details

### Groq Whisper Usage

From amp-audio skill:
```typescript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const transcription = await groq.audio.transcriptions.create({
  file: audioFile,  // File or Buffer
  model: 'whisper-large-v3',
  response_format: 'verbose_json',
  timestamp_granularities: ['word'],
});
```

### Database Update

```typescript
await supabase
  .from('episodes')
  .update({
    transcript: transcription.text,
    transcript_status: 'completed',
  })
  .eq('id', episodeId);
```

## Notes

- This is intentionally simple (no queue) for testing
- Will add BullMQ + Redis in Phase 2 for production
- Need to get Groq API key first
- May need to handle large files (>25MB) differently

---

*Created: 2026-03-11*
