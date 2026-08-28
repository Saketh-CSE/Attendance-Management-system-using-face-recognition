import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "https://attendance-management-system-using-face-8xyl.onrender.com/:path*",
      },
    ];
  },
};

export default nextConfig;