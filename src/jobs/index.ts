/**
 * Fundalyst — Job type definitions
 *
 * Each queue+job pair defines its payload type here.
 * Workers use these types for type-safe job handling.
 */

import type { Job } from "bullmq";

// ──────────────────────────────────────────────
// Document queue jobs
// ──────────────────────────────────────────────

export interface DocumentOcrJobPayload {
  documentId: string;
  extractionJobId: string;
  filePath?: string; // Path to the uploaded file (if local)
  storageKey?: string; // Object storage key (if remote)
}

export type DocumentOcrJob = Job<DocumentOcrJobPayload>;

export interface DocumentTextExtractionJobPayload {
  documentId: string;
  extractionJobId: string;
}

export type DocumentTextExtractionJob = Job<DocumentTextExtractionJobPayload>;

// ──────────────────────────────────────────────
// Analysis queue jobs (Phase 2+)
// ──────────────────────────────────────────────

export interface AiAnalysisJobPayload {
  workspaceId: string;
  documentId?: string;
  promptType: "summarize" | "extract" | "analyze";
  parameters?: Record<string, unknown>;
}

export type AiAnalysisJob = Job<AiAnalysisJobPayload>;

// ──────────────────────────────────────────────
// Example / smoke-test job
// ──────────────────────────────────────────────

export interface ExampleJobPayload {
  message: string;
  delay?: number; // Simulate work duration in ms
}

export type ExampleJob = Job<ExampleJobPayload>;
