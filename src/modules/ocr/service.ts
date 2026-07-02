/**
 * OCR module — document OCR/text-extraction orchestration.
 *
 * Phase 1: placeholder — queues document for OCR processing.
 * Phase 2+: actual OCR provider integration (Mistral, Tesseract, etc.).
 *
 * Flow:
 *   1. Document is uploaded → Document record created (status: "uploaded")
 *   2. This module creates an ExtractionJob + enqueues to BullMQ
 *   3. Worker picks up the job, processes OCR, writes results
 *   4. FinancialStatement record created with extracted data
 */

import { createExtractionJob, updateExtractionJobStatus } from "@/services/prisma";
import { documentQueue } from "@/lib/queue";
import type { DocumentOcrJobPayload } from "@/jobs";

export async function enqueueOcrJob(documentId: string) {
  // Create extraction job record (Prisma relation uses connect, not scalar)
  const job = await createExtractionJob({
    document: { connect: { id: documentId } },
    type: "ocr",
    status: "queued",
  });

  // Enqueue to BullMQ
  const queueJob = await documentQueue.add(
    "ocr",
    {
      documentId,
      extractionJobId: job.id,
    } satisfies DocumentOcrJobPayload,
    { attempts: 3 }
  );

  // Link BullMQ job ID back to the extraction job
  await updateExtractionJobStatus(job.id, "queued");

  return {
    extractionJobId: job.id,
    queueJobId: queueJob.id,
  };
}
