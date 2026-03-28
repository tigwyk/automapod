/**
 * Cloudflare R2 Storage Utilities
 *
 * R2 is S3-compatible, so we use the AWS SDK v3.
 * This module handles audio file uploads for podcast episodes.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Environment variables with validation
const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

// R2 Configuration (lazy-loaded to avoid build-time errors)
function getR2Config() {
  return {
    accountId: getRequiredEnv('R2_ACCOUNT_ID'),
    accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
    bucketName: getRequiredEnv('R2_EPISODES_BUCKET'),
    publicUrl: getRequiredEnv('R2_EPISODES_CUSTOM_DOMAIN'),
  } as const;
}

// R2 Client (singleton)
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const config = getR2Config();
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // AWS SDK v3 adds CRC32 checksums by default (WHEN_SUPPORTED).
      // R2 does not support these and they break presigned PUT URLs,
      // so we restrict checksums to only when strictly required.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
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
    const config = getR2Config();
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await getR2Client().send(command);

    // Return public URL
    return `${config.publicUrl}/${key}`;
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
    const config = getR2Config();
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
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
    'application/ogg',   // OGG (generic container, common browser/OS report)
    'video/ogg',         // OGG (container MIME, some systems use for audio-only OGG)
    'audio/x-ogg',       // OGG (alternative)
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

/**
 * Generate a presigned PUT URL for direct-to-R2 browser uploads.
 * The URL is valid for 15 minutes.
 *
 * @param key    - The R2 storage key (from generateEpisodeKey)
 * @param contentType - MIME type of the file being uploaded
 * @returns A presigned URL the client can PUT to directly
 */
export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const config = getR2Config();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: 900 });
}

// Re-export constants for backward compatibility (lazy-loaded)
export function getR2EpisodesBucket(): string {
  return getR2Config().bucketName;
}

export function getR2EpisodesCustomDomain(): string {
  return getR2Config().publicUrl;
}
