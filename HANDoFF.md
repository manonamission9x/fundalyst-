# Fundalyst Handoff

Last updated: 2026-07-02 (Spreadsheet & Data-Flow Redesign — "The Living Workspace")

## Latest change (2026-07-02) — Spreadsheet & Data-Flow Redesign (Phases 0–3)

Complete architectural rewrite per `HANDOFF_SPREADSHEET_DATAFLOW.md`. Absorbs T8/T10/T11, lays substrate for T14/T17.

### Phase 0/1 — Unified data flow (Pillar A)
- **Write API** in `global-data-store.ts`: `writeCell`, `upsertFact`, `renameMetric`, `deleteFact`, `addPeriod`, `removePeriod`, `applyEdits`, `deleteMetric`. All mutations are immutable updates with `userOverridden: true` + provenance preservation. `notifyModelUpdated()` debounced at ~80ms so fast typing triggers one downstream recompute, not hundreds.
- **`ModelBoundSpreadsheet`** (`src/components/input/ModelBoundSpreadsheet.tsx`): Adapter that wraps `SpreadsheetInput` to read from and write to the canonical model. Every cell commit → `applyEdits` → debounced `notifyModelUpdated()` → all `useModelData` readers re-extract → charts/tools/ratios live-update.
- **Grid helpers** in `financial-model-selectors.ts`: `datasetToGrid()` (model → grid shape) and `gridToEdits()` (grid changes → write API calls).
- **DCF page refactored** (`src/app/tools/dcf/page.tsx`): Replaced local `sheetRows` state with `ModelBoundSpreadsheet`. DCF compute reads directly from the canonical model. Removed Load sample / empty-state (only shows when no dataset exists). Provenance read from model facts.
- **CellEdit type** exported from `global-data-store.ts` for cross-module use.

### Phase 2 — Workspace Grid (Pillar B)
- **`WorkspaceGrid`** (`src/components/workspace/WorkspaceGrid.tsx`): Option B per handoff (no `contentEditable`-per-cell). Virtualized DOM grid with single floating `<input>` overlay. Features:
  - Windowed rendering (only visible rows + buffer)
  - Sticky header with period column labels
  - Provenance dots per metric row (green=imported, grey=override, caution=low-conf)
  - Keyboard navigation (arrows, Tab, Enter, F2, Esc, Home/End)
  - Type-to-replace: typing on a selected cell immediately enters edit mode
  - Ctrl+C/V/X clipboard via `navigator.clipboard`
  - Ctrl+A select all, Delete/Backspace clear cells
  - Shift+click range selection
  - Scroll-cell-into-view on navigation
  - Reads from canonical model via `datasetToGrid`, writes via store write API
- glide-data-grid not used (React 19 incompatibility — peer dep requires React 18).

### Phase 3 — AI context substrate
- **`workspace-context-store.ts`**: Tiny zustand store (`useWorkspaceContextStore`) that always reflects the current workspace context (active dataset, sheet, selection range, active cell). `describeContext()` + `getSelectedFacts()` produce the exact payload a future T14 "Explain this" will consume. No AI answer shipped — just the socket.

### Verification
- `tsc --noEmit`, `lint`, `build`, and Playwright e2e need to be run on the real Windows checkout (sandbox has no network access).

### Tickets absorbed
- `CODEX_TICKETS.md`: T8 [x], T10 [x], T11 [x], T14 [substrate ready], T17 [~] (substrate laid, tiling is next).

### Follow-up pass (Claude) — integration completion + review

- **Correction to a false alarm:** an audit initially reported ~13 files as truncated/NUL-corrupted and `tsc` failing. That was **an artifact of the sandbox's unreliable shell mount** serving garbled reads (also the source of git "improper chunk offset" errors), NOT real damage. Verified via the file tools that all files are intact. No `git restore` was performed. **Build/typecheck cannot be trusted from the sandbox — run them on the real Windows checkout.**
- **Selection → context store is now live (T14 seam wired):** `SpreadsheetInput` gained an optional `onActiveCellChange(row,col)` callback; `ModelBoundSpreadsheet` translates row/col → canonical `{metric, periodLabel}` and calls `useWorkspaceContextStore.setActiveCell`. So focusing a cell in DCF/WC/Ratios now populates the AI context substrate.
- **Trends + Growth now write back to the model:** their existing change handlers additively call `gridToEdits` + `applyEdits`, guarded by `activeDatasetId && !isSampleLoaded` (so sample/manual data never pollutes the canonical model). Editing there now propagates live like the other tools. Rendering/CSV/sample/chart features preserved (no risky component swap).
- **Model-first guard:** Trends + Growth hide "Load sample" when an imported dataset is active (returning users work on their document, not sample data). DCF/WC/Ratios were already model-first (empty state only when `!hasData`).
- **Intentionally left as-is:** **Peer** (multi-company — does not fit the single-dataset canonical model; needs T12 multi-entity work) and **Filing** (two-filing comparison tool, not a single-dataset editor) keep their local `ToolSpreadsheet` + sample flow. Migrating them would be wrong, not incomplete.
- **T13 editable spread restored:** Hermes's DCF page rewrite had dropped the editable/persisted bull-bear spread UI (scenarios rendered with default deltas only). Re-wired: the DCF page again reads the persisted `scenarioConfig` from `useDCFStore`, feeds the deltas into `computeDCFScenarios(opts)`, and renders the editable Growth±/WACC∓/Terminal± controls + "Reset spread" in the Scenario Range card (`.dcf-scenario-ctrls`). Engine untouched/pure.

**Verify locally before shipping:** `npm.cmd exec tsc --noEmit` · `npm.cmd run lint` · `npm.cmd run build` · Playwright `/` + tool routes. Manual: import a report, edit revenue in the grid, confirm trends/DCF/ratios move live.

---

## Latest change (2026-07-02) — Returning-user launchpad redesign ("Mission Control")

The `.lp-resume` banner was replaced with a richer `.lp-launch` card when a dataset exists.

- **Card layout:** Three vertical zones — identity (kicker + document title + meta/tags), command console bar (focal element), verb chips. "Open workspace" demoted to quiet underlined link.
- **Graphite Depth:** `--gradient-graphite` (surface sheen) + `--glow-launchpad` (top-left radial) + dissolving `--ledger-grid` via `::before`/`::after` pseudo-elements.
- **Command bar:** Full-width `<button>` styled as input. Opens existing palette via `fundalyst:open-palette`. No second parser created. `aria-label="Open command bar"`.
- **Verb chips:** Four real routes — Build valuation (`/tools/dcf`), Compare periods (`/research/filing`), Peer set (`/tools/peer`), Ratios (`/tools/ratios`).
- **Green:** Used only for the `.lp-launch-live` data-ready dot. Slate `--primary` does all wayfinding.
- **Cleanup:** Removed `.lp-resume`, `.home-resume`, `.home-command-hint`, `.lp-cmd` CSS classes and hero command button. Retired dead Phosphor imports.
- Updated `DESIGN.md §10` with `.lp-launch` pattern + new tokens.
- Commits: `3e1d52f`.

## Latest change (2026-07-02) — T13 DCF scenario manager finished

Completed T13. The pure engine `computeDCFScenarios` and the "Scenario Range" card
(bear/base/bull IV vs current price) were already present from commit `c1c9137`; what
was missing per the ticket's Done criteria was persistence + genuine stored assumption
sets. Added:
- `src/store/index.ts` — `useDCFStore` now wraps `persist` (key `fundalyst-dcf`, v1,
  `partialize` → only `scenarioConfig`). New `scenarioConfig` {growthDelta, waccDelta,
  terminalDelta}, `setScenarioConfig`, `resetScenarioConfig`, and exported
  `DEFAULT_DCF_SCENARIO_CONFIG` (3/2/1). Live `summary`/`sens` stay session-only.
- `src/app/tools/dcf/page.tsx` — reads `scenarioConfig`, passes deltas into
  `computeDCFScenarios(opts)`, and renders editable spread controls (growth ±, WACC ∓,
  terminal ±) + "Reset spread" in the Scenario Range card. Engine untouched (pure).
- `src/app/globals.css` — `.dcf-scenario-ctrls .num-input { width: 5rem }` (no new utility
  needed; project uses hand-rolled utilities, not Tailwind — there is no `w-20`).

Verified `tsc --noEmit` + `eslint` clean on changed files. `next build`, vitest and
Playwright can't run in the Linux sandbox (Windows-only SWC/rolldown native binaries, no
network) — run them on a real Windows checkout.

---

## Latest change (2026-07-02) — v6 landing/marketing redesign

Landing page reinvented and a v6 design layer added on top of v5 (Institutional Slate),
scoped to *marketing surfaces only* (landing + about); tool pages untouched.

- `src/app/globals.css` — appended a `v6 "Living Ledger"` block at the very end: new
  `--text-4xl/-5xl`, `--ease-out`, `--ledger-grid` tokens; `.fnd-reveal` entrance motion
  (reduced-motion + touch safe); `.lp-*` landing patterns (ambient hero, numbered section
  rhythm, question-first tool cards, trust strip/columns, final CTA, resume banner);
  restructured `.site-footer`. All token-based, no raw component colours.
- `src/app/page.tsx` — full rewrite to the `.lp-*` system. Tool cards now surface each
  tool's `ToolMetadata.answer` (the question it settles). Stagger via `d(ms)` helper.
- `src/app/layout.tsx` — richer structured footer (brand + tag, quick links, legal row).
- `src/components/ui/index.tsx` — `PageHeader` gained an optional `kicker` prop.
- `src/app/about/page.tsx` — uses the new kicker + sharper title.
- `DESIGN.md` — documented as §10 (keep in sync; no silent drift).

NOTE: verified statically (authoring + full read-through); a local `tsc/build/e2e` run is
still recommended on a real checkout — the sandbox used for this pass had an unreliable
shell mount, so no compiler run was captured here.

---

Last updated: 2026-07-02 (returning-user launchpad + landing polish)

Repo: `C:\Users\kingo\Desktop\fundalyst-next`  
GitHub: `https://github.com/manonamission9x/fundalyst-`  
Branch: `main`  
Latest code commit: `3e1d52f` — Returning-user launchpad redesign (Mission Control)
Push status: pushed to `origin/main`.

## Current Product State

Fundalyst is a client-side financial analysis app for imported/manual company financials. It is a credible local analyst tool, not an enterprise platform.

Real today: local import/review for CSV/XLSX/PDF/OCR/image/manual data, Filing comparison, Trends, Growth rates, DCF valuation with provenance-labeled assumptions, Cash efficiency, Financial Ratios, Peer comparison with institutional analytics, Workspace command center, source-linked calculation trace panels, investment memo export, provenance badges, and EV/EBITDA/EV/Sales/P/E/P/B/FCF Yield/ROIC/ROCE helpers.

Not real: cloud auth, organization tenancy, server RBAC, multi-user collaboration, retained audit logs, cloud/database persistence, data-provider APIs, credential vault, or cloud sync.

## Stack

Next.js 16 App Router, React 19, TypeScript strict, Zustand localStorage, Recharts, Vitest, Playwright, global CSS.

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Design Direction

`DESIGN.md` is the canonical design-language reference.

Fundalyst should feel like professional financial software: calm, deliberate, dense, typographic, source-first, and trustworthy. Avoid generic AI SaaS patterns, decorative grids, glass/glow effects, fake dashboards, startup claims, and visual flourishes that do not improve comprehension.

Current design system:

- Dark default, restrained slate accent, light mode supported.
- Primary action weight comes from inversion (`--text` on `--bg`), not a brand hue.
- Color is reserved for meaning: green = positive/imported/ready, red = negative/risk, caution = warning/default assumption.
- Purple was intentionally removed from provenance surfaces. Legacy `--violet` token names now map to slate for compatibility.
- Monospace is used for data, labels, codes, and numbers. Prose/headings use the system sans stack.
- Homepage and Workspace should lead with real product/workflow content, not marketing decoration.

## Recently Completed

### Homepage Institutional Redesign

- Replaced the centered marketing hero with a left-aligned, typographic product narrative.
- Made `Analyze an annual report` the dominant primary CTA.
- Replaced artificial dashboard/DCF preview with an extracted financial statement surface showing source/provenance, periods, YoY changes, and mapped metrics.
- Removed decorative hero grid/glow styling and stale homepage preview CSS.
- Reworked sections into a clearer narrative: hero, trust facts, workflow, analyst outputs, trust rationale, final CTA.
- Replaced inline/manual SVG tool icons in the homepage with Phosphor icons.

### Workspace Design Pass

- Tightened Workspace into a more professional analyst control surface.
- Reworked the empty-state hero around the source-data workflow and the primary annual-report CTA.
- Made sidebar/workflow navigation denser and more deliberate.
- Replaced workflow icons with Phosphor icons.
- Fixed mobile Workspace navigation so route labels no longer overlap.
- Kept local backup/settings controls available but visually secondary.

### Provenance Color Cleanup

- Removed the purple inferred/computed provenance appearance.
- Updated `DESIGN.md` so inferred provenance is slate, not violet/purple.
- Browser checks confirmed zero purple-ish computed colors on homepage/workspace.

## Key Files

| Path | Purpose |
|------|---------|
| `DESIGN.md` | Canonical design language and token rules |
| `src/app/globals.css` | Global design tokens, component styles, homepage/workspace CSS |
| `src/app/page.tsx` | Homepage |
| `src/app/workspace/page.tsx` | Research workspace |
| `src/components/layout/Nav.tsx` | Global nav, dropdowns, mobile menu, theme toggle |
| `src/components/shared/ProvenanceBadge.tsx` | Provenance badge |
| `src/lib/calculations.ts` | Pure financial engine |
| `src/lib/calculation-trace.ts` | Source-fact trace helpers and provenance helpers |
| `src/lib/memo-export.ts` | Investment memo generation |
| `src/lib/chart-theme.ts` | Dynamic CSS-token chart config for Recharts |
| `src/store/index.ts` | Tool-local persisted stores |
| `src/store/financial-model-selectors.ts` | Tool-specific imported-data extractors |
| `src/store/importer-store.ts` | Import lifecycle and source switching |
| `src/lib/importer/parser.ts` | CSV/XLSX/PDF/OCR parse-to-review flow |
| `src/lib/importer/ocr.ts` | Browser OCR/PDF rendering path |
| `src/lib/importer/pdf-importer.ts` | PDF text extraction and OCR fallback orchestration |

## Verification

Latest verification:

```bash
npm.cmd exec tsc -- --noEmit  # passes
npm.cmd run lint              # 0 errors, 3 known warnings
npm.cmd run build             # passes
```

Playwright visual checks were run for:

- `/` desktop
- `/workspace` desktop
- `/workspace` mobile

Known lint warnings:

- `src/app/import/page.tsx`: `next/no-img-element`
- `src/components/import/PdfViewer.tsx`: `next/no-img-element`
- `src/app/research/growth/page.tsx`: React hook exhaustive-deps warning for `parseWithText`

## Known Risks / Later Work

- `xlsx` has a high-severity advisory with no fix. Mitigations and plan live in `docs/xlsx-risk-plan.md`. Do not blindly run `npm audit fix --force`.
- Scanned-PDF OCR is review-required, not trusted automation. Accuracy work should add row/column consistency checks, flag row-level value-count mismatches, and expose suspicious rows more prominently.
- Excel-native memo export with live formulas is not built.
- DCF scenario manager (T13) is done: bear/base/bull via pure `computeDCFScenarios`; the spread (growth/WACC/terminal deltas) is now a persisted, user-editable `scenarioConfig` in `useDCFStore` (localStorage key `fundalyst-dcf`, `partialize`d to config only).
- Real backend remains future work: auth, tenancy, RBAC, persistence, immutable audit, collaboration.

## Rules

- Do not add fake enterprise/backend claims.
- Do not store provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage.
- If changing spreadsheet behavior, test all affected routes.
- If changing backup/restore, test plain and encrypted export/import.
