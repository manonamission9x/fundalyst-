<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fundalyst — shared agent brief

**Canonical context for every agent (Claude, Codex, DeepSeek). Read this first. Don't duplicate it elsewhere — link here.**

Hybrid architecture: core financial analysis is still local-first (browser-only, keeps the privacy promise); optional backend services (Phase 1) provide PostgreSQL persistence, Better Auth, BullMQ queues, and Valkey. Import a filing → review/accept extracted facts with provenance → the accepted dataset pre-fills every tool. Indian-market skew (₹ Cr/Lakh).

**Stack:**
- Frontend: Next.js 16 (App Router) · React 19 · TS strict · Zustand + `localStorage` · Recharts · PDF.js · Vitest · Playwright · global CSS (tokens in `src/app/globals.css`)
- Backend (optional): PostgreSQL 17 + PostGIS · Prisma 7 · Better Auth · BullMQ + Valkey · Zod
- Infrastructure: Docker Compose (PostgreSQL + Valkey)
- Windows: use `npm.cmd`

**Routes:** `/` · `/workspace` · `/import` · `/research/{filing,trends,growth}` · `/tools/{dcf,wc,ratios,peer}` · `/about` · `/debug-import` (dev-only, unlinked).

## Default context policy

Keep every session narrow by default. Do **not** read the whole repo, large audits, or broad docs unless the task clearly needs them.

Default bootstrap for new tasks:

1. Read `AGENTS.md`.
2. Read `HANDoFF.md` for current state.
3. Read only the specific target file(s) for the task.
4. Use `rg` for targeted search instead of opening folders/files broadly.
5. Before editing, state which files will be touched.
6. Verify with the smallest relevant command first.

Add task-specific docs only when needed:

| Task type | Extra context |
|---|---|
| Backend/database/auth/queue | `BACKEND.md`, `DATABASE.md`, relevant `src/lib/*` / `src/server/*` / `prisma/*` files |
| UI/design | `DESIGN.md`, target route/component, relevant CSS token section |
| Data flow/spreadsheet/import | `ARCHITECTURE.md`, target store/importer files |
| Bug fix | Reproduction/error output plus the smallest failing file path |
| Roadmap/ticket work | `CODEX_TICKETS.md` or `DEEPSEEK_TASKS.md`, not the full audit unless specifically requested |

## Doc map — one source of truth per topic (don't restate, link)

**New agent? Read in this order:**

| Order | File | What it tells you |
|---|---|---|
| 1 | `PROJECT.md` | What this project is, who it's for, what's real vs not |
| 2 | `ARCHITECTURE.md` | Data flow, stores, component tree, key decisions |
| 3 | `HANDoFF.md` | **Current snapshot** (what works / in progress / risks) **+ changelog** — the single status doc |
| 4 | `FRONTEND.md` | Stack, routing, component conventions, CSS rules |
| 5 | `DESIGN.md` | Visual language, tokens, colour/typography rules |
| 6 | `BACKEND.md` | Backend architecture: PostgreSQL, Prisma, Better Auth, BullMQ, Docker Compose — what exists and how to extend it |
| 7 | `DATABASE.md` | Dual persistence: localStorage (client) + PostgreSQL (server). Schema, migrations, privacy model |
| 8 | `STYLE.md` | Code style, naming, lint rules, PR checklist |
| 9 | `CODEX_TICKETS.md` | Active tickets — claim one before starting |
| 10 | `DEEPSEEK_TASKS.md` | Visual/theme fix queue — DeepSeek lane only |

| Topic | Canonical file |
|---|---|
| **Execution rules + sandbox verification (read before "done")** | `AI_EXECUTION_RULES.md` |
| Design language / tokens (read before any UI change) | `DESIGN.md` |
| Product state: real vs not, risks, verify steps | `HANDoFF.md` |
| UX/IA audit vs Godel + prioritized roadmap (deep rationale) | `FUNDALYST_DESIGN_AUDIT.md` |
| Implementation tickets from the audit (read this, not the audit) | `CODEX_TICKETS.md` |
| Visual/theme + product fix queue (checklist) | `DEEPSEEK_TASKS.md` |
| Multi-agent collaboration + token-saving workflow | `AGENT_COLLABORATION.md` |
| Reusable prompt templates for recurring work | `AGENT_PLAYBOOKS.md` |
| How to keep token usage low | `TOKENS.md` |
| xlsx advisory + mitigation | `docs/xlsx-risk-plan.md` |
| Environment/config variables (the ONLY place to read env) | `docs/environment.md` (`src/lib/env.ts` is the single source of truth) |
| Backend architecture (deep reference) | `docs/backend.md` (`BACKEND.md` is the summary) |

## Key files
- Command palette (Cmd/Ctrl+K; nav + 3 actions today): `src/components/layout/CommandPalette.tsx`
- Global nav / dataset badge / theme: `src/components/layout/Nav.tsx`
- Workspace cockpit (has local-sim Governance/Audit/Integrations — flagged for removal): `src/app/workspace/page.tsx`
- Reference tool-page pattern: `src/app/tools/dcf/page.tsx` + `src/components/ui/index.tsx`
- Provenance/trace (the differentiator): `src/components/shared/{ProvenanceBadge,CalculationTrace}.tsx`, `src/lib/calculation-trace.ts`
- Shared data / model pre-fill (why tools behave as modules): `src/store/{global-data-store,financial-model-selectors,use-model-data}.ts`
- Pure financial engine (keep pure): `src/lib/calculations.ts` · Import pipeline: `src/lib/importer/*` · Export: `src/lib/memo-export.ts`

## Backend key files (Phase 1)
- Centralized env config (only reader of `process.env`): `src/lib/env.ts` · Guide: `docs/environment.md`
- Prisma client singleton: `src/lib/db.ts` · Schema: `prisma/schema.prisma`
- Better Auth config: `src/lib/auth.ts` · Route: `src/app/api/auth/[...all]/route.ts`
- BullMQ + Valkey: `src/lib/queue.ts` · Example job: `src/jobs/example.ts` · Example worker: `src/workers/example.worker.ts`
- Service layer (Prisma helpers): `src/services/prisma.ts`
- Domain modules: `src/modules/{users,workspaces,uploads,ocr,extraction,normalization,spreadsheet,valuation,exports}/service.ts`
- Worker lifecycle: `src/lib/workers.ts` · Server startup: `src/instrumentation.ts`
- Docker: `docker-compose.yml`
- Backend architecture reference: `docs/backend.md` · Database reference: `DATABASE.md` · Backend summary: `BACKEND.md`

## Hard rules
- Obey `DESIGN.md`: use tokens, never raw hex/px/font literals in `app/**` or `components/**`.
- Keep `src/lib/calculations.ts` pure.
- No fake enterprise/backend claims; never store credentials in frontend/localStorage.
- All runtime config flows through `src/lib/env.ts` (the only file that may read `process.env`); real secrets go in `.env.local` only. See `docs/environment.md`.
- Don't blindly `npm audit fix --force` (known `xlsx` advisory).
- Preserve Playwright route coverage; test affected routes when changing spreadsheet/backup behavior.
- Verify before done on a **real local checkout**: `npm.cmd exec tsc -- --noEmit` · `npm.cmd run lint` · `npm.cmd run build` · relevant Playwright routes. The agent sandbox can report **false** syntax errors from NUL-corrupted mounts — treat repo contents (editor view) as the source of truth and never rewrite working code to satisfy phantom errors. Full rules: `AI_EXECUTION_RULES.md`.

## Agent coordination
- **Claude & Codex — equal peers, full authority** over all work *including architecture* (command language, multi-panel workspace, nav restructure, compare/entity-pivot, provenance). Either can take any ticket in `CODEX_TICKETS.md`; they're used interchangeably.
- **DeepSeek** — self-contained visual/theme + product tasks per `DEEPSEEK_TASKS.md` only. No architectural changes; don't restyle the command palette.
- **Avoiding collisions (the only real constraint):** `CODEX_TICKETS.md` is the shared ledger both agents read *and* write. Claim a ticket by marking its box `[~] — <agent> <date>` before you start; scan for existing `[~]` marks before taking one (especially `[architectural]` T16–T18). That's how each agent sees what the other has open. Flip to `[x]` when done. Small independent tickets: same lightweight claim.
- **Rule:** implement, don't expand scope beyond the ticket; flag ambiguity instead of guessing; tick checklist boxes in the owning doc; don't delete task files.
