# Fundalyst — Database (Persistence)

**There is no database server.** Persistence is entirely via the browser's `localStorage` API.

## Schema

All state is serialised as JSON strings under `localStorage` keys prefixed with `fundalyst-`.

| localStorage key | Store | Contents |
|---|---|---|
| `fundalyst-global-data` | `global-data-store` | `datasets[]` (canonical `FundalystDataset`), `activeDatasetId` |
| `fundalyst-importer` | `importer-store` | Last import state, `lastDataset` |
| `fundalyst-enterprise` | `enterprise-store` | Projects, audit events, backup metadata |
| `fundalyst-dcf` | `useDCFStore` | DCF scenario config (growth/WACC/terminal deltas) — via `partialize`, summary/sens are session-only |
| `fundalyst-filing` | `filing-store` | Filing comparison results |
| `fundalyst-wc` | `wc-store` | Working capital results |
| `fundalyst-ratios` | `ratios-store` | Ratio analysis results |
| `fundalyst-peer` | `peer-store` | Peer comparison state |
| `fundalyst-trends` | `trends-store` | Trend data |
| `fundalyst-yoy` | `yoy-store` | YoY growth state |
| `fundalyst-thesis` | thesis (ad-hoc) | Saved investment thesis text |

## Data model (canonical)

The core data model is `FundalystDataset` (defined in `src/lib/importer/types.ts`):

```typescript
interface FundalystDataset {
  id: string;
  sourceType: string;
  companyName?: string;
  currency: Currency;
  unit: Unit;
  periods: string[];
  facts: CanonicalFact[];
  warnings: string[];
  confidence: number;
  createdAt: string;
  // ... see ARCHITECTURE.md for full shape
}
```

Facts are the atomic unit: one `CanonicalFact` = one metric × one period × one value with full provenance (confidence, source row/column, statement type, userOverridden flag).

## Read/write pattern

- **Read:** Components use `useModelData(extractor)` or `useGlobalDataStore(s => ...)` selectors.
- **Write:** Always through the store's write API (`writeCell`, `applyEdits`, etc.) — never write to localStorage directly.
- **Notify:** Every write calls `notifyModelUpdated()` (debounced ~80ms) so all subscribers re-extract.

## Backup and restore

Export: collects every `fundalyst-*` key from localStorage into a single JSON file (`fundalyst-workspace-<date>.json`).

Import: reads a workspace file and writes matching keys back to localStorage, followed by a page reload.

See `src/app/workspace/page.tsx` `handleExport()` / `handleImportFile()`.

## Migration

Zustand's `persist` middleware handles this via two separate options: `partialize` (choose which fields persist) and `merge` (reconcile persisted state with the current shape on load). The global-data store's `merge` validates persisted datasets and picks a valid `activeDatasetId`:

```typescript
merge: (persisted, current) => {
  // Validates persisted datasets, picks the first valid activeDatasetId
  return { ...current, datasets, activeDatasetId };
}
```

## Privacy promise

- No data ever leaves `localStorage`.
- No network call carries any persisted state.
- The workspace export file is downloaded directly — never sent anywhere.

## Known risk

The `xlsx` library (used for Excel import) has a high-severity advisory with no available fix. Mitigations: it runs only on user-uploaded files, not on remote data. See `docs/xlsx-risk-plan.md` for the full plan. Do **not** run `npm audit fix --force`.
