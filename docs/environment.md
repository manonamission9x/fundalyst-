# Fundalyst — Environment Configuration

This document is the reference for how runtime configuration works in Fundalyst.
It is written to be understood by both humans and AI coding assistants before
they modify anything config-related.

## The one rule

**`src/lib/env.ts` is the single source of truth for runtime configuration and
the only file allowed to read `process.env`.** Everything else imports typed
values from it. This is enforced by an ESLint rule (`no-restricted-properties`
on `process.env`).

There is no second env loader, no duplicate validation, and no scattered
`process.env` access anywhere in the codebase. Do not add any.

## Context: Fundalyst is hybrid now

Fundalyst is a hybrid local-first application (see `BACKEND.md` and
`DATABASE.md`). Core financial analysis still runs in the browser by default,
while optional backend features provide auth, workspace persistence, document
metadata, queues, and OCR orchestration.

Server variables stay optional in the schema until a feature imports them with
`requireEnv()`. Once a backend feature is active, the variables it depends on
are required at that point of use with a precise error message. For local
backend work, `.env.local` should include `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, and `REDIS_URL`.

## Files

| File | Committed? | Purpose |
|---|---|---|
| `.env.example` | ✅ yes | Template of every supported variable. **Placeholders only, never real secrets.** |
| `.env.local` | ❌ no (gitignored) | Your real secrets. Stays on your machine. |
| `src/lib/env.ts` | ✅ yes | Validates and exports typed config. Only reader of `process.env`. |
| `src/instrumentation.ts` | ✅ yes | Runs env validation once at server startup (fail-fast). |

Getting started: `cp .env.example .env.local` and fill in the values you need.

## How values are validated

- On **server startup**, `src/instrumentation.ts` imports the env module, which
  parses `process.env` against a Zod schema. Invalid values (e.g. a malformed
  URL) throw immediately with a readable list of exactly what's wrong.
- Missing **optional** server vars do not fail startup. They fail *when used*
  via `requireEnv()` (see below), with a clear message.
- `SKIP_ENV_VALIDATION=1` bypasses validation for lint/CI/Docker-build steps
  that have no real environment. Never set it in a real runtime.

## Variables

Server-only unless marked public. "Required?" reflects the current backend
feature that needs the value.

| Variable | Scope | Required (at use) | Purpose |
|---|---|---|---|
| `NODE_ENV` | server | auto | Runtime mode (`development`/`test`/`production`). |
| `DATABASE_URL` | server | yes, for Prisma/backend routes | Postgres connection string. |
| `BETTER_AUTH_SECRET` | server | yes, for auth routes | Auth signing secret (`openssl rand -base64 32`). |
| `BETTER_AUTH_URL` | server | yes, for auth routes | Base URL for auth callbacks. |
| `REDIS_URL` | server | yes, for BullMQ queue routes/workers | Valkey/Redis connection for BullMQ queues. |
| `DEEPSEEK_API_KEY` | server | optional | DeepSeek AI provider. |
| `OPENAI_API_KEY` | server | optional | OpenAI provider. |
| `ANTHROPIC_API_KEY` | server | optional | Anthropic provider. |
| `GOOGLE_API_KEY` | server | optional | Google AI provider. |
| `MISTRAL_API_KEY` | server | optional | Mistral OCR. |
| `R2_ACCOUNT_ID` | server | optional | Cloudflare R2 account. |
| `R2_ACCESS_KEY_ID` | server | optional | R2 access key. |
| `R2_SECRET_ACCESS_KEY` | server | optional | R2 secret key. |
| `R2_BUCKET` | server | optional | R2 bucket name. |
| `R2_PUBLIC_URL` | server | optional | R2 public base URL. |
| `RESEND_API_KEY` | server | optional | Resend email API. |
| `SENTRY_DSN` | server | optional | Server-side Sentry DSN. |
| `NEXT_PUBLIC_APP_URL` | **public** | optional (defaults) | App base URL, exposed to browser. |
| `NEXT_PUBLIC_SENTRY_DSN` | **public** | optional | Browser Sentry DSN. |

### Server vs client

- **Server-only** vars are never shipped to the browser. Reading one in client
  code throws at runtime (a Proxy guard in `env.ts`) — a deliberate tripwire.
- **Public** vars must be prefixed `NEXT_PUBLIC_`. Only these are safe in the
  browser; Next.js inlines them into the client bundle at build time. Never put
  a secret behind a `NEXT_PUBLIC_` name.

## Using config in code

```ts
// Server code — full typed access:
import { env, requireEnv } from "@/lib/env";

const mode = env.NODE_ENV;                 // typed, always present
const db = requireEnv("DATABASE_URL");     // throws with a clear message if unset

// Client components — client-safe subset only:
import { clientEnv } from "@/lib/env";

const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;
```

Use `env.FOO` for vars that are always present (e.g. `NODE_ENV`, or once you've
made a var required). Use `requireEnv("FOO")` for optional server vars that a
particular feature genuinely needs, so the failure is precise and local.

## Adding a new variable (the permanent workflow)

Follow all five steps, in order:

1. **`.env.example`** — add the variable under the right section with a one-line
   comment and a placeholder (never a real value).
2. **`src/lib/env.ts`** — add it to `serverSchema` (secret) or `clientSchema`
   (`NEXT_PUBLIC_*`). Choose the right Zod type (`.url()`, `.min(1)`, enum…).
   Make it `.optional()` until code actually requires it.
3. **Use it** via `env` / `requireEnv` / `clientEnv`. Never touch `process.env`.
4. **`docs/environment.md`** — add a row to the table above.
5. **`.env.local`** — set your real value locally.

## Example: adding a new AI provider (e.g. xAI / Grok)

1. `.env.example`:
   ```env
   #################################################
   # AI Providers (server-only)
   #################################################
   XAI_API_KEY=
   ```
2. `src/lib/env.ts`, inside `serverSchema`:
   ```ts
   XAI_API_KEY: nonEmpty.optional(),
   ```
3. In the provider code:
   ```ts
   import { requireEnv } from "@/lib/env";
   const key = requireEnv("XAI_API_KEY");
   ```
4. Add an `XAI_API_KEY` row to the table above.
5. Put the real key in `.env.local`.

That's the whole surface area. No new files, no new loaders.

## Tightening requirements

When a backend capability becomes mandatory for all deployments, flip the
relevant vars from `.optional()` to required in `serverSchema`. Startup
validation will then refuse to boot the server without them. Nothing else in the
config system changes.

## Security checklist

- Real secrets live only in `.env.local` (gitignored). Never in `.env.example`,
  source, logs, or docs.
- Only `NEXT_PUBLIC_*` values reach the browser.
- If a secret is ever committed or pasted somewhere public, rotate it.
- Never read `process.env` outside `src/lib/env.ts`.
