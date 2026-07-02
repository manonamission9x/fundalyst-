import { prisma } from "@/lib/db";
import type { UploadInput } from "@/modules/uploads/types";

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
