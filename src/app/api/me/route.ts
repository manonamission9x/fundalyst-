import { apiError, apiOk } from "@/server/api/response";
import { getServerSession } from "@/server/auth/session";
import { getUserById } from "@/modules/users/service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return apiError("UNAUTHORIZED", "Sign in to view your profile.");
  }

  const profile = await getUserById(session.user.id);

  if (!profile) {
    return apiError("NOT_FOUND", "User profile was not found.");
  }

  return apiOk({ user: profile });
}
