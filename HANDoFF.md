# Fundalyst Handoff

Last updated: 2026-07-01 (workspace workflow redesign + nav labels + CTA fix)

Repo: `C:\Users\kingo\Desktop\fundalyst-next`  
GitHub: `https://github.com/manonamission9x/fundalyst-`  
Branch: `main`  
Latest code commit: `1c9ad44` — Workspace workflow redesign + nav labels + CTA fix

## Git Log (Recent)

```text
1c9ad44  Workspace workflow redesign + nav labels + CTA fix
76d8167  Update handoff with filing page shake fix — part 2: clearVersion init
47d80ef  Fix filing page shaking: remove duplicate pre-fill effect
b84a9b3  Fix filing page shaking: force scrollbar to prevent layout shift
afcde26  Homepage redesign: product-first institutional landing
1136296  Fix parser.ts: commit missing isLikelyRepairedOcrValue function
844a304  Institutional Slate design system: remove Terminal Gold
a177ec7  Theme toggle: binary dark/light (remove auto mode)
1a7c1f5  Fix page shake + switch to system fonts (zero FOUT)
257f911  Replace all icons with Phosphor, remove lucide-react
84c9c8c  Nav polish pass: consistent borders, better contrast, tighter sizing
5f1755d  Fix: setSheetPeriods uses local periods const, not modelData.data
21ef828  Nav redesign: premium UX for the control center
ed17b70  Audit-driven security + governance hardening (P1-P5)
```

## Current Product State

Fundalyst is a client-side financial analysis app for imported/manual company financials. It is a credible local analyst tool, not an enterprise platform.

Real today: local import/review for CSV/XLSX/PDF/OCR/image/manual data, Filing comparison, Trends, Growth rates, DCF valuation with provenance-labeled assumptions, Cash efficiency, Financial Ratios, Peer comparison with institutional analytics, Workspace command center, source-linked calculation trace panels, investment memo export, provenance badges, and EV/EBITDA/EV/Sales/P/E/P/B/FCF Yield/ROIC/ROCE helpers.

Not real: cloud auth, organization tenancy, server RBAC, multi-user collaboration, retained audit logs, cloud/database persistence, data-provider APIs, credential vault, or cloud sync.

## Stack

Next.js 16 App Router, React 19, TypeScript strict, Zustand localStorage, Recharts, Vitest, Playwright, global CSS.

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Design System v4 — Institutional Slate

- **Dark default:** cool charcoal (`#0C0C0E`) with restrained slate accent (`#6F7D8C`).
- **Light mode:** cooler off-white (`#F6F5F3`) with deeper slate (`#5A6B7C`).
- **Theme toggle** in nav is binary **dark ↔ light** (Moon/Sun). Stored in `localStorage` key `fundalyst-theme`.
- **Auto/prefers-color-scheme** mode was removed.
- **No warm tones anywhere** — the gold accent (`#C8962E`) was fully removed. All borders, text, and accent colors are cool greys and blue-greys.
- **System fonts** — `-apple-system` UI stack and `SF Mono`/`Cascadia Code` monospace stack. Zero FOUT. No web font loading.
- **Icons** — `@phosphor-icons/react` throughout. `lucide-react` removed.
- **Decorative UI removed** — `body::before` grid texture, `card-accent` decorative border, `hero-feature` left-border styling. No visual flourishes without function.
- **Chart colors** derive from CSS tokens at runtime.
- **Shadows** are restrained — every elevation token was reduced in opacity.
- **`change-up/down/flat`** include `::before` arrows for color-blind users.

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/calculations.ts` | Pure financial engine: DCF, WC, ratios, institutional analytics |
| `src/lib/calculation-trace.ts` | Source-fact trace helpers and provenance helpers |
| `src/lib/memo-export.ts` | Investment memo generation |
| `src/lib/chart-theme.ts` | Dynamic CSS-token chart config for Recharts |
| `src/components/layout/Nav.tsx` | Workspace hub nav, desktop section dropdowns, mobile hamburger, binary theme toggle; nav labels: Data → Upload Reports, Tools → Documentation |
| `src/components/layout/CommandPalette.tsx` | Cmd-K route/action palette; do not touch `.cmdk-*` styles unless explicitly scoped |
| `src/components/shared/CalculationTrace.tsx` | Reusable Show sources panel |
| `src/components/shared/MissingMetricsNotice.tsx` | Missing-metric alert per tool |
| `src/components/shared/ProvenanceBadge.tsx` | Provenance badge |
| `src/components/input/SpreadsheetInput.tsx` | Excel-like grid with ARIA roles, undo/redo, paste support |
| `src/store/index.ts` | Tool-local persisted stores; includes `clearAllToolStores()` for import source switching |
| `src/store/financial-model-selectors.ts` | Tool-specific imported-data extractors |
| `src/store/importer-store.ts` | Import lifecycle; blocks no-data parses, clears stale tool state on confirm, marks sample vs uploaded source |
| `src/lib/importer/parser.ts` | CSV/XLSX/PDF/OCR parse-to-review flow; preserves partial-parse warnings and source type |
| `src/lib/importer/ocr.ts` | Browser OCR/PDF rendering path, OCR row splitting, compact scanned-table value repair |
| `src/lib/importer/pdf-importer.ts` | PDF text extraction and scanned/tableless OCR fallback orchestration |
| `src/app/workspace/page.tsx` | Research workspace — workflow-guided overview, empty-state onboarding, collapsed Settings for admin panels |

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

### Homepage Redesign — Product-First Landing

The homepage was rewritten from a feature-grid app screen into a conversion-focused landing page:

- **Hero:** "Upload an annual report. Get the analysis instantly." with a single dominant CTA and a live DCF product preview card (EV ₹12,847Cr, IV/Share ₹1,284, MoS +32.4%) that proves the product works.
- **How It Works:** 3-step grid (Upload → Extract → Analyze) with concise copy and step numbers.
- **What You Get:** 6 compact tool cards showing real output values (not feature descriptions) — DCF, Filing Comparison, Trend Charts, Ratios, Peer Comparison, Cash Efficiency.
- **Why It Works:** 3-column trust section (Privacy · Accuracy · Enterprise) with no testimonials or logos — trust through competence.
- **Final CTA:** "Ready to analyze your first report?" + Upload button.
- Removed: Quick Company Check inline tool, old feature-grid card layout, hero-feature decorative styling.
- All copy is short, specific, and avoids buzzwords. Design uses existing institutional slate tokens — no new colors or radii.
- Commit: `afcde26`.

### Workspace Workflow Redesign

The Research Workspace was redesigned from a flat dashboard of competing panels into a workflow-guided research environment:

- **Single onboarding empty state:** One hero card ("No company selected") with a single primary action (Upload Annual Report) — no conflicting signals.
- **Data-loaded overview has clear hierarchy:** Research Status → Next Step → Workflow Progress → Analysis Tools → Investment Memo → Data Backup (in workflow order, not visual competition).
- **Research Status** now shows Company, Report, Periods, and Metrics extracted (answers "what company am I analyzing?").
- **Next Step** card is contextual — recommends Import, Filing Comparison, or DCF based on actual progress.
- **Workflow Progress** is a visual dot-track showing Import → Review → Analyze → Conclude with completed/current/remaining states.
- **Tools categorized by purpose:** "Quick Analysis" (Filing Comparison, Trend Charts, Growth Rates) vs "Deep Dive" (DCF, Ratios, Peer Comparison, Cash Efficiency), each with a "why" description.
- **Enterprise administrative features removed from overview:** Enterprise Command Center and "Enterprise" card removed. Governance, Audit Trail, and Integrations moved to a collapsible "Workspace Settings" at the bottom of the sidebar. All functionality preserved.
- **Sidebar labels renamed:** Import → Import Report, Filing → Filing Comparison, Ratios → Financial Ratios, Thesis → Investment Thesis.
- Commits: `1c9ad44`.

### Hero CTA Button Fix

Removed inline styles on the primary hero CTA (`padding: 9px 22px`, `fontSize: 'var(--text-sm)'`) that made it different from the secondary CTA. Both buttons now share identical CSS dimensions (`padding: 7px 16px`, `font-size: var(--text-xs)`). Only color/border differentiates primary from secondary.

### Nav Label Fix

Renamed ambiguous navigation labels for clarity:
- Tools → About → renamed to **Tools → Documentation** (descriptive noun for an informational page).
- Data → Import → renamed to **Data → Upload Reports** (action verb for a task page).
- Updated in both desktop and mobile nav.

### Filing Page Shake Fix

The filing comparison page was shaking violently on navigation. Two causes:

- **Duplicate pre-fill effect removed.** The page had two mechanisms filling the spreadsheet on mount — `useGlobalImportFill` (via import-hooks) and a direct `useEffect`. Both used `setTimeout(0)`, creating a cascade of empty → fill A → fill B. Removed the redundant effect.
- **Scrollbar-induced layout shift.** Added `overflow-y: scroll` on `<html>` to permanently reserve the scrollbar track, preventing width reflow when content loads.
- Commits: `b84a9b3`, `47d80ef`.

### Scanned PDF Import / OCR

- Scanned PDF import falls back to OCR when text extraction yields no usable financial facts or no usable table structure.
- OCR table parsing handles collapsed rows such as `Revenue from operations 566090 8457.33 ...` by splitting label/value cells and repairing compact numeric OCR tokens like `566090 -> 5660.90`.
- Repaired compact OCR values are intentionally marked lower confidence via `isLikelyRepairedOcrValue`; review warnings explicitly tell users to verify them against the PDF.
- Exact test file: `C:\Users\kingo\Downloads\Financial-Results.pdf`.
- Real `/import` production-build test reached review in about 54 seconds with `404 values found`, `75 metrics mapped`, `20 need review`, scanned-PDF warning present, and repaired-OCR-values warning present.
- Accuracy caveat: this is not fully verified line-item truth. Spot-checking the first page showed some values match after repair, but at least one revenue-period value was still wrong/missing due to OCR. Treat scanned-PDF imports as review-required, not trusted automation.
- Next accuracy work should add row/column consistency checks against header counts, flag row-level value-count mismatches, and expose suspicious rows more prominently in the review table.

## Verification

Last verified after workspace workflow redesign:

```bash
npm.cmd test          # 58 passed
npm.cmd run lint      # 0 errors, 3 warnings
npm.cmd run build     # passed
```

Known lint warnings:
- 2 `next/no-img-element` (import page + PdfViewer — pre-existing)
- 1 React hook exhaustive-deps warning in Growth prefill (pre-existing)

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
