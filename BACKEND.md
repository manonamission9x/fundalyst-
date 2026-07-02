# Fundalyst — Backend

Fundalyst is now a **hybrid app**: the core analysis is still local-first (client-side, in-browser), but we've added an optional backend foundation for authentication, persistence, document processing, and cloud features.

The privacy promise stays: imported financial data stays on-device unless the user explicitly opts into a cloud feature (account sync, server-side OCR, collaboration, backup).

## Architecture

```
src/
├── app/api/            Next.js route handlers (auth, health, queue, entities)
├── lib/                Shared server utilities
│   ├── auth.ts         Better Auth configuration
│   ├── db.ts           Prisma client singleton
│   ├── env.ts          Environment config (single source of truth for process.env)
│   ├── queue.ts        BullMQ + IORedis connection
│   └── workers.ts      Worker lifecycle management
├── jobs/               BullMQ job type definitions + queue factories
├── workers/            BullMQ worker implementations
├── services/           Service layer (Prisma query wrappers with business rules)
├── modules/            Domain-organized business logic
│   ├── users/
│   ├── workspaces/
│   ├── uploads/
│   ├── ocr/
│   ├── extraction/
│   ├── normalization/
│   ├── spreadsheet/
│   ├── valuation/
│   └── exports/
├── server/             Legacy server utilities (migrating to modules/)
│   ├── api/response.ts     Standard API response envelope
│   ├── auth/session.ts     Auth placeholder (being replaced by Better Auth)
│   ├── backend-status.ts   Capability reporting
│   ├── documents/pipeline.ts
│   ├── jobs/types.ts
│   └── projects/types.ts
└── types/              Shared type definitions
```

## Layer overview

| Layer | Path | Purpose |
|---|---|---|
| API routes | `src/app/api/*` | HTTP endpoints — thin, call modules/services |
| Auth | `src/lib/auth.ts` | Better Auth (email/password, sessions) |
| Database | `src/lib/db.ts` + `prisma/schema.prisma` | PostgreSQL via Prisma ORM |
| Queue | `src/lib/queue.ts` + `src/jobs/*` | BullMQ + Valkey (Redis-compatible) |
| Workers | `src/workers/*` | Background job processors |
| Services | `src/services/prisma.ts` | Prisma query helpers with business rules |
| Domain modules | `src/modules/*/service.ts` | Business logic organized by domain |

## Quick start

```bash
# 1. Start infrastructure (PostgreSQL + Valkey)
docker compose up -d

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your BETTER_AUTH_SECRET (openssl rand -base64 32)

# 3. Install deps (if not already done)
npm install

# 4. Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate dev --name init

# 5. Start the dev server
npm run dev
```

## Auth endpoints (Better Auth)

Better Auth is mounted at `/api/auth/*` and provides:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup/email` | Create account |
| POST | `/api/auth/login/email` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/session` | Get current session |
| GET | `/api/auth/list-sessions` | List active sessions |
| POST | `/api/auth/revoke-session` | Revoke a session |
| POST | `/api/auth/revoke-other-sessions` | Revoke all other sessions |

## Queue endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/queue/example` | Queue status (smoke test) |
| POST | `/api/queue/example` | Enqueue a test job |

## Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend status + capability report |
| GET | `/api/backend` | Backend manifest + document pipeline |

## Environment

See `docs/environment.md` for the full reference.

Key variables:
- `DATABASE_URL` — PostgreSQL connection (matches `docker-compose.yml` defaults)
- `BETTER_AUTH_SECRET` — Auth signing secret (generate via `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — Base URL for auth callbacks (`http://localhost:3000`)
- `REDIS_URL` — Valkey/Redis connection (`redis://localhost:6379`)

All env vars are validated by `src/lib/env.ts` — the **only** file that reads `process.env`.

## Database schema (Prisma)

See `prisma/schema.prisma` for the full schema. Key models:

```
User ──┐
       ├── Workspace ──┐
       │               ├── Document ──┐
       │               │              ├── ExtractionJob
       │               │              └── FinancialStatement
       │               ├── Spreadsheet
       │               ├── DCFModel ── Scenario
       │               └── AuditLog
       └── Session / Account (Better Auth)
```

All application models support soft-delete (`deletedAt`). Audit logs are append-only.

## How to extend the backend

### Add a new database model
1. Add to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Add query helpers in `src/services/prisma.ts`
4. Add domain module in `src/modules/<name>/service.ts`
5. Add API routes in `src/app/api/<name>/route.ts`

### Add a new queue/job
1. Define job payload type in `src/jobs/index.ts`
2. Create queue factory in `src/jobs/<name>.ts`
3. Create worker in `src/workers/<name>.worker.ts`
4. Register worker in `src/lib/workers.ts`

### Add a new env variable
1. Add to `.env.example` (placeholder only!)
2. Add to the Zod schema in `src/lib/env.ts`
3. Document in `docs/environment.md`
4. Use via `import { env, requireEnv } from "@/lib/env"` — never `process.env`
