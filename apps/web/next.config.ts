import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ims/shared"],
  basePath,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
