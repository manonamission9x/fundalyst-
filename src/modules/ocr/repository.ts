import { prisma } from "@/lib/db";
import type { Prisma } from "@gen/prisma/client";

export function findExtractionJobsForDocumentForUser(documentId: string, userId: string) {
  return prisma.extractionJob.findMany({
    where: {
      documentId,
      document: {
        deletedAt: null,
        workspace: { ownerId: userId, deletedAt: null },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function insertExtractionJob(data: Prisma.ExtractionJobCreateInput) {
  return prisma.extractionJob.create({ data });
}

export function updateExtractionJobStatus(
  id: string,
  status: string,
  options: { errorMessage?: string; queueJobId?: string } = {}
) {
  const update: Prisma.ExtractionJobUpdateInput = {
    status,
    ...(options.queueJobId ? { queueJobId: options.queueJobId } : {}),
    ...(options.errorMessage ? { errorMessage: options.errorMessage } : {}),
  };

  if (status === "running") update.startedAt = new Date();
  if (status === "succeeded" || status === "failed") {
    update.completedAt = new Date();
  }

  return prisma.extractionJob.update({ where: { id }, data: update });
}
