/**
 * Transcription job processor
 * Handles audio transcription using Groq Whisper API
 */

import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import type { TranscriptionJobData, TranscriptionJobResult } from '../types';

/** Service-role client for direct DB writes, bypassing RLS. */
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable for Supabase client in transcription worker'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable for Supabase client in transcription worker'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Download audio from URL and convert to File.
 * Preserves the filename and content-type from the response so Groq
 * receives the correct format metadata.
 */
async function downloadAudioFile(audioUrl: string): Promise<File> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  const filename = new URL(audioUrl).pathname.split('/').pop() || 'audio';
  const contentType = response.headers.get('content-type') || audioBlob.type || 'audio/mpeg';
  return new File([audioBlob], filename, { type: contentType });
}

/**
 * Transcribe audio using Groq Whisper API
 */
async function transcribeAudio(audioFile: File): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3',
    response_format: 'json',
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
  data: TranscriptionJobData
): Promise<TranscriptionJobResult> {
  const { episodeId, audioUrl, title } = data;

  const supabase = getSupabase();

  try {
    // Validate input
    if (!audioUrl) {
      throw new Error('Episode has no audio URL to transcribe');
    }

    // Update status to processing
    await supabase
      .from('episodes')
      .update({ transcript_status: 'processing' })
      .eq('id', episodeId);

    // Download audio file
    console.log(`[transcription] Downloading audio for: ${title}`);
    const audioFile = await downloadAudioFile(audioUrl);

    // Transcribe audio
    console.log(`[transcription] Starting transcription for: ${title}`);
    const transcript = await transcribeAudio(audioFile);

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

    console.log(`[transcription] Completed for: ${title}`);

    return {
      episodeId,
      transcript,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[transcription] Failed for ${title}: ${errorMessage}`);

    // Reset episode status on failure
    await supabase
      .from('episodes')
      .update({ transcript_status: 'pending' })
      .eq('id', episodeId);

    throw error;
  }
}
