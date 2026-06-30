import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Commented out to allow `next start`
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.0.247'],
};

export default nextConfig;
