import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for large ZIP uploads (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
