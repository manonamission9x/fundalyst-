# Fundalyst Handoff

Last updated: 2026-06-30 (night)

Repo: `C:\Users\kingo\Desktop\fundalyst-next`
GitHub: `https://github.com/manonamission9x/fundalyst-`
Branch: `main`
Latest: `6182760` — full DeepSeek fix-queue (theme/P0-P3, D1-D6) + C1 palette + C3/C4, all merged & verified (58 tests, build, 25 e2e green)

## Git log (recent)
```
6182760  Add GitHub details + git log to handoff
e789b79  feat: multi-company peer compare (C3) + global memo export (C4)
4069571  feat: command palette (Cmd-K), Terminal Gold + light mode, dead-code cleanup
8892f27  D1-D6: Product tasks complete
8a41dc6  Update HANDoFF.md with Terminal Gold theme info
6c12d6c  P0-P3 fixes + Terminal Gold theme re-skin + light mode toggle
```

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

## Pending — C2 & C5 (implement in the dev + e2e loop; both break current e2e)

These need the app running + e2e updates; do NOT push blind to green main. Specs are exact (file/line refs verified against `6182760`).

### C2 — Remove auto-injected demo data; explicit "Load sample" instead
Goal: no fake company data auto-loads. Fresh users get the (already-polished, D5) empty states + an explicit per-tool "Load sample" button. Keep all canonical-model prefill (real imported data) untouched.
- `src/store/index.ts` — blank initial sample defaults to match each store's own `clear()` state: Filing `labelA/labelB/periodA/periodB` → `''`; DCF `inputs` → all `''`; WC `inputs` → all `''`; Ratios `data` → all `null`; Peer `csv` → `''`; Trends `csv` → `''`; YoY `years/csv` → `''`. Do NOT bump `version` (preserve existing users' persisted data).
- `src/app/research/filing/page.tsx` (~L114-130) — delete the "Priority 2: demo data" block (keep Priority 1 canonical prefill). Move the Q1-Q4 sample into a `loadSample()` fn behind a button; clean now-unused `isSampleLoaded`/refs.
- `src/app/tools/dcf/page.tsx` (~L126-159) — delete the "Auto-demo on first visit" effect AND the auto-calculate-on-demo effect; move the 8-row sample into a `loadSample()` button.
- `src/app/research/trends/page.tsx` (~L43-60) — `defaultPeriods`/`defaultRows` return empty (`['','','']` / `[]`) when no imported data; add a "Load sample" button injecting the FY22-26 demo.
- `src/app/research/growth/page.tsx` (~L76) — same: neutralize the on-mount demo, add a button.
- WC / Ratios / Peer — already clean (canonical prefill; peer already has an on-demand `loadSample()`); no change.
- **e2e impact:** specs asserting demo values (filing Q1-Q4, DCF intrinsic value, trends series) will fail — update them to import a fixture OR click "Load sample" before asserting. Preserve route coverage.
- Verify: `npm run build`, `npm test`, `npm run test:e2e` (update to green), dev pass (each tool: empty state + working "Load sample").

### C5 — Nav IA: collapse 9 flat tabs; resolve Workspace redundancy
- `src/components/layout/Nav.tsx` renders Research/Valuation/Data/Tools as flat tabs. Collapse desktop to ~4 section triggers that open a dropdown/popover of their tools (mobile overlay already groups — keep). Position Workspace as the primary hub/landing; tools remain deep-links from Workspace + command palette.
- Risk: interaction-heavy (hover/click/keyboard focus-trap, mobile, active-state, no layout shift — F-17 already reserves the 2px). MUST be built with dev server open; tsc won't catch nav interaction bugs.

## Later Work

1. **DCF scenario manager** — Bull/Base/Bear cases with assumption versioning and sensitivity export.
2. **Backend API boundary scaffold** — Typed service interfaces to replace Zustand.
3. **Real backend** — Auth, tenancy, RBAC, persistence, immutable audit, collaboration.

## Rules

- No fake enterprise/backend claims.
- No provider credentials in frontend code or localStorage.
- Keep calculations pure in `src/lib/calculations.ts`.
- Preserve Playwright route coverage. If changing spreadsheet behavior, test all routes.
- If changing backup/restore, test plain + encrypted export/import.
