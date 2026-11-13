import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone for the Docker image.
  output: "standalone",
};

export default nextConfig;
