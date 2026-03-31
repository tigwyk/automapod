import { Worker, Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const execFileAsync = promisify(execFile)

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const R2_BUCKET = process.env.R2_BUCKET_NAME!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

interface AdInjectionJobData {
  episodeId: string
  placementIds?: string[]
}

interface PlacementWithCreative {
  id: string
  position_ms: number
  status: string
  ad_creatives: {
    id: string
    audio_url: string
    duration_seconds: number
  }
}

/**
 * Ad Injection Worker
 *
 * Generates ad-enhanced audio by concatenating episode audio with ad placements.
 * Uses ffmpeg to join audio segments at specified positions.
 */
export async function runAdInjectionWorker() {
  const worker = new Worker(
    'ad-injection',
    async (job: Job<AdInjectionJobData>) => {
      const { episodeId, placementIds } = job.data

      job.updateProgress(10)

      try {
        // Fetch episode details
        const { data: episode, error: episodeError } = await supabase
          .from('episodes')
          .select('id, title, audio_url, duration_seconds')
          .eq('id', episodeId)
          .single()

        if (episodeError || !episode) {
          throw new Error(`Episode not found: ${episodeId}`)
        }

        job.updateProgress(20)

        // Fetch placements
        let placementsQuery = supabase
          .from('ad_placements')
          .select(`
            id,
            position_ms,
            status,
            ad_creatives(
              id,
              audio_url,
              duration_seconds
            )
          `)
          .eq('episode_id', episodeId)
          .eq('status', 'placed')
          .order('position_ms', { ascending: true })

        if (placementIds && placementIds.length > 0) {
          placementsQuery = placementsQuery.in('id', placementIds)
        }

        const { data: placements, error: placementsError } = await placementsQuery

        if (placementsError) {
          throw new Error(`Failed to fetch placements: ${placementsError.message}`)
        }

        if (!placements || placements.length === 0) {
          return {
            success: true,
            episodeId,
            message: 'No placements to inject',
            adsInjected: 0,
          }
        }

        job.updateProgress(30)

        // Create temp directory
        let tempDir: string | undefined
        try {
          tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ad-inject-'))
          const episodePath = path.join(tempDir, 'episode.mp3')
          const adDir = path.join(tempDir, 'ads')
          await fs.mkdir(adDir)
          const concatFilePath = path.join(tempDir, 'concat.txt')
          const outputPath = path.join(tempDir, 'output.mp3')

          // Download episode audio
          const episodeResponse = await fetch(episode.audio_url)
          if (!episodeResponse.ok) {
            throw new Error(`Failed to download episode audio: ${episodeResponse.statusText}`)
          }
          const episodeBuffer = await episodeResponse.arrayBuffer()
          await fs.writeFile(episodePath, Buffer.from(episodeBuffer))

          job.updateProgress(40)

          // Download all ad creatives
          const adPaths: Map<string, string> = new Map()
          for (const placement of placements as unknown as PlacementWithCreative[]) {
            const adPath = path.join(adDir, `ad-${placement.ad_creatives.id}.mp3`)
            const adResponse = await fetch(placement.ad_creatives.audio_url)
            if (!adResponse.ok) {
              throw new Error(`Failed to download ad: ${adResponse.statusText}`)
            }
            const adBuffer = await adResponse.arrayBuffer()
            await fs.writeFile(adPath, Buffer.from(adBuffer))
            adPaths.set(placement.ad_creatives.id, adPath)
          }

          job.updateProgress(50)

          // Generate ffmpeg concat script
          // We need to split the episode at each ad position and insert ads
          await generateConcatScript(
            episodePath,
            tempDir,
            concatFilePath,
            placements as unknown as PlacementWithCreative[],
            adPaths
          )

          job.updateProgress(70)

          // Run ffmpeg concatenation
          await execFileAsync('ffmpeg', [
            '-f', 'concat',
            '-safe', '0',
            '-i', concatFilePath,
            '-c', 'copy',
            outputPath,
          ])

          job.updateProgress(80)

          // Upload to R2
          const outputBuffer = await fs.readFile(outputPath)
          const enhancedKey = `episodes/${episodeId}/enhanced-${Date.now()}.mp3`
          const r2Key = `podcasts/${enhancedKey}`

          await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: outputBuffer,
            ContentType: 'audio/mpeg',
          }))

          const enhancedUrl = `${R2_PUBLIC_URL}/${r2Key}`

          job.updateProgress(90)

          // Update episode with enhanced audio URL
          await supabase
            .from('episodes')
            .update({ ad_enhanced_audio_url: enhancedUrl })
            .eq('id', episodeId)

          job.updateProgress(100)

          return {
            success: true,
            episodeId,
            audioUrl: enhancedUrl,
            adsInjected: placements.length,
            processingTimeMs: Date.now() - job.timestamp,
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
      } catch (error) {
        console.error('Error in ad injection job:', error)
        throw error
      }
    },
    {
      connection: {
        url: process.env.REDIS_URL!,
      },
      concurrency: 1, // Audio processing is CPU-intensive
    }
  )

  worker.on('completed', (job, result) => {
    console.log(`Ad injection job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`Ad injection job ${job?.id} failed:`, err)
  })

  console.log('Ad injection worker started')

  process.on('SIGTERM', async () => {
    await worker.close()
  })
}

/**
 * Generate ffmpeg concat script
 *
 * Splits episode at ad positions into real temp segments and creates concat file.
 * Format: file '/path/to/file.mp3'
 */
async function generateConcatScript(
  episodePath: string,
  tempDir: string,
  concatFilePath: string,
  placements: PlacementWithCreative[],
  adPaths: Map<string, string>
): Promise<void> {
  // Get episode duration using ffprobe
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    episodePath,
  ])
  const episodeDurationSec = parseFloat(stdout.trim())

  const concatLines: string[] = []
  let currentPositionSec = 0
  let segmentIndex = 0

  for (const placement of placements) {
    const positionSec = placement.position_ms / 1000
    const adPath = adPaths.get(placement.ad_creatives.id)

    if (!adPath) {
      console.warn(`Ad path not found for creative ${placement.ad_creatives.id}`)
      continue
    }

    // Add episode segment before this ad, if there is a gap
    if (positionSec > currentPositionSec) {
      const segmentPath = path.join(tempDir, `episode_segment_${segmentIndex++}.mp3`)
      const start = currentPositionSec.toFixed(3)
      const duration = (positionSec - currentPositionSec).toFixed(3)

      await execFileAsync('ffmpeg', [
        '-y',
        '-ss', start,
        '-t', duration,
        '-i', episodePath,
        '-c', 'copy',
        segmentPath,
      ])

      concatLines.push(`file '${segmentPath}'`)
    }

    // Add ad file
    concatLines.push(`file '${adPath}'`)

    currentPositionSec = positionSec
  }

  // Add remaining episode segment after the last ad
  if (currentPositionSec < episodeDurationSec) {
    const finalSegmentPath = path.join(tempDir, `episode_segment_${segmentIndex++}.mp3`)
    const start = currentPositionSec.toFixed(3)
    const duration = (episodeDurationSec - currentPositionSec).toFixed(3)

    await execFileAsync('ffmpeg', [
      '-y',
      '-ss', start,
      '-t', duration,
      '-i', episodePath,
      '-c', 'copy',
      finalSegmentPath,
    ])

    concatLines.push(`file '${finalSegmentPath}'`)
  }

  // Write concat file in ffmpeg concat demuxer format
  await fs.writeFile(concatFilePath, concatLines.join('\n'))
}

// Run worker if this file is executed directly
if (require.main === module) {
  runAdInjectionWorker().catch(console.error)
}
