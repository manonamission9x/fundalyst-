# Fundalyst Handoff

Last updated: 2026-06-30 (late night)

Repo: `C:\Users\kingo\Desktop\fundalyst-next`  
GitHub: `https://github.com/manonamission9x/fundalyst-`  
Branch: `main`  
Latest code commit: `5f1755d` - ingestion/source-switching hardening verified and pushed.  
This handoff update documents that state and the top-right theme-toggle note.

## Git Log (Recent)

```text
5f1755d  Fix: setSheetPeriods uses local periods const, not modelData.data
653b9e2  Fix moon centering: symmetric crescent at (6.5,6.5)
3a42f3f  Fix: centered moon icon, remove ⌘K from search bar
21ef828  Nav redesign: premium UX for the control center
ed17b70  Audit-driven security + governance hardening (P1-P5)
e3b3bc0  Update handoff after C2 C5
a60d377  Collapse desktop nav into dropdown sections
```

## Current Product State

Fundalyst is a client-side financial analysis app for imported/manual company financials. It is a credible local analyst tool, not an enterprise platform.

Real today: local import/review for CSV/XLSX/PDF/OCR/image/manual data, Filing comparison, Trends, Growth rates, DCF valuation with provenance-labeled assumptions, Cash efficiency, Financial Ratios, Peer comparison with institutional analytics, Workspace command center, source-linked calculation trace panels, investment memo export, provenance badges, and EV/EBITDA/EV/Sales/P/E/P/B/FCF Yield/ROIC/ROCE helpers.

Not real: cloud auth, organization tenancy, server RBAC, multi-user collaboration, retained audit logs, cloud/database persistence, data-provider APIs, credential vault, or cloud sync.

## Stack

Next.js 16 App Router, React 19, TypeScript strict, Zustand localStorage, Recharts, Vitest, Playwright, global CSS.

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Design System v3 - Terminal Gold

- Dark default: deep charcoal `#0E0E0F` with gold accent `#C8962E`.
- Light mode: warm off-white `#FAF9F6` with deeper gold `#B07D1F`.
- Theme toggle in nav cycles auto/light/dark and persists to `localStorage` key `fundalyst-theme`.
- Auto mode respects `prefers-color-scheme`.
- Chart colors derive from CSS tokens at runtime.
- `change-up/down/flat` include arrows for color-blind users.

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/calculations.ts` | Pure financial engine: DCF, WC, ratios, institutional analytics |
| `src/lib/calculation-trace.ts` | Source-fact trace helpers and provenance helpers |
| `src/lib/memo-export.ts` | Investment memo generation |
| `src/lib/chart-theme.ts` | Dynamic CSS-token chart config for Recharts |
| `src/components/layout/Nav.tsx` | Workspace hub nav, desktop section dropdowns, mobile hamburger, theme toggle |
| `src/components/layout/CommandPalette.tsx` | Cmd-K route/action palette; do not touch `.cmdk-*` styles unless explicitly scoped |
| `src/components/shared/CalculationTrace.tsx` | Reusable Show sources panel |
| `src/components/shared/MissingMetricsNotice.tsx` | Missing-metric alert per tool |
| `src/components/shared/ProvenanceBadge.tsx` | Provenance badge |
| `src/components/input/SpreadsheetInput.tsx` | Excel-like grid with ARIA roles, undo/redo, paste support |
| `src/store/index.ts` | Tool-local persisted stores; includes `clearAllToolStores()` for import source switching |
| `src/store/financial-model-selectors.ts` | Tool-specific imported-data extractors |
| `src/store/importer-store.ts` | Import lifecycle; blocks no-data parses, clears stale tool state on confirm, marks sample vs uploaded source |
| `src/lib/importer/parser.ts` | CSV/XLSX/PDF/OCR parse-to-review flow; preserves partial-parse warnings and source type |

## Recently Completed

### C2 - Explicit Sample Loading

- Removed auto-injected demo data from store defaults and tool mount effects.
- Fresh Filing, DCF, Trends, and Growth screens now start empty when no import exists.
- Canonical imported-data prefill remains intact.
- Filing, DCF, Trends, and Growth samples moved behind explicit `Load sample` buttons.
- E2E specs now click `Load sample` where sample-driven assertions are intended.
- Commit: `5fe100d`.

### C5 - Nav IA

- Desktop nav now makes Workspace the primary hub and collapses deep routes behind Research, Valuation, Data, and Tools dropdown triggers.
- Mobile hamburger overlay remains grouped and includes Workspace.
- Added Playwright coverage for desktop dropdown route reachability, Escape close behavior, and mobile hamburger availability.
- Dev-server browser check passed: dropdowns open/close, DCF route reachable, nav height shift `0`, mobile menu opens/closes, Workspace visible.
- Commit: `a60d377`.

### Audit-Driven Ingestion + Source Switching

- Empty/no-data uploads are rejected with a clear import failure instead of silently returning to the upload screen.
- Confirmed imports clear stale per-tool stores so old sample/demo calculations do not remain visible.
- Sample imports are explicitly marked as `sample`; uploaded CSV/XLSX/PDF/OCR data preserves its actual source type.
- Uploaded datasets fall back to the uploaded file name as `companyName` when no company is detected, so the active source is always visible.
- Partial parse warnings are carried into the final dataset for downstream visibility.
- DCF, Ratios, Cash Efficiency, Peer, Trends, and Growth now reset their spreadsheet rows/results when the active uploaded dataset changes.
- Growth spreadsheet defaults are blank unless a user explicitly loads sample data or has imported data.
- Fresh production-build probe verified: after uploading `uploaded-company.csv`, DCF, Ratios, Cash Efficiency, Trends, and Growth all showed `uploaded-company.csv` and no sample badge.
- Commits: `ed17b70`, `3a42f3f`, `653b9e2`, `5f1755d`.

### Nav / Top-Right Theme Icon

- The small crescent icon in the top-right nav is the theme toggle in dark mode.
- It cycles `dark -> light -> auto` and persists to `localStorage` key `fundalyst-theme`.
- It has `title`/`aria-label`, but visually it can look like a stray icon when isolated. If future polish work touches nav affordances, either keep the icon with a clearer hover/active treatment or replace it with a more explicit theme control.
- Relevant files: `src/components/layout/Nav.tsx` (`ThemeToggle`) and `src/app/globals.css` (`.nav-theme-toggle`).

## Verification

Last verified after ingestion/source-switching hardening:

```bash
npm.cmd test          # 58 passed
npm.cmd run lint      # 0 errors, 3 warnings
npm.cmd run build     # passed
npm.cmd run test:e2e  # 33 passed
```

Known lint warnings:
- 2 `next/no-img-element`
- 1 React hook exhaustive-deps warning in Growth prefill

## Audit

`xlsx` has a high-severity advisory with no fix. Mitigations and plan live in `docs/xlsx-risk-plan.md`. Do not blindly run `npm audit fix --force`.

## Later Work

1. DCF scenario manager: Bull/Base/Bear cases with assumption versioning and sensitivity export.
2. Backend API boundary scaffold: typed service interfaces to replace Zustand later.
3. Real backend: auth, tenancy, RBAC, persistence, immutable audit, collaboration.

## Rules

- Do not add fake enterprise/backend claims.
- Do not store provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage.
- If changing spreadsheet behavior, test all routes.
- If changing backup/restore, test plain and encrypted export/import.
