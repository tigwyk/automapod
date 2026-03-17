/**
 * Cloudflare R2 Storage Utilities
 *
 * R2 is S3-compatible, so we use the AWS SDK v3.
 * This module handles audio file uploads for podcast episodes.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Environment variables with validation
const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

// R2 Configuration
export const R2_CONFIG = {
  accountId: getRequiredEnv('R2_ACCOUNT_ID'),
  accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
  secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
  bucketName: getRequiredEnv('R2_EPISODES_BUCKET'),
  publicUrl: getRequiredEnv('R2_EPISODES_CUSTOM_DOMAIN'),
} as const;

// R2 Client (singleton)
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
    });
  }
  return r2Client;
}

/**
 * Generate a unique storage key for an episode file
 * Pattern: episodes/{year}/{month}/{episodeId}/{filename}
 *
 * @param episodeId - The UUID of the episode
 * @param filename - The original filename
 * @returns The R2 storage key
 */
export function generateEpisodeKey(episodeId: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Sanitize filename: remove special characters, keep extension
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return `episodes/${year}/${month}/${episodeId}/${sanitized}`;
}

/**
 * Upload a file to R2
 *
 * @param file - The file to upload (File, Buffer, or Uint8Array)
 * @param episodeId - The episode UUID
 * @param filename - The original filename
 * @returns The public URL of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadToR2(
  file: File | Buffer | Uint8Array,
  episodeId: string,
  filename: string
): Promise<string> {
  const key = generateEpisodeKey(episodeId, filename);

  // Determine content type
  let contentType = 'audio/mpeg'; // Default to MP3
  if (file instanceof File) {
    contentType = file.type || contentType;
  }

  // Convert File to Buffer if needed
  let body: Buffer | Uint8Array;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = new Uint8Array(arrayBuffer);
  } else {
    body = file;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await getR2Client().send(command);

    // Return public URL
    return `${R2_CONFIG.publicUrl}/${key}`;
  } catch (error) {
    console.error('R2 upload failed:', error);
    throw new Error(
      `Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a file from R2
 *
 * @param key - The R2 storage key
 * @throws Error if deletion fails
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
    });

    await getR2Client().send(command);
  } catch (error) {
    console.error('R2 deletion failed:', error);
    throw new Error(
      `Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate file type (audio only)
 *
 * @param file - The file to validate
 * @returns True if valid audio file
 */
export function isValidAudioFile(file: File): boolean {
  const validTypes = [
    'audio/mpeg',        // MP3
    'audio/mp3',         // MP3 (alternative)
    'audio/mp4',         // M4A
    'audio/x-m4a',       // M4A (alternative)
    'audio/wav',         // WAV
    'audio/wave',        // WAV (alternative)
    'audio/x-wav',       // WAV (alternative)
    'audio/ogg',         // OGG
    'audio/webm',        // WebM Audio
    'audio/flac',        // FLAC
  ];

  return validTypes.includes(file.type);
}

/**
 * Validate file size (max 500MB)
 *
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in megabytes (default: 500)
 * @returns True if file size is within limit
 */
export function isValidFileSize(file: File, maxSizeMB: number = 500): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

// Re-export constants for backward compatibility
export const R2_EPISODES_BUCKET = R2_CONFIG.bucketName;
export const R2_EPISODES_CUSTOM_DOMAIN = R2_CONFIG.publicUrl;
