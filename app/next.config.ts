import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Safety net for any Server Actions that accept small payloads (forms with text only).
    // Audio uploads bypass this entirely via presigned R2 URLs — see /api/r2/presign.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
