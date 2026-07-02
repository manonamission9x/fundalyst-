/**
 * Prisma client singleton
 *
 * Fundalyst — the single PrismaClient instance.
 * Uses the global-for-dev pattern to survive hot-reloads without
 * exhausting database connections during development.
 *
 * Import this, never `new PrismaClient()` directly.
 *
 * Usage:
 *   import { prisma } from "@/lib/db";
 *   const users = await prisma.user.findMany();
 *
 * Note: Prisma 7's Rust generator outputs to generated/prisma/.
 * The @gen/* alias in tsconfig resolves it.
 */

import { PrismaClient } from "@gen/prisma/client";
import { nodeEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

const prismaOptions = {
  log:
    nodeEnv === "development"
      ? (["query", "error", "warn"] as const)
      : (["error"] as const),
} satisfies ConstructorParameters<typeof PrismaClient>[0];

export const prisma =
  globalForPrisma.__prisma ?? new PrismaClient(prismaOptions);

if (nodeEnv !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
