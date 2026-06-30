# Fundalyst Handoff

Last updated: 2026-06-30

Repo: `C:\Users\kingo\Desktop\fundalyst-next`  
GitHub: `https://github.com/manonamission9x/fundalyst-`  
Branch: `main`

## Current Product State

Client-side financial analysis app for imported/manual company financials. Credible local analyst tool, not an enterprise platform.

**Real today:** Local import/review (CSV/XLSX/PDF/OCR/image/manual), Filing comparison, Trends, Growth rates, DCF valuation, Cash efficiency, Ratios, Peer comparison, Workspace command center (local projects, role simulation, audit events, snapshots, thesis, encrypted backup/restore), source-linked calculation trace panels (DCF, Ratios, WC, Filing).

**Not real:** Cloud auth, organization tenancy, server RBAC, multi-user collaboration, retained audit logs, cloud/database persistence, data-provider APIs, credential vault, cloud sync.

## Stack

Next.js 16 App Router · React 19 · TypeScript strict · Zustand (localStorage) · Recharts · Vitest · Playwright · Global CSS (`src/app/globals.css`)

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Routes

`/` `/import` `/workspace` `/research/filing` `/research/trends` `/research/growth` `/tools/dcf` `/tools/wc` `/tools/ratios` `/tools/peer` `/about`

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/workspace/page.tsx` | Workspace command center, projects, governance, audit, thesis, backup/restore |
| `src/store/enterprise-store.ts` | Backendless enterprise state (projects, members/roles, audit, versions) |
| `src/lib/enterprise-backup.ts` | Web Crypto encrypted workspace backup/restore, allowlisted keys |
| `src/store/global-data-store.ts` | Canonical dataset store with audit events |
| `src/store/importer-store.ts` | Import review/confirmation |
| `src/app/import/page.tsx` | Import workflow with file-size guards and object URL cleanup |
| `src/components/input/SpreadsheetInput.tsx` | Shared Excel-like grid — high-risk, test every route |
| `src/components/input/ToolSpreadsheet.tsx` | Tool-specific spreadsheet defaults |
| `src/components/layout/Nav.tsx` | Global nav with desktop tabs + mobile hamburger menu |
| `src/lib/calculations.ts` | Pure financial engine — keep side-effect free |
| `src/lib/calculation-trace.ts` | Source-fact trace helpers |
| `src/components/shared/CalculationTrace.tsx` | Reusable "Show sources" panel |
| `src/app/globals.css` | All styles — design system v2, cool indigo + warm monochrome |

## Data Flow

```
CSV/XLSX/PDF/OCR/manual → import parser → FundalystDataset → global-data-store → financial-model-selectors → tools & Workspace
```

## Verification

```bash
npm.cmd test          # 58 passed
npm.cmd run lint      # 0 errors, 6 warnings (2 img-element, 4 exhaustive-deps)
npm.cmd run build     # passed
npm.cmd run test:e2e  # 25 passed (18 smoke/core/a11y + 7 workflow)
```

## Audit

`xlsx` high-severity advisory (no fix). Mitigated with 15s timeout + `structuredClone()` sandboxing in `src/lib/importer/parser.ts` and `src/lib/helpers.ts`. See `docs/xlsx-risk-plan.md` for full plan.

## Next Work

1. **Investment memo export** — Generate local exportable memo from company data, thesis, ratios, DCF, and trace metadata.
2. **DCF scenario manager** — Bull/Base/Bear cases with assumption versioning and sensitivity export.
3. **Extend source traces** to Trends, Growth, and Peer (Filing already done).
4. **Institutional analytics** — EV/EBITDA, EV/Sales, P/E, P/B, ROIC, ROCE, FCF yield, peer multiples.
5. **Backend API boundary scaffold** — Typed service interfaces to replace Zustand.
6. **Real backend** — Auth, tenancy, RBAC, persistence, immutable audit, collaboration.

## Rules

- No fake enterprise/backend claims.
- No provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage. If changing spreadsheet behavior, test all routes.
- If changing backup/restore, test plain + encrypted export/import.
