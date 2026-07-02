import { prisma } from "@/lib/db";
import type { Prisma } from "@gen/prisma/client";

export function insertDcfModel(
  workspaceId: string,
  name: string,
  parameters: Prisma.InputJsonValue,
  description?: string
) {
  return prisma.dCFModel.create({
    data: {
      workspace: { connect: { id: workspaceId } },
      name,
      description,
      parameters,
    },
  });
}

export function findDcfModelsByWorkspace(workspaceId: string) {
  return prisma.dCFModel.findMany({
    where: { workspaceId, deletedAt: null },
    include: { scenarios: true },
    orderBy: { updatedAt: "desc" },
  });
}

export function insertScenario(
  dcfModelId: string,
  name: string,
  parameters: Prisma.InputJsonValue,
  label?: string
) {
  return prisma.scenario.create({
    data: {
      dcfModel: { connect: { id: dcfModelId } },
      name,
      label,
      parameters,
    },
  });
}
