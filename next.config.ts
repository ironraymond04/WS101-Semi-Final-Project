import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: { 
    serverActions: { 
      allowedOrigins: [
        "localhost:3000",
        "fearsome-spell-77w67g7j9rxpfx99-3000.app.github.dev",
      ], 
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
