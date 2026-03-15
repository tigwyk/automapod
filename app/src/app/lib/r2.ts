import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Validate environment variables
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn('R2 credentials not configured. File upload will fail.');
}

// Create R2 client (S3-compatible)
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

// Bucket names
export const R2_EPISODES_BUCKET = process.env.R2_EPISODES_BUCKET || 'automapod-episodes';
export const R2_IMAGES_BUCKET = process.env.R2_IMAGES_BUCKET || 'automapod-images';

// Public URLs
export const getEpisodePublicUrl = (key: string) => {
  const customDomain = process.env.R2_EPISODES_CUSTOM_DOMAIN;
  if (customDomain) {
    return `${customDomain}/${key}`;
  }
  const publicUrl = process.env.R2_EPISODES_PUBLIC_URL;
  return `${publicUrl}/${key}`;
};

export const getImagePublicUrl = (key: string) => {
  const customDomain = process.env.R2_IMAGES_CUSTOM_DOMAIN;
  if (customDomain) {
    return `${customDomain}/${key}`;
  }
  const publicUrl = process.env.R2_IMAGES_PUBLIC_URL;
  return `${publicUrl}/${key}`;
};

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  bucket: string,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return public URL
  if (bucket === R2_EPISODES_BUCKET) {
    return getEpisodePublicUrl(key);
  } else if (bucket === R2_IMAGES_BUCKET) {
    return getImagePublicUrl(key);
  }
  throw new Error(`Unknown bucket: ${bucket}`);
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(
  bucket: string,
  key: string
): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Generate a unique key for an episode file
 * Format: {rss-slug}/{episode-id}.{ext}
 */
export function generateEpisodeKey(
  rssSlug: string,
  episodeId: string,
  filename: string
): string {
  const ext = filename.split('.').pop() || 'mp3';
  return `${rssSlug}/${episodeId}.${ext}`;
}

/**
 * Generate a unique key for a cover image
 * Format: covers/{podcast-id}.jpg
 */
export function generateCoverKey(podcastId: string): string {
  return `covers/${podcastId}.jpg`;
}
