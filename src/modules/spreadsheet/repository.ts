import { prisma } from "@/lib/db";
import type { Prisma } from "@gen/prisma/client";

export function insertSpreadsheet(
  workspaceId: string,
  name: string,
  data: Prisma.InputJsonValue,
  description?: string
) {
  return prisma.spreadsheet.create({
    data: {
      workspace: { connect: { id: workspaceId } },
      name,
      description,
      data,
    },
  });
}

export function findSpreadsheetsByWorkspace(workspaceId: string) {
  return prisma.spreadsheet.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export function findSpreadsheetById(id: string, workspaceId: string) {
  return prisma.spreadsheet.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
}
