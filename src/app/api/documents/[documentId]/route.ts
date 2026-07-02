import { apiError, apiOk } from "@/server/api/response";
import { getServerSession } from "@/server/auth/session";
import { deleteDocument, getDocumentForUser } from "@/modules/uploads/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to view this document.");
  }

  const { documentId } = await context.params;
  const document = await getDocumentForUser(documentId, session.user.id);

  if (!document) {
    return apiError("NOT_FOUND", "Document was not found.");
  }

  return apiOk({ document });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to delete this document.");
  }

  const { documentId } = await context.params;
  const result = await deleteDocument(documentId, session.user.id);

  if (result.count === 0) {
    return apiError("NOT_FOUND", "Document was not found.");
  }

  return apiOk({ deleted: true });
}
