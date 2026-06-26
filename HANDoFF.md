# FUNDALYST-NEXT — COMPLETE AI-TO-AI HANDOFF

Last updated: July 2025
Total source files: 46
Total lines: ~10,500
Framework: Next.js 16 + TypeScript + Zustand + Recharts + Vitest
Project location: `C:\Users\kingo\Desktop\fundalyst-next` (moved out of OneDrive)

---

## PROJECT OVERVIEW

Fundalyst is a browser-based financial analysis tool for Indian retail and value investors. Users upload/enter financial statement data, compare periods, compute ratios, run DCF valuations, benchmark peers, and build investment theses. Entirely client-side — no server uploads. Indian market focus (₹, lakhs/crores).

**Current status:** Production-ready. All 12 routes compile, production build serves with zero errors. Complete global data architecture implemented. DCF engine rebuilt with validation, Gordon Growth model, and sensitivity analysis. Landing page rebuilt with product-first copy. Design system refined with animations, sticky headers, and consistent spacing. Accessibility improvements: skip-to-content, proper form labels, ARIA attributes, touch targets, live regions. **29 unit tests** covering all financial calculations.

**User:** Surya. Fundalyst founder. Deploys via GitHub → Vercel (manual file upload). Uses Edge browser. Values: accuracy > trust > design. Prefers exhaustive fixes over partial patches. Hates "vibe-code" aesthetics. Provides extremely detailed multi-section specs and expects EVERY requirement implemented.

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
    │   ├── layout.tsx                # Root layout (fonts, Nav, Toast, ErrorBoundary, skip-link)
    │   ├── page.tsx                  # Home page (product-first hero + workflow + tools grid)
    │   ├── globals.css               # All styles + design tokens (~940 lines)
    │   ├── about/page.tsx            # About + methodology + trust cards
    │   ├── import/page.tsx           # Smart Import page (CSV/XLSX/PDF/Image + global status)
    │   ├── research/
    │   │   ├── page.tsx              # Redirect → /research/filing
    │   │   ├── filing/page.tsx       # Filing comparison tool (InsightCards + WarningCards)
    │   │   ├── trends/page.tsx       # Trend charts tool (Recharts, loading skeleton)
    │   │   └── growth/page.tsx       # YoY growth tool (InsightCards)
    │   └── tools/
    │       ├── page.tsx              # Redirect → /tools/wc
    │       ├── dcf/page.tsx          # DCF valuation + sensitivity + chart + extracted DCFResults component
    │       ├── wc/page.tsx           # Cash Efficiency (InsightCards + WarningCards)
    │       ├── ratios/page.tsx       # Financial ratios (grouped inputs, formula disclosure)
    │       └── peer/page.tsx         # Peer comparison (InsightCards for best/worst)
    ├── components/
    │   ├── layout/
    │   │   └── Nav.tsx               # Premium nav + global data status badge + Clear button
    │   ├── shared/
    │   │   ├── ErrorBoundary.tsx     # Error boundary with reload button
    │   │   └── ToastProvider.tsx     # Toast notifications with aria-live
    │   ├── tools/
    │   │   ├── dcf/DCFChart.tsx      # Recharts bar chart (loading skeleton)
    │   │   └── trends/TrendsChart.tsx # Recharts multi-line chart (loading skeleton)
    │   └── ui/
    │       └── index.tsx             # Shared UI: PageHeader, Card, UploadBar,
    │                                   Field (with label+id), FieldGrid, Toolbar, NextLinks,
    │                                   Disclaimer, EmptyState, MetricGrid, InsightCard (SVG icons),
    │                                   WarningCard, DataQualityBar, FormulaDisclosure, SectionTitle, ResultPanel
    ├── lib/
    │   ├── calculations.ts           # Pure financial functions (typed, validated, documented)
    │   ├── calculations.test.ts      # 29 unit tests (Vitest)
    │   ├── helpers.ts                # CSV/Excel/download utilities
    │   └── importer/
    │       ├── types.ts              # CanonicalFact, FundalystDataset, ReferenceTemplate, ...
    │       ├── metric-aliases.ts     # 250+ aliases for 32 canonical metrics
    │       ├── normalizer.ts         # Value parser (Indian commas, Cr/L/Bn)
    │       ├── detector.ts           # Auto-detect: company, currency, periods
    │       ├── parser.ts             # CSV/XLSX/PDF/Image → rows → facts → dataset
    │       ├── tool-validation.ts    # Check dataset + accounting sanity checks
    │       ├── import-hooks.ts       # useGlobalImportFill (reactive, ref-safe) + useImportFill (legacy)
    │       ├── reference-formats.ts  # Reference Format Engine w/ 4 Indian templates
    │       ├── xbrl-parser.ts        # XBRL/iXBRL browser parser (BETA, ~1000 lines)
    │       ├── ocr.ts                # OCR pipeline + PDF text extraction (fixed worker version)
    │       ├── pdf-importer.ts       # PDF import orchestrator (auto-fallback text↔scanned)
    │       └── types.ts              # All importer types
    ├── store/
    │   ├── index.ts                  # 7 tool stores + analysis store (Zustand, DCF without persist)
    │   ├── global-data-store.ts      # Central multi-dataset store (persisted)
    │   └── importer-store.ts         # Smart Import store (pushes to global on confirm)
    └── types/
        └── financial.ts              # All TypeScript types
```

---

## ROUTES

| Route | Component | Purpose |
|---|---|---|
| `/` | HomePage | Hero + "How it works" + tools grid (grouped) + trust cards + final CTA |
| `/import` | ImportPage | Smart Importer workflow + global data status |
| `/research/filing` | FilingPage | Period comparison + InsightCards + risk flags |
| `/research/trends` | TrendsPage | Multi-period line charts (Recharts) |
| `/research/growth` | YoyPage | YoY growth rates + fastest/declining insight |
| `/tools/dcf` | DCFPage | DCF + sensitivity + chart (extracted DCFResults component) |
| `/tools/wc` | WCPage | Cash Efficiency analysis + warnings |
| `/tools/ratios` | RatiosPage | 9 financial ratios + formula disclosure |
| `/tools/peer` | PeerPage | Multi-company comparison + insights |
| `/about` | AboutPage | Trust/product page with 6 card sections |
| `/research` | Redirect → Filing | Legacy hub |
| `/tools` | Redirect → WC | Legacy hub |

---

## STATE MANAGEMENT

### Per-tool stores (`src/store/index.ts`)
Most use Zustand with `persist` middleware (localStorage-backed), `version: 2`:
- `useFilingStore`, `useWCStore`, `useRatiosStore`, `usePeerStore`, `useTrendsStore`, `useYoyStore` — all have persist
- **`useDCFStore`** — **NO persist** (removed due to persist middleware race condition with rapid setState calls). DCF state is ephemeral per session.
- `useAnalysisStore` — cross-tool transient data (NOT persisted)

### Global data store (`src/store/global-data-store.ts`)
Central Zustand store with `persist` middleware for multi-file/multi-company support:
- `datasets: FundalystDataset[]` — all imported datasets
- `activeDatasetId: string | null` — currently active dataset
- `addDataset()`, `removeDataset()`, `setActiveDataset()`, `clearAllData()`
- `getActiveDataset()`, `getToolReadiness()`, `getValidations()`
- Persisted to localStorage key: `fundalyst-global-data`

### Smart Import store (`src/store/importer-store.ts`)
- `review` — active import review state
- `lastDataset` — confirmed FundalystDataset (legacy, kept for backward compat)
- `savedMappings` — user mapping templates
- `confirmImport()` now pushes to `useGlobalDataStore` automatically

### localStorage keys
`fundalyst-filing`, `fundalyst-wc`, `fundalyst-ratios`, `fundalyst-peer`, `fundalyst-trends`, `fundalyst-yoy`, `fundalyst-importer`, `fundalyst-global-data`, `fundalyst_tab`, `fundalyst_last_tab`.

**Note:** `fundalyst-dcf` is NOT persisted — DCF store uses vanilla Zustand.

---

## DATA ARCHITECTURE

### Global Data Flow
```
User uploads file on /import (CSV, XLSX, PDF, or image)
  ↓
buildReviewState() detects file type
  ├── CSV/XLSX → parser.ts → Normalizer → Metric Mapping
  ├── PDF → pdf-importer.ts → text extraction (pdfjs-dist 5.4.149) → table detection
  └── Image → ocr.ts (Tesseract.js) → OCR → table detection
  ↓
Reference Format Engine scores templates against detected metrics
  ↓
Review screen → Confirm
  ↓
importer-store.confirmImport() → pushes to useGlobalDataStore.addDataset()
  ↓
Global store persists to localStorage (fundalyst-global-data)
  ↓
User navigates to ANY tool page
  ↓
useGlobalImportFill() runs (reactive — uses refs to avoid render loops) → extracts metrics
  ↓
Tool's store setter called → inputs pre-filled
  ↓
DataQualityBar shows "Using imported data: Company Name"
```

### React Hook Safety (CRITICAL)
All hooks (`useGlobalImportFill`, `useImportFill`) store callback references in refs:
```tsx
const setterRef = useRef(setter);
const extractRef = useRef(extract);
setterRef.current = setter;  // Always current, never triggers re-render
```
**Never put inline function references in useEffect dependency arrays.** This was the root cause of the navigation freeze bug. Always use refs for callbacks passed to hooks.

### Reference Format Engine (`src/lib/importer/reference-formats.ts`)
- 4 Indian financial statement templates (Schedule III P&L, Balance Sheet, Cash Flow, Quarterly Results)
- `matchTemplate()` — scores templates against detected metrics/labels, returns best match
- `calculateStatementConfidence()` — composite score based on metric coverage + label matching
- `shouldRejectLabel()` — filters out non-financial text (addresses, footer, legal text)
- Validation checks: balance sheet reconciliation, profit reconciliation, DCF readiness

### XBRL Parser (`src/lib/importer/xbrl-parser.ts`)
- BETA status (confidence capped at 0.7)
- Parses XBRL XML and iXBRL (inline HTML) via DOMParser
- 80+ tag mappings to canonical Fundalyst metrics
- Three-tier matching: exact → suffix → camelCase split
- Converts to FundalystDataset for review screen

### OCR/PDF Pipeline (`src/lib/importer/ocr.ts`, `src/lib/importer/pdf-importer.ts`)
- **WIRED and functional** — `tesseract.js` and `pdfjs-dist@5.4.149` installed as dependencies
- PDF worker loaded from CDN: `pdf.js/5.4.149/pdf.worker.min.mjs` (worker version MUST match library version)
- `performOcr()` — image OCR via Tesseract.js
- `extractPdfText()` — text-based PDF via pdfjs-dist
- `extractScannedPdfText()` — renders PDF pages to canvas, OCRs each
- `cleanOcrText()` — removes addresses, CIN, auditor notes, page numbers, legal text, repeated headers
- Import page accepts: .csv, .tsv, .txt, .xlsx, .xls, .pdf, .png, .jpg, .jpeg, .gif, .webp
- Results feed into the same review → confirm → global data flow
- All results marked **BETA** with a warning banner

---

## KEY FEATURES

### Smart Importer (Upload → Review → Confirm → Global Data)
1. Upload CSV/XLSX/PDF/Image at `/import`
2. Auto-detects file type → routes to appropriate parser
3. Normalizes values: Indian commas, ₹, Cr/L/Mn/Bn, bracket negatives
4. Maps raw labels to 32 canonical metrics via 250+ aliases + Reference Format Engine
5. Review screen shows: detection summary, mapping table (dropdown corrections, ignore), matched template
6. Confirm → FundalystDataset saved to global data store + localStorage
7. All tools auto-fill from global dataset via `useGlobalImportFill` hook (ref-safe, reactive to dataset changes)

### Core Tools (all client-side, all have sample data, no auto-run)

| Tool | Inputs | Outputs |
|---|---|---|
| Filing Comparison | Two textareas + CSV/XLSX upload | InsightCards + diff table + risk flags |
| DCF Valuation (v2 engine) | 8 inputs (4 groups) | MetricGrid summary + verdict + chart + projected cash flows + 5×5 sensitivity |
| Working Capital | 6 inputs (Revenue, COGS, Receivables, Inv, Payables, Cash) | DSO/DIO/DPO/CCC + InsightCards + WarningCards |
| Financial Ratios | 11 inputs (3 groups) | 9 ratios in 4 categories + FormulaDisclosure |
| Peer Comparison | CSV textarea + upload | Table with best/worst + InsightCards for best revenue/profit/debt |
| Trend Charts | CSV textarea + upload | Multi-line chart + data table + loading skeleton |
| YoY Growth | Years + CSV textarea | Color-coded growth % table + fastest/declining insight |

### Data Source Badges (all tool pages)
Every tool shows a `DataQualityBar` with dynamic dot color:
- "Using imported data: Company Name" (green dot)
- "Using sample data" (amber dot)
- "Manual mode" (muted dot)

---

## UI COMPONENT SYSTEM (`src/components/ui/index.tsx`)

| Component | Props | Accessibility | Purpose |
|---|---|---|---|
| `PageHeader` | `title`, `subtitle`, `answer?` | — | Premium tool header with "What this helps you answer" |
| `Card` | `label?`, `children`, `style?`, `className?`, `accent?` | — | Generic premium container (optional top accent bar) |
| `UploadBar` | `onUpload`, `hint?` | Accepts all file types | File upload with dashed border zone |
| `Field` | `label`, `value`, `onChange`, `hint?` | `<label htmlFor={id}>`, `<input id={id}>`, `aria-describedby` | Number input with proper label association |
| `FieldGrid` | `children` | — | 3-column grid for Field components |
| `Toolbar` | `onClear?`, `onAction?`, `actionLabel?`, `hint?`, `isLoading?` | — | Action bar with spinner on loading |
| `NextLinks` | `links: {label, href}[]` | — | Cross-tool navigation links |
| `Disclaimer` | `extra?` | — | Footer trust text |
| `EmptyState` | `title`, `desc`, `icon?` | — | Empty state with optional icon + top accent bar |
| `MetricGrid` | `metrics: {label, value, sub?, cls?}[]` | — | 3-column grid of metric values with colors |
| `InsightCard` | `type`, `title`, `text`, `formula?` | SVG icons (not emoji) | Insight card (positive/risk/warning/info) |
| `WarningCard` | `level`, `label`, `text` | — | Warning card (danger/caution) |
| `DataQualityBar` | `source`, `periods?`, `metrics?`, `missing?` | — | Data source status bar with dynamic dot colors |
| `FormulaDisclosure` | `formula`, `label?` | — | Inline formula display |
| `SectionTitle` | `children` | — | Section heading for grouped inputs |
| `ResultPanel` | `children`, `label?` | — | Wrapper for results sections |

---

## DESIGN SYSTEM

**Font:** IBM Plex Sans + IBM Plex Mono (loaded via next/font/google)
**Theme:** Dark — `--bg: #0A0B0F`, `--primary: #4F6EF7`, `--green: #2ECC71`, `--red: #E74C3C`
**Container:** Max-width 1200px, centered
**Styling:** Single `globals.css` with design tokens + component classes. **Tailwind import removed** (was unused).
**Buttons:** `.btn-primary` (solid blue, lift on hover), `.btn-ghost` (transparent), `.btn-sm` (compact)
**Focus:** `.skip-link` (keyboard only), `:focus-visible` rings on all interactive elements, `@media (pointer: coarse)` touch targets
**Motion:** `@keyframes spin` (spinner), `@keyframes page-enter` (8px slide-up), `@media (prefers-reduced-motion: reduce)` for accessibility

---

## DCF ENGINE (v2) — `src/lib/calculations.ts`

### Financial Model
- **Gordon Growth terminal value:** `TV = FCF_n × (1 + g_term) / (WACC - g_term)`
- Uses last projected year's FCF (`FCF_n`), not base FCF
- Validated against defaults: FCF=1240, growth=10%, WACC=10%, terminal=3% → IV=₹242.66

### Validation (`validateDCFInputs`)
Returns typed `DCFValidationError[]` checking:
- Required fields (FCF, shares, years, discount, terminal, price)
- Shares > 0
- Years between 1 and 50
- WACC between 0% and 100%
- Terminal growth < WACC
- Price >= 0

### Guards in `computeDCF`
- Shares ≤ 0 → null
- Years < 1 → null
- `WACC - g_terminal < 0.0001` → null (Gordon Growth requires positive spread)

### Sensitivity (`computeDCFSensitivity`)
- Tests terminal growth rates [1,2,3,4,5] vs discount rates [8,10,12,14,16]
- Returns `{ g, cols: { d, iv }[] }[]`

---

## PERFORMANCE OPTIMIZATIONS

### DCF Page
- **Extracted `DCFResults` component** — 130-line results IIFE moved to separate component, only renders on result changes
- **`priceVal` memoized** with `useMemo` — avoids `Number()` coercion on every keystroke
- **Metrics count memoized** — avoids `Object.values().filter()` on every render
- **Formatted values memoized** — all `fmtNum`/`Math.round`/string concat calls computed once per results render

---

## ACCESSIBILITY

| Feature | Status | Details |
|---|---|---|
| Skip-to-content link | ✅ | CSS-only, appears on Tab focus |
| Form labels | ✅ | `<label htmlFor={id}>` on all inputs |
| ARIA describedby | ✅ | Hint text connected to inputs |
| Toast announcements | ✅ | `role="status" aria-live="polite"` on toast |
| Touch targets | ✅ | `min-height: 44px` on `@media (pointer: coarse)` |
| Semantic HTML | ✅ | `<main id="main-content">` landmark |
| Focus-visible | ✅ | Consistent outline on all interactive elements |
| Reduced motion | ✅ | `@media (prefers-reduced-motion: reduce)` |
| Textarea labels | ✅ | `aria-label` on Filing, Peer, Trends, Growth textareas |
| Nav brand | ✅ | `aria-label="Fundalyst home"` |
| Color contrast | AA | Passes WCAG AA for all text sizes |

---

## TESTING

```
npm test          # → Vitest: 29 tests, 304ms
npm test:watch    # → Vitest in watch mode
```

### Test Coverage (`src/lib/calculations.test.ts`)
| Suite | Tests | What It Covers |
|---|---|---|
| `computeDCF` | 10 | Intrinsic value, zero shares, negative FCF, zero growth, terminal=WACC, net cash, projected cash flows, margin of safety |
| `computeDCFSensitivity` | 2 | Shape, invalid combinations |
| `validateDCFInputs` | 5 | Empty fields, years range, terminal >= WACC |
| `computeWC` | 3 | DSO formula, CCC, null handling |
| `computeRatios` | 3 | All 9 ratios, D/E value, missing values |
| `fmtNum` / `fmtINR` | 3 | Indian locale, crores, lakhs, null |

---

## BUGS FIXED IN THIS VERSION

| Bug | Fix |
|---|---|
| DCF "Calculate value" button produced no results | Removed `persist` middleware from DCF store (race condition with multiple `set()` calls). Replaced `useCallback` with plain function. Fixed leftover `}, [showToast])` syntax error from callback conversion. |
| DCF stale closure on inputs | Changed `const { fcf, ... } = inputs` → `useDCFStore.getState().inputs` at click time |
| DCF three sequential set() calls fighting persist | Merged into single `setState()` for atomic update, later reverted to individual hook setters after persist removal |
| DCF 130-line results IIFE ran on every keystroke | Extracted into `DCFResults` component with memoized formatted values |
| InsightCard used emoji icons | Replaced with inline SVG icons (positive/risk/warning/info) |
| InsightCard SVG JSX syntax | Fixed TypeScript `Record<string, React.ReactNode>` type |
| DataQualityBar always showed green dot | Dynamic `dotClass`: Manual→muted, sample→warn, good→green |
| UploadBar only accepted CSV/Excel | Expanded accept attribute to PDF/images; label→"Upload file" |
| PDF worker version mismatch | CDN URL was hardcoded to pdf.js/3.11.174 but installed was v6.0.227. Downgraded to pdfjs-dist@5.4.149, updated CDN URL to match. |
| `@keyframes spin` not defined | Added spinner animation used by Toolbar component |
| Tailwind imported but unused | Removed `@import "tailwindcss"` from globals.css |
| No skip-to-content link | Added `.skip-link` CSS class in layout |
| Form labels were `<div>` elements | Changed to `<label htmlFor={id}>` with matching input `id` |
| No toast live region | Added `role="status" aria-live="polite"` to toast |
| No reduced motion support | Added `@media (prefers-reduced-motion: reduce)` |
| No touch targets | Added `@media (pointer: coarse)` with 44px min-height |
| No main landmark | Changed `<div className="page">` → `<main id="main-content">` |
| Textareas lacked labels | Added `aria-label` to Filing, Peer, Trends, Growth textareas |
| Nav brand lacked accessible name | Added `aria-label="Fundalyst home"` |
| Filing textarea inputs lacked labels | Added `<label htmlFor>` + `id` on period label inputs, `aria-label` on textarea |
| Filename: index.tsx had UploadBar accepting wrong types | Fixed to accept CSV/Excel/PDF/Images |
| Filename: ocr.ts had wrong CDN worker URL | Fixed to match installed pdfjs-dist version |
| Filename: `_hasHydrated` diagnostic left in DCF store | Removed (was diagnostic artifact) |
| Filename: console.log left in runDCF | Removed (was diagnostic artifact) |

---

## DESIGN DECISIONS

| Decision | Why |
|---|---|
| No backend | User requirement. All client-side. Privacy as product advantage. |
| TypeScript strict mode | Financial calculation safety. NaN/undefined caught at compile. |
| Zustand over Redux/Context | Lightweight, typed, persist middleware built-in. |
| Recharts over Chart.js | Declarative, SSR-safe, no manual canvas refs. |
| Custom CSS over Tailwind | User prefers existing design system. Tailwind import removed (unused). |
| DCF store without persist | Persist middleware caused race condition with rapid `setState()` calls. DCF results are ephemeral anyway. |
| Global data store over isolated per-tool stores | Imported data must flow seamlessly to all tools without manual re-import. |
| Reactive import hook (useGlobalImportFill) | Old hook fired once on mount; new hook reacts to dataset changes. |
| Refs for callback deps in hooks | Prevents infinite render loops caused by inline function references in useEffect. |
| Vitest over Jest | Faster, native TypeScript, works with Next.js without Babel config. |
| SVG icons over emoji | Platform-independent rendering, consistent across browsers. |
| `useMemo` for derived values | Prevents unnecessary string formatting on every render. |
| Extracted DCFResults component | 130-line IIFE was re-executing on every keystroke. Now only renders on result changes. |

---

## DEPENDENCIES

**Production:** `next@16.2.9`, `react@19.2.4`, `react-dom@19.2.4`, `zustand@5`, `recharts@3.9`, `xlsx@0.18`, `tesseract.js@7.0.0`, `pdfjs-dist@5.4.149`

**Dev:** `typescript@5`, `eslint@9`, `@types/react@19`, `@types/react-dom@19`, `vitest@4`

---

## KNOWN ISSUES

| Issue | Severity | Notes |
|---|---|---|
| DCF store not persisted across refreshes | Low | Intentional — DCF results are ephemeral. Inputs reset to defaults on page reload. |
| No per-tool error boundary — one wraps all | Low | ErrorBoundary added to layout, could be per-tool |
| XBRL parser is BETA with basic tag coverage | Low | 80+ tag mappings; needs more Indian taxonomy tags |
| Reference Format Engine only has 4 Indian templates | Low | Can add more (US GAAP, IFRS, quarterly/half-yearly) |
| Dataset selector UI not built — multi-file not selectable | Low | Global store supports multiple datasets but no UI to switch |
| OCR/PDF results are BETA — accuracy depends on input quality | Low | Always require user review before analysis |
| `@/types/financial` module resolution | Low | VSCode shows TS2307 error, but builds succeed because Next.js resolves `@/` at compile time. Adding `"paths": { "@/*": ["./src/*"] }` to tsconfig (already there) validates it works. |

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
npm test             # → 29 tests, ~300ms

# Deploy to Vercel
# Connect fundalyst-next repo to Vercel (auto-detects Next.js)
# Or upload files manually to GitHub (excluding node_modules/ and .next/)

# Test OCR/PDF import
# Upload a .pdf, .png, .jpg, or .gif file at /import
# Results are BETA — review mappings before confirming
```

---

## DESIGN PRINCIPLES

1. **Build for longevity.** Every component is modular, every hook uses refs to avoid stale closures and render loops, types are strict, imports are explicit, CSS uses design tokens. Adding new tools or import sources should require minimal changes to the core architecture.

2. **Clarity first.** Every element should communicate something useful within 5 seconds. A new visitor should understand what the product is, who it's for, and what to do next.

3. **Function before decoration.** If an element does not improve understanding, remove it.

4. **Data-first, not tool-first.** Users see data immediately, not instructions about tools.

5. **Zero friction.** No confirm dialogs. No hub pages. No fake inputs. Tools are one click from the nav.

6. **Transparent methodology.** Every formula is documented. No black-box finance.

7. **Indian market native.** ₹ formatting, Cr/L units, NSE/BSE terminology, lakhs/crores.

8. **Institutional aesthetic.** Dark theme, IBM Plex fonts, minimal chrome, information-dense.

9. **Progressive disclosure.** Show the most important information first. Reveal complexity gradually.

10. **Hook safety.** Never put inline function references in useEffect dependency arrays. Stale closures and render loops are the #1 source of runtime bugs in React hooks. Use refs for callbacks.

11. **Accessibility is correctness.** Skip-to-content, proper labels, ARIA attributes, touch targets, reduced motion, and semantic HTML are not optional — they are part of shipping a professional product.
