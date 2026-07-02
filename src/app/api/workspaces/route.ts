import { z } from "zod";
import { apiError, apiOk } from "@/server/api/response";
import { getServerSession } from "@/server/auth/session";
import { createWorkspace, findUserWorkspaces } from "@/modules/workspaces/service";

export const runtime = "nodejs";

const workspaceCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000).optional(),
});

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to view workspaces.");
  }

  const workspaces = await findUserWorkspaces(session.user.id);
  return apiOk({ workspaces });
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to create a workspace.");
  }

  const parsed = workspaceCreateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return apiError("BAD_REQUEST", "Invalid workspace payload.");
  }

  const workspace = await createWorkspace({
    name: parsed.data.name,
    description: parsed.data.description,
    owner: { connect: { id: session.user.id } },
  });

  return apiOk({ workspace }, { status: 201 });
}
