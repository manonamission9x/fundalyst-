import { z } from "zod";
import { apiError, apiOk } from "@/server/api/response";
import { getServerSession } from "@/server/auth/session";
import { findWorkspaceById } from "@/modules/workspaces/service";
import {
  createDocumentRecord,
  getWorkspaceDocuments,
} from "@/modules/uploads/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

const documentCreateSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().min(0).max(100 * 1024 * 1024),
  storageKey: z.string().trim().min(1).max(1_024).optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to view workspace documents.");
  }

  const { workspaceId } = await context.params;
  const workspace = await findWorkspaceById(workspaceId, session.user.id);

  if (!workspace) {
    return apiError("NOT_FOUND", "Workspace was not found.");
  }

  const documents = await getWorkspaceDocuments(workspaceId, session.user.id);
  return apiOk({ documents });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to upload documents.");
  }

  const parsed = documentCreateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return apiError("BAD_REQUEST", "Invalid document payload.");
  }

  const { workspaceId } = await context.params;
  const workspace = await findWorkspaceById(workspaceId, session.user.id);

  if (!workspace) {
    return apiError("NOT_FOUND", "Workspace was not found.");
  }

  const document = await createDocumentRecord({
    workspaceId,
    ...parsed.data,
  });

  return apiOk({ document }, { status: 201 });
}
