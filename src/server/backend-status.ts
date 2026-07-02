import { env } from "@/lib/env";

export type BackendCapabilityStatus = "configured" | "missing_env" | "local_only";

export interface BackendCapability {
  key: "database" | "auth" | "queue" | "storage" | "ocr" | "ai";
  label: string;
  status: BackendCapabilityStatus;
}

export interface BackendStatus {
  app: "fundalyst";
  mode: "local_first";
  version: string;
  generatedAt: string;
  capabilities: BackendCapability[];
}

export function getBackendStatus(now = new Date()): BackendStatus {
  return {
    app: "fundalyst",
    mode: "local_first",
    version: "0.1.0",
    generatedAt: now.toISOString(),
    capabilities: [
      capability("database", "PostgreSQL persistence", Boolean(env.DATABASE_URL)),
      capability("auth", "Account sessions", Boolean(env.BETTER_AUTH_SECRET && env.BETTER_AUTH_URL)),
      capability("queue", "Background jobs", Boolean(env.REDIS_URL)),
      capability(
        "storage",
        "Document object storage",
        Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET)
      ),
      capability("ocr", "Server-side OCR", Boolean(env.MISTRAL_API_KEY)),
      capability(
        "ai",
        "AI analysis providers",
        Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || env.DEEPSEEK_API_KEY || env.GOOGLE_API_KEY)
      ),
    ],
  };
}

function capability(
  key: BackendCapability["key"],
  label: string,
  configured: boolean
): BackendCapability {
  return {
    key,
    label,
    status: configured ? "configured" : "missing_env",
  };
}
