import type { NextConfig } from "next";
import pino from "pino";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.vecteezy.com",
      },
    ],
  },
};

export default nextConfig;
