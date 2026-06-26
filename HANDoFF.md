# FUNDALYST-NEXT — COMPLETE AI-TO-AI HANDOFF

Last updated: July 2025
Total source files: ~60
Total lines: ~11,500
Framework: Next.js 16 + TypeScript + Zustand + Recharts + Vitest
Project location: `C:\Users\kingo\Desktop\fundalyst-next` (moved out of OneDrive)

---

## PROJECT OVERVIEW

Fundalyst is a browser-based financial analysis tool for Indian retail and value investors. Users upload/enter financial statement data, compare periods, compute ratios, run DCF valuations, benchmark peers, and build investment theses. Entirely client-side — no server uploads. Indian market focus (₹, lakhs/crores).

**Current status:** Production-ready for soft launch. All 12 routes compile, production build serves with zero errors. Complete global data architecture. DCF engine v2 with Gordon Growth model + sensitivity + heatmap. Landing page with product-first copy. Design system v4 with refined dark palette, typography scale, spacing scale. PDF import with embedded viewer + validation. Screenshot import with preprocessing pipeline. Auto-CSV delimiter detection. Confidence grouping in review UI. Error logging to localStorage. All tools auto-execute on first visit with sample data. **29 unit tests** covering all financial calculations.

**User:** Surya. Fundalyst founder. GitHub: manonamission9x. Deploys via GitHub → Vercel (manual file upload). Uses Edge browser. Values: accuracy > trust > design. Prefers exhaustive fixes over partial patches. Hates "vibe-code" aesthetics. Provides extremely detailed multi-section specs and expects EVERY requirement implemented.

**GitHub repo:** `https://github.com/manonamission9x/fundalyst-`

**Build philosophy:** The codebase is built for future longevity — every component is modular, every hook uses refs to avoid stale closures and render loops, types are strict, imports are explicit, and CSS uses design tokens. Adding new tools or import sources should require minimal changes to the core architecture.

---

## FILE MAP

```
fundalyst-next/
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts                  # Test runner configuration
├── HANDoFF.md                        # This file
└── src/
    ├── app/                          # Next.js App Router pages
    │   ├── layout.tsx                # Root layout (fonts, Nav, Toast, ErrorBoundary, favicon)
    │   ├── page.tsx                  # Home page (CSS classes, no inline styles)
    │   ├── globals.css               # All styles + design system v4 (~1400 lines)
    │   ├── about/page.tsx            # About + SVG icons + methodology
    │   ├── import/page.tsx           # Smart Import + PDF viewer + confidence grouping
    │   ├── research/
    │   │   ├── page.tsx              # Redirect → /research/filing
    │   │   ├── filing/page.tsx       # Filing comparison (auto-executes on first visit)
    │   │   ├── trends/page.tsx       # Trend charts (custom financial tooltip, chart theme)
    │   │   └── growth/page.tsx       # YoY growth + fastest/declining insight
    │   └── tools/
    │       ├── page.tsx              # Redirect → /tools/wc
    │       ├── dcf/page.tsx          # DCF + sensitivity heatmap + price reference line
    │       ├── wc/page.tsx           # Cash Efficiency + InsightCards + WarningCards
    │       ├── ratios/page.tsx       # 9 financial ratios + formula disclosure
    │       └── peer/page.tsx         # Peer comparison + inline bar visualization
    ├── components/
    │   ├── import/
    │   │   └── PdfViewer.tsx         # Embedded PDF viewer (zoom, page nav, thumbnails)
    │   ├── layout/
    │   │   └── Nav.tsx               # Premium nav with category separators, CSS classes
    │   ├── shared/
    │   │   ├── ErrorBoundary.tsx     # Error boundary + localStorage error logging
    │   │   └── ToastProvider.tsx     # Toast notifications (now has CSS styling)
    │   ├── tools/
    │   │   ├── dcf/DCFChart.tsx      # Recharts bar chart + price reference line
    │   │   └── trends/TrendsChart.tsx # Recharts multi-line chart (financial theme)
    │   └── ui/
    │       └── index.tsx             # Shared UI: PageHeader, Card, UploadBar, Field (+trend/bar props)
    ├── lib/
    │   ├── calculations.ts           # Pure financial functions (typed, validated, 29 tests)
    │   ├── calculations.test.ts      # 29 unit tests (Vitest)
    │   ├── chart-theme.ts            # Chart configuration (colors, grid, tooltip, formatters)
    │   ├── helpers.ts                # CSV/Excel/download utilities
    │   └── importer/
    │       ├── types.ts              # CanonicalFact, FundalystDataset, ReferenceTemplate
    │       ├── metric-aliases.ts     # 250+ aliases for 32 canonical metrics
    │       ├── normalizer.ts         # Value parser (Indian commas, Cr/L/Bn)
    │       ├── detector.ts           # Auto-detect: company, currency, periods
    │       ├── parser.ts             # CSV/XLSX/PDF/Image → rows → facts → dataset
    │       ├── csv-detector.ts       # Auto-CSV delimiter (comma/tab/semicolon/pipe)
    │       ├── confidence.ts         # Confidence tier grouping (high/medium/low)
    │       ├── pdf-validator.ts      # PDF validation (size, encryption, corruption)
    │       ├── tool-validation.ts    # Accounting sanity checks
    │       ├── import-hooks.ts       # useGlobalImportFill (reactive, ref-safe)
    │       ├── reference-formats.ts  # Reference Format Engine w/ 4 Indian templates
    │       ├── xbrl-parser.ts        # XBRL/iXBRL browser parser (BETA, ~1000 lines)
    │       ├── ocr.ts                # OCR pipeline + PDF text extraction + noise filtering
    │       ├── pdf-importer.ts       # PDF import orchestrator (non-financial label filtering)
    │       └── screenshot/           # Screenshot import pipeline
    │           ├── preprocessor.ts   # Image resize, grayscale, contrast, sharpen
    │           ├── table-finder.ts   # OCR text → table structure
    │           ├── value-extractor.ts# Metric mapping + confidence scoring
    │           └── pipeline.ts       # Full orchestrator → review state
    ├── store/
    │   ├── index.ts                  # 7 tool stores + analysis store (Zustand)
    │   ├── global-data-store.ts      # Central multi-dataset store (persisted)
    │   └── importer-store.ts         # Smart Import store → global data
    └── types/
        └── financial.ts              # All TypeScript types
```

---

## ROUTES

| Route | Component | Purpose | Auto-demo |
|---|---|---|---|
| `/` | HomePage | Hero + workflows + tools grid + trust cards | — |
| `/import` | ImportPage | Smart Import + PDF viewer + confidence grouping | — |
| `/research/filing` | FilingPage | Period comparison + insight cards + risk flags | ✅ Auto-executes |
| `/research/trends` | TrendsPage | Multi-period line charts (financial theme) | — |
| `/research/growth` | YoyPage | YoY growth rates + fastest/declining insight | — |
| `/tools/dcf` | DCFPage | DCF + sensitivity heatmap + price reference | ✅ Auto-executes |
| `/tools/wc` | WCPage | Cash Efficiency analysis + warnings | — |
| `/tools/ratios` | RatiosPage | 9 financial ratios + formula disclosure | — |
| `/tools/peer` | PeerPage | Multi-company comparison + inline bars | — |
| `/about` | AboutPage | Product page with SVG icons + methodology | — |
| `/research` | Redirect → Filing | Legacy hub | — |
| `/tools` | Redirect → WC | Legacy hub | — |

---

## STATE MANAGEMENT

### Per-tool stores (`src/store/index.ts`)
Most use Zustand with `persist` middleware (localStorage-backed), `version: 2`:
- `useFilingStore`, `useWCStore`, `useRatiosStore`, `usePeerStore`, `useTrendsStore`, `useYoyStore` — all have persist
- **`useDCFStore`** — **NO persist** (race condition with rapid setState). Ephemeral per session.
- `useAnalysisStore` — cross-tool transient data (NOT persisted)

### Global data store (`src/store/global-data-store.ts`)
Central Zustand store with `persist` middleware for multi-file support:
- `datasets: FundalystDataset[]` — all imported datasets
- `activeDatasetId: string | null` — currently active dataset
- `addDataset()`, `removeDataset()`, `setActiveDataset()`, `clearAllData()`
- `getActiveDataset()`, `getToolReadiness()`, `getValidations()`

### Smart Import store (`src/store/importer-store.ts`)
- `review` — active import review state
- `lastDataset` — confirmed FundalystDataset
- `savedMappings` — user mapping templates
- `confirmImport()` pushes to `useGlobalDataStore` automatically

### localStorage keys
`fundalyst-filing`, `fundalyst-wc`, `fundalyst-ratios`, `fundalyst-peer`, `fundalyst-trends`, `fundalyst-yoy`, `fundalyst-importer`, `fundalyst-global-data`, `fundalyst_tab`, `fundalyst_last_tab`, `fundalyst-errors`.

**Note:** `fundalyst-dcf` is NOT persisted.

---

## DATA ARCHITECTURE

### Global Data Flow
```
User uploads file on /import (CSV, XLSX, PDF, or image)
  ↓
buildReviewState() detects file type
  ├── CSV/XLSX → parser.ts (auto-delimiter detection) → Normalizer → Metric Mapping
  ├── PDF → pdf-importer.ts → text extraction (pdfjs-dist) → table detection → noise filter
  ├── Screenshot → screenshot/pipeline.ts → preprocessor → OCR → table finder → extractor
  └── XBRL/iXBRL → xbrl-parser.ts (BETA)
  ↓
Reference Format Engine scores templates against detected metrics
  ↓
Review screen → confidence grouping (high/medium/low) → user edits → Confirm
  ↓
importer-store.confirmImport() → pushes to useGlobalDataStore.addDataset()
  ↓
Global store persists to localStorage (fundalyst-global-data)
  ↓
User navigates to ANY tool page
  ↓
useGlobalImportFill() runs (reactive, ref-safe) → extracts metrics → pre-fills inputs
  ↓
DataQualityBar shows "Using imported data: Company Name"
```

### Import Pipeline Details

**CSV/Excel:** Auto-delimiter detection (comma/tab/semicolon/pipe) via `csv-detector.ts`. Header detection via `detector.ts`. 250+ metric aliases via `metric-aliases.ts`.

**PDF:** Two-stage validation (`pdf-validator.ts`): sync (extension, size) + async (encryption, page count, scanned detection). Embedded viewer (`PdfViewer.tsx`) with zoom, page nav, thumbnails. Text extraction via `extractPdfText()` — groups items by Y-position into rows, joins with 3 spaces, splits on 3+ spaces. 50+ `REMOVE_KEYWORDS` patterns filter noise. `NON_FINANCIAL_LABELS` list silently skips country names, filler words, narrative sentences.

**Screenshot:** `preprocessor.ts` resizes to 600-1600px, grayscale, contrast stretch, unsharp mask. Tesseract.js OCR. `table-finder.ts` detects structure. `value-extractor.ts` maps labels and scores confidence (metric match × 0.35 + OCR quality × 0.25 + plausibility × 0.25 + 0.15 baseline). Clipboard paste (Ctrl+V) supported.

---

## KEY FEATURES

### Smart Importer (Upload → Review → Confirm → Global Data)
1. Upload CSV/XLSX/PDF/Image/Screenshot at `/import`
2. Auto-detects file type, validates PDFs, preprocesses images
3. Normalizes values: Indian commas, ₹, Cr/L/Mn/Bn, bracket negatives
4. Maps raw labels to 32 canonical metrics via 250+ aliases
5. Confidence grouping: high (≥70%), medium (≥40%), low (<40%)
6. Review screen shows: file preview, detection summary, mapping table, confidence badges, "Accept high-confidence" button
7. Confirm → FundalystDataset saved to global data store
8. All tools auto-fill via `useGlobalImportFill` hook

### Core Tools (all client-side)

| Tool | Auto-execute | Inputs | Outputs |
|---|---|---|---|
| Filing Comparison | ✅ First visit | Two textareas + CSV upload | InsightCards + diff table + risk flags |
| DCF Valuation v2 | ✅ First visit | 8 inputs (4 groups) | MetricGrid + verdict + chart + projected cash flows + 5×5 sensitivity heatmap |
| Working Capital | — | 6 inputs | DSO/DIO/DPO/CCC + InsightCards + WarningCards |
| Financial Ratios | — | 11 inputs (3 groups) | 9 ratios in 4 categories + FormulaDisclosure |
| Peer Comparison | — | CSV textarea + upload | Table with best/worst + inline bar charts |
| Trend Charts | — | CSV textarea + upload | Multi-line chart (financial theme) + data table |
| YoY Growth | — | Years + CSV textarea | Growth table + fastest/declining insight |

### Data Source Badges
Every tool shows a `DataQualityBar` with dynamic dot color:
- "Using imported data: Company Name" (green dot)
- "Using sample data" (amber dot)
- "Manual mode" (muted dot)

---

## UI COMPONENT SYSTEM (`src/components/ui/index.tsx`)

| Component | New Features |
|---|---|
| `MetricGrid` | `trend` prop (↑↓ arrows), `bar` prop (inline comparison bar) |
| `CalcTimestamp` | Shows "Calculated HH:MM" after each tool run |
| `Disclaimer` | Now uses CSS class, no inline styles |
| `Card` | Radius 10px (v4 refinement) |
| `Field` | Label font-size via `--text-xs` |
| `EmptyState` | Supports SVG icons |

All components use design system v4 tokens (typography scale, spacing scale).

---

## DESIGN SYSTEM V4

### Color Palette (Refined)
```
--bg: #0A0B0F              // Near-black
--bg-elevated: #141520     // Cards
--bg-surface: #1C1E2E      // Surfaces
--bg-hover: #22243A        // Hover states
--bg-field: #181A28        // Input fields (was #10111C — much more visible)
--border: #2A2D42          // Borders
--border-light: #22253A    // Subtle borders
--border-strong: #363A52   // Strong borders
--text: #F0EFEA            // Primary text
--text-secondary: #C8C9D4  // Secondary text
--text-tertiary: #9597A8   // Tertiary text
--text-muted: #63657A      // Muted text
--primary: #4F6EF7         // Brand — indigo-blue
--green: #2ECC71           // Positive
--red: #E5484D             // Negative (was #E74C3C — less saturated)
--amber: #F0B429           // Warning
```

### Typography Scale
```
--text-xs: 10px    --text-sm: 12px    --text-base: 14px
--text-lg: 16px    --text-xl: 20px    --text-2xl: 24px
--text-3xl: 32px
```

### Spacing Scale (4px grid)
```
--space-1: 4px    --space-4: 16px   --space-8: 32px
--space-2: 8px    --space-5: 20px   --space-10: 40px
--space-3: 12px   --space-6: 24px   --space-12: 48px
```

### Chart Theme (`src/lib/chart-theme.ts`)
- `CHART_COLORS` — 10-color muted palette
- `SERIES_COLORS` — 8-color series for multi-line charts
- `chartGrid` — `#2A2D42` dashed grid
- `axisTick` — monospace 10px `#63657A`
- `tooltipStyle` — dark tooltip with shadow
- `fmtINR()`, `fmtPct()`, `changeColor()`, `trendArrow()`

---

## DCF ENGINE (v2)

### Financial Model
- **Gordon Growth:** `TV = FCF_n × (1 + g_term) / (WACC - g_term)`
- Uses last projected year's FCF, not base FCF
- Validated: FCF=1240, growth=10%, WACC=10%, terminal=3% → IV=₹242.66

### Sensitivity Heatmap
- 5×5 table with CSS classes: `sens-td-up` (green), `sens-td-down` (red), `sens-td-base` (bold white)
- Base assumption cell highlighted
- Row hover state via `.sens-table tr:hover td`

### DCFChart
- Custom bar colors: projection years in primary blue, terminal in amber
- **Price reference line**: red dashed line showing current market price
- Terminal value bar visually distinct (lower opacity)

### TrendsChart
- Financial tooltip with `fmtINR()` formatting
- Primary metric emphasized (2.5px stroke + dots)
- Secondary metrics de-emphasized (1.5px, no dots, 0.7 opacity)
- Vertical grid lines removed

---

## PDF IMPORT SYSTEM

### Validator (`pdf-validator.ts`)
- **Sync:** extension check, empty file (0 bytes), 50 MB limit, 20 MB warning
- **Async:** encryption detection, corruption check, page count, scanned vs text detection
- User-facing error messages for each failure mode

### Viewer (`PdfViewer.tsx`)
- Canvas rendering via pdfjs-dist
- Page navigation (prev/next, jump-to-page input)
- Zoom controls (fit width, fit page, custom zoom +/−)
- Thumbnail strip (first 20 pages at 0.3× scale)
- Loading/error states
- Lazy-loaded via `dynamic()`

### Integration
- PDF upload → validation → `buildOcrReviewState` → `importPdf` → `extractPdfText` → `parseOcrTextToTables` + `cleanOcrText`
- Noise: 50+ REMOVE_KEYWORDS patterns + `isNonFinancialLabel()` + `looksFinancial()`
- Multi-column: one fact per period column
- Auto-ignore low-confidence mappings in review UI

---

## TESTING

```
npm test          # → Vitest: 29 tests, ~50ms
npm test:watch    # → Vitest in watch mode
```

| Suite | Tests | Coverage |
|---|---|---|
| `computeDCF` | 10 | Intrinsic value, zero shares, negative FCF, zero growth, terminal=WACC, net cash, projected cash flows, margin of safety |
| `computeDCFSensitivity` | 2 | Shape, invalid combinations |
| `validateDCFInputs` | 5 | Empty fields, years range, terminal ≥ WACC |
| `computeWC` | 3 | DSO formula, CCC, null handling |
| `computeRatios` | 3 | All 9 ratios, D/E value, missing values |
| `fmtNum` / `fmtINR` | 3 | Indian locale, crores, lakhs, null |

---

## BUGS FIXED IN THIS VERSION

| Bug | Fix |
|---|---|
| DCF "Calculate value" produced no results | Removed persist middleware. Fixed callback syntax error. |
| DCF stale closure | `getState().inputs` at click time instead of closure capture |
| DCF 130-line IIFE on every keystroke | Extracted `DCFResults` component with memoization |
| PDF rows joined with 2 spaces, but table parser split on 3+ | Changed `join('  ')` → `join('   ')` |
| PDF builder used `table.rows` (unfiltered) instead of `cleanedRows` | Switched to `table.cleanedRows` + 3 additional filters |
| All PDF facts had `periodLabel: 'Period 1'` | Now creates one fact per value column |
| Import hook silently returned when extract() returned null | Hook now always updates state even when extract returns null |
| DCF extract required FCF — no PDF has FCF | Falls back to Net Profit/EBIT as proxy |
| Home page used 16 inline style objects | All moved to CSS classes |
| Nav used inline styles for badge/clear | Extracted to CSS classes |
| Design system: bg-field too dark, borders too subtle | Refined all color tokens (v4) |
| Card radius 12px felt soft for financial tool | Reduced to 10px |
| No typography/spacing scale | Added CSS variables for both |
| Sensitivity table: 48 inline style lines | Replaced with CSS classes + heatmap coloring |
| Filing diff change column used inline style | Replaced with CSS class |
| Disclaimer had inline styles | Moved to CSS class |
| Chart container had inline styles | Moved to CSS class |
| Period label input was unstyled (white box) | Added `.period-label-input` CSS class |
| Filing textarea had inline styles | Moved to `.filing-textarea` CSS class |
| No Filing auto-execute | Added useEffect + ref guard |
| No favicon | Added inline SVG favicon |
| Error boundary didn't log errors | Added componentDidCatch + localStorage error log |
| Missing success toasts | Added to WC, Ratios, Filing, DCF |
| No toast CSS (unstyled element) | Added fixed bottom-center with slide-up animation |
| Mobile nav didn't scroll on small screens | Added `-webkit-overflow-scrolling: touch`, hidden scrollbar |
| About grid didn't collapse on mobile | Added `.about-grid` → 1 column at 820px |

---

## DESIGN DECISIONS

| Decision | Why |
|---|---|
| No backend | User requirement. All client-side. Privacy as product advantage. |
| TypeScript strict mode | Financial calculation safety. NaN/undefined caught at compile. |
| Zustand over Redux/Context | Lightweight, typed, persist middleware built-in. |
| Recharts over Chart.js | Declarative, SSR-safe, no manual canvas refs. |
| Custom CSS over Tailwind | User prefers existing design system. Tailwind removed. |
| DCF store without persist | Race condition with rapid setState. Results are ephemeral. |
| Global data store over per-tool stores | Imported data flows seamlessly without re-import. |
| Refs for callback deps in hooks | Prevents infinite render loops. |
| Vitest over Jest | Faster, native TypeScript, works without Babel config. |
| SVG icons over emoji | Platform-independent, consistent rendering. |
| PDF 3-space join | Column splitter needs 3+ spaces — must match. |
| Auto-CSV delimiter | Tab/semicolon/pipe CSVs would fail with comma-only parser. |
| Image preprocessing before OCR | Significantly improves Tesseract accuracy for financial tables. |

---

## DEPENDENCIES

**Production:** `next@16.2.9`, `react@19.2.4`, `react-dom@19.2.4`, `zustand@5`, `recharts@3.9`, `xlsx@0.18`, `tesseract.js@7.0.0`, `pdfjs-dist@5.4.149`

**Dev:** `typescript@5`, `eslint@9`, `@types/react@19`, `@types/react-dom@19`, `vitest@4`

---

## KNOWN ISSUES

| Issue | Severity | Notes |
|---|---|---|
| DCF store not persisted | Low | Intentional — inputs reset to defaults on reload |
| No per-tool error boundary | Low | Single ErrorBoundary wraps all tools |
| XBRL parser BETA, 80+ tag mappings | Low | Needs more Indian taxonomy tags |
| Reference Format Engine has 4 templates | Low | Can add US GAAP, IFRS, etc. |
| Dataset selector UI not built | Low | Multi-file support exists but no UI to switch |
| OCR/PDF results BETA for complex docs | Low | Always require user review |
| No analytics/tracking | Medium | Cannot measure user success |
| No error reporting (remote) | Medium | localStorage logging only |
| Mobile responsive functional but basic | Low | Works down to 480px |

---

## HOW TO RUN

```bash
cd "C:\Users\kingo\Desktop\fundalyst-next"

# Install
npm install

# Dev server
npm run dev          # → http://localhost:3000

# Production build
npm run build        # → outputs to .next/
npm start            # → serves on port 3000

# Run tests
npm test             # → 29 tests, ~50ms
```

---

## DEPLOYMENT

```bash
# 1. Push to GitHub
git add .
git commit -m "message"
git push origin main

# 2. Vercel (manual upload)
#    - Go to https://vercel.com
#    - Connect fundalyst- repo
#    - Auto-detects Next.js
#    - Deploys automatically on push
```

---

## DESIGN PRINCIPLES

1. **Build for longevity.** Modular components, ref-safe hooks, strict types, explicit imports, CSS design tokens.

2. **Clarity first.** Every element communicates something useful within 5 seconds.

3. **Function before decoration.** If an element does not improve understanding, remove it.

4. **Data-first, not tool-first.** Users see data immediately, not instructions.

5. **Zero friction.** No confirm dialogs. No hub pages. Tools are one click from the nav.

6. **Transparent methodology.** Every formula is documented. No black-box finance.

7. **Indian market native.** ₹ formatting, Cr/L units, NSE/BSE terminology, lakhs/crores.

8. **Institutional aesthetic.** Dark theme, IBM Plex fonts, minimal chrome, information-dense.

9. **Hook safety.** Never put inline function references in useEffect dependency arrays. Use refs.

10. **Accessibility is correctness.** Skip-to-content, labels, ARIA, touch targets, reduced motion, semantic HTML.

---

## ROADMAP & NEXT STEPS

### Critical (Ship-blocking for public launch)

| Priority | Feature | Why | Effort |
|---|---|---|---|
| P0 | **Client-side error tracking** | Errors stored in localStorage but user never sees them. Add a "Support" button that exports error logs, or integrate Sentry (free tier, client-side only) | Low |
| P0 | **Loading skeletons on all pages** | DCF and Filing have auto-execute, but on slow connections the initial page load shows nothing. Add skeleton placeholders for all tool pages | Low |
| P0 | **Page transition loading state** | Navigating between tools on slow connections shows blank page briefly. Add a route change loading indicator | Low |

### High Impact (Biggest user value per engineering hour)

| Priority | Feature | Why | Effort |
|---|---|---|---|
| P1 | **NSE/BSE XBRL auto-fetch** | Users currently paste data manually. If Fundalyst could fetch XBRL data from NSE/BSE corporate sites (client-side fetch from public URLs), it eliminates 90% of manual entry. Requires CORS proxy or browser extension | High |
| P1 | **Portfolio / watchlist** | LocalStorage-based list of companies the user is tracking. Each company stores its imported datasets. Creates retention loop without backend | Medium |
| P1 | **Multi-sheet Excel support** | SheetJS can read all sheets, but UI only shows first. Add sheet selector dropdown when workbook has multiple sheets | Low |
| P1 | **Download extracted data as CSV** | After import review, user can download the mapped data as CSV before confirming. Enables data portability | Low |

### Medium Impact (Polishes the experience)

| Priority | Feature | Why | Effort |
|---|---|---|---|
| P2 | **Keyboard shortcuts** | Power users spend hours researching. Keyboard shortcuts for "Run calculation" (Ctrl+Enter), "Clear" (Ctrl+Shift+C), "Navigate tools" (1-9) increase efficiency significantly | Medium |
| P2 | **Chart export as PNG** | Every chart should have a download button. Recharts supports this via `toDataURL()` on the SVG container | Low |
| P2 | **PWA / offline support** | Many Indian users have unreliable internet. A service worker + manifest would let the app work offline after first load. All data is already client-side | Medium |
| P2 | **Mobile-first responsive** | Current responsive works down to 480px but isn't optimized for mobile use. Nav should collapse to hamburger, tool sections should stack better, font sizes should adjust | Medium |

### Lower Priority (Valuable but substantial)

| Priority | Feature | Why | Effort |
|---|---|---|---|
| P3 | **Multi-language (Hindi, Tamil, Telugu)** | Majority of Indian retail investors prefer local languages. Requires i18n framework + translations for all UI text | High |
| P3 | **Data screening engine** | Filter companies by financial metrics (P/E < 15, ROE > 15%, Debt/Equity < 1, etc.). Requires data API integration | Very High |
| P3 | **Pre-built company templates** | Pre-filled financial data for NSE 500 companies. Users select a company and get all tools pre-populated. Requires data sourcing | Very High |
| P3 | **Social sharing / public analysis links** | Share a company analysis via URL (data encoded in hash). Enables word-of-mouth without backend | Medium |

---

## CURRENT SHORTCOMINGS

### Functional Shortcomings

1. **No data API** — Users must manually upload/paste financial data. This is the #1 barrier to adoption. Every competitor (Screener, Tickertape, Trendlyne) has built-in data.

2. **No persistence beyond localStorage** — Clear browser data = lose all work. No cloud sync, no export/import of workspace state.

3. **No company watchlist** — Users research one company at a time with no way to save their research history or track multiple companies.

4. **No keyboard shortcuts** — Power researchers navigate with keyboard. Current UI requires mouse clicks for every action.

5. **No chart export** — Users can't save or share charts as images.

6. **No data screening** — Users can't discover companies by financial criteria (e.g. "show me all companies with ROE > 15% and debt < 100 Cr").

7. **Single-period Filing import only** — The Filing tool only compares two periods. Importing 5-year trends requires going to the Trends tool separately.

### UX Shortcomings

8. **No loading skeletons on non-auto tools** — WC, Ratios, Peer, Trends, Growth pages show nothing while loading. DCF and Filing show data immediately because of auto-execute.

9. **Mobile experience is basic** — Works at 480px but nav tabs are small, tool cards don't stack optimally, input fields are cramped.

10. **No "Quick tour" on first visit** — First-time users land on the home page with no guided onboarding. They have to figure out the workflow themselves.

11. **Results positioning** — After clicking "Calculate" on WC/Ratios/Peer, the page doesn't scroll to results. Users have to scroll down manually.

### Technical Shortcomings

12. **No error reporting** — Crashes are logged to localStorage but never surfaced to developers. Silent failures are invisible.

13. **Bundle size** — Next.js+Tesseract.js+pdfjs-dist+Recharts is a heavy client payload. Tesseract alone is ~1MB. Could be code-split more aggressively.

14. **No automated accessibility testing** — Manual accessibility pass was done but no automated CI checks exist.

15. **No TypeScript path aliases for importer** — `@/lib/importer/types` works but some internal imports use relative paths (`../../types`). Inconsistent.

### Business Shortcomings

16. **No monetization** — Zero revenue model. All features free. No way to fund development or API integrations.

17. **No user analytics** — Impossible to know which features users actually use, where they get stuck, or what drives retention.

18. **No competitive moat** — Everything is client-side and open source. Competitors can replicate features. The only moat is user trust + data integrations.

---

## IMPROVEMENT ROADMAP

### Phase 1: Launch Polish (1-2 weeks, no backend)

1. **Add loading skeletons** to all tool pages (WC, Ratios, Peer, Trends, Growth)
2. **Add keyboard shortcuts**: Enter to run, Escape to clear, 1-9 for nav
3. **Add chart export** as PNG download button
4. **Auto-scroll to results** after calculation on all tools
5. **Add "Quick tour" modal** on first visit showing the 3-step workflow

### Phase 2: User Retention (2-4 weeks, no backend)

6. **Build portfolio/watchlist** in localStorage — companies, imported datasets, last viewed
7. **Add data export/import** — export all tool data as JSON, import to restore workspace
8. **Add PWA manifest + service worker** — installable on mobile home screen, offline-capable

### Phase 3: Data Integration (4-8 weeks, requires CORS proxy or backend)

9. **NSE/BSE XBRL scraper** — fetch annual/quarterly results from exchange websites
10. **Screening engine** — filter companies by financial criteria
11. **Company profiles** — pre-built financial summaries for NSE 500 companies

### Phase 4: Scale (8+ weeks)

12. **Cloud accounts** — sync workspace across devices, share analyses
13. **Mobile app** (React Native or PWA-first) — tap into India's mobile-first user base
14. **Multi-language** — Hindi, Tamil, Telugu, Bengali, Marathi
15. **API for developers** — programmatic access to Fundalyst's calculation engine

---

## VERDICT

Fundalyst is a **powerful, polished analysis tool** that solves a real problem for Indian retail investors. Its strengths are:

- **Zero friction** — no accounts, no sign-up, instant start
- **Privacy-first** — all computation client-side
- **Financial accuracy** — 29 tests, validated formulas, transparent methodology
- **Professional design** — dark theme, IBM Plex, information-dense

Its biggest weakness is the **lack of built-in financial data**. The manual paste/upload workflow is tolerable for occasional use but won't retain users long-term. The single highest-impact investment would be integrating NSE/BSE XBRL data — even if it's client-side fetching from public URLs.

**Current stage:** Beta-ready for small user group.
**Target:** Indispensable research tool for Indian retail value investors.
**North star:** "Bloomberg Terminal for Indian retail investors — in the browser, no server, no cost."
