# Fundalyst Handoff

Last updated: 2026-06-30

Repo: `C:\Users\kingo\Desktop\fundalyst-next`
GitHub: `https://github.com/manonamission9x/fundalyst-`
Current branch: `main`
Latest relevant commits:
- `1840ddc` - Add backendless enterprise workspace foundation
- `ff1f382` - Fix product audit reliability issues

## Product State

Fundalyst is a client-side financial analysis app for imported/manual company financials. It has no backend yet.

The product is now a credible local analyst tool, not a true enterprise platform. Be honest about this in future work:
- Real today: local import, analysis tools, Workspace, local projects, local role simulation, local audit events, local snapshots, encrypted local export/import.
- Not real yet: cloud auth, multi-user collaboration, server-enforced permissions, organization tenancy, retained audit logs, data-provider APIs, scheduled filing ingestion, credential vault, cloud sync.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Zustand with localStorage persistence
- Recharts
- Vitest
- Playwright
- Styling: global CSS in `src/app/globals.css`

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Routes

- `/`
- `/import`
- `/workspace`
- `/research/filing`
- `/research/trends`
- `/research/growth`
- `/tools/dcf`
- `/tools/wc`
- `/tools/ratios`
- `/tools/peer`
- `/about`

## Important Files

- `src/app/workspace/page.tsx`
  Workspace command center, local projects, governance, audit, integrations, thesis, encrypted backup UI.

- `src/store/enterprise-store.ts`
  Backendless enterprise state: projects, members/roles, audit events, versions, integration readiness.

- `src/lib/enterprise-backup.ts`
  Browser Web Crypto encrypted workspace backup/restore.

- `src/store/global-data-store.ts`
  Canonical imported dataset store. Import/add/remove/clear actions write audit events.

- `src/store/importer-store.ts`
  Import review and confirmation. Sample import now becomes `Sample Company`.

- `src/components/input/SpreadsheetInput.tsx`
  Shared spreadsheet grid. Its `onDataChange` callback is stabilized with a ref to prevent render loops.

- `src/components/input/ToolSpreadsheet.tsx`
  Tool-specific spreadsheet defaults.

- `src/lib/calculations.ts`
  Pure financial calculation engine.

- `src/store/financial-model-selectors.ts`
  Converts canonical datasets into per-tool inputs.

- `src/app/tools/dcf/page.tsx`
  DCF input mapping, validation, calculation, audit event.

- `src/app/tools/ratios/page.tsx`
  Ratio calculation, empty-result guard, audit event.

- `src/app/tools/wc/page.tsx`
  Cash efficiency calculation, empty-result guard, audit event.

- `src/app/research/growth/page.tsx`
  Growth Rates. Previously crashed from update depth; now stable.

## Current Data Model

Primary flow:

```text
CSV/XLSX/PDF/OCR/manual input
  -> import parser / spreadsheet
  -> FundalystDataset
  -> global-data-store
  -> financial-model-selectors
  -> tools and Workspace
```

Enterprise-local flow:

```text
Project / role / audit / snapshot actions
  -> enterprise-store
  -> localStorage key: fundalyst-enterprise
```

Relevant localStorage keys:
- `fundalyst-global-data`
- `fundalyst-importer`
- `fundalyst-enterprise`
- `fundalyst-filing`
- `fundalyst-wc`
- `fundalyst-ratios`
- `fundalyst-peer`
- `fundalyst-trends`
- `fundalyst-yoy`
- `fundalyst-thesis`

## Recently Fixed

Critical/high-priority audit fixes:
- Growth Rates no longer crashes.
- DCF no longer renders `NaN` from sample/default data.
- DCF invalid inputs clear stale results.
- Desktop horizontal overflow fixed.
- Import mapping percentage now reflects mapping rows, not raw facts.
- Sample import now shows `Sample Company`.
- Ratios no longer shows a successful empty result.
- Cash Efficiency no longer shows a successful empty analysis from blank core inputs.

Backendless roadmap foundation:
- Workspace has Enterprise Command Center.
- Local projects and active project switching.
- Local role simulation.
- Governance controls: status, approval gate, retention policy.
- Local audit log.
- Version snapshots.
- Encrypted workspace export/import.
- Backend-ready integrations panel.
- Audit events wired for dataset add/remove/clear, DCF, ratios, cash efficiency, thesis save, snapshots, role changes, encrypted backup actions.

## Verification Status

Last verified after `1840ddc`:

```bash
npm.cmd test          # 58 passed
npm.cmd run lint      # 0 errors, 6 existing warnings
npm.cmd run build     # passed
npm.cmd run test:e2e  # 17 passed
```

The 6 lint warnings are pre-existing:
- 2 `next/no-img-element`
- 4 React hook exhaustive-deps warnings

Do not call the app "lint clean" unless those warnings are removed.

## Known Limitations

Be direct about these. Do not paper over them in future implementation notes.

1. No backend.
   Enterprise controls are local product state only.

2. No real authentication.
   Roles are simulated. They do not secure data.

3. No true multi-user collaboration.
   There is no shared workspace, comments, assignments, or server sync.

4. No retained audit log.
   Audit events live in localStorage and can be cleared.

5. No external data providers.
   Integrations panel is backend-ready UI, not connected APIs.

6. No credential vault.
   Do not add provider API keys to the frontend.

7. No cloud encryption.
   Encrypted backup is local file export/import only.

8. Some text encoding/mojibake exists in older files.
   Avoid broad encoding rewrites unless deliberately cleaning the app.

9. Financial analytics are still shallow for institutional use.
   DCF, ratios, peer comparison, filing comparison, trends, growth, and cash efficiency are useful, but not yet comparable to Bloomberg/FactSet/CapIQ/institutional Excel workflows.

## Next Priorities

### P0: Backend Foundation

Build real backend primitives before claiming enterprise readiness:
- Auth with organization tenancy.
- User/team model.
- Server-enforced RBAC.
- Project/company/workspace persistence.
- Server audit log with immutable retention.
- Encrypted database storage.
- File/document storage.
- API route or service layer that can replace local Zustand persistence.

Acceptance criteria:
- A user can sign in.
- A workspace belongs to an organization.
- Roles are enforced server-side.
- Audit events cannot be edited from the client.
- Imported datasets survive browser/cache clearing.

### P1: Source-Linked Analysis

Every output should be traceable to source facts.

Implement:
- Formula/source drawer for DCF, ratios, WC, filing, growth.
- Metric-level provenance in result tables.
- "Used in this calculation" source list.
- Snapshot comparison between versions.

Acceptance criteria:
- A reviewer can inspect any number and see formula, source metric, source period, source file/import, timestamp, and confidence.

### P1: Institutional Analytics Upgrade

Add professional-grade analysis:
- EV/EBITDA, EV/Sales, P/E, P/B, ROIC, ROCE, FCF yield.
- Scenario manager for DCF.
- Sensitivity exports.
- Peer multiples table.
- Assumption versioning.
- Investment memo export.

Acceptance criteria:
- A user can produce a basic investment committee memo from one imported company and one saved DCF scenario.

### P2: Data Integrations

Do not fake integrations in the frontend.

Implement only after backend exists:
- Filing ingestion jobs.
- Market data provider abstraction.
- Credential vault.
- Provider health/status.
- Refresh history and failures in audit log.

Acceptance criteria:
- A configured provider can ingest a company filing or quote data through backend services, not hardcoded frontend calls.

### P2: Collaboration

Implement:
- Comments.
- Review assignments.
- Approval workflow.
- Workspace activity feed.
- Shared thesis/memo.

Acceptance criteria:
- Analyst submits a thesis for review; reviewer approves/rejects; both actions are retained in server audit log.

## Engineering Rules For Future Agents

- Do not add fake enterprise claims without backend enforcement.
- Do not store provider credentials in frontend code or localStorage.
- Do not remove local privacy messaging unless backend sync is actually added.
- Prefer extending `enterprise-store` only for local prototype behavior; move to backend APIs when backend exists.
- Keep calculations pure in `src/lib/calculations.ts`.
- Keep import parsing separate from UI.
- Preserve Playwright route coverage.
- If changing spreadsheet behavior, test Growth, Trends, Filing, DCF, Ratios, Peer, and WC.

## Useful Commands

```bash
npm.cmd run dev
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

If a dev server is stuck:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue
Get-Process -Name node -ErrorAction SilentlyContinue
```

## Deployment

```bash
git add -A
git commit -m "..."
git push origin main
```

Vercel auto-deploys from GitHub.
