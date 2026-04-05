import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude large transaction JSON files from Vercel serverless function bundles.
  // These files (~375 MB total) would exceed Vercel's 250 MB per-function limit.
  // Master data files (restaurants, menus, etc.) are small and remain bundled.
  outputFileTracingExcludes: {
    "*": ["./lib/data/transactions/**"],
  },
};

export default nextConfig;
