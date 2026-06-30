# Fundalyst Handoff

Last updated: 2026-06-30

Repo: `C:\Users\kingo\Desktop\fundalyst-next`  
GitHub: `https://github.com/manonamission9x/fundalyst-`  
Branch: `main`

Latest relevant commits:
- `e7226fc` - Fix Workspace React update loop and persisted state recovery
- `6e41857` - Harden local workflows and polish responsive UI
- `04012a7` - Add source-linked calculation traces
- `1840ddc` - Add backendless enterprise workspace foundation
- `ff1f382` - Fix product audit reliability issues

## Current Product State

Fundalyst is a client-side financial analysis app for imported/manual company financials. It is a credible local analyst tool, not an enterprise platform yet.

Real today:
- Local import/review for CSV/XLSX/PDF/OCR/image/manual data.
- Canonical `FundalystDataset` model stored in localStorage.
- Filing comparison, trends, growth, DCF, cash efficiency, ratios, peer comparison.
- Workspace command center with local projects, role simulation, local audit events, snapshots, thesis notes, and encrypted local export/import.
- Source-linked calculation trace panels for DCF, Ratios, and Cash Efficiency.

Not real yet:
- Cloud auth, organization tenancy, server-enforced RBAC, multi-user collaboration, retained audit logs, cloud/database persistence, data-provider APIs, scheduled ingestion, credential vault, cloud sync.

Do not describe the product as enterprise-ready until those backend primitives exist.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
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
  Workspace command center, local projects, governance, audit, integrations, thesis, backup/restore UI.

- `src/store/enterprise-store.ts`  
  Backendless enterprise state: projects, members/roles, audit events, versions, integration readiness.

- `src/lib/enterprise-backup.ts`  
  Browser Web Crypto encrypted workspace backup/restore. Restore is now allowlisted to known Fundalyst keys.

- `src/store/global-data-store.ts`  
  Canonical imported dataset store. Import/add/remove/clear actions write audit events.

- `src/store/importer-store.ts`  
  Import review and confirmation. Sample import becomes `Sample Company`.

- `src/app/import/page.tsx`  
  Import workflow. Has file-size guardrails and object URL cleanup for pasted image previews.

- `src/components/input/SpreadsheetInput.tsx`  
  Shared spreadsheet grid. Powerful but complex; treat edits here as high-risk and test every spreadsheet-backed route.

- `src/components/input/ToolSpreadsheet.tsx`  
  Tool-specific spreadsheet defaults.

- `src/lib/calculations.ts`  
  Pure financial calculation engine. Keep side-effect free.

- `src/store/financial-model-selectors.ts`  
  Converts canonical datasets into per-tool inputs.

- `src/lib/calculation-trace.ts`  
  Shared helper for mapping result formulas to imported/manual source facts.

- `src/components/shared/CalculationTrace.tsx`  
  Reusable “Show sources” calculation trace panel.

- `src/app/tools/dcf/page.tsx`  
  DCF input mapping, validation, calculation, audit event, and source trace panel.

- `src/app/tools/ratios/page.tsx`  
  Ratio calculation, empty-result guard, audit event, and source trace panel.

- `src/app/tools/wc/page.tsx`  
  Cash efficiency calculation, empty-result guard, audit event, and source trace panel.

- `src/app/research/trends/page.tsx`  
  Trend charts. Default spreadsheet props are memoized to prevent reset/render loops.

- `src/components/layout/Nav.tsx`  
  Global navigation. Label shortened to `Import`; CSS hides section labels and duplicate CTA at constrained widths.

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

Source-linked analysis:
- DCF, Ratios, and Cash Efficiency now include reusable “Show sources” trace panels.
- Trace panels show formula, result, source metric, period, original label, location, confidence, and manual override state where available.

Reliability and security hardening:
- `/workspace` no longer hits React minified error #185 / maximum update depth when syncing active project metadata.
- Persisted Zustand state for enterprise, global data, and importer stores is shape-checked during hydration so old/malformed localStorage does not crash Workspace.
- Playwright now includes a Workspace resilience regression for malformed persisted Fundalyst state.
- Playwright web server command uses `npm.cmd run dev` on Windows to avoid PowerShell `npm.ps1` execution-policy failures.
- `/research/trends` no longer emits a maximum update depth runtime error.
- Plain and encrypted workspace restore now only restore known Fundalyst localStorage keys.
- Import files over 20 MB are rejected before parser libraries run.
- Workspace restore files over 10 MB are rejected.
- Pasted image preview object URLs are revoked instead of leaking.

Design/UX polish:
- Desktop home tool cards now fill available width more professionally.
- Global nav is less cluttered at normal desktop widths.
- Mobile Workspace stats and enterprise panels no longer force cramped multi-column grids.
- `Import Financials` nav label shortened to `Import`.

Older audit fixes still relevant:
- Growth Rates no longer crashes.
- DCF no longer renders `NaN` from sample/default data.
- DCF invalid inputs clear stale results.
- Desktop horizontal overflow fixed.
- Import mapping percentage reflects mapping rows, not raw facts.
- Ratios and Cash Efficiency no longer show successful empty results from blank inputs.

## Verification Status

Last verified after Workspace React #185 fix:

```bash
npm.cmd test          # 58 passed
npm.cmd run lint      # 0 errors, 6 existing warnings
npm.cmd run build     # passed
npm.cmd run test:e2e  # 18 passed
```

Known lint warnings:
- 2 `next/no-img-element`
- 4 React hook exhaustive-deps warnings

Do not call the app “lint clean” unless those warnings are removed.

`npm.cmd audit --audit-level=moderate` currently reports:
- `xlsx`: high-severity advisories, no fix available.
- Next/PostCSS bundled advisory: moderate severity; audit suggests a breaking downgrade, so do not blindly run `npm audit fix --force`.

## Known Limitations

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
   Do not add provider API keys to frontend code or localStorage.

7. No cloud encryption.
   Encrypted backup is local file export/import only.

8. Financial analytics remain shallow for institutional use.
   Useful today, but not Bloomberg/FactSet/CapIQ/institutional Excel depth.

9. Mobile navigation is still icon-heavy.
   It is usable, but should become a proper compact command/menu pattern.

10. Test coverage is still too smoke-heavy.
    E2E coverage renders routes but does not deeply assert import-to-analysis workflows.

## Next Work To Make

### Immediate

1. Workflow-focused Playwright coverage.
   Add tests for sample import -> confirm mapping -> DCF/Ratios/WC populated, plus trends no-console-error regression and oversized import/restore rejection.

2. Dependency risk plan for `xlsx`.
   Evaluate replacing `xlsx`, sandboxing it harder, or disabling XLSX import until a safer parser path exists. Do not ignore the audit finding.

3. Mobile navigation redesign.
   Replace icon strip with an accessible compact menu/command pattern while preserving fast desktop nav.

### Short Term

4. Extend source-linked analysis to Filing, Trends, Growth, and Peer.
   DCF/Ratios/WC already have the foundation.

5. Investment memo export from Workspace.
   Generate a local exportable memo from imported company data, thesis, key ratios, DCF summary, and source trace metadata.

6. DCF scenario manager.
   Bull/Base/Bear cases, assumption versioning, and sensitivity export.

### Medium Term

7. Backend API boundary scaffold without fake auth.
   Create typed service interfaces/API route boundaries that can later replace local Zustand persistence. Do not claim security until real auth/RBAC exists.

8. Institutional analytics upgrade.
   EV/EBITDA, EV/Sales, P/E, P/B, ROIC, ROCE, FCF yield, peer multiples table, and sensitivity exports.

### Long Term

9. Real backend foundation.
   Auth, organization tenancy, server RBAC, persistence, immutable audit log, file storage, observability, and secret management.

10. Collaboration.
    Comments, assignments, review workflow, approvals, workspace activity feed, retained server audit actions.

## Codex + DeepSeek Workflow

Current available agents:
- Codex: orchestrator, product/architecture lead, reviewer, test runner, final integrator, committer.
- DeepSeek V4 Flash via Hermes/user paste: implementation worker for tightly scoped tasks.

Optimize for low token use.

Preferred loop:
1. Codex inspects the repo and chooses one narrow implementation slice.
2. Codex writes a compact DeepSeek prompt with objective, files, constraints, acceptance criteria, tests, and return format.
3. User pastes that prompt into DeepSeek V4 Flash.
4. User pastes DeepSeek output back into Codex.
5. Codex reviews, integrates/fixes if needed, runs verification, commits, and pushes.

Use DeepSeek when work is broad, repetitive, or test-heavy. Codex can implement directly when the slice is surgical and cheaper than prompting/reviewing.

DeepSeek prompt template:

```text
You are implementing one scoped change in Fundalyst.

Objective:
...

Files to inspect first:
...

Files likely to edit:
...

Do not touch:
...

Implementation requirements:
...

Acceptance criteria:
...

Verification:
...

Return:
- concise summary
- changed files
- test results
- unresolved risks
```

Rules:
- Do not ask DeepSeek to explore broadly.
- Do not give vague prompts like “make it enterprise-grade”.
- Do not allow broad refactors unless explicitly scoped.
- Do not accept fake backend/enterprise claims.
- Do not store provider credentials in frontend code or localStorage.
- Do not skip tests.
- Codex has final responsibility for reviewing diffs and shipping.

## DeepSeek-Ready Prompt For Next Slice

```text
You are implementing one scoped change in Fundalyst.

Objective:
Add workflow-focused Playwright regression coverage for the current local analyst workflow.

Files to inspect first:
- tests/smoke.spec.ts
- tests/core.spec.ts
- tests/a11y.spec.ts
- src/app/import/page.tsx
- src/app/tools/dcf/page.tsx
- src/app/tools/ratios/page.tsx
- src/app/tools/wc/page.tsx
- src/app/research/trends/page.tsx
- src/app/workspace/page.tsx

Files likely to edit:
- tests/core.spec.ts
- optionally add a new tests/workflows.spec.ts

Do not touch:
- Production app code unless a test reveals a confirmed bug.
- Backend/auth claims.
- Provider credentials.
- Broad UI redesign.

Implementation requirements:
1. Add a Playwright test for sample import -> confirm mapping -> imported dataset visible.
2. Add route workflow checks that DCF, Ratios, and WC can calculate from their default/sample data and show results.
3. Add a regression test that /research/trends loads without console errors containing "Maximum update depth".
4. Add tests for oversized import and oversized workspace restore rejection if practical with synthetic files.
5. Keep tests deterministic and fast.

Acceptance criteria:
- New tests fail on the old broken Trends behavior and pass now.
- Existing route smoke coverage remains.
- No fragile selectors based only on long copy where role/text alternatives exist.
- No app code changes unless strictly necessary and explained.

Verification:
Run:
- npm.cmd test
- npm.cmd run lint
- npm.cmd run build
- npm.cmd run test:e2e

Return:
- concise summary
- changed files
- test results
- unresolved risks
```

## Engineering Rules

- Do not add fake enterprise claims without backend enforcement.
- Do not store provider credentials in frontend code or localStorage.
- Do not remove local privacy messaging unless backend sync is actually added.
- Prefer extending `enterprise-store` only for local prototype behavior; move to backend APIs when backend exists.
- Keep calculations pure in `src/lib/calculations.ts`.
- Keep import parsing separate from UI.
- Preserve Playwright route coverage.
- If changing spreadsheet behavior, test Growth, Trends, Filing, DCF, Ratios, Peer, and WC.
- If changing backup/restore, test plain export/import and encrypted export/import.

## Useful Commands

```bash
npm.cmd run dev
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
npm.cmd audit --audit-level=moderate
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
