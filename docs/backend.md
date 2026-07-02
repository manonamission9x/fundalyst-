# Fundalyst — Backend Architecture

This document describes the backend architecture that has been built in Phase 1.
It is the authoritative reference for understanding how the server-side
components fit together.

## Stack

| Component | Technology | Purpose |
|---|---|---|
| Web framework | Next.js 16 (App Router) | API routes, server actions |
| Database | PostgreSQL 17 + PostGIS | Relational data store |
| ORM | Prisma 7 | Type-safe database access |
| Auth | Better Auth | Authentication + sessions |
| Queue | BullMQ + Valkey | Background job processing |
| Validation | Zod | Environment + request validation |
| Runtime | Node.js (server) + browser (client) | Hybrid architecture |

## Infrastructure (Docker)

`docker-compose.yml` defines two services:

| Service | Image | Port | Volume |
|---|---|---|---|
| `postgres` | `postgis/postgis:17-3.5` | 5432 | `fundalyst-pgdata` |
| `valkey` | `valkey/valkey:8-alpine` | 6379 | `fundalyst-valkey-data` |

Start: `docker compose up -d`
Stop: `docker compose down`
Reset: `docker compose down -v`

## Architecture diagram

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Client)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  DCF / Ratios│  │  Workspace   │  │  Import   │  │
│  │  / Trends    │  │  Grid        │  │  Pipeline │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                 │                │         │
│  ┌──────┴─────────────────┴────────────────┴──────┐ │
│  │           global-data-store (Zustand)           │ │
│  │           localStorage: fundalyst-*             │ │
│  └──────────────────────┬─────────────────────────┘ │
└─────────────────────────┼───────────────────────────┘
                          │ HTTP (fetch)
┌─────────────────────────┼───────────────────────────┐
│  Next.js (API Routes)   │                           │
│  ┌──────────────────────┴──────────────────────┐    │
│  │  src/app/api/*                               │    │
│  │  /api/auth/*  /api/health  /api/queue/*     │    │
│  │  /api/workspaces  /api/documents  ...        │    │
│  └──────────────────────┬──────────────────────┘    │
│                         │                            │
│  ┌──────────────────────┴──────────────────────┐    │
│  │  Modules (domain logic)                      │    │
│  │  users / workspaces / uploads / ocr          │    │
│  │  extraction / normalization / valuation      │    │
│  └──────────────────────┬──────────────────────┘    │
│                         │                            │
│  ┌──────────────────────┼──────────────────────┐    │
│  │         Prisma ORM   │    BullMQ             │    │
│  │         src/lib/db.ts│    src/lib/queue.ts   │    │
│  └──────────────────────┼──────────────────────┘    │
│                         │                            │
├── Docker ───────────────┼────────────────────────────┤
│  ┌──────────┐  ┌───────┴───────┐                    │
│  │ PostgreSQL│  │   Valkey      │                    │
│  │ :5432     │  │   :6379       │                    │
│  └──────────┘  └───────────────┘                    │
└─────────────────────────────────────────────────────┘
```

## API structure

All API routes live under `src/app/api/` and follow the Next.js App Router
file-based routing convention. Responses use a standard envelope:

```typescript
// Success
{ ok: true, data: T, requestId: string }

// Error
{ ok: false, error: { code: string, message: string }, requestId: string }
```

| Prefix | Purpose | Auth required |
|---|---|---|
| `GET /api/health` | Server health + capability report | No |
| `GET /api/backend` | Backend manifest | No |
| `POST/GET /api/auth/*` | Better Auth endpoints | Varies |
| `GET /api/me` | Current user profile | Yes |
| `GET/POST /api/workspaces` | Workspace list/create | Yes |
| `GET/PATCH/DELETE /api/workspaces/:workspaceId` | Workspace read/update/delete | Yes |
| `GET/POST /api/workspaces/:workspaceId/documents` | Document metadata list/create | Yes |
| `GET/DELETE /api/documents/:documentId` | Document read/delete | Yes |
| `GET/POST /api/documents/:documentId/ocr` | OCR job status/enqueue | Yes |
| `POST/GET /api/queue/example` | Queue smoke test | No |

## Auth architecture

Better Auth handles:
- Email/password registration and login
- Session management (HTTP-only cookie)
- Session verification in route handlers

Better Auth is **optional** — the app works without it. Only features that
require authentication (account sync, server-side processing) depend on it.

The auth library is initialized in `src/lib/auth.ts` using the Prisma adapter.
Route handlers access sessions through `src/server/auth/session.ts`, which wraps
`auth.api.getSession()` and returns a small server-safe session shape.

## Phase 2 API slice

The first Phase 2 backend slice connects the application domain modules to real
HTTP routes:

| Domain | Files | Status |
|---|---|---|
| User profile | `src/app/api/me/route.ts` | Authenticated profile read |
| Workspaces | `src/app/api/workspaces/**` | List, create, read, update, soft-delete |
| Documents | `src/app/api/workspaces/[workspaceId]/documents/route.ts`, `src/app/api/documents/[documentId]/route.ts` | Metadata list/create/read/soft-delete |
| OCR orchestration | `src/app/api/documents/[documentId]/ocr/route.ts` | Job list + BullMQ enqueue |

All workspace/document queries enforce ownership by joining through the
workspace owner and excluding soft-deleted records.

## Queue architecture

BullMQ manages background job processing with Valkey as the backing store.

| Queue | Purpose | Worker |
|---|---|---|
| `document` | OCR, text extraction, table extraction | `document.worker.ts` (Phase 2) |
| `analysis` | AI-powered financial analysis | `analysis.worker.ts` (Phase 2) |
| `maintenance` | Periodic cleanup jobs | `maintenance.worker.ts` (Phase 2) |
| `example` | Smoke test queue (verify infrastructure) | `example.worker.ts` (active) |

During development, workers run in-process alongside Next.js (via
`src/instrumentation.ts`). In production, workers should be deployed as
separate processes using `src/workers/start.ts` or your process manager.

## Module directory conventions

| Directory | Contains |
|---|---|
| `src/modules/users/` | User profile, preferences |
| `src/modules/workspaces/` | Workspace CRUD |
| `src/modules/uploads/` | File upload handling |
| `src/modules/ocr/` | OCR job orchestration |
| `src/modules/extraction/` | Data extraction pipeline |
| `src/modules/normalization/` | Fact normalization |
| `src/modules/spreadsheet/` | Spreadsheet snapshot CRUD |
| `src/modules/valuation/` | DCF model + scenario CRUD |
| `src/modules/exports/` | Data export to various formats |

Each module exports service functions that encapsulate business logic.
Route handlers call these services — they should not contain business logic.

## Environment configuration

See `docs/environment.md` for the full reference.

Key principle: `src/lib/env.ts` is the **only** file that reads `process.env`.
Every other file imports typed values from it.

## Future considerations

After the first Phase 2 API slice (User Accounts -> Workspaces -> Uploads -> OCR):

1. **Run Prisma migration**: `npx prisma migrate dev --name init`
2. **Set BETTER_AUTH_SECRET**: Generate with `openssl rand -base64 32`
3. **Docker must be running**: `docker compose up -d` for Postgres + Valkey
4. **Worker separation**: In production, extract workers to a separate
   process or container — don't run them inside Next.js
5. **R2 integration**: Real object storage for document uploads
6. **OCR provider integration**: Wire Mistral/tesseract to OCR module
