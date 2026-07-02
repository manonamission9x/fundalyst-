/**
 * Fundalyst — BullMQ queue infrastructure
 *
 * Configures IORedis connection + BullMQ queue/worker factories.
 *
 * Valkey is the local queue backend (Redis-compatible, started via
 * `docker compose up -d`). In production, use any Redis-compatible
 * service.
 *
 * Usage:
 *   import { documentQueue, connection } from "@/lib/queue";
 *   await documentQueue.add("process-ocr", { documentId, ... });
 *
 * Workers live in src/workers/ and use the same connection:
 *   import { Worker } from "bullmq";
 *   import { connection } from "@/lib/queue";
 *   new Worker("document", handler, { connection });
 */

import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { env, isProductionBuild, requireEnv } from "@/lib/env";

const buildTimeRedisUrl = "redis://localhost:6379";

/**
 * IORedis connection — shared by all queues and workers.
 * BullMQ v5 bundles its own ioredis peer types, so we maintain
 * the raw IORedis instance for operations like quit() and pass
 * a connection-typed reference to BullMQ constructors.
 */
const redisUrl = env.REDIS_URL || (isProductionBuild ? buildTimeRedisUrl : requireEnv("REDIS_URL"));
const rawRedis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  offlineQueue: false,
  lazyConnect: true,
});

/** Type-safe reference for BullMQ — runtime is the same IORedis instance. */
export const connection = rawRedis as import("bullmq").ConnectionOptions;

/** The raw IORedis instance for shutdown/management. */
export const redis = rawRedis;

// Graceful shutdown helper
export async function closeQueueConnection(): Promise<void> {
  await rawRedis.quit();
}

// ──────────────────────────────────────────────
// Queue definitions
// ──────────────────────────────────────────────

/**
 * Document processing queue — OCR, text extraction, table extraction.
 * Workers: src/workers/document.worker.ts
 */
export const documentQueue = new Queue("document", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // keep completed jobs for 7 days
      count: 1000,
    },
    removeOnFail: {
      age: 14 * 24 * 3600, // keep failed jobs for 14 days
    },
  },
});

export const documentQueueEvents = new QueueEvents("document", {
  connection,
});

/**
 * AI analysis queue — LLM-based financial analysis, summarization.
 * Workers: src/workers/analysis.worker.ts (Phase 2+)
 */
export const analysisQueue = new Queue("analysis", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 500,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,
    },
  },
});

/**
 * Audit / cleanup queue — periodic maintenance, data retention.
 * Workers: src/workers/maintenance.worker.ts (Phase 2+)
 */
export const maintenanceQueue = new Queue("maintenance", {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      age: 3 * 24 * 3600,
    },
  },
});
