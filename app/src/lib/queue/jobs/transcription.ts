/**
 * Transcription job processor
 * Handles audio transcription using Groq Whisper API
 */

import { Job } from 'bullmq';
import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';
import type { TranscriptionJobData, TranscriptionJobResult } from '../types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Download audio from URL and convert to File
 */
async function downloadAudioFile(audioUrl: string): Promise<File> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  return new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
}

/**
 * Transcribe audio using Groq Whisper API
 */
async function transcribeAudio(audioFile: File): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3',
    response_format: 'text',
  });

  return transcription.text;
}

/**
 * Process a transcription job
 *
 * Handles the full transcription workflow:
 * 1. Downloads audio from R2
 * 2. Transcribes using Groq Whisper
 * 3. Saves transcript to database
 * 4. Updates episode status
 */
export async function processTranscriptionJob(
  job: Job<TranscriptionJobData>
): Promise<TranscriptionJobResult> {
  const { episodeId, audioUrl, title } = job.data;

  job.updateProgress(10);

  const supabase = await createClient();

  try {
    // Validate input
    if (!audioUrl) {
      throw new Error('Episode has no audio URL to transcribe');
    }

    job.updateProgress(20);

    // Update status to processing
    await supabase
      .from('episodes')
      .update({ transcript_status: 'processing' })
      .eq('id', episodeId);

    // Download audio file
    job.log(`Downloading audio for: ${title}`);
    const audioFile = await downloadAudioFile(audioUrl);

    job.updateProgress(40);

    // Transcribe audio
    job.log(`Starting transcription for: ${title}`);
    const transcript = await transcribeAudio(audioFile);

    job.updateProgress(90);

    // Save transcript to database
    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        transcript,
        transcript_status: 'completed',
      })
      .eq('id', episodeId);

    if (updateError) {
      throw new Error(`Failed to save transcript: ${updateError.message}`);
    }

    job.updateProgress(100);
    job.log(`Transcription completed for: ${title}`);

    return {
      episodeId,
      transcript,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    job.log(`Transcription failed: ${errorMessage}`);

    // Reset episode status on failure
    await supabase
      .from('episodes')
      .update({ transcript_status: 'pending' })
      .eq('id', episodeId);

    throw error;
  }
}
