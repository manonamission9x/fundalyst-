/**
 * ============================================================================
 * Fundalyst — Centralized Environment Configuration
 * ============================================================================
 *
 * THIS IS THE ONLY FILE IN THE CODEBASE ALLOWED TO READ `process.env`.
 * Everything else imports typed values from here.
 *
 * Why: one source of truth, validated once, fully typed, with server secrets
 * provably unreachable from the browser bundle.
 *
 * ----------------------------------------------------------------------------
 * IMPORTANT — Fundalyst is currently a 100% client-side app (see BACKEND.md).
 * There is no server/database/auth yet. So every SERVER variable below is
 * OPTIONAL: the app boots fine with an empty `.env`. Values are still
 * *format-validated* when present, and `requireEnv()` fails fast with a clear
 * message the moment backend code actually depends on a missing value.
 * When you make the backend real, flip a var from `.optional()` to required
 * in the schema — nothing else changes.
 * ----------------------------------------------------------------------------
 *
 * HOW TO ADD A NEW VARIABLE (the permanent convention):
 *   1. Add it to `.env.example` (with a comment; placeholder only).
 *   2. Add it to the correct schema below (`serverSchema` or `clientSchema`).
 *   3. Import it from `env` / `clientEnv` everywhere it's used.
 *   4. Document it in docs/environment.md.
 *   5. Never read `process.env` outside this file.
 *
 * See docs/environment.md for the full guide.
 */

import { z } from "zod";

/** Skip validation during lint/CI/Docker-build steps that have no real env.
 *  NEVER set this in a real runtime. */
const SKIP = process.env.SKIP_ENV_VALIDATION === "1" || process.env.SKIP_ENV_VALIDATION === "true";

const isServer = typeof window === "undefined";

/* ---------------------------------------------------------------------------
 * Reusable field helpers
 * ------------------------------------------------------------------------- */

/** A non-empty string once provided (rejects the empty placeholders in .env.example). */
const nonEmpty = z.string().min(1);

/* ---------------------------------------------------------------------------
 * SERVER schema — secrets. NEVER exposed to the browser.
 * All optional today (client-only app); tighten to required as backend lands.
 * ------------------------------------------------------------------------- */
const serverSchema = z.object({
  // Runtime metadata
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database
  DATABASE_URL: z.string().url().optional(),

  // Authentication
  BETTER_AUTH_SECRET: nonEmpty.optional(),
  BETTER_AUTH_URL: z.string().url().optional(),

  // Redis / Queue
  REDIS_URL: z.string().url().optional(),

  // AI providers
  DEEPSEEK_API_KEY: nonEmpty.optional(),
  OPENAI_API_KEY: nonEmpty.optional(),
  ANTHROPIC_API_KEY: nonEmpty.optional(),
  GOOGLE_API_KEY: nonEmpty.optional(),

  // OCR
  MISTRAL_API_KEY: nonEmpty.optional(),

  // Cloudflare R2
  R2_ACCOUNT_ID: nonEmpty.optional(),
  R2_ACCESS_KEY_ID: nonEmpty.optional(),
  R2_SECRET_ACCESS_KEY: nonEmpty.optional(),
  R2_BUCKET: nonEmpty.optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Email
  RESEND_API_KEY: nonEmpty.optional(),

  // Monitoring (server-side)
  SENTRY_DSN: z.string().url().optional(),
});

/* ---------------------------------------------------------------------------
 * CLIENT schema — ONLY NEXT_PUBLIC_* vars. Safe to ship to the browser.
 * Next.js inlines these at build time.
 * ------------------------------------------------------------------------- */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

/* ---------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------- */

/** Only the NEXT_PUBLIC_* keys are readable in the browser (Next inlines them). */
const clientRuntimeEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

function formatIssues(kind: "server" | "client", error: z.ZodError): never {
  const lines = error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
  throw new Error(
    `\n❌ Invalid ${kind} environment variables:\n${lines.join("\n")}\n\n` +
      `Fix these in your .env.local (copy from .env.example). ` +
      `See docs/environment.md.\n`
  );
}

function buildEnv() {
  // Client validation runs on both server and browser.
  const client = clientSchema.safeParse(clientRuntimeEnv);
  if (!SKIP && !client.success) formatIssues("client", client.error);

  // Server validation runs on the server only. In the browser, expose no server keys.
  if (isServer) {
    const server = serverSchema.safeParse(process.env);
    if (!SKIP && !server.success) formatIssues("server", server.error);

    return {
      ...(server.success ? server.data : ({} as z.infer<typeof serverSchema>)),
      ...(client.success ? client.data : ({} as z.infer<typeof clientSchema>)),
    };
  }

  return { ...(client.success ? client.data : ({} as z.infer<typeof clientSchema>)) };
}

const parsed = buildEnv();

/* ---------------------------------------------------------------------------
 * Exports
 * ------------------------------------------------------------------------- */

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

/**
 * Full typed config. On the server this includes server + client vars.
 *
 * Guard: reading a server-only key in the browser throws — server secrets can
 * never leak into client code even by accident.
 */
const serverKeys = new Set(Object.keys(serverSchema.shape));
const clientKeys = new Set(Object.keys(clientSchema.shape));

export const env = new Proxy(parsed as ServerEnv & ClientEnv, {
  get(target, prop) {
    if (
      !isServer &&
      typeof prop === "string" &&
      serverKeys.has(prop) &&
      !clientKeys.has(prop)
    ) {
      throw new Error(
        `❌ Attempted to access server-only env var "${prop}" in the browser. ` +
          `Only NEXT_PUBLIC_* vars are available client-side. See docs/environment.md.`
      );
    }
    return target[prop as keyof typeof target];
  },
});

/** Client-safe subset — import this from client components. */
export const clientEnv: ClientEnv = {
  NEXT_PUBLIC_APP_URL: parsed.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: parsed.NEXT_PUBLIC_SENTRY_DSN,
};

/**
 * Fail-fast accessor for OPTIONAL server vars at their point of use.
 * Use this in backend code that genuinely requires a value:
 *
 *     const url = requireEnv("DATABASE_URL"); // throws with a clear message if unset
 */
export function requireEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  if (!isServer) {
    throw new Error(`requireEnv("${String(key)}") called in the browser — server-only.`);
  }
  const value = (parsed as ServerEnv)[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `❌ Missing required environment variable "${String(key)}". ` +
        `Add it to .env.local (see .env.example) and docs/environment.md.`
    );
  }
  return value as NonNullable<ServerEnv[K]>;
}

export type { ServerEnv, ClientEnv };
