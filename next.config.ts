import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Small self-contained build for the Docker image (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
