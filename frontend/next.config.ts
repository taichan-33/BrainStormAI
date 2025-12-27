import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyTimeout: 120000, // 2 minutes timeout for proxied requests
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.BACKEND_URL || "http://backend:8000"
        }/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
