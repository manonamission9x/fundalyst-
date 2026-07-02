/**
 * Example queue endpoint — smoke test for BullMQ + Valkey
 *
 * GET  /api/queue/example     — returns queue status
 * POST /api/queue/example     — enqueues a test job
 *
 * Verify the queue pipeline:
 *   curl http://localhost:3000/api/queue/example
 *   curl -X POST http://localhost:3000/api/queue/example \
 *     -H "Content-Type: application/json" \
 *     -d '{"message":"Hello Fundalyst!"}'
 */

import { apiOk, apiError } from "@/server/api/response";
import { exampleQueue, addExampleJob } from "@/jobs/example";
import { z } from "zod";

export const runtime = "nodejs";

const exampleJobRequestSchema = z.object({
  message: z.string().min(1).max(500).optional(),
  delay: z.number().int().min(0).max(60_000).optional(),
});

export async function GET() {
  try {
    const jobs = await exampleQueue.getJobCounts();
    return apiOk({
      queue: "example",
      status: "connected",
      counts: jobs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError("INTERNAL_ERROR", `Queue connection failed: ${message}`);
  }
}

export async function POST(request: Request) {
  try {
    const body = exampleJobRequestSchema.parse(await request.json());
    const message = body.message ?? "Hello from Fundalyst!";
    const delayMs = body.delay ?? 0;

    const jobId = await addExampleJob(message, delayMs);

    return apiOk(
      { jobId, message, delayed: delayMs > 0 ? `${delayMs}ms` : false },
      { status: 202 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError("BAD_REQUEST", "Invalid queue payload");
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError("INTERNAL_ERROR", `Failed to enqueue job: ${message}`);
  }
}
