import { prisma } from "@/lib/db";
import type { UploadInput } from "@/modules/uploads/types";

export function findDocumentByIdForUser(id: string, userId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      deletedAt: null,
      workspace: { ownerId: userId, deletedAt: null },
    },
  });
}

export function findWorkspaceDocuments(workspaceId: string, userId: string) {
  return prisma.document.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      workspace: { ownerId: userId, deletedAt: null },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function insertDocumentRecord(input: UploadInput) {
  return prisma.document.create({
    data: {
      workspaceId: input.workspaceId,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      status: "uploaded",
    },
  });
}

export function softDeleteDocument(id: string, userId: string) {
  return prisma.document.updateMany({
    where: {
      id,
      deletedAt: null,
      workspace: { ownerId: userId, deletedAt: null },
    },
    data: { deletedAt: new Date() },
  });
}
