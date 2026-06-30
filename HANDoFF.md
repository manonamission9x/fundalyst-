# Fundalyst Handoff

Last updated: 2026-06-30 (evening)

Repo: `C:\Users\kingo\Desktop\fundalyst-next`
GitHub: `https://github.com/manonamission9x/fundalyst-`
Branch: `main`

## Current Product State

Client-side financial analysis app for imported/manual company financials. Credible local analyst tool, not an enterprise platform.

**Real today:** Local import/review (CSV/XLSX/PDF/OCR/image/manual), import review with collapsed low-confidence-only mapping table, Filing comparison, Trends, Growth rates, DCF valuation (with provenance-labeled assumptions), Cash efficiency, Financial Ratios, Peer comparison (with institutional analytics), Workspace command center (local projects, role simulation, audit events, snapshots, thesis, encrypted backup/restore), source-linked calculation trace panels (Filing, DCF, Ratios, WC, Trends, Growth, Peer), **investment memo export** (markdown/HTML), **provenance badges** on every visible metric (imported/manual/default/inferred/unavailable), **EV/EBITDA, EV/Sales, P/E, P/B, FCF Yield, ROIC, ROCE** calculation helpers.

**Not real:** Cloud auth, organization tenancy, server RBAC, multi-user collaboration, retained audit logs, cloud/database persistence, data-provider APIs, credential vault, cloud sync.

## Stack

Next.js 16 App Router - React 19 - TypeScript strict - Zustand (localStorage) - Recharts - Vitest - Playwright - Global CSS (`src/app/globals.css`)

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Routes

`/` `/import` `/workspace` `/research/filing` `/research/trends` `/research/growth` `/tools/dcf` `/tools/wc` `/tools/ratios` `/tools/peer` `/about`

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/workspace/page.tsx` | Workspace command center, projects, governance, audit, thesis, backup/restore, **memo export button** |
| `src/store/enterprise-store.ts` | Backendless enterprise state (projects, members/roles, audit, versions) |
| `src/lib/enterprise-backup.ts` | Web Crypto encrypted workspace backup/restore, allowlisted keys |
| `src/store/global-data-store.ts` | Canonical dataset store with audit events + tool readiness checks |
| `src/store/importer-store.ts` | Import review/confirmation |
| `src/app/import/page.tsx` | Import workflow with collapsible mapping table, friendly labels, success banner |
| `src/components/input/SpreadsheetInput.tsx` | Shared Excel-like grid with ARIA roles/accessibility |
| `src/components/input/ToolSpreadsheet.tsx` | Tool-specific spreadsheet defaults |
| `src/components/layout/Nav.tsx` | Global nav with desktop tabs + mobile hamburger menu |
| `src/lib/calculations.ts` | Pure financial engine — DCF, WC, ratios, **institutional analytics (EV/EBITDA, P/E, ROIC, ROCE, etc.)** |
| `src/lib/calculation-trace.ts` | Source-fact trace helpers + **provenance helpers** |
| `src/lib/memo-export.ts` | **Investment memo generation and markdown/HTML export** |
| `src/components/shared/CalculationTrace.tsx` | Reusable "Show sources" panel with ARIA labels |
| `src/components/shared/MissingMetricsNotice.tsx` | **Reusable missing-metric alert per tool** |
| `src/components/shared/ProvenanceBadge.tsx` | **Reusable provenance badge (imported/manual/default/inferred/unavailable)** |
| `src/store/financial-model-selectors.ts` | Tool-specific data extractors + **peer extractor for institutional analytics** |
| `src/app/globals.css` | All styles — design system v2, cool indigo + warm monochrome, mobile + a11y rules |
| `src/lib/importer/tool-validation.ts` | Tool metric requirements + validation checks |
| `src/lib/importer/types.ts` | Canonical types + `TOOL_METRICS` with `missingMessage` field |

## Data Flow

```text
CSV/XLSX/PDF/OCR/manual -> import parser -> FundalystDataset -> global-data-store -> financial-model-selectors -> tools & Workspace
                                                            ↘ provenance helpers → provenance badges per metric
```

## Verification

```bash
npm.cmd test          # 58 passed
npm.cmd run lint      # 0 errors, 13 warnings (pre-existing)
npm.cmd run build     # passed — 14 static routes
npm.cmd run test:e2e  # 20/25 passed (5 page-title timing failures on Trends/Growth/WC)
```

## Audit

`xlsx` high-severity advisory (no fix). Mitigated with 15s timeout + `structuredClone()` sandboxing in `src/lib/importer/parser.ts` and `src/lib/helpers.ts`. See `docs/xlsx-risk-plan.md` for full plan.

## Known Issues

- 5 e2e tests fail with page-title timing issues on Trends, Growth, and WC pages (pages load with default title instead of tool-specific title — likely client hydration timing). Fix: investigate render-sequence issue in these pages.
- `import/page.tsx` has a pre-existing TS type-narrowing warning (no build error).
- `growth/page.tsx` pre-fill effect has missing exhaustive-deps (pre-existing, stable).
- `memo-export.ts` has 3 unused-variable warnings (fmtMult, provenanceMap, encodedCompany — cleanup welcome).
- `InstitutionalResult` type import unused in `peer/page.tsx` (type inference covers it).

## Next Work

1. **Fix e2e title failures** — Trends, Growth, WC pages show default title instead of tool title. Investigate hydration timing.
2. **DCF scenario manager** — Bull/Base/Bear cases with assumption versioning and sensitivity export.
3. **Backend API boundary scaffold** — Typed service interfaces to replace Zustand.
4. **Real backend** — Auth, tenancy, RBAC, persistence, immutable audit, collaboration.
5. **Clean up memo-export.ts unused vars** — Remove fmtMult, provenanceMap, encodedCompany if not needed.

## Rules

- No fake enterprise/backend claims.
- No provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage. If changing spreadsheet behavior, test all routes.
- If changing backup/restore, test plain + encrypted export/import.
