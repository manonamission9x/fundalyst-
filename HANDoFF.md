# FUNDALYST — PRODUCTION HANDOFF

**Last updated:** August 2026
**Framework:** Next.js 16 + TypeScript + Zustand + Recharts + Vitest
**Fonts:** Inter (UI) · IBM Plex Mono (data)
**Build:** `npm run build` → zero errors, 14 static routes
**Tests:** 29 passing (Vitest, ~300ms)
**Location:** `C:\Users\kingo\Desktop\fundalyst-next`
**GitHub:** `github.com/manonamission9x/fundalyst-`
**Deploy:** GitHub → Vercel (manual upload)

---

## PRODUCT IDENTITY

Fundalyst is a browser-based financial analysis tool for Indian retail and value investors. Entirely client-side — no accounts, no server uploads, no data collection.

**Monetization strategy:** The architecture is designed to support a freemium model. The client-side computation engine is the free tier. Paid tiers add: PDF import (server-side OCR), XBRL import (SEC/BSE/NSE filing parsing), data persistence across devices (sync), API access to company datasets, and team/workspace sharing.

**North star:** "Bloomberg Terminal for Indian retail investors — in the browser, no accounts, instant."

**User:** Surya (Hyderabad). Fundalyst founder. Deploys via GitHub → Vercel. Values: accuracy > trust > design > UX. Impatient with incomplete work.

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

**Monetization hook:** The canonical model is the unit of value. A paid tier adds server-side persistence, allowing users to save/load companies across sessions and devices.

---

## FILE MAP

```
src/
├── app/                              # App Router pages
│   ├── layout.tsx                    # Root layout (Inter + IBM Plex Mono via next/font)
│   ├── loading.tsx                   # Global loading skeleton
│   ├── globals.css                   # Design System v2 (~820 lines)
│   ├── page.tsx                      # Home: tool grid + Quick Company Check
│   ├── about/page.tsx                # Static about page (Server Component)
│   ├── import/page.tsx               # Smart Import: CSV/XLSX/PDF/OCR/Screenshot
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
│   └── importer-store.ts
└── types/
    └── financial.ts                  # Calculation-specific types
```

---

## ROUTES

| Route | Component | Auto-data | Description |
|---|---|---|---|
| `/` | HomePage | — | Tool grid + Quick Company Check |
| `/import` | ImportPage | — | CSV/XLSX/PDF/OCR upload pipeline |
| `/workspace` | WorkspacePage | — | 7-step research workflow |
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
- `useDCFStore` — growth rate, WACC, terminal growth (user assumptions)
- `useWCStore`, `useRatiosStore`, `usePeerStore`, `useTrendsStore`, `useYoyStore` — all persisted
- `useFilingStore` — result cache (diffs, flags)
- `useAnalysisStore` — ephemeral cross-tool transient data

### localStorage keys
`fundalyst-filing`, `fundalyst-wc`, `fundalyst-ratios`, `fundalyst-peer`, `fundalyst-trends`, `fundalyst-yoy`, `fundalyst-importer`, `fundalyst-global-data`, `fundalyst_tab`, `fundalyst_last_tab`, `fundalyst-errors`, `fundalyst-thesis`

**Note:** `fundalyst-dcf` is NOT persisted by design (ephemeral per session).

### DCF Validation Constraints
- Growth (default 8%) must be < WACC (default 10%)
- Terminal growth must be < WACC
- WACC must be > 0%

---

## DESIGN SYSTEM V2

### Color Palette
```
--bg: #141416               // Warm monochrome (near-black)
--bg-elevated: #1B1B1E      // Card surfaces
--bg-surface: #222226        // Input fields, hover base
--bg-hover: #29292D          // Hover state
--bg-active: #313135         // Active/pressed
--bg-field: #18181A          // Input fields
--border: #2E2E32            // Default borders
--border-light: #232326      // Subtle borders
--border-strong: #3A3A3E     // Strong borders
--border-focus: #4F6EF7      // Focus ring (cool indigo)

--text: #EEEEF2              // Primary (high contrast)
--text-secondary: #B0B2B8    // Secondary labels
--text-tertiary: #8A8C92     // Helper text
--text-muted: #6A6C72        // Captions, metadata

--primary: #4F6EF7           // Cool indigo accent (wayfinding only)
--primary-hover: #6B86FF
--primary-subtle: rgba(79,110,247,0.06)

--green: #3DA06D             // Financial data only
--red: #CC5A5A
--amber: #B08C40
```

### Design Principles
- 95% neutral grayscale — color only for financial data (green/red) and wayfinding (indigo)
- All buttons are ghost style (border-only, no filled backgrounds)
- Cards: 10px radius, `--shadow-card`, thin borders
- Tables: compact rows, right-aligned numbers, alternating stripes
- No decorative elements, no filled buttons, no brand color
- Static grid background (48px, 1.2% opacity) + noise texture (4%)

### Typography
```
--text-2xs: 11px  --text-xs: 12px   --text-sm: 13.5px
--text-base: 15px --text-lg: 17px   --text-xl: 21px
--text-2xl: 26px  --text-3xl: 34px
```

### Spacing (4px grid)
```
--space-1: 4px   --space-4: 16px  --space-8: 32px
--space-2: 8px   --space-5: 20px  --space-10: 40px
--space-3: 12px  --space-6: 24px  --space-12: 48px
```

### Responsive Breakpoints
- **1024px:** Home grid 2 cols
- **820px:** About grid 1 col, field grid 2 cols, metric grid 2 cols
- **640px:** Main mobile — icon-only nav, 1-col grids, compact cards/padding
- **420px:** Small phones — minimal padding, 9px table fonts, 15px metric values
- **Pointer:coarse:** 44px min touch targets for all interactive elements

---

## KEY COMPONENTS

### SpreadsheetInput (`components/input/SpreadsheetInput.tsx`)
- Keyboard-first financial data grid
- Tab/Enter/Arrow navigation, Shift+Tab to go back
- Paste from Excel/Google Sheets (tab-separated) — auto-detects headers
- Metric auto-suggest dropdown (80+ metrics)
- Add/remove rows and columns
- contentEditable cells for native copy/paste
- Live data via `onDataChange` callback

### Metric Library (`components/input/metric-library.ts`)
- 80+ metrics across 4 categories: Income Statement, Balance Sheet, Cash Flow, Ratios
- Percentage-type flags for margins/ratios
- Used by SpreadsheetInput for suggestions

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
- **EmptyState** — with action link (WHY → HOW → WHAT)
- **InsightCard / WarningCard** — Financial insight display
- **Toolbar / PageHeader / Field / FieldGrid / Card** — Layout primitives

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
- `FormulaDisclosure` shows calculation formulas
- `CalcTimestamp` shows when calculations were computed

---

## MOBILE

- **Nav:** Icons-only at <640px (labels hidden, active tab shows label)
- **Spreadsheet:** 80px metric column, 55px period columns on <420px phones
- **Touch targets:** 44px min for all interactive elements (pointer:coarse)
- **Cards:** Padding reduced 50% at 640px, 75% at 420px
- **Tables:** Horizontal scroll on overflow, 9px font at 420px
- **Metrics:** Single column at 640px, 15px values at 420px

---

## KNOWN ISSUES

| Issue | Severity | Notes |
|---|---|---|
| ~178 inline `style={{}}` | Low | Most are dynamic (bar widths, spinner animations) — not migratable to classes |
| 17 `: any` type annotations | Low | All in pdfjs/tesseract/recharts dynamic imports |
| No component/E2E tests | Medium | Manual testing only. Add Playwright/Cypress before monetization |
| No ESLint CI | Low | Would catch unused imports |
| Auto-execute may not fire in production | Low | User can always click Calculate/Compare |
| No paywall/subscription layer | N/A | Needs auth provider (NextAuth/Clerk) + Stripe before monetizing |

---

## MONETIZATION GAPS

Before monetizing, these need to be built:

1. **Auth system** — NextAuth.js or Clerk for user accounts
2. **Server-side persistence** — Save company models to DB (Supabase/Neon) instead of only localStorage
3. **Paywall gate** — Stripe integration, tier enforcement middleware
4. **PDF import upgrade** — Server-side PDF parsing (unlocks complex statements, larger files)
5. **XBRL import** — Parse BSE/NSE filing XML directly (high-value paid feature)
6. **Data sync** — Cross-device company library
7. **Export** — PDF reports, Excel exports, one-click reports

**The canonical model is the product.** The FundalystDataset with its facts, periods, and confidence scores is what paid users pay for — persistence, import power, and export.

---

## CRITICAL PITFALLS

1. **Never use `read_file()` + `write_file()` in execute_code** — read_file returns line-number-prefixed content. Use `patch()` or `sed`.
2. **DCF growth must be < WACC** — defaults 8% < 10%. If changed, validation blocks auto-execute.
3. **DCF store has no persist** — Ephemeral per session. Don't add persist without partialize filtering.
4. **Nav logo + favicon use #4F6EF7** — If accent color changes, update both `Nav.tsx` and `layout.tsx`.
5. **Spreadsheet cell refs** — `contentEditable` cells use `window.getSelection()` for cursor position (not DOM `selectionStart`).
6. **getPeriods preserves insertion order** — Periods appear in the order they were first encountered in the facts array, not sorted alphabetically.

---

## DEPLOYMENT

```bash
npm run build          # → zero errors, 14 static routes
npm test               # → 29 tests pass
git add -A && git commit -m "..."
git push origin main
# Vercel: Import repo → Deploy (no config needed — static export)
```
