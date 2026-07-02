# Fundalyst — Frontend Conventions

This file covers code conventions for the frontend. For visual/design rules, see `DESIGN.md`. For architecture/data flow, see `ARCHITECTURE.md`.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript strict |
| State management | Zustand 5 + `localStorage` persist middleware |
| Charts | Recharts 3 |
| PDF | pdfjs-dist 5 (Web Worker) |
| OCR | tesseract.js 7 (Web Worker) |
| Testing | Vitest 4 (unit) + Playwright 1.61 (e2e) |
| Linting | ESLint 9 + `eslint-config-next` |
| Styling | Global CSS (`src/app/globals.css`) — no Tailwind utility classes in components |

**Windows note:** Use `npm.cmd` instead of `npm` (PowerShell may block `npm.ps1`).

**Tailwind trap:** `tailwindcss` v4 + `@tailwindcss/postcss` are dependencies, but there is **no `tailwind.config`** and Tailwind's utility classes are **not generally available** in components. The utility-looking classes you see (`flex`, `flex-col`, `gap-2`, `items-center`, `mt-3`, `text-2xs`, `w-full`) are **hand-rolled in `globals.css`**, and only the ones defined there exist. If you write a Tailwind class that isn't defined (e.g. `w-20`, `grid-cols-3`) it silently does nothing — add the rule to `globals.css` instead, or use an existing token/utility.

## Routing

All routes live under `src/app/` using the App Router convention:

```
/                          — homepage
/workspace                 — research cockpit
/import                    — import pipeline
/research/filing           — filing comparison
/research/trends           — trend charts
/research/growth           — growth rates
/tools/dcf                 — DCF valuation
/tools/wc                  — cash efficiency
/tools/ratios              — financial ratios
/tools/peer                — peer comparison
/about                     — about / help
/debug-import              — dev-only, unlinked from nav
```

Each tool page follows the same layout pattern: `PageHeader` → `DataQualityBar` → input grid → compute button → results (HeroDecision → MetricGrid → InsightCard → CalculationTrace → sensitivity/export → NextLinks).

## Component conventions

- **Components go in `src/components/`** grouped by domain: `input/`, `shared/`, `layout/`, `workspace/`, `tools/`, `import/`.
- **UI primitives** (Card, Button, Toolbar, etc.) are in `src/components/ui/index.tsx`.
- **Tool-specific components** (DCFChart, TrendsChart) are in `src/components/tools/<tool>/`.
- **Tool pages** are in `src/app/tools/<tool>/page.tsx` and import their components.
- Every tool page uses `usePageTitle()` for the document title.

## State management rules

1. **Read financial data** through `useModelData(extractor)` / `useActiveDataset()` — never hold a private copy of canonical numbers.
2. **Write financial data** through `global-data-store`'s write API (`writeCell`, `applyEdits`, etc.) — never mutate a dataset in place.
3. **Tool assumptions** (DCF growth rate, WACC, etc.) live in the canonical model with `statement: 'assumptions'`, not in local state.
4. **UI-only state** (selection, active cell, scroll position, edit buffer) stays in local `useState`/`useRef` — this is the only exception.
5. **Persisted tool state** (DCF scenario config, etc.) goes in per-tool Zustand stores in `src/store/index.ts` with `persist` middleware and `partialize` to keep only config.

## CSS rules

- **No raw hex, rgb(), px, or font-family in `app/**` or `components/**`.** Use CSS custom properties from `src/app/globals.css`.
- **Spacing uses the 4px grid:** `--space-1` through `--space-12` (4px–48px).
- **Typography uses the token scale:** `--text-nano` (9px, data-viz only) through `--text-3xl` (36px). Floor: 9px, and only for data-viz.
- **Colour = meaning, never decoration.** `--green` for positive/imported, `--red` for negative/risk, `--caution` for warning/default, `--primary` (slate) for wayfinding.
- **Monospace for data.** `--font-ibm-plex-mono` for all numbers, labels, codes. `--font-inter` (system sans) for prose and headings.
- **Provenance badges** use semantic colour: imported=green, manual=slate, default=caution, unavailable=muted.

## Configuration (environment variables)

`src/lib/env.ts` is the **single source of truth** for runtime config and the **only** file allowed to read `process.env` (enforced by ESLint `no-restricted-properties`). Import typed values from it (`env`, `clientEnv`, `requireEnv`) — never touch `process.env` directly, never add a second loader. Server secrets live in `.env.local` (gitignored); the committed `.env.example` holds placeholders only. To add a variable: `.env.example` → schema in `env.ts` → export → `docs/environment.md`. Full guide: `docs/environment.md`.

## Mobile navigation

- **Bottom tab bar** (`MobileTabBar.tsx`) is the primary mobile nav, shown only ≤640px: Home / Research / Tools / Import / Workspace. Thumb-reachable, `z-index:150` (tucks under drawer `200` + command palette `300`). The top-nav hamburger **drawer** still holds the full section list + mobile search. Desktop is unaffected.
- The **`viewport`** export in `layout.tsx` sets `viewport-fit=cover` — required for `env(safe-area-inset-*)` to resolve to real values. Bottom-anchored elements (nav, tab bar, toast, `.page`, sticky action bars) must include `env(safe-area-inset-bottom)` in their bottom padding/offset.
- Dense tables/spreadsheets pin their left-most label column on mobile (`.diff-table`/`.sens-table`/`.stmt-table` first child, `.spreadsheet-corner`/`.spreadsheet-metric-cell`) so a value is never orphaned from its metric name while scrolling.

## Accessibility

- Grid is keyboard-complete: arrows, Tab, Enter, F2, Esc, Ctrl shortcuts.
- `focus-visible` rings on all interactive elements.
- `prefers-reduced-motion` disables all animations.
- `(hover: none)` disables hover-dependent interactions.
- 44px touch targets on mobile; ≥16px mobile input font.

## Verification (run before every PR)

```bash
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run build
npx playwright test  # affected routes
```

## Key files map

| File | Purpose |
|---|---|
| `src/app/globals.css` | All CSS custom properties and component styles |
| `src/store/global-data-store.ts` | Canonical data store + write API |
| `src/store/pipeline-store.ts` | Change notification pub/sub |
| `src/store/use-model-data.ts` | Universal data read hook |
| `src/store/financial-model-selectors.ts` | Model → tool extractors |
| `src/store/workspace-context-store.ts` | AI context substrate |
| `src/lib/calculations.ts` | Pure financial engine |
| `src/components/ui/index.tsx` | UI primitives (Card, PageHeader, etc.) |
| `src/components/layout/Nav.tsx` | Top nav bar + drawer, theme toggle, command-palette + mobile search |
| `src/components/layout/MobileTabBar.tsx` | Bottom tab bar — primary mobile nav (≤640px) |
| `src/lib/env.ts` | **Only** reader of `process.env` — typed, validated config |
| `src/instrumentation.ts` | Runs env validation at server startup |
| `src/components/input/SpreadsheetInput.tsx` | Legacy contentEditable grid (being replaced) |
| `src/components/input/ModelBoundSpreadsheet.tsx` | Adapter: grid reads/writes canonical model |
| `src/components/workspace/WorkspaceGrid.tsx` | Virtualized, overlay-input grid |
| `DESIGN.md` | Visual language and token rules |
