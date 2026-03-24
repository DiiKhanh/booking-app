import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments.
  // Copies only the necessary files so the container image is minimal.
  output: "standalone",
};

export default nextConfig;
