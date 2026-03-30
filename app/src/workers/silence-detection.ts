import { Worker, Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SilenceDetectionJobData {
  episodeId: string
  audioUrl: string
  minDurationMs: number
  minConfidence: number
  userId: string
}

interface SilenceSegment {
  start: number // seconds
  end: number // seconds
  duration: number // seconds
}

interface FfmpegSilenceOutput {
  silence: Array<{
    start: string
    end: string
    duration: string
  }>
}

/**
 * Silence Detection Worker
 *
 * Analyzes audio files using ffmpeg to detect silence gaps.
 * Silence gaps are potential ad insertion points.
 */
export async function runSilenceDetectionWorker() {
  const worker = new Worker(
    'silence-detection',
    async (job: Job<SilenceDetectionJobData>) => {
      const { episodeId, audioUrl, minDurationMs, minConfidence } = job.data

      job.updateProgress(10)

      let tempDir: string | undefined
      try {
        // Download audio to temp file
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'silence-'))
        const audioPath = path.join(tempDir, 'audio.mp3')

        job.updateProgress(20)

        // Download from R2 (or whatever storage)
        const response = await fetch(audioUrl)
        if (!response.ok) {
          throw new Error(`Failed to download audio: ${response.statusText}`)
        }

        const buffer = await response.arrayBuffer()
        await fs.writeFile(audioPath, Buffer.from(buffer))

        job.updateProgress(40)

        // Run ffmpeg silence detection
        // ffmpeg -i audio.mp3 -af silencedetect=noise=-30dB:d=1 -f null -
        const minDurationSec = minDurationMs / 1000

        job.updateProgress(50)

        const { stderr } = await execFileAsync('ffmpeg', [
          '-i', audioPath,
          '-af', `silencedetect=noise=-30dB:d=${minDurationSec}`,
          '-f', 'null',
          '-',
        ])
        const output = stderr // ffmpeg writes to stderr

        job.updateProgress(70)

        // Parse ffmpeg output for silence segments
        const silenceSegments = parseFfmpegSilenceOutput(output)

        job.updateProgress(80)

        // Filter by minimum duration and confidence
        // For now, confidence is based on silence duration (longer = more confident)
        const filteredSegments = silenceSegments
          .filter(seg => seg.duration * 1000 >= minDurationMs)
          .map(seg => ({
            start_ms: Math.round(seg.start * 1000),
            end_ms: Math.round(seg.end * 1000),
            duration_ms: Math.round(seg.duration * 1000),
            confidence: Math.min(1.0, seg.duration / 2), // Cap at 1.0, 2s silence = 1.0 confidence
            is_suggested_placement: seg.duration >= 1.5, // Recommend 1.5s+ silences
          }))
          .filter(seg => seg.confidence >= minConfidence)

        // Insert into database
        if (filteredSegments.length > 0) {
          const { error } = await supabase
            .from('silence_markers')
            .insert(
              filteredSegments.map(seg => ({
                episode_id: episodeId,
                ...seg,
              }))
            )

          if (error) {
            console.error('Error inserting silence markers:', error)
            throw error
          }
        }

        job.updateProgress(100)

        return {
          success: true,
          episodeId,
          markersDetected: filteredSegments.length,
          suggestedPlacements: filteredSegments.filter(m => m.is_suggested_placement).length,
        }
      } finally {
        if (tempDir) {
          try {
            await fs.rm(tempDir, { recursive: true, force: true })
          } catch (cleanupError) {
            console.error('Failed to cleanup temp directory:', cleanupError)
          }
        }
      }
    },
    {
      connection: {
        url: process.env.REDIS_URL!,
      },
      concurrency: 2, // Process 2 audio files at a time
    }
  )

  worker.on('completed', (job, result) => {
    console.log(`Silence detection job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`Silence detection job ${job?.id} failed:`, err)
  })

  console.log('Silence detection worker started')

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await worker.close()
  })
}

/**
 * Parse ffmpeg silence_detect output
 *
 * Input format:
 * [silencedetect @ 0x7f8b1c000000] silence_start: 1.234
 * [silencedetect @ 0x7f8b1c000000] silence_end: 2.456 | silence_duration: 1.222
 */
function parseFfmpegSilenceOutput(output: string): SilenceSegment[] {
  const segments: SilenceSegment[] = []
  const lines = output.split('\n')

  let currentStart: number | null = null

  for (const line of lines) {
    const silenceStartMatch = line.match(/silence_start:\s+(\d+\.?\d*)/)
    const silenceEndMatch = line.match(/silence_end:\s+(\d+\.?\d*)\s*\|\s*silence_duration:\s+(\d+\.?\d*)/)

    if (silenceStartMatch) {
      currentStart = parseFloat(silenceStartMatch[1])
    } else if (silenceEndMatch && currentStart !== null) {
      const end = parseFloat(silenceEndMatch[1])
      const duration = parseFloat(silenceEndMatch[2])

      segments.push({
        start: currentStart,
        end,
        duration,
      })

      currentStart = null
    }
  }

  return segments
}

// Run worker if this file is executed directly
if (require.main === module) {
  runSilenceDetectionWorker().catch(console.error)
}
