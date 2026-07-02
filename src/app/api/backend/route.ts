import { apiOk } from "@/server/api/response";
import { DOCUMENT_PIPELINE } from "@/server/documents/pipeline";

export const runtime = "nodejs";

export async function GET() {
  return apiOk({
    architecture: "next_api_routes_with_future_python_workers",
    privacyMode: "local_first_opt_in_cloud",
    endpoints: ["/api/health", "/api/backend"],
    documentPipeline: DOCUMENT_PIPELINE,
  });
}
