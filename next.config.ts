import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Allow larger file uploads for PDF sources (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // V8.0: Enable instrumentation for migration status check on startup
    instrumentationHook: true,
  },
};

export default nextConfig;
