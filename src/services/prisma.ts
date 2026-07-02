/**
 * Prisma service layer — reusable query helpers
 *
 * Thin wrappers around Prisma operations that enforce business rules:
 *   - Soft-delete filtering (deletedAt IS NULL)
 *   - Ownership scoping
 *   - Audit logging
 *
 * Route handlers call these services instead of prisma.user.findMany()
 * directly. This keeps business rules in one place and route handlers thin.
 *
 * Usage:
 *   import { findWorkspaceById } from "@/services/prisma";
 *   const workspace = await findWorkspaceById(workspaceId, userId);
 */

import { prisma } from "@/lib/db";
import type { Prisma } from "@gen/prisma/client";

// ──────────────────────────────────────────────
// Workspace services
// ──────────────────────────────────────────────

export async function findWorkspaceById(
  id: string,
  userId: string
) {
  return prisma.workspace.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
  });
}

export async function findUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { ownerId: userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createWorkspace(
  data: Prisma.WorkspaceCreateInput
) {
  return prisma.workspace.create({ data });
}

export async function softDeleteWorkspace(id: string, userId: string) {
  return prisma.workspace.updateMany({
    where: { id, ownerId: userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

// ──────────────────────────────────────────────
// Document services
// ──────────────────────────────────────────────

export async function findDocumentsByWorkspace(
  workspaceId: string,
  includeDeleted = false
) {
  const where: Prisma.DocumentWhereInput = { workspaceId };
  if (!includeDeleted) where.deletedAt = null;

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function findDocumentById(
  id: string,
  workspaceId: string
) {
  return prisma.document.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
}

export async function createDocument(
  data: Prisma.DocumentCreateInput
) {
  return prisma.document.create({ data });
}

// ──────────────────────────────────────────────
// Extraction job services
// ──────────────────────────────────────────────

export async function createExtractionJob(
  data: Prisma.ExtractionJobCreateInput
) {
  return prisma.extractionJob.create({ data });
}

export async function updateExtractionJobStatus(
  id: string,
  status: string,
  errorMessage?: string
) {
  const update: Prisma.ExtractionJobUpdateInput = { status };
  if (errorMessage) update.errorMessage = errorMessage;
  if (status === "running") update.startedAt = new Date();
  if (status === "succeeded" || status === "failed") {
    update.completedAt = new Date();
  }
  return prisma.extractionJob.update({ where: { id }, data: update });
}

// ──────────────────────────────────────────────
// Audit log services
// ──────────────────────────────────────────────

export async function createAuditLog(
  data: Prisma.AuditLogCreateInput
) {
  return prisma.auditLog.create({ data });
}

export async function findAuditLogs(
  workspaceId: string,
  limit = 50,
  cursor?: string
) {
  const where: Prisma.AuditLogWhereInput = { workspaceId };
  const take = limit + 1;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}
