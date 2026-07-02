/**
 * Better Auth — Fundalyst authentication configuration
 *
 * Single-source-of-truth for auth config. Import `auth` from here,
 * never instantiate `better-auth` directly.
 *
 * See: https://www.better-auth.com/docs
 *
 * Usage (server-side only):
 *   import { auth } from "@/lib/auth";
 *   const session = await auth.api.getSession({ headers });
 *
 * Next.js route handler:
 *   import { auth } from "@/lib/auth";
 *   export const GET = auth.handler;
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { env, isProductionBuild, requireEnv } from "@/lib/env";

const buildTimeAuthSecret = "bld_4f9bc4a7417e4fd4b56460dbb5a1e9959d34e2c2a8e44f7d9e830dc79e0b7b0a";
const buildTimeAuthUrl = "http://localhost:3000";

export const auth = betterAuth({
  appName: "Fundalyst",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  /** Environment config — validated once by env.ts */
  secret: env.BETTER_AUTH_SECRET || (isProductionBuild ? buildTimeAuthSecret : requireEnv("BETTER_AUTH_SECRET")),
  baseURL: env.BETTER_AUTH_URL || (isProductionBuild ? buildTimeAuthUrl : requireEnv("BETTER_AUTH_URL")),
});

/**
 * Type helper for request handlers that need the current session.
 * Call from route handlers after auth middleware has run.
 */
export type AuthSession = {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};
