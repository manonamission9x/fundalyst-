/**
 * Example worker — smoke test for BullMQ + Valkey integration.
 *
 * This worker verifies that the queue infrastructure is functional:
 *   - BullMQ connects to Valkey
 *   - Jobs are dispatched and processed
 *   - Workers can access the database (Prisma)
 *
 * Process a job:
 *   curl -X POST http://localhost:3000/api/queue/example
 *
 * This triggers addExampleJob() → worker receives → logs → completes.
 */

import { Worker } from "bullmq";
import { connection } from "@/lib/queue";
import type { ExampleJobPayload } from "@/jobs";

/**
 * Start the example worker. Call during app initialization
 * (e.g., from instrumentation.ts or a dedicated startup module).
 *
 * In production, workers run in separate processes (not in Next.js).
 * For local dev, we start them alongside the Next.js server.
 */
export function startExampleWorker(): Worker {
  const worker = new Worker<ExampleJobPayload>(
    "example",
    async (job) => {
      const { message, delay } = job.data;

      console.log(`[example-worker] Processing job ${job.id}: ${message}`);

      if (delay && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      console.log(`[example-worker] Job ${job.id} completed successfully`);
      return { processed: true, message, timestamp: new Date().toISOString() };
    },
    {
      connection,
      concurrency: 1,
      lockDuration: 30000,
    }
  );

  worker.on("completed", (job) => {
    if (job) {
      console.log(`[example-worker] ✅ Job ${job.id} completed`);
    }
  });

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(`[example-worker] ❌ Job ${job.id} failed:`, err.message);
    }
  });

  worker.on("error", (err) => {
    console.error("[example-worker] Worker error:", err.message);
  });

  return worker;
}
