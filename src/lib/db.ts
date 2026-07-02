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
import { PrismaPg } from "@prisma/adapter-pg";
import { env, isProductionBuild, nodeEnv, requireEnv } from "@/lib/env";

const buildTimeDatabaseUrl = "postgresql://fundalyst:fundalyst_dev@localhost:5432/fundalyst";

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL || (isProductionBuild ? buildTimeDatabaseUrl : requireEnv("DATABASE_URL")),
});

export const prisma = globalForPrisma.__prisma ?? new PrismaClient({ adapter });

if (nodeEnv !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
