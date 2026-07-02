/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * Responsibilities:
 *   1. Validate environment variables (imports env.ts which parses process.env).
 *   2. Start BullMQ workers for local development.
 *
 * This file is registered in next.config.ts via the `instrumentationHook` flag.
 * Next.js calls the exported `register()` function once during server init.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { startWorkers } from "@/lib/workers";

export async function register() {
  // 1. Environment validation — importing @/lib/env validates and parses
  //    process.env against the Zod schema. Throws on invalid values.
  const { env } = await import("@/lib/env");

  if (env.NODE_ENV === "development") {
    console.log(
      `[instrumentation] Fundalyst starting in ${env.NODE_ENV} mode`
    );
  }

  // 2. Start BullMQ workers (only in development; production uses standalone processes)
  try {
    await startWorkers();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[instrumentation] Workers failed to start (non-fatal): ${message}`
    );
  }
}
