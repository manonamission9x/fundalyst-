/**
 * Spreadsheet module — server-side spreadsheet CRUD.
 *
 * Phase 1: basic persistence — save/load spreadsheet snapshots.
 * Phase 2+: collaboration, conflict resolution, version history.
 */

import type { Prisma } from "@gen/prisma/client";
import {
  findSpreadsheetById,
  findSpreadsheetsByWorkspace,
  insertSpreadsheet,
} from "@/modules/spreadsheet/repository";

export async function saveSpreadsheet(
  workspaceId: string,
  name: string,
  data: unknown,
  description?: string
) {
  return insertSpreadsheet(workspaceId, name, data as Prisma.InputJsonValue, description);
}

export async function getSpreadsheets(workspaceId: string) {
  return findSpreadsheetsByWorkspace(workspaceId);
}

export async function getSpreadsheetById(id: string, workspaceId: string) {
  return findSpreadsheetById(id, workspaceId);
}
