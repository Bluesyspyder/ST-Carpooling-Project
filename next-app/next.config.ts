import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_MODE === 'export' && { 
    output: 'export',
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true }
  }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
