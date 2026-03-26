/**
 * Configure CORS on the R2 episodes bucket.
 *
 * Run once (or whenever the allowed-origins list changes):
 *   bun run setup:cors
 *
 * Required env vars (same as app — loaded from .env.local):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_EPISODES_BUCKET
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

// Load .env.local from the app root
config({ path: resolve(import.meta.dir, '../.env.local') });

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const accountId  = getRequiredEnv('R2_ACCOUNT_ID');
const bucketName = getRequiredEnv('R2_EPISODES_BUCKET');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

// Allow PUT requests from any origin (presigned URLs are already scoped by signature)
const corsRules = [
  {
    AllowedOrigins: ['*'],
    AllowedMethods: ['PUT'],
    AllowedHeaders: ['Content-Type', 'Content-Length'],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  console.log(`Configuring CORS on bucket: ${bucketName}`);

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: { CORSRules: corsRules },
    })
  );

  // Verify
  const { CORSRules } = await client.send(
    new GetBucketCorsCommand({ Bucket: bucketName })
  );

  console.log('CORS rules applied:');
  console.log(JSON.stringify(CORSRules, null, 2));
  console.log('\n✓ Done. Browser uploads should now work.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
