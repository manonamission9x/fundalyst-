import { z } from "zod";
import { apiError, apiOk } from "@/server/api/response";
import { getServerSession } from "@/server/auth/session";
import {
  findWorkspaceById,
  softDeleteWorkspace,
  updateWorkspace,
} from "@/modules/workspaces/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

const workspaceUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to view this workspace.");
  }

  const { workspaceId } = await context.params;
  const workspace = await findWorkspaceById(workspaceId, session.user.id);

  if (!workspace) {
    return apiError("NOT_FOUND", "Workspace was not found.");
  }

  return apiOk({ workspace });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to update this workspace.");
  }

  const parsed = workspaceUpdateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || (!("name" in parsed.data) && !("description" in parsed.data))) {
    return apiError("BAD_REQUEST", "Invalid workspace payload.");
  }

  const { workspaceId } = await context.params;
  const existing = await findWorkspaceById(workspaceId, session.user.id);

  if (!existing) {
    return apiError("NOT_FOUND", "Workspace was not found.");
  }

  const workspace = await updateWorkspace(workspaceId, session.user.id, {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
  });

  return apiOk({ workspace });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to delete this workspace.");
  }

  const { workspaceId } = await context.params;
  const result = await softDeleteWorkspace(workspaceId, session.user.id);

  if (result.count === 0) {
    return apiError("NOT_FOUND", "Workspace was not found.");
  }

  return apiOk({ deleted: true });
}
