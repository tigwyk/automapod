/**
 * Types for the transcription job queue
 */

export interface TranscriptionJobData {
  episodeId: string;
  userId: string;
  audioUrl: string;
  title: string;
}

export interface TranscriptionJobResult {
  episodeId: string;
  transcript: string;
  duration?: number;
}

export interface TranscriptionJobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  delay?: number;
}

export const TRANSCRIPTION_QUEUE_NAME = 'transcription';
