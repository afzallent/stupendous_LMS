import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  eslint: {
    // 构建时忽略ESLint错误
    ignoreDuringBuilds: true,
  },
  // Enable proper static file serving
  // Remove the webpack configuration that was disabling hot reloading
  // This will allow Next.js to properly serve static assets
};

export default nextConfig;