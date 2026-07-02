# Fundalyst Handoff

**The single status doc — current snapshot + rolling changelog.** (Formerly split into
`CURRENT_STATUS.md`; merged here 2026-07-02. Update *this* file; there is no separate status doc.)

Last updated: 2026-07-02
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

```bash
npm.cmd exec tsc -- --noEmit   # run locally — must be 0 errors
npm.cmd run lint               # run locally — ~4 known pre-existing warnings expected
npm.cmd run build              # run locally
npx playwright test            # run locally (affected routes)
```

Known lint warnings (pre-existing): `import/page.tsx` + `PdfViewer.tsx` `next/no-img-element`; `research/growth/page.tsx` hook exhaustive-deps for `parseWithText`.

---

## Changelog (newest first)

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

Next.js 16 (App Router) · React 19 · TypeScript strict · Zustand + `localStorage` · Recharts · PDF.js · tesseract.js · Vitest · Playwright · global CSS (tokens in `src/app/globals.css`). Windows: use `npm.cmd`.

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
| `DESIGN.md` | Canonical design language & tokens |

### Rules

- Use tokens — never raw hex/px/font literals in `app/**` or `components/**`.
- Keep `src/lib/calculations.ts` pure (no store access, no side effects).
- No fake enterprise/backend claims; never store credentials in frontend/localStorage.
- No network calls from core analysis code — the privacy promise is non-negotiable.
- Don't blindly `npm audit fix --force` (known `xlsx` advisory).
- Preserve Playwright route coverage; test affected routes when changing spreadsheet/backup behaviour.
- Read financial data via `useModelData`/selectors; write via the store write API — never hold or mutate a private copy.
