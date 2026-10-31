import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Small self-contained build for the Docker image (see Dockerfile). Vercel builds its own way.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
