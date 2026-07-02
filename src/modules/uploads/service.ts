/**
 * Uploads module — document upload and storage handling.
 *
 * Phase 1: basic file upload → create Document record.
 * Phase 2+: R2/S3 integration, file validation, chunked uploads, virus scanning.
 */

import {
  findDocumentByIdForUser,
  findWorkspaceDocuments,
  insertDocumentRecord,
  softDeleteDocument,
} from "@/modules/uploads/repository";
import type { UploadInput } from "@/modules/uploads/types";

export async function createDocumentRecord(input: UploadInput) {
  return insertDocumentRecord(input);
}

export async function getDocumentForUser(id: string, userId: string) {
  return findDocumentByIdForUser(id, userId);
}

export async function getWorkspaceDocuments(workspaceId: string, userId: string) {
  return findWorkspaceDocuments(workspaceId, userId);
}

export async function deleteDocument(id: string, userId: string) {
  return softDeleteDocument(id, userId);
}

export type { UploadInput };
