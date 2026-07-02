/**
 * Workspaces module — workspace CRUD operations.
 *
 * A workspace is the top-level organizational unit. Every document,
 * spreadsheet, DCF model, and audit log belongs to a workspace.
 *
 * Phase 1: basic CRUD (via prisma service).
 * Phase 2+: sharing, permissions, invitations.
 */

export {
  findWorkspaceById,
  findUserWorkspaces,
  createWorkspace,
  softDeleteWorkspace,
} from "@/services/prisma";
