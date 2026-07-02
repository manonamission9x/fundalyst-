import { prisma } from "@/lib/db";
import type { Prisma } from "@gen/prisma/client";

export function findWorkspaceById(id: string, userId: string) {
  return prisma.workspace.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
  });
}

export function findUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { ownerId: userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export function insertWorkspace(data: Prisma.WorkspaceCreateInput) {
  return prisma.workspace.create({ data });
}

export function updateWorkspace(
  id: string,
  userId: string,
  data: Pick<Prisma.WorkspaceUpdateInput, "name" | "description">
) {
  return prisma.workspace.update({
    where: { id, ownerId: userId, deletedAt: null },
    data,
  });
}

export function softDeleteWorkspace(id: string, userId: string) {
  return prisma.workspace.updateMany({
    where: { id, ownerId: userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
