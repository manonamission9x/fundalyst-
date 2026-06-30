# Fundalyst Handoff

Last updated: 2026-06-30 (night)

Repo: `C:\Users\kingo\Desktop\fundalyst-next`
GitHub: `https://github.com/manonamission9x/fundalyst-`
Branch: `main`

## Current Product State

Client-side financial analysis app for imported/manual company financials. Credible local analyst tool, not an enterprise platform.

**Real today:** Local import/review (CSV/XLSX/PDF/OCR/image/manual), import review with collapsed low-confidence-only mapping table, Filing comparison, Trends, Growth rates, DCF valuation (with provenance-labeled assumptions), Cash efficiency, Financial Ratios, Peer comparison (with institutional analytics), Workspace command center, source-linked calculation trace panels (all tools), investment memo export, provenance badges on every visible metric, EV/EBITDA/EV/Sales/P/E/P/B/FCF Yield/ROIC/ROCE calculation helpers.

**Not real:** Cloud auth, organization tenancy, server RBAC, multi-user collaboration, retained audit logs, cloud/database persistence, data-provider APIs, credential vault, cloud sync.

## Stack

Next.js 16 App Router — React 19 — TypeScript strict — Zustand (localStorage) — Recharts — Vitest — Playwright — Global CSS

## Design System v3 — Terminal Gold

- **Dark default:** Deep charcoal (`#0E0E0F`) with gold accent (`#C8962E`)
- **Light mode:** Warm off-white (`#FAF9F6`) with deeper gold (`#B07D1F`)
- **Theme toggle:** Nav bar button cycles auto/light/dark (persisted to localStorage)
- **Auto-detect:** Respects `prefers-color-scheme`; explicit toggle wins
- **Caution (warning only):** `#C2703D` (distinct hue from gold accent)
- **Full CSS token system:** elevation scale (`--shadow-sm/base/md/lg`), radius scale (`--radius-pill`), type scale (`--text-3xs` floor 11px), spacing grid (`--space-*`)
- **Chart colors:** Derived from CSS tokens at runtime via `getChartColors()` etc.
- **Accessibility:** `change-up/down/flat` include `::before` arrows for color-blind users

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/calculations.ts` | Pure financial engine — DCF, WC, ratios, institutional analytics |
| `src/lib/calculation-trace.ts` | Source-fact trace helpers + provenance helpers |
| `src/lib/memo-export.ts` | Investment memo generation (markdown/HTML) |
| `src/lib/chart-theme.ts` | Chart config — dynamic CSS token readers for Recharts |
| `src/components/layout/Nav.tsx` | Nav bar with desktop tabs, mobile hamburger, theme toggle |
| `src/components/shared/CalculationTrace.tsx` | Reusable "Show sources" panel |
| `src/components/shared/MissingMetricsNotice.tsx` | Missing-metric alert per tool |
| `src/components/shared/ProvenanceBadge.tsx` | Provenance badge (theme-aware CSS vars) |
| `src/components/input/SpreadsheetInput.tsx` | Excel-like grid with ARIA roles, undo/redo, paste support |
| `src/store/financial-model-selectors.ts` | Tool-specific data extractors |

## Verification

```bash
npm.cmd test          # 58 passed
npm.cmd run lint      # 0 errors, 9 warnings (all pre-existing)
npm.cmd run build     # passed — 14 static routes
npm.cmd run test:e2e  # 25 passed
```

## Audit

`xlsx` high-severity advisory (no fix). Mitigated with 15s timeout + `structuredClone()` sandboxing. See `docs/xlsx-risk-plan.md`.

## Theme info

- Toggle in nav bar (sun icon = light, moon icon = dark, sun+rays icon = auto)
- `localStorage` key: `fundalyst-theme` (values: `light`, `dark`, or absent for auto)
- No flash-of-wrong-theme: CSS `@media (prefers-color-scheme: light)` handles auto mode before JS hydrates

## Next Work

1. **DCF scenario manager** — Bull/Base/Bear cases with assumption versioning and sensitivity export.
2. **Backend API boundary scaffold** — Typed service interfaces to replace Zustand.
3. **Real backend** — Auth, tenancy, RBAC, persistence, immutable audit, collaboration.

## Rules

- No fake enterprise/backend claims.
- No provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage. If changing spreadsheet behavior, test all routes.
- If changing backup/restore, test plain + encrypted export/import.
