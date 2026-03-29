/**
 * Types for the transcription job
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
