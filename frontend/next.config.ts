import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  // Note: eslint configuration is no longer supported in Next.js 16
  // Use .eslintrc.json or eslint.config.js instead
  
  // Enable proper static file serving
  // Remove the webpack configuration that was disabling hot reloading
  // This will allow Next.js to properly serve static assets
};

export default nextConfig;