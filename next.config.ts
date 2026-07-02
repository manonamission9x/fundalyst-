import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma requires Node.js runtime — disables the default Edge where possible
  // Server actions and API routes with Prisma need the Node.js runtime

  // Server-only packages that should not be bundled into the client
  serverExternalPackages: [
    "@prisma/client",
    "better-auth",
    "bullmq",
    "ioredis",
  ],

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Allow large document uploads
    },
  },
};

export default nextConfig;
