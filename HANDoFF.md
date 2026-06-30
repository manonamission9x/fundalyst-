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

Next.js 16 App Router - React 19 - TypeScript strict - Zustand (localStorage) - Recharts - Vitest - Playwright - Global CSS (`src/app/globals.css`)

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
| `src/components/input/SpreadsheetInput.tsx` | Shared Excel-like grid - high-risk, test every route |
| `src/components/input/ToolSpreadsheet.tsx` | Tool-specific spreadsheet defaults |
| `src/components/layout/Nav.tsx` | Global nav with desktop tabs + mobile hamburger menu |
| `src/lib/calculations.ts` | Pure financial engine - keep side-effect free |
| `src/lib/calculation-trace.ts` | Source-fact trace helpers |
| `src/components/shared/CalculationTrace.tsx` | Reusable "Show sources" panel |
| `src/app/globals.css` | All styles - design system v2, cool indigo + warm monochrome |

## Data Flow

```text
CSV/XLSX/PDF/OCR/manual -> import parser -> FundalystDataset -> global-data-store -> financial-model-selectors -> tools & Workspace
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

### Million-User UX Simulation Audit (2026-06-30)

No code changes were made during this audit. Verified on `http://localhost:3000` with Playwright/manual route exploration plus the verification commands above.

Overall user satisfaction estimate: **72/100**. First-week retention confidence: **Medium** for individual research users, **Low-Medium** for professional teams. Enterprise confidence: **Low today** because the product is intentionally local-only and lacks real auth, tenancy, retained audit, collaboration, cloud persistence, and provider integrations.

Top strengths:

- Clear local/privacy posture; no fake backend claims.
- Strong local research workflow: import review, Filing, DCF, Peer, Workspace thesis/governance surface.
- DCF and Filing provide credible outputs with source-oriented panels.
- Navigation and baseline route coverage are healthy.

Top confirmed UX/product issues:

1. **Imported data does not consistently power all tools.** Sample import flows well into Filing and DCF, but Ratios remains incomplete when required metrics such as equity/assets are missing and Cash Efficiency remains blank despite imported revenue/inventory/receivables/cash-like facts.
2. **Demo/manual/imported data boundaries are confusing.** Trends can show `Source: Sample Company` while plotting default FY22-FY26 demo data; Growth remains manual/demo-oriented after import. Users may believe they are analyzing uploaded data when they are not.
3. **Import review is too dense for mainstream users.** The mapping table exposes many options at once and uses trust-reducing language such as `UNKNOWN`, `ones`, `Unknown -- skip`, and ambiguous counts.
4. **DCF assumption provenance needs stronger labeling.** Some DCF assumptions are defaults/sample assumptions even when the page context references an imported company.
5. **Enterprise features remain simulated.** Workspace governance, roles, integrations, and audit are useful local scaffolding, but not enforceable enterprise controls.
6. **Source traces are incomplete across Trends, Growth, and Peer.**
7. **Institutional analytics and memo export are missing.**
8. **Mobile works but spreadsheet-heavy workflows remain cramped and desktop-first.**

Recommended implementation order for DeepSeek V4 Flash:

1. Repair import-to-analysis continuity and add explicit missing-metric messaging per tool.
2. Add source/provenance labels for every visible metric and assumption: imported, manual, default, inferred, or unavailable.
3. Simplify import review with progressive disclosure, clearer safe-to-continue guidance, and user-friendly labels/counts.
4. Extend calculation/source traces to Trends, Growth, and Peer.
5. Build local investment memo export from company data, thesis, ratios, DCF, peer outputs, and trace metadata.
6. Add DCF scenario manager and institutional analytics.
7. Improve mobile/accessibility for spreadsheet-heavy workflows.
8. Only then scaffold/implement real backend boundaries.

## Next Work

1. **Import-to-analysis continuity** -- Ensure imported datasets truthfully populate or explain missing data for Filing, Trends, Growth, DCF, Ratios, Cash Efficiency, Peer, and Workspace.
2. **Source/provenance labeling** -- Mark values and assumptions as imported, manual, default, inferred, or unavailable.
3. **Import review simplification** -- Progressive disclosure, clearer missing/unmapped rows, friendly labels, and accurate counts.
4. **Extend source traces** -- Trends, Growth, and Peer need trace panels comparable to Filing/DCF.
5. **Investment memo export** -- Generate local exportable memo from company data, thesis, ratios, DCF, peer outputs, and trace metadata.
6. **DCF scenario manager** -- Bull/Base/Bear cases with assumption versioning and sensitivity export.
7. **Institutional analytics** -- EV/EBITDA, EV/Sales, P/E, P/B, ROIC, ROCE, FCF yield, peer multiples.
8. **Mobile/accessibility hardening** -- Spreadsheet-heavy workflows need better small-screen and keyboard/screen-reader ergonomics.
9. **Backend API boundary scaffold** -- Typed service interfaces to replace Zustand.
10. **Real backend** -- Auth, tenancy, RBAC, persistence, immutable audit, collaboration.

## Rules

- No fake enterprise/backend claims.
- No provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage. If changing spreadsheet behavior, test all routes.
- If changing backup/restore, test plain + encrypted export/import.
