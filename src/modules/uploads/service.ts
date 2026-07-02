/**
 * Uploads module — document upload and storage handling.
 *
 * Phase 1: basic file upload → create Document record.
 * Phase 2+: R2/S3 integration, file validation, chunked uploads, virus scanning.
 */

import { insertDocumentRecord } from "@/modules/uploads/repository";
import type { UploadInput } from "@/modules/uploads/types";

export async function createDocumentRecord(input: UploadInput) {
  return insertDocumentRecord(input);
}

export type { UploadInput };
