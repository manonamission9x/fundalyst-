# Fundalyst — Database (Persistence)

Fundalyst uses a **dual persistence** model:

1. **Local** (client-side) — `localStorage` for the core financial analysis.
   All imported datasets, facts, and tool state persist locally.
2. **Server** (PostgreSQL via Prisma) — for auth, workspaces, documents,
   and background job state. Optional — the app works without it.

## Current local schema

All client-side state is serialised as JSON strings under `localStorage`
keys prefixed with `fundalyst-`.

| localStorage key | Store | Contents |
|---|---|---|
| `fundalyst-global-data` | `global-data-store` | `datasets[]`, `activeDatasetId` |
| `fundalyst-importer` | `importer-store` | Last import state |
| `fundalyst-enterprise` | `enterprise-store` | Projects, audit events, backup metadata |
| `fundalyst-dcf` | `useDCFStore` | DCF scenario config |
| `fundalyst-filing` | `filing-store` | Filing comparison results |
| `fundalyst-wc` | `wc-store` | Working capital results |
| `fundalyst-ratios` | `ratios-store` | Ratio analysis results |
| `fundalyst-peer` | `peer-store` | Peer comparison state |
| `fundalyst-trends` | `trends-store` | Trend data |
| `fundalyst-yoy` | `yoy-store` | YoY growth state |
| `fundalyst-thesis` | thesis (ad-hoc) | Saved investment thesis text |

## Server schema (PostgreSQL)

The server database is defined in `prisma/schema.prisma`.
Generate the client with `npx prisma generate`.

### Models

```
User ── Workspace ──┐
                    ├── Document ──┐
                    │              ├── ExtractionJob
                    │              └── FinancialStatement
                    ├── Spreadsheet
                    ├── DCFModel ── Scenario
                    └── AuditLog
```

Plus Better Auth models: `Account`, `Session`, `Verification`.

### Key design decisions

- **Soft-delete**: `Workspace`, `Document`, `Spreadsheet`, and `DCFModel`
  have a nullable `deletedAt` field. The default Prisma service layer
  automatically filters out soft-deleted records.
- **Append-only audit**: `AuditLog` has no `updatedAt` — records are never
  updated after creation.
- **JSON columns**: `FinancialStatement.data`, `Spreadsheet.data`,
  `DCFModel.parameters/results`, `Scenario.parameters/results` use
  PostgreSQL JSONB for flexible schema evolution. Each has a `schemaVersion`
  integer for migration support.
- **Cascade deletes**: Deleting a `Workspace` cascades to all children.
  Deleting a `User` cascades to their workspaces.

## Read/write pattern

### Client-side (local-first)
- **Read:** Components use `useModelData(extractor)` or store selectors.
- **Write:** Always through the store write API (`writeCell`, `applyEdits`).
- **Notify:** Every write calls `notifyModelUpdated()` (debounced ~80ms).

### Server-side (when backend is running)
- **Read:** Route handlers call `services/prisma.ts` or `modules/*/service.ts`
  helpers (never `prisma` directly outside the service layer).
- **Write:** Same service layer, which enforces ownership scoping and
  soft-delete filtering.
- **Auth:** All server writes require a valid session via Better Auth.

## Running migrations

```bash
# Create initial migration
npx prisma migrate dev --name init

# After schema changes
npx prisma migrate dev --name <description>

# Apply in production
npx prisma migrate deploy

# Generate Prisma client (after pulling schema changes)
npx prisma generate
```

## Data model (canonical — local)

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

Facts are the atomic unit: one `CanonicalFact` = one metric × one period
× one value with full provenance (confidence, source row/column,
statement type, userOverridden flag).

## Backup and restore

The workspace export/import feature (in the Workspace page) collects every
`fundalyst-*` localStorage key into a single JSON file. This operates
entirely client-side — no server involvement.

## Privacy promise

- Imported financial data stays in `localStorage` by default.
- Server persistence is explicitly opt-in (user creates an account,
  enables cloud sync, or uses server-side document processing).
- The workspace export file is a client-side download — never sent
  anywhere unless the user explicitly uploads it.
