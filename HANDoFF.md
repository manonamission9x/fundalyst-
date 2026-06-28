# FUNDALYST — PRODUCTION HANDOFF

**Last updated:** June 29, 2026
**Framework:** Next.js 16 + TypeScript + Zustand + Recharts + Vitest
**Fonts:** Inter (UI) · IBM Plex Mono (data)
**Build:** `npm run build` → zero errors, 14 static routes
**Tests:** 29 passing (Vitest, ~280ms)
**Location:** `C:\Users\kingo\Desktop\fundalyst-next`
**GitHub:** `github.com/manonamission9x/fundalyst-`
**Deploy:** GitHub → Vercel (auto-deploys on push)

---

## PRODUCT IDENTITY

Fundalyst is a financial analysis platform for Indian retail and value investors. All computation is client-side — no accounts, no server uploads, no data collection.

**North star:** "Bloomberg Terminal for Indian retail investors — in the browser, no accounts, instant."

**Design standard:** Premium · Institutional · Timeless · Calm · Intelligent · Precise · Engineered. Every screen must pass: "Would a hedge fund analyst voluntarily switch to this?"

---

## ARCHITECTURE

```
Input (any format)
    ↓
Import Pipeline (CSV/XLSX/PDF/OCR/Screenshot/Paste)
    ↓
Canonical FundalystDataset (global-data-store)
    ↓
Financial Model Selectors (financial-model-selectors.ts)
    ├── Filing comparison
    ├── DCF pre-fill (FCF, shares, debt)
    ├── Ratios (IS + BS)
    ├── Working Capital
    ├── Trends (multi-period)
    └── Peer Comparison
```

**Key principle:** Tools read from the canonical model. They do not store their own input data. The only per-tool state is user assumptions (e.g. DCF growth rate, WACC).

---

## FILE MAP

```
src/
├── app/                              # App Router pages
│   ├── layout.tsx                    # Root layout (Inter + IBM Plex Mono via next/font)
│   ├── loading.tsx                   # Global loading skeleton
│   ├── globals.css                   # Design System v2 (~1200 lines)
│   ├── page.tsx                      # Home: tool grid + Company Snapshot
│   ├── not-found.tsx                 # Custom 404 page
│   ├── about/page.tsx                # Static about page (Server Component)
│   ├── import/page.tsx               # Import: CSV/XLSX/PDF/OCR/Screenshot
│   ├── workspace/page.tsx            # Research Workspace (7-step sidebar)
│   ├── research/
│   │   ├── page.tsx                  # Redirect → /research/filing
│   │   ├── filing/page.tsx           # Spreadsheet input → insight-first comparison
│   │   ├── trends/page.tsx           # Multi-line Recharts + auto-populate from model
│   │   └── growth/page.tsx           # YoY growth rates
│   └── tools/
│       ├── page.tsx                  # Redirect → /tools/wc
│       ├── dcf/page.tsx              # DCF + sensitivity heatmap + chart
│       ├── wc/page.tsx               # Cash Efficiency
│       ├── ratios/page.tsx           # Financial Ratios
│       └── peer/page.tsx             # Multi-company comparison
├── components/
│   ├── input/
│   │   ├── SpreadsheetInput.tsx      # Keyboard-first data grid (Tab/Enter/arrows, paste)
│   │   ├── metric-library.ts         # 80+ categorized financial metrics
│   │   └── index.ts
│   ├── input/ToolSpreadsheet.tsx     # Single-column wrapper for tool pages
│   ├── layout/Nav.tsx                # 11-tab nav with SVG icons
│   ├── import/PdfViewer.tsx          # PDF.js canvas renderer
│   ├── shared/
│   │   ├── ErrorBoundary.tsx
│   │   └── ToastProvider.tsx
│   ├── tools/
│   │   ├── dcf/DCFChart.tsx
│   │   └── trends/TrendsChart.tsx
│   └── ui/index.tsx                  # 30+ components + 30 SVG icons
├── lib/
│   ├── calculations.ts               # Pure financial functions (29 tests)
│   ├── calculations.test.ts
│   ├── chart-theme.ts
│   ├── helpers.ts
│   ├── use-page-title.ts             # Sets document.title with " — Fundalyst" suffix
│   └── importer/                     # Full import pipeline
│       ├── types.ts                  # CanonicalFact, FundalystDataset, StatementType
│       ├── metric-aliases.ts         # 250+ aliases → 32 canonical metrics
│       ├── normalizer.ts             # Indian commas, Cr/L/Bn, bracket negatives
│       ├── detector.ts / parser.ts / csv-detector.ts / confidence.ts
│       ├── pdf-validator.ts / ocr.ts / pdf-importer.ts / xbrl-parser.ts
│       ├── import-hooks.ts           # useGlobalImportFill
│       ├── reference-formats.ts / tool-validation.ts
│       └── screenshot/               # preprocessor, table-finder, value-extractor
├── store/
│   ├── index.ts                      # Per-tool Zustand stores (assumptions only)
│   ├── global-data-store.ts          # Central FundalystDataset store (persisted)
│   ├── financial-model-selectors.ts  # Tools read from canonical model via this layer
│   ├── canonical-helpers.ts          # spreadsheetToDataset, writeSpreadsheetToModel
│   ├── use-model-data.ts             # Hook for pre-filling from canonical model
│   └── importer-store.ts
└── types/
    └── financial.ts                  # Calculation-specific types
```

---

## ROUTES

| Route | Component | Auto-data | Description |
|---|---|---|---|
| `/` | HomePage | — | Tool grid + Company Snapshot |
| `/import` | ImportPage | — | CSV/XLSX/PDF/OCR upload pipeline |
| `/workspace` | WorkspacePage | — | 7-step research workflow + Thesis notes |
| `/research/filing` | FilingPage | ✅ Spreadsheet → model → compare | Spreadsheet input + insight-first output |
| `/research/trends` | TrendsPage | ✅ Reads from canonical model | Multi-period chart |
| `/research/growth` | GrowthPage | — | YoY growth rates |
| `/tools/dcf` | DCFPage | ✅ Pre-fills FCF/shares/debt from model | DCF + sensitivity heatmap |
| `/tools/wc` | WCPage | ✅ Pre-fills from model | Cash Conversion Cycle |
| `/tools/ratios` | RatiosPage | ✅ Pre-fills from model | 9 financial ratios |
| `/tools/peer` | PeerPage | — | Multi-company comparison |
| `/about` | AboutPage | — | Static page (Server Component) |

---

## STATE MANAGEMENT

### Canonical Model (single source of truth)
- **`useGlobalDataStore`** (`global-data-store.ts`) — Zustand + persist
- Holds `FundalystDataset[]` with facts, periods, company metadata
- All tools read from this via `financial-model-selectors.ts`
- `writeSpreadsheetToModel()` writes manual entry into the model
- Import pipeline writes uploads into the model

### Per-tool Stores (assumptions only)
- `useDCFStore` — growth rate, WACC, terminal growth (user assumptions; NOT persisted)
- `useWCStore`, `useRatiosStore`, `usePeerStore`, `useTrendsStore`, `useYoyStore` — all persisted
- `useFilingStore` — result cache (diffs, flags)
- `useAnalysisStore` — ephemeral cross-tool transient data

### localStorage keys
`fundalyst-filing`, `fundalyst-wc`, `fundalyst-ratios`, `fundalyst-peer`, `fundalyst-trends`, `fundalyst-yoy`, `fundalyst-importer`, `fundalyst-global-data`, `fundalyst_tab`, `fundalyst_last_tab`, `fundalyst-errors`, `fundalyst-thesis`

---

## KEY COMPONENTS

### SpreadsheetInput (`components/input/SpreadsheetInput.tsx`)
- Keyboard-first financial data grid
- Tab/Enter/Arrow navigation, Shift+Tab to go back
- Paste from Excel/Google Sheets (tab-separated) — auto-detects headers
- Metric auto-suggest dropdown (80+ metrics)
- Add/remove rows and columns
- contentEditable cells for native copy/paste
- Undo/redo (Ctrl+Z/Ctrl+Y), range selection (Shift+click), context menu

### ToolSpreadsheet (`components/input/ToolSpreadsheet.tsx`)
- Single-column or multi-column wrapper used by all tools
- Standard consistent input across Filing, DCF, WC, Ratios, Peer, Trends, Growth

### Financial Model Selectors (`store/financial-model-selectors.ts`)
Read-only access layer for all tools:
- `useActiveDataset()` — hook to get current dataset
- `getMetricValue(dataset, metric, period?)` — highest-confidence value
- `findMetricFlexibly(dataset, searchTerm, period?)` — alias-aware search
- `extractFilingData()` / `extractDCFInputsFromModel()` / `extractRatiosFromModel()` / `extractWCFromModel()` / `extractTrendData()`
- `datasetToSpreadsheetRows()` — canonical model → editable spreadsheet

### UI Components (`components/ui/index.tsx`)
- **ConfidenceBadge** — 99% (green) / 85% (neutral) / 60% (amber) pill badges
- **TrustBadge** — Source/method badges (e.g. "DCF - Gordon Growth")
- **StatRow** — Bloomberg-style compact data row with trend indicator
- **MetricGrid** — with context/trend props for at-a-glance comprehension
- **EmptyState** — with action link
- **InsightCard / WarningCard** — Financial insight display
- **Toolbar / PageHeader / Field / FieldGrid / Card** — Layout primitives
- **DataQualityBar** — optional source/periods/metrics bar (hides when no source)

---

## DATA FLOW

### Manual entry (Filing page)
```
SpreadsheetInput → rows + periods
    ↓
writeSpreadsheetToModel() → global-data-store (addDataset)
    ↓
Financial Model Selectors → Filing comparison
    ↓
Insight-first output: Executive Summary → Key Metrics → Top Changes → Risk Flags → Expandable Table
```

### Upload (Import page)
```
CSV/XLSX/PDF/Screenshot
    ↓
detect.ts → parser.ts → normalizer.ts → metric-aliases.ts
    ↓
FundalystDataset (global-data-store)
    ↓
All tools pre-fill from model automatically
```

### Trust signals
- Every canonical fact carries `confidence: 0-1`
- `ConfidenceBadge` component renders confidence percentage
- `DataQualityBar` shows source type, periods, metrics count
- `CalcTimestamp` shows when calculations were computed

---

## MOBILE

- **Nav:** Icons-only at <640px (labels hidden, active tab shows label). Active tab uses `border-bottom` (not ::after). `env(safe-area-inset-bottom)` on page and sticky-actions.
- **Spreadsheet:** 80px metric column, 55px period columns at <420px. Minimum 11px font at 420px.
- **Touch targets:** 44px min for all interactive elements via `@media (pointer: coarse)`.
- **Cards:** Padding 12px at 420px.
- **Tables:** Horizontal scroll on overflow, 9px font at 420px.
- **Import page:** Format labels wrap, PDF validation messages compact, PDF progress bar capped at 160px.
- **Landscape mobile:** Tables and spreadsheet auto-scroll with momentum touch.

---

## KNOWN ISSUES

| Issue | Severity | Notes |
|---|---|---|
| ~60 inline `style={{}}` | Low | Most are dynamic (bar widths, chart dimensions) |
| 17 `: any` type annotations | Low | All in pdfjs/tesseract/recharts dynamic imports |
| No component/E2E tests | Medium | Manual testing only. Add Playwright/Cypress before monetization |
| No ESLint CI | Low | Would catch unused imports |
| No paywall/subscription layer | N/A | Needs auth provider (NextAuth/Clerk) + Stripe before monetizing |
| Nav has 11 flat items | Medium | Consider grouping into Research/Valuation/Tools hub pages |
| Workspace page duplicates tools | Medium | Only adds Thesis/notes feature. Consider rebuilding as real dashboard |

---

## CRITICAL PITFALLS

1. **DCF growth must be < WACC** — defaults 8% < 10%. Validation catches terminal == WACC before computeDCF runs.
2. **DCF store has no persist** — Ephemeral per session. Don't add persist without partialize filtering.
3. **Nav logo + favicon use #4F6EF7** — If accent color changes, update both `Nav.tsx` and `layout.tsx`.
4. **Spreadsheet cell refs** — contentEditable cells use `window.getSelection()` for cursor position (not DOM `selectionStart`).
5. **getPeriods preserves insertion order** — Periods appear in the order they were first encountered, not sorted alphabetically.
6. **downloadCSV quotes cells** — Values containing commas, quotes, or newlines are wrapped correctly. Do not revert to plain `.join(',')`.
7. **SpreadsheetInput has no IME/composition handling** — Chinese/Japanese/Korean IME may flicker suggestions.
8. **ContentEditable value cells lack inputMode on mobile** — No numeric keyboard for financial entry.
9. **CVS:still uses --shadow-sm** — Defined in CSS but unused anywhere.

---

## DEPLOYMENT

```bash
npm run build          # → zero errors, 14 static routes
npm test               # → 29 tests pass
git add -A && git commit -m "..."
git push origin main   # Auto-deploys to Vercel (~20s)
```

---

## DESIGN NOTES (June 2026 audit)

A full trillion-dollar design audit was completed in June 2026. All 30 "college-project signal" issues (CP-1 through CP-30) were fixed in commit `aba97f1`. Details in `.hermes/trillion-dollar-audit.md`.

**Key design rules:**
- 95% neutral grayscale — color only for financial data (green/red) and wayfinding (indigo)
- All buttons are ghost style (border-only, no filled backgrounds)
- Radius system: 2px (sm) / 4px (md) / 8px (lg) — no pills or circles
- "Line Item" column header in all spreadsheets
- Nav labels: Valuation, Cash Eff., Peer Comp., Import financials
- No version numbers, no "Manual mode", no "Smart" prefixes in labels
- Custom 404, branded loading skeleton, page-specific browser titles (`%s — Fundalyst`)
