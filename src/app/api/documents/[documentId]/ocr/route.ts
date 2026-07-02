import { apiError, apiOk } from "@/server/api/response";
import { getServerSession } from "@/server/auth/session";
import { enqueueOcrJob, getOcrJobsForDocument } from "@/modules/ocr/service";
import { getDocumentForUser } from "@/modules/uploads/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to view OCR jobs.");
  }

  const { documentId } = await context.params;
  const document = await getDocumentForUser(documentId, session.user.id);

  if (!document) {
    return apiError("NOT_FOUND", "Document was not found.");
  }

  const jobs = await getOcrJobsForDocument(document.id, session.user.id);
  return apiOk({ jobs });
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to process this document.");
  }

  const { documentId } = await context.params;
  const document = await getDocumentForUser(documentId, session.user.id);

  if (!document) {
    return apiError("NOT_FOUND", "Document was not found.");
  }

  const job = await enqueueOcrJob(document.id);
  return apiOk({ documentId: document.id, ...job }, { status: 202 });
}
