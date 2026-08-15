import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type errors must fail the build. This was suppressed, which let type
  // errors ship to production silently across a 24k-line TypeScript
  // codebase. See PRODUCTION_READINESS.md (P1-10).
  //
  // Note: Next 16 removed the `eslint` key from next.config; linting is run
  // separately via `pnpm lint` (wire it into CI alongside the build).
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  
  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lms.5stars.dev',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  
  // Enable compression
  compress: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Power by header removal for security
  poweredByHeader: false,
};

export default nextConfig;