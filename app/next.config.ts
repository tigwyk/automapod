import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Explicitly set the app directory
  experimental: {
    // Use src directory for app router
  },
};

export default nextConfig;
