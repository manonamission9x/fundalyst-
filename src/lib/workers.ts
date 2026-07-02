/**
 * Worker lifecycle management
 *
 * Starts BullMQ workers alongside the Next.js server during development.
 * In production, workers run in separate processes (e.g., via PM2 or Docker).
 *
 * Called from src/instrumentation.ts at server startup.
 */

import type { Worker } from "bullmq";
import { nodeEnv } from "@/lib/env";

const activeWorkers: Worker[] = [];

/**
 * Register a worker for lifecycle management.
 * Called by worker modules themselves.
 */
export function registerWorker(worker: Worker): void {
  activeWorkers.push(worker);
  console.log(`[workers] Registered: ${worker.name}`);
}

/**
 * Start all development workers.
 * Called once at server startup from instrumentation.ts.
 */
export async function startWorkers(): Promise<void> {
  if (nodeEnv === "production") {
    console.log(
      "[workers] Skipping in-process workers in production — " +
        "run workers separately via src/workers/start.ts"
    );
    return;
  }

  // Lazy-load workers only when starting (avoids circular deps at import time)
  const { startExampleWorker } = await import("@/workers/example.worker");
  const w = startExampleWorker();
  registerWorker(w);

  console.log("[workers] Development workers started");
}

/**
 * Graceful shutdown — close all workers.
 */
export async function stopWorkers(): Promise<void> {
  await Promise.all(
    activeWorkers.map((w) => w.close(true))
  );
  activeWorkers.length = 0;
  console.log("[workers] All workers stopped");
}
