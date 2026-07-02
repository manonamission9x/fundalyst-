# Fundalyst Handoff

Last updated: 2026-07-02 (v6 "Living Ledger" marketing-surface redesign)

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

Prior update: 2026-07-01 (homepage + workspace institutional design pass)

Repo: `C:\Users\kingo\Desktop\fundalyst-next`  
GitHub: `https://github.com/manonamission9x/fundalyst-`  
Branch: `main`  
Latest code commit: current `HEAD` - Homepage and workspace institutional redesign
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
