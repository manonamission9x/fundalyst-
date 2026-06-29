# FUNDALYST — PRODUCTION HANDOFF

**Last updated:** June 30, 2026
**Framework:** Next.js 16 + TypeScript + Zustand + Recharts + Vitest + Playwright
**Fonts:** Inter (UI) · IBM Plex Mono (data)
**Build:** `npm run build` → zero errors, 14 static routes
**Tests:** 58 Vitest + 17 Playwright
**Lint:** `npm run lint` → 0 errors, 6 pre-existing warnings
**Location:** `C:\Users\kingo\Desktop\fundalyst-next`
**GitHub:** `github.com/manonamission9x/fundalyst-`
**Deploy:** GitHub → Vercel (auto-deploys on push)

---

## PRODUCT

Client-side financial analysis for Indian retail and value investors. No accounts, no server uploads, no data collection.

**Routes:** `/`, `/import`, `/workspace`, `/research/filing`, `/research/trends`, `/research/growth`, `/tools/dcf`, `/tools/wc`, `/tools/ratios`, `/tools/peer`, `/about`

**Nav:** 4 grouped sections — Research, Valuation, Data, Tools (src/components/layout/Nav.tsx)

---

## ARCHITECTURE

```
Input → Import Pipeline (CSV/XLSX/PDF/OCR/Paste)
  ↓
FundalystDataset (global-data-store, Zustand + persist)
  ↓
Financial Model Selectors → per-tool views (Filing, DCF, Ratios, WC, Trends, Peer)
```

All tools read from the canonical model via `financial-model-selectors.ts`. Per-tool stores hold only user assumptions (growth rate, WACC, etc.).

**localStorage keys:** `fundalyst-filing`, `fundalyst-wc`, `fundalyst-ratios`, `fundalyst-peer`, `fundalyst-trends`, `fundalyst-yoy`, `fundalyst-importer`, `fundalyst-global-data`, `fundalyst_tab`, `fundalyst_last_tab`, `fundalyst-errors`, `fundalyst-thesis`

---

## KEY COMPONENTS

| Component | Path | Purpose |
|---|---|---|
| `SpreadsheetInput` | `components/input/SpreadsheetInput.tsx` | Keyboard-first financial data grid (Tab/Enter/arrows, paste, undo/redo) |
| `ToolSpreadsheet` | `components/input/ToolSpreadsheet.tsx` | Single/multi-column wrapper for tool pages |
| `Nav` | `components/layout/Nav.tsx` | 4-section grouped nav with SVG icons |
| `ProvenancePopover` | `components/ui/index.tsx` | Click-to-inspect source info per metric |
| `DataSourceBadge` | `components/ui/index.tsx` | Sample/imported/manual badges |
| `DCFChart` | `components/tools/dcf/DCFChart.tsx` | DCF waterfall chart |
| `TrendsChart` | `components/tools/trends/TrendsChart.tsx` | Multi-period Recharts line chart |
| `PdfViewer` | `components/import/PdfViewer.tsx` | PDF.js canvas renderer |
| Financial Model Selectors | `store/financial-model-selectors.ts` | Read-only access layer: `getMetricValue`, `findMetricFlexibly`, `datasetToSpreadsheetRows`, extract functions |

---

## DATA FLOW

**Import:** Upload (CSV/XLSX/PDF/Screenshot) → `detect.ts → parser.ts → normalizer.ts → metric-aliases.ts` → `FundalystDataset` → all tools pre-fill automatically.

**Manual entry:** SpreadsheetInput → `writeSpreadsheetToModel()` → global-data-store.

**Provenance:** Every `CanonicalFact` carries `sourceType`, `labelOriginal`, `value`, `rawValue`, `periodLabel`, `confidence`, `sourceRow`, `sourceColumn`, `userOverridden`. Surfaced via `ProvenancePopover` and `DataSourceBadge` on every tool page.

---

## CRITICAL PITFALLS

1. **DCF growth must be < WACC** — defaults 8% < 10%. Validation catches terminal == WACC before computeDCF runs.
2. **DCF store has no persist** — Ephemeral per session. Don't add persist without partialize filtering.
3. **Nav logo uses `#4F6EF7`** — If accent color changes, update both Nav.tsx and layout.tsx.
4. **Spreadsheet cell refs** — contentEditable cells use `window.getSelection()` for cursor position (not DOM `selectionStart`).
5. **getPeriods preserves insertion order** — Periods appear in insertion order, not sorted.
6. **downloadCSV quotes cells** — Values with commas/quotes/newlines are wrapped correctly. Do not revert to `.join(',')`.
7. **No IME/composition handling** — CJK IME may flicker suggestions in SpreadsheetInput.
8. **No inputMode on mobile** — contentEditable value cells lack numeric keyboard hint.

---

## TESTS

```bash
npm test               # 58 Vitest unit tests (calculations + edge cases)
npm run test:e2e       # 17 Playwright tests (routes, a11y, core interactions)
npm run lint           # 0 errors, 6 warnings (2 `<img>` in dynamic uploads, 4 deliberate exhaust-deps)
npm run build          # 14 static routes, zero errors
```

---

## DEPLOYMENT

```bash
git add -A && git commit -m "..."
git push origin main   # Auto-deploys to Vercel (~20s)
```
