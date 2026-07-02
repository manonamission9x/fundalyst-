import { apiOk } from "@/server/api/response";
import { getBackendStatus } from "@/server/backend-status";

export const runtime = "nodejs";

export async function GET() {
  return apiOk(getBackendStatus());
}
