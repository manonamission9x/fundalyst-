# Fundalyst — Current Status

Last updated: 2026-07-02

> **Quick orientation:** For active tickets with checkbox statuses, see `CODEX_TICKETS.md` (Claude/Codex) and `DEEPSEEK_TASKS.md` (DeepSeek). For the full change log, see `HANDoFF.md`.

## What works (shippable)

| Feature | Notes |
|---|---|
| Import CSV/XLSX/PDF/OCR/screenshot/manual | Multi-format import with confidence scoring |
| Filing comparison | Period-over-period diff with highlights |
| Trend charts | Multi-metric line/bar charts |
| Growth rates | CAGR, YoY percentages |
| DCF valuation | Sensitivity analysis, scenario manager (bear/base/bull), calculation trace |
| Cash efficiency | DSO, DIO, DPO, CCC |
| Financial ratios | Net profit margin, ROE, Debt/Equity, Debt/Assets, Asset Turnover |
| Peer comparison | Multi-company benchmarking with bar charts, CSV export |
| Research workspace | Cockpit with workflow sidebar, data panel, evidence/assumptions, backup/restore |
| Investment memo export | Markdown export aggregating DCF+ratios+thesis |
| Provenance + trace | Every value knows its source; every calculation has an auditable trace |
| Unified data flow (Pillar A) | Model-bound grids write back to canonical model; live-update across all surfaces |
| Workspace grid (Pillar B) | Virtualized, keyboard-complete, overlay-input grid with provenance dots |
| Theme | Dark default + light mode, toggleable |
| Keyboard | Cmd/Ctrl+K palette, `g`-then-key go-to, `?` overlay, shortcut guards inside inputs |
| Returning-user launchpad | "Mission Control" card on home when dataset exists |
| v6 marketing surfaces | Ambient hero, numbered section rhythm, question-first tool cards |
| Design system | Tokenised colours, typographic scale, provenance-first, institutional minimalism |

## Recently completed

| Date | Change | Tickets |
|---|---|---|
| 2026-07-02 | **Spreadsheet & Data-Flow Redesign** — write API on global-data-store, ModelBoundSpreadsheet adapter, WorkspaceGrid (virtualized, overlay-input), workspace-context-store, DCF/WC/Ratios refactored to model-bound | Absorbs T8, T10, T11; lays T14/T17 substrate |
| 2026-07-02 | DCF scenario manager (persisted bear/base/bull config with editable spread controls) | T13 |
| 2026-07-02 | Returning-user launchpad (Mission Control card), v6 landing redesign | T3, T4, v6 |
| 2026-07-02 | Provenance color cleanup (purple→slate), homepage institutional redesign, workspace design pass | — |

## In progress

| Ticket | Title | Agent |
|---|---|---|
| T17 | Multi-panel tiling workspace (substrate laid: WorkspaceGrid + context store; tiling is next) | Hermes 2026-07-02 |

## Active tickets (open)

See `CODEX_TICKETS.md` for full descriptions:

| Priority | Tickets |
|---|---|
| Quick wins | T1 (command language v1), T2 (keyboard system), T5 (inline provenance dots), T6 (analyst-arc ordering), T7 (cleanup) |
| Medium | T9 (clickable cross-linking), T12 (company switcher), T14 (grounded AI), T15 (Excel export), T16 (command language v2) |
| Major | T17 (multi-panel workspace, substrate done), T18 (command language v3), T19 (review gate) |

## Known risks

| Risk | Mitigation |
|---|---|
| `xlsx` has a high-severity advisory (no fix) | Runs only on user-uploaded files. See `docs/xlsx-risk-plan.md`. Do not `npm audit fix --force`. |
| Scanned-PDF OCR is review-required | Future work: add row/column consistency checks, flag mismatches. |
| Not all tool pages use ModelBoundSpreadsheet yet | Filing/Trends/Growth research pages still use legacy ToolSpreadsheet — read-heavy, lower priority. |
| Excel-native memo export with live formulas | Not built (T15). |
| Canvas colour in PdfViewer uses raw hex | Should read via `getComputedStyle` — flagged in DESIGN.md §9. |

## Not real (future work)

- Cloud auth, organization tenancy, server RBAC
- Multi-user collaboration
- Retained audit logs
- Cloud/database persistence
- Live market data / data-provider APIs
- Credential vault / cloud sync
- Grounded AI explanations (T14 — substrate built, feature not shipped)
- Multi-panel tiling workspace (T17 — substrate laid, tiling not built)

## Verification commands

```bash
npm.cmd exec tsc -- --noEmit   # passes — 0 errors
npm.cmd run lint               # passes — 0 errors, ~4 pre-existing warnings
npm.cmd run build              # passes
npx playwright test            # run on a real Windows checkout (sandbox has no network)
```

See `DEEPSEEK_TASKS.md` for the visual/theme product-fix queue.
