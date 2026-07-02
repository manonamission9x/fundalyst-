/**
 * Example job definition — smoke test for BullMQ + Valkey integration.
 *
 * Add an example job:
 *   import { exampleQueue } from "@/lib/queue";
 *   await exampleQueue.add("smoke-test", { message: "Hello from Fundalyst!" });
 *
 * The example worker (src/workers/example.worker.ts) processes it.
 * Verify with:
 *   curl http://localhost:3000/api/queue/example
 */

import type { ExampleJobPayload } from "@/jobs";
import { Queue } from "bullmq";
import { connection } from "@/lib/queue";

export const exampleQueue = new Queue("example", {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 3600, // keep for 1 hour
      count: 10,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
  },
});

/**
 * Add an example job. Returns the job ID for polling.
 */
export async function addExampleJob(
  message: string,
  delayMs = 0
): Promise<string> {
  const job = await exampleQueue.add(
    "smoke-test",
    { message, delay: delayMs } satisfies ExampleJobPayload,
    { delay: delayMs }
  );
  return job.id ?? "unknown";
}
