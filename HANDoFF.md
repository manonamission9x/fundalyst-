# Fundalyst Handoff

**The single status doc — current snapshot + rolling changelog.** (Formerly split into
`CURRENT_STATUS.md`; merged here 2026-07-02. Update *this* file; there is no separate status doc.)

Last updated: 2026-07-02 (backend Phase 1 infrastructure — Hermes)
Repo: `C:\Users\kingo\Desktop\fundalyst-next` · GitHub: `https://github.com/manonamission9x/fundalyst-` · Branch: `main`
Latest code commit: `3e1d52f` — Returning-user launchpad redesign (Mission Control). Pushed to `origin/main`.

> **Orientation:** active tickets → `CODEX_TICKETS.md` (Claude/Codex) + `DEEPSEEK_TASKS.md` (DeepSeek).
> Architecture/data flow → `ARCHITECTURE.md`. Visual system → `DESIGN.md`. What/why the project is → `PROJECT.md`.

---

## Current snapshot

### What works (shippable)

| Feature | Notes |
|---|---|
| Import CSV/XLSX/PDF/OCR/screenshot/manual | Multi-format import with confidence scoring |
| Filing comparison | Period-over-period diff with highlights |
| Trend charts | Multi-metric line/bar charts |
| Growth rates | CAGR, YoY percentages |
| DCF valuation | Sensitivity analysis, scenario manager (bear/base/bull, editable+persisted spread), calculation trace |
| Cash efficiency | DSO, DIO, DPO, CCC |
| Financial ratios | Net profit margin, ROE, Debt/Equity, Debt/Assets, Asset Turnover |
| Peer comparison | Multi-company benchmarking with bar charts, CSV export |
| Research workspace | Cockpit with workflow sidebar, data panel, evidence/assumptions, backup/restore |
| Investment memo export | Markdown export aggregating DCF+ratios+thesis |
| Provenance + trace | Every value knows its source; every calculation has an auditable trace |
| Unified data flow (Pillar A) | Model-bound grids write back to the canonical model; live-update across all surfaces |
| Workspace grid (Pillar B) | Virtualized, keyboard-complete, overlay-input grid with provenance dots |
| Theme | Dark default + light mode, toggleable |
| Keyboard | Cmd/Ctrl+K palette, `g`-then-key go-to, `?` overlay, shortcut guards inside inputs |
| Returning-user launchpad | "Mission Control" card on home when a dataset exists |
| v6 marketing surfaces | Ambient hero, numbered section rhythm, question-first tool cards |
| Design system | Tokenised colours, typographic scale, provenance-first, institutional minimalism |

### In progress

| Ticket | Title | Agent |
|---|---|---|
| T17 | Multi-panel tiling workspace (substrate laid: WorkspaceGrid + context store; tiling is next) | Hermes 2026-07-02 |

Open tickets by priority (see `CODEX_TICKETS.md` for full descriptions):
- **Quick wins:** T1 (command language v1), T2 (keyboard system), T5 (inline provenance dots), T6 (analyst-arc ordering), T7 (cleanup)
- **Medium:** T9 (clickable cross-linking), T12 (company switcher), T14 (grounded AI), T15 (Excel export), T16 (command language v2)
- **Major:** T17 (multi-panel workspace, substrate done), T18 (command language v3), T19 (review gate)

### Not real (future work)

Cloud auth / org tenancy / server RBAC · multi-user collaboration · retained audit logs · cloud/database persistence · live market data / data-provider APIs · credential vault / cloud sync · grounded AI explanations (T14 — substrate built, feature not shipped) · multi-panel tiling (T17 — substrate laid, tiling not built) · Excel-native memo export with live formulas (T15).

### Known risks

| Risk | Mitigation / status |
|---|---|
| `xlsx` high-severity advisory (no fix) | Runs only on user-uploaded files, not remote data. See `docs/xlsx-risk-plan.md`. **Do not** `npm audit fix --force`. |
| Scanned-PDF OCR is review-required | Not trusted automation. Future: row/column consistency checks, flag value-count mismatches, surface suspicious rows. |
| Peer & Filing not model-bound | By design: Peer is multi-company (needs T12); Filing is a two-filing comparison. Both keep the local `ToolSpreadsheet` + sample flow. Trends & Growth **do** write back (guarded to imported datasets). |
| Canvas colour in `PdfViewer` uses raw hex | Should read via `getComputedStyle` — flagged in `DESIGN.md §9`. |
| Real backend | Out of scope: auth, tenancy, RBAC, cloud persistence, immutable audit, collaboration. |

### Verification

> ⚠️ **Not verified in the agent sandbox.** The sandbox has an unreliable file mount that corrupts
> what `tsc`/`git` read, so no compile result from it is trustworthy (it once produced fake
> "13 files corrupted" + `tsc` failures that were pure mount artifacts). Recent edits were authored
> and reviewed but **must be compiled on a real Windows checkout before shipping.** Do not assume green.
> **Canonical rule: `AI_EXECUTION_RULES.md`** — treat repo contents (editor view) as the source of
> truth over sandbox compiler output, and never rewrite working code to satisfy phantom syntax errors.

```bash
npm.cmd exec tsc -- --noEmit   # run locally — must be 0 errors
npm.cmd run lint               # run locally — ~4 known pre-existing warnings expected
npm.cmd run build              # run locally
npx playwright test            # run locally (affected routes)
```

Known lint warnings (pre-existing): `import/page.tsx` + `PdfViewer.tsx` `next/no-img-element`; `research/growth/page.tsx` hook exhaustive-deps for `parseWithText`.

---

## Changelog (newest first)

### 2026-07-02 — Ticket batch: T1/T2/T5/T6/T9/T12/T14/T15 done; T7/T16 partial (Claude)

Worked the open Codex queue one by one. **All edits authored + reviewed via the file tools but NOT compiled** — the agent sandbox's bash mount still reads many files as NUL-corrupted (a fresh `tsc` here reported fake "Unterminated string literal"/"Invalid character" across `filing`, `about`, `layout`, `page`, `import` etc., exactly the documented artifact). **Run `npm.cmd install && npm.cmd exec tsc -- --noEmit && npm.cmd run lint && npm.cmd run build` on the Windows checkout before shipping.**

- **T1 — Command language v1** (`CommandPalette.tsx`): verb + optional `<company>` arg (`ratios reliance` switches `activeDatasetId` then routes; resolved company shown; unmatched arg shown as "no match", never fires ambiguous). Special verbs `memo`/`thesis`/`evidence`/`theme`/`clear`/`help`. New `matchDataset()`.
- **T2 — Keyboard**: added `e` = export memo (guarded off-input); refreshed `?` cheat-sheet + `g`-toast (`g t`/`g p`/`e`).
- **T5 — Inline provenance dot**: new `ProvenanceDot` (`ui/index.tsx`) + `.prov-dot-*` tokens; applied to `CalculationTrace` source values.
- **T6 — Analyst-arc order**: canonical Filing→Trends→Growth→Ratios→Cash→DCF→Peers drives `TOOL_METADATA` (→ palette), Nav Valuation group, workspace deep-dive, home cards. New `ANALYST_ARC` + entity-aware `ArcNextLinks` replaced all 7 static `NextLinks`.
- **T9 — Cross-linking / entity pivot**: peer name → switch active dataset on match; growth metric → `/research/trends?metric=` (trends reads `?metric`, focus note + row highlight + scroll); trace→source jump already present.
- **T12 — Company switcher**: Nav badge → dropdown switcher over `datasets[]` (filter >5, switch, Add/Coverage/Compare). New `.nav-switcher*` styles.
- **T14 — Grounded AI (local/offline)**: new `src/lib/grounded-ai.ts` (`explainTrace`, `draftThesisFromEvidence`) — deterministic, no network, privacy-safe. Opt-in "Explain" on every trace panel (labeled, cited); "Draft from evidence" in `ThesisPanel` pre-fills editable notes (never auto-saved).
- **T15 — Excel live formulas**: `buildDCFWorkbook`/`downloadDCFExcel` in `memo-export.ts` (SheetJS formula cells mirroring `computeDCF`; cached values match app). Button on DCF results + palette `?export=1`.
- **T7 — Cleanup (partial)**: `/debug-import` unlinked (confirmed); `.home-card*`/`.home-grid` already gone; `PdfViewer` canvas backdrop reads `--bg-elevated` via `getComputedStyle`; removed duplicated ≤420/≤820/≤768px mobile `@media` clusters (byte-identical → no visual change). **Remaining:** inline-style sprawl (`import`/`ui`/`workspace`), ≤640px duplicated tail.
- **T16 — Command v2 (partial)**: added parsed-interpretation `↵ <action>` confirmation line to the palette. **Deferred:** persistent always-visible bar + inline mini-results (overlaps T17; needs visual verification).
- **T19 — Review gate**: not started (large import-review rework; unsafe without compile/Playwright).

### 2026-07-02 — Backend Phase 1 infrastructure (Hermes)

**Backend foundation established.** PostgreSQL, Prisma 7, Better Auth, BullMQ + Valkey, Docker Compose, domain-based project structure, and comprehensive documentation.

- **Docker Compose** (`docker-compose.yml`): PostgreSQL 17 + PostGIS (port 5432) + Valkey 8 (port 6379) with persistent volumes and health checks. Start with `docker compose up -d`.
- **Prisma schema** (`prisma/schema.prisma`): 10 models covering the full domain — `User`, `Account`, `Session`, `Verification` (Better Auth), `Workspace`, `Document`, `ExtractionJob`, `FinancialStatement`, `Spreadsheet`, `DCFModel`, `Scenario`, `AuditLog`. JSONB for flexible data. Soft-delete on workspace/document/spreadsheet/DCFModel. Append-only audit log.
- **Better Auth** (`src/lib/auth.ts` + `src/app/api/auth/[...all]/route.ts`): email/password auth with session management mounted at `/api/auth/*`. Prisma adapter for PostgreSQL persistence. Secret/URL from validated env.
- **BullMQ + Valkey** (`src/lib/queue.ts`): Three queue definitions (`document`, `analysis`, `maintenance`) with exponential backoff, retention policies, and graceful shutdown. IORedis connection shared across all queues/workers.
- **Example job/worker** (`src/jobs/example.ts`, `src/workers/example.worker.ts`): Smoke test queue verifying the full pipeline — enqueue via `POST /api/queue/example`, check status via `GET /api/queue/example`.
- **Domain-based structure** (`src/modules/{users,workspaces,uploads,ocr,extraction,normalization,spreadsheet,valuation,exports}/service.ts`): Business logic organized by domain, not by route. Route handlers call module services.
- **Service layer** (`src/services/prisma.ts`): Prisma query helpers with soft-delete filtering, ownership scoping, and audit logging. Thin wrappers that enforce conventions.
- **Worker lifecycle** (`src/lib/workers.ts` + `src/instrumentation.ts`): Workers start alongside Next.js in development; separate processes in production.
- **Documentation**: `BACKEND.md` rewritten (architecture, layer overview, quick start). `DATABASE.md` updated (dual persistence, server schema, migrations). `docs/backend.md` created (deep reference: stack, architecture diagram, folder conventions, future considerations). `AGENTS.md` doc map updated for backend sections.
- **Auth/queue health endpoints**: `GET /api/health` → capability reporting; `GET /api/queue/example` → queue status; `POST /api/queue/example` → enqueue test job.

**What exists but needs setup:**
- Run `npx prisma generate && npx prisma migrate dev --name init` after Docker is up.
- Set `BETTER_AUTH_SECRET` in `.env.local` (generate with `openssl rand -base64 32`).

### 2026-07-02 — Environment config system + first-class mobile pass (Claude)

**Environment configuration (new subsystem).** Centralised, type-safe env so secrets are never hardcoded/committed and config is validated once. Full guide: `docs/environment.md`.
- `src/lib/env.ts` — the **only** file allowed to read `process.env`. Zod-validated, split `server` (secrets) / `client` (`NEXT_PUBLIC_*`) schemas, one typed `env` export, a Proxy guard that throws if a server-only var is read in the browser, and a `requireEnv()` fail-fast accessor. All server vars are **optional today** (client-only app boots with an empty env); flip a var to required in the schema when the backend actually lands.
- `src/instrumentation.ts` — imports the env module so validation runs once at server startup.
- `.env.example` (committed, **placeholders only**) + `.env.local` (gitignored, real secrets). `.gitignore` bug fixed: `.env*` was also ignoring the template — now ignores real files and keeps `!.env.example`.
- ESLint `no-restricted-properties` blocks `process.env` outside the env module (+ `instrumentation`/config). `zod` pinned in `package.json`. Audit found **zero** prior `process.env` usage and **zero** hardcoded secrets — nothing to migrate.
- **Convention:** new service → add to `.env.example` → add to schema in `env.ts` → export via `env` → document in `docs/environment.md` → never read `process.env` elsewhere.

**Mobile pass (treat phone as a first-class platform; desktop untouched).**
- **Bottom tab bar** — new `src/components/layout/MobileTabBar.tsx` (Home / Research / Tools / Import / Workspace). Thumb-reachable, shown ≤640px only, safe-area aware, `z-index:150` so it tucks under the nav drawer (200) and command palette (300). Surfaces destinations that were previously buried behind the hamburger. The drawer still holds the full section list.
- **Viewport fix** — added `export const viewport` in `layout.tsx` (`viewport-fit=cover` + themeColor). Without it `env(safe-area-inset-*)` resolved to **0**, so all existing safe-area CSS was inert on notched phones.
- **Mobile search** — restored command-palette access via a "Search & commands" row in the drawer (`.nav-cmdk-trigger` is hidden ≤640px with no keyboard alternative on touch).
- **Table/spreadsheet polish** — pinned the spreadsheet "Line Item" column (`.spreadsheet-corner`/`.spreadsheet-metric-cell`) and `.stmt-table` first column while values scroll; added pinned-column edge shadows on diff/sens/stmt; lifted `#toast` above the tab bar. (diff/sens already had sticky col 1 + horizontal scroll + scroll-fade.)
- **Left for other lanes:** pre-existing **duplicate mobile media blocks** in `globals.css` (T7 cleanup); `WorkspaceGrid` (virtualized) uses its own classes, so mobile column-pinning isn't applied there yet.
- ⚠️ **Not compiled in the sandbox** (mount unreliable, as noted below). Run `npm.cmd install && npm.cmd run build` on a real checkout — `npm install` is required because `zod` was added to `package.json`.

### 2026-07-02 — Data-flow follow-up (Claude): integration completion + doc review

- **Correction to a false alarm:** an audit initially reported ~13 files as truncated/NUL-corrupted with `tsc` failing. That was **an artifact of the sandbox's unreliable shell mount** (also the source of git "improper chunk offset" errors), NOT real damage. All files verified intact via the file tools; no `git restore` performed.
- **Selection → context store live (T14 seam):** `SpreadsheetInput` gained optional `onActiveCellChange(row,col)`; `ModelBoundSpreadsheet` translates it to canonical `{metric, periodLabel}` → `useWorkspaceContextStore.setActiveCell`. Focusing a cell in DCF/WC/Ratios now populates the AI substrate.
- **Trends + Growth write back to the model:** their change handlers additively call `gridToEdits` + `applyEdits`, guarded by `activeDatasetId && !isSampleLoaded`. Live propagation like the other tools; CSV/sample/chart features preserved (no risky component swap). "Load sample" hidden when a dataset is active.
- **Intentionally left local:** Peer (multi-company, needs T12) and Filing (two-filing comparison). Migrating them would be wrong, not incomplete.
- **T13 editable spread restored:** Hermes's DCF rewrite had dropped the editable/persisted bull-bear spread UI. Re-wired: DCF page reads `scenarioConfig` from `useDCFStore`, feeds deltas into `computeDCFScenarios(opts)`, renders editable Growth±/WACC∓/Terminal± + "Reset spread" in the Scenario Range card. Engine pure/untouched.
- **Docs review:** corrected the 7 onboarding docs Hermes added — removed a false "build passes" claim, refreshed Trends/Growth status, added a "Tailwind trap" note in `FRONTEND.md` (utilities are hand-rolled in `globals.css`, not Tailwind), fixed `merge`/`partialize` wording in `DATABASE.md`.

### 2026-07-02 — Spreadsheet & Data-Flow Redesign, Phases 0–3 (Hermes)

Architectural rewrite per `HANDOFF_SPREADSHEET_DATAFLOW.md`. Absorbs T8/T10/T11; lays substrate for T14/T17. Tickets: T8 [x], T10 [x], T11 [x], T14 [substrate ready], T17 [~].

- **Pillar A — write API** in `global-data-store.ts`: `writeCell`, `upsertFact`, `renameMetric`, `deleteFact`, `addPeriod`, `removePeriod`, `applyEdits`, `deleteMetric`. Immutable updates, `userOverridden: true` + provenance preserved. `notifyModelUpdated()` debounced ~80ms.
- **`ModelBoundSpreadsheet`** wraps `SpreadsheetInput` to read/write the canonical model → every commit `applyEdits` → debounced notify → all `useModelData` readers re-extract → live update. Grid helpers `datasetToGrid()` / `gridToEdits()` in `financial-model-selectors.ts`. DCF/WC/Ratios refactored to model-bound.
- **Pillar B — `WorkspaceGrid`** (`src/components/workspace/WorkspaceGrid.tsx`): virtualized DOM grid with a single floating `<input>` overlay (no `contentEditable`-per-cell): windowed rendering, sticky header, provenance dots, full keyboard (arrows/Tab/Enter/F2/Esc/Home/End), type-to-replace, Ctrl+C/V/X/A, shift-click range. **glide-data-grid rejected** — its peer dep needs React 18, project is React 19.
- **Pillar C — `workspace-context-store.ts`**: reflects active dataset/sheet/selection/active-cell; `describeContext()` + `getSelectedFacts()` are the T14 payload. No AI shipped — just the socket.

### 2026-07-02 — Returning-user launchpad ("Mission Control") + v6 landing (commit `3e1d52f`)

- `.lp-resume` banner replaced by a richer `.lp-launch` card (identity + command console bar + verb chips; "Open workspace" demoted to a quiet link). Graphite Depth via `--gradient-graphite` + `--glow-launchpad` + dissolving `--ledger-grid`. Command bar is a `<button>` opening the existing palette (`fundalyst:open-palette`) — no second parser. Green only on the `.lp-launch-live` data-ready dot; slate does wayfinding. Removed dead `.lp-resume`/`.home-resume`/`.lp-cmd` CSS. `DESIGN.md §10` updated.
- v6 "Living Ledger" landing layer (marketing surfaces only): `--text-4xl/5xl`, `--ease-out`, `--ledger-grid` tokens; `.fnd-reveal` motion; `.lp-*` patterns; restructured footer. Tool pages untouched.

### 2026-07-02 — T13 DCF scenario manager

`useDCFStore` wrapped in `persist` (key `fundalyst-dcf`, `partialize` → only `scenarioConfig`). New `scenarioConfig` {growthDelta, waccDelta, terminalDelta} + setters + `DEFAULT_DCF_SCENARIO_CONFIG` (3/2/1). DCF page feeds deltas into `computeDCFScenarios(opts)` and renders editable spread controls. Engine pure. (See the follow-up entry — this UI was dropped in the data-flow rewrite and later restored.)

### Earlier — institutional design passes

Homepage institutional redesign (typographic product narrative, real extracted-statement surface, Phosphor icons); Workspace design pass (denser sidebar, mobile nav fix, secondary backup controls); provenance colour cleanup (purple → slate, `--violet` legacy-mapped to slate).

---

## Reference

### Stack

**Frontend:** Next.js 16 (App Router) · React 19 · TypeScript strict · Zustand + `localStorage` · Recharts · PDF.js · tesseract.js · Vitest · Playwright · global CSS (tokens in `src/app/globals.css`). Windows: use `npm.cmd`.

**Backend (optional):** PostgreSQL 17 + PostGIS · Prisma 7 · Better Auth · BullMQ + Valkey · Zod · Docker Compose.

### Design direction

`DESIGN.md` is canonical. Fundalyst should feel like professional financial software: calm, deliberate, dense, typographic, source-first. Dark default + light mode; weight comes from inversion (`--text` on `--bg`), not a brand hue; colour = meaning only (green positive/imported, red negative/risk, caution warning/default, slate wayfinding); mono for data, sans for prose. No generic AI-SaaS decoration, fake dashboards, or startup claims.

### Key files

| Path | Purpose |
|---|---|
| `src/store/global-data-store.ts` | Canonical model + write API |
| `src/store/pipeline-store.ts` | `notifyModelUpdated()` / `onModelUpdate()` pub-sub |
| `src/store/use-model-data.ts` | Universal read hook |
| `src/store/financial-model-selectors.ts` | Model → tool extractors (`datasetToGrid`, `gridToEdits`, `extract*`) |
| `src/store/workspace-context-store.ts` | AI context substrate (T14 seam) |
| `src/store/index.ts` | Per-tool persisted stores (DCF scenarioConfig, etc.) |
| `src/components/input/ModelBoundSpreadsheet.tsx` | Grid adapter: reads/writes canonical model |
| `src/components/workspace/WorkspaceGrid.tsx` | Virtualized overlay-input grid |
| `src/components/input/SpreadsheetInput.tsx` | Legacy contentEditable grid (being replaced) |
| `src/lib/calculations.ts` | Pure financial engine (keep pure) |
| `src/lib/calculation-trace.ts` | Source-fact trace + provenance helpers |
| `src/lib/memo-export.ts` | Investment memo generation |
| `src/app/globals.css` | Design tokens + component/utility styles |
| `src/lib/env.ts` | **Only** reader of `process.env` — typed, validated config (see `docs/environment.md`) |
| `src/instrumentation.ts` | Runs env validation at server startup |
| `src/components/layout/MobileTabBar.tsx` | Bottom tab bar — primary mobile nav (≤640px) |
| `DESIGN.md` | Canonical design language & tokens |
| `docs/environment.md` | Env variables: what/why, required vs optional, server vs client, how to add |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/auth.ts` | Better Auth configuration |
| `src/lib/queue.ts` | BullMQ + Valkey queue infrastructure |
| `src/lib/workers.ts` | Worker lifecycle management |
| `src/services/prisma.ts` | Prisma query helpers with soft-delete/ownership |
| `prisma/schema.prisma` | PostgreSQL schema (12 models) |
| `docker-compose.yml` | PostgreSQL + Valkey local dev |
| `docs/backend.md` | Backend architecture deep reference |
| `BACKEND.md` | Backend summary / quick start |

### Rules

- Use tokens — never raw hex/px/font literals in `app/**` or `components/**`.
- Keep `src/lib/calculations.ts` pure (no store access, no side effects).
- No fake enterprise/backend claims; never store credentials in frontend/localStorage.
- No network calls from core analysis code — the privacy promise is non-negotiable.
- Don't blindly `npm audit fix --force` (known `xlsx` advisory).
- Preserve Playwright route coverage; test affected routes when changing spreadsheet/backup behaviour.
- Read financial data via `useModelData`/selectors; write via the store write API — never hold or mutate a private copy.
- All runtime config flows through `src/lib/env.ts` (the only file that may read `process.env`); real secrets live in `.env.local` only. Extend the schema — never scatter `process.env` or add a second loader. See `docs/environment.md`.
