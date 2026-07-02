# Fundalyst — Architecture

For the full rationale behind the spreadsheet/data-flow design, see `docs/archive/HANDOFF_SPREADSHEET_DATAFLOW.md`. This file (ARCHITECTURE.md) is the durable reference.

## Core principle

**One canonical model is the single source of truth; every surface reads from it and writes back to it; a write anywhere propagates everywhere, live.**

The user uploads a filing once. DCF, ratios, charts, the spreadsheet, and research are *lenses* on that one living model. Edit a number anywhere, everything downstream re-reasons instantly.

## Data flow

```
Import (CSV/XLSX/PDF/OCR) ──→ CANONICAL MODEL (FundalystDataset)
                                  │
                           global-data-store (Zustand + localStorage)
                                  │
                     ┌────────────┼────────────┐
                     │ read       │ write      │
              ┌──────▼─────┐ ┌───▼────┐ ┌─────▼──────┐
              │ DCF / WC / │ │ Charts │ │ Workspace  │
              │ Ratios /   │ │ Trends │ │ Grid       │
              │ Peers      │ │ Growth │ │            │
              └────────────┘ └────────┘ └────────────┘
                     │                         │
                     └───────── notifyModelUpdated() ───┘
                                   (debounced ~80ms)
```

### Key stores

| Store | File | Purpose |
|---|---|---|
| `global-data-store` | `src/store/global-data-store.ts` | Canonical model: datasets, facts, write API (writeCell, applyEdits, etc.) — persisted to `localStorage` key `fundalyst-global-data` |
| `pipeline-store` | `src/store/pipeline-store.ts` | Pub/sub spine: `notifyModelUpdated()` / `onModelUpdate()` — lightweight change broadcast |
| `use-model-data` | `src/store/use-model-data.ts` | Universal read hook: subscribes to pipeline, re-extracts on model update |
| `financial-model-selectors` | `src/store/financial-model-selectors.ts` | Pure selectors: dataset → tool-shaped inputs (`datasetToGrid`, `extractDCFInputsFromModel`, etc.) |
| `workspace-context-store` | `src/store/workspace-context-store.ts` | Ephemeral context: active sheet, selection, active cell — substrate for future grounded AI (T14) |
| `enterprise-store` | `src/store/enterprise-store.ts` | Audit events, backup metadata — persist-only |

### Canonical data model

```typescript
interface FundalystDataset {
  id: string;
  sourceType: 'csv' | 'xlsx' | 'pdf-text' | 'ocr' | 'manual' | 'sample';
  companyName?: string;
  currency: Currency;     // 'INR' | 'USD' | ...
  unit: Unit;             // 'crores' | 'millions' | ...
  periods: string[];      // e.g. ['FY22', 'FY23', 'FY24']
  facts: CanonicalFact[];
  warnings: string[];
  confidence: number;
}

interface CanonicalFact {
  metric: string;         // canonical key, e.g. 'revenue', 'netProfit'
  periodLabel: string;
  value: number;
  userOverridden?: boolean;  // true if user edited after import
  statement: StatementType;  // 'income_statement' | 'balance_sheet' | ...
  confidence: number;        // 0.0–1.0
  sourceRow: number;         // provenance: original row in source
  sourceColumn: number;
  sourceTableId?: string;
  sourceType: SourceType;
  labelOriginal: string;
  currency: Currency;
  unit: Unit;
}
```

### Write API (added 2026-07-02 — Pillar A)

All mutations go through the store's write API, which:
- Performs immutable updates to the dataset (immer-free, pure spread)
- Sets `userOverridden: true` on edited facts
- Preserves `sourceRow/Col` and `sourceTableId` for provenance
- Fires `debouncedNotify()` — a batched `notifyModelUpdated()` at ~80ms debounce
- Logs an audit event per logical edit

```typescript
writeCell(datasetId, metric, periodLabel, value);
applyEdits(datasetId, edits[]);       // batch — one notify
upsertFact(datasetId, fact);          // create or update
renameMetric(datasetId, from, to);
deleteFact(datasetId, metric, periodLabel);
deleteMetric(datasetId, metric);
addPeriod(datasetId, periodLabel);
removePeriod(datasetId, periodLabel);
```

## Component tree

```
layout.tsx
├── Nav.tsx            — top bar, dataset badge, theme toggle, command palette
│   ├── CommandPalette.tsx — Cmd/Ctrl+K, fuzzy nav, T1 foundation
│   └── MobileMenu
├── page.tsx           — homepage (v6 "Living Ledger" marketing + returning-user launchpad)
├── workspace/page.tsx — research cockpit (entity-first, sidebar+content)
│   ├── WorkspaceGrid  — canonical data grid (virtualized, overlay-input, provenance dots)
│   └── Panel system   — DataPanel, FilingPanel, DCFPanel, EvidencePanel, etc.
├── tools/
│   ├── dcf/page.tsx   — DCF valuation + sensitivity + scenarios
│   ├── wc/page.tsx    — Cash efficiency (DSO/DIO/DPO/CCC)
│   ├── ratios/page.tsx— Financial ratios (margin, ROE, leverage, turnover)
│   └── peer/page.tsx  — Peer comparison (multi-company, CSV import)
├── research/
│   ├── filing/page.tsx— Period-over-period comparison
│   ├── trends/page.tsx— Multi-metric trend charts
│   └── growth/page.tsx— YoY growth rates + CAGR
├── import/page.tsx    — Import pipeline (CSV/XLSX/PDF/OCR/manual)
└── about/page.tsx     — About / help
```

## Key patterns

1. **Read through `useModelData(...)` / selectors.** Never keep a private copy of financial data in a component.
2. **Write through the store write API.** Never mutate a dataset object in place. Every write sets `userOverridden` and notifies subscribers.
3. **No empty state when a dataset exists.** Empty state only when `datasets.length === 0`. The single import path is `/import`. (Exceptions by design: **Peer** — multi-company, doesn't fit a single dataset; **Filing** — a two-filing comparison. Both keep their own local input + sample flow.)
4. **One grid, one model.** `ModelBoundSpreadsheet` (the adapter) and `WorkspaceGrid` (the virtualized grid) both read/write the same canonical model.
5. **Calculations are pure.** `src/lib/calculations.ts` never reaches into stores. Live updates come from the notify→re-extract loop.

## Route list

| Route | Purpose |
|---|---|
| `/` | Homepage (marketing + returning-user launchpad) |
| `/workspace` | Research workspace / cockpit |
| `/import` | Import pipeline (single entry point) |
| `/research/filing` | Filing comparison |
| `/research/trends` | Trend charts |
| `/research/growth` | Growth rates |
| `/tools/dcf` | DCF valuation |
| `/tools/wc` | Cash efficiency (working capital) |
| `/tools/ratios` | Financial ratios |
| `/tools/peer` | Peer comparison |
| `/about` | About / help |
| `/debug-import` | Dev-only, unlinked from nav |

## Migrations / key decisions

See `docs/archive/HANDOFF_SPREADSHEET_DATAFLOW.md` for the full architectural plan behind the spreadsheet & data-flow redesign. Key decisions:

- **glide-data-grid skipped** (React 19 incompatibility — peer dep requires React 18). Built Option B: virtualized DOM grid with single floating `<input>` overlay.
- **Assumptions pseudo-sheet** — tool inputs that aren't source facts (DCF growth/WACC/terminal) now live in the model with `statement: 'assumptions'`.
- **Workspace context store** built as AI substrate (T14) — no AI shipped, just the socket.
