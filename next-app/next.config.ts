import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_MODE === 'export' && { output: 'export' }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
