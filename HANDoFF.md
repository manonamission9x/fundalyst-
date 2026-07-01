# Fundalyst Handoff

Last updated: 2026-07-01 (homepage + workspace institutional design pass)

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
- DCF scenario manager remains future work.
- Real backend remains future work: auth, tenancy, RBAC, persistence, immutable audit, collaboration.

## Rules

- Do not add fake enterprise/backend claims.
- Do not store provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage.
- If changing spreadsheet behavior, test all affected routes.
- If changing backup/restore, test plain and encrypted export/import.
