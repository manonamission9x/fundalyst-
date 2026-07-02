/**
 * Valuation module — DCF model CRUD and scenario management.
 *
 * Phase 1: basic CRUD — save/load DCF models and scenarios.
 * Phase 2+: live computation, sensitivity tables, export.
 */

import type { Prisma } from "@gen/prisma/client";
import {
  findDcfModelsByWorkspace,
  insertDcfModel,
  insertScenario,
} from "@/modules/valuation/repository";

export async function createDcfModel(
  workspaceId: string,
  name: string,
  parameters: unknown,
  description?: string
) {
  return insertDcfModel(workspaceId, name, parameters as Prisma.InputJsonValue, description);
}

export async function getDcfModels(workspaceId: string) {
  return findDcfModelsByWorkspace(workspaceId);
}

export async function addScenario(
  dcfModelId: string,
  name: string,
  parameters: unknown,
  label?: string
) {
  return insertScenario(dcfModelId, name, parameters as Prisma.InputJsonValue, label);
}
