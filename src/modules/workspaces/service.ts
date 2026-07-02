/**
 * Workspaces module — workspace CRUD operations.
 *
 * A workspace is the top-level organizational unit. Every document,
 * spreadsheet, DCF model, and audit log belongs to a workspace.
 *
 * Phase 1: basic CRUD.
 * Phase 2+: sharing, permissions, invitations.
 */

export {
  findWorkspaceById,
  findUserWorkspaces,
  insertWorkspace as createWorkspace,
  softDeleteWorkspace,
  updateWorkspace,
} from "@/modules/workspaces/repository";
