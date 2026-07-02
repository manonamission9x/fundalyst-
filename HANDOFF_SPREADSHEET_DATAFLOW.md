# Handoff — Spreadsheet & Data-Flow Redesign ("The Living Workspace")

**For:** the implementing agent (architectural authority required — this is a Claude/Codex-lane
change per `AGENTS.md`; it absorbs/supersedes tickets **T8, T10, T11, T17**, and lays the
substrate for **T14**). Not a DeepSeek visual-lane task.
**From:** Claude
**Date:** 2026-07-02
**Read first:** `AGENTS.md`, `DESIGN.md`, `FUNDALYST_DESIGN_AUDIT.md §19`, and this doc.
**Status:** architecture spec + phased plan. One decision gate (§6) to confirm before Phase 2.

---

## 1. The mental model we are building

> The user uploads **Financial-Results.pdf** once. From that moment they are never "in the DCF
> tool" or "in the ratios tool" — they are **working on Financial-Results.pdf**, and DCF, ratios,
> charts, the spreadsheet, and research are just *lenses* on that one living model. Edit a number
> anywhere, everything downstream re-reasons instantly. No re-import, no "apply", no duplicate
> state, no empty screens.

Two deliverables, one philosophy:

- **Pillar A — Unified data flow.** One canonical model is the single source of truth; every
  surface reads from it and writes back to it; a write anywhere propagates everywhere, live.
- **Pillar B — An Excel-grade spreadsheet** that *is* the primary editable view of that model —
  desktop-native typing, virtualized, full keyboard/clipboard/fill, and aware of its own context
  so intelligence can sit on top.

---

## 2. Honest reality check (read before you design — it changes what you build)

Fundalyst is **100% client-side: no backend, no server, no account, nothing leaves the device**
(`AGENTS.md`). That constrains three things in the brief, and I want them explicit so you don't
build on sand:

1. **"AI understands the spreadsheet / instant explanations / AI memory."** There is **no live
   LLM in the core loop today**, and grounded-AI is a separate opt-in ticket (**T14**, not built).
   So in this task you do **not** ship an answering AI. You ship the **context substrate** the AI
   will consume — a workspace-context store that always knows *current company / sheet / selection
   / range / active cell / assumptions* (§9). When T14 lands, "highlight a row, ask 'explain
   this'" works with zero rework because the context is already there. Build the socket, not the
   bulb. Do not fake AI output.
2. **Persistence is `localStorage`.** The canonical model already persists there
   (`fundalyst-global-data`). "Audit trail", "exports", "notes" are local artifacts, not cloud.
   Keep the privacy promise: never add a network call.
3. **"Excel-level" is a real engineering bar, not a coat of paint.** The current grid
   (`SpreadsheetInput.tsx`) is a `contentEditable`-per-cell HTML `<table>` with no virtualization
   — it cannot meet the brief at scale. This is a **build-or-buy decision** (§6), not a refactor.

### The one judgment call I'm making for you

The brief says *"do not preserve the current implementation simply because it already exists."*
Correct — **but apply that scalpel precisely.** After reading the code:

- **KEEP and extend** the canonical data layer. `FundalystDataset` + `global-data-store` +
  `pipeline-store` + `use-model-data` + `financial-model-selectors` *already are* the "single
  shared dataset, tools read don't store, notify-on-change" architecture the brief describes.
  Its own code comment literally says *"Tools read, they don't store… the single source of
  truth."* Throwing this away would be throwing away the win.
- **REPLACE** the disconnected UI layer: the per-tool `ToolSpreadsheet`/`SpreadsheetInput` local
  editor (whose edits **never write back** to the canonical model), the per-tool empty states and
  "Load sample" buttons, and the tool-local input stores. **This** is the "collection of
  disconnected tools" the brief wants gone.

That distinction is the whole plan. We're not rebuilding the model; we're making the model the
thing every surface actually reads *and writes*, and giving it a world-class editing view.

---

## 3. What exists today (accurate file map)

| Concern | File | What it does | Verdict |
|---|---|---|---|
| Canonical model type | `src/lib/importer/types.ts` (`FundalystDataset`, `CanonicalFact`) | facts (metric, value, period, unit, currency, **confidence**, **sourceRow/Col**, **userOverridden**), periods, tables, warnings | **Keep — extend** |
| Shared dataset store | `src/store/global-data-store.ts` | `datasets[]`, `activeDatasetId`, `addDataset`, `getActiveDataset`, `getToolReadiness`, persisted | **Keep — add write API (§7.2)** |
| Change pub/sub | `src/store/pipeline-store.ts` | `notifyModelUpdated()` / `onModelUpdate()` | **Keep — this is the live-update spine** |
| Universal read hook | `src/store/use-model-data.ts` | `useModelData(extractor)` — re-extracts on model update | **Keep** |
| Per-tool extractors | `src/store/financial-model-selectors.ts` | dataset → tool-shaped inputs; `useActiveDataset()` | **Keep — extend for write-back** |
| Grid UI | `src/components/input/SpreadsheetInput.tsx` | `contentEditable` `<table>`, keyboard/paste/undo, **local state only** | **Replace (§6, §8)** |
| Grid wrapper | `src/components/input/ToolSpreadsheet.tsx` | per-tool default rows; `onDataChange` → **tool-local** state | **Replace with model-bound view** |
| Tool pages | `src/app/tools/{dcf,wc,ratios,peer}`, `src/app/research/{filing,trends,growth}` | pre-fill from model **but** keep empty states + Load-sample + local edits | **Rewire to model (§7.4)** |
| Workspace | `src/app/workspace/page.tsx` | cockpit; has panels that only describe/link | **Becomes the workspace shell (§7.5)** |
| Installed deps | `package.json` | `zustand`, `xlsx`, `recharts`, `pdfjs-dist`, `tesseract.js`. **No grid lib.** | see §6 |

### The core defect, in one sentence

`SpreadsheetInput.onDataChange` flows to **tool-local React state**, never into
`global-data-store`, and never calls `notifyModelUpdated()`. So editing revenue in the DCF grid
does **not** update charts, ratios, or trends. The brief's "revenue changes ↓ everything updates"
is exactly the wire that's missing. Pillar A is: **make the grid write to the canonical model,
and make every surface a `useModelData` reader.**

---

## 4. Gap analysis — brief vs. reality

| Brief requirement | Today | Action |
|---|---|---|
| Upload once, every page populated, no re-import | Tools pre-fill **if** model exists, but still show empty states + "Load sample" | Kill empty/sample per tool; model-first everywhere (§7.4) |
| Single shared dataset, tools are views | Model exists; **spreadsheet edits don't reach it** | Write-back API + grid binds to model (§7.2, §8) |
| Spreadsheet = source of truth, everything live-updates | `pipeline-store` exists but grid never notifies | Grid writes → `notifyModelUpdated()` → all readers (§7.3) |
| Excel-grade editing, native typing, virtualization | `contentEditable` table, caret hacks, no virtualization, no fill handle/resize | New engine (§6, §8) |
| Large-paste/scroll/edit stay instant | Whole-grid re-render on state change | Virtualized engine + granular writes (§8.5) |
| AI knows company/sheet/selection/range | No context store; no AI | Workspace-context store now; AI later via T14 (§9) |
| Not a suite of tools — one workspace | Nav = separate tool routes | Workspace shell + entity-aware lenses (§7.5); dovetails with T17 |

---

## 5. Target architecture — the living workspace

```
                         ┌───────────────────────────────────────────┐
   Import (once)  ─────▶  │        CANONICAL MODEL (per document)       │
   PDF/CSV/XLSX/OCR       │  FundalystDataset in global-data-store      │
                         │  facts[] · periods[] · provenance · units   │
                         └───────────────┬─────────────────────────────┘
                                         │  read  ▲ write (new §7.2)
                        ┌────────────────┼────────┼─────────────────┐
                        │                │        │                 │
             ┌──────────▼─────┐  ┌───────▼──────┐ │        ┌────────▼────────┐
             │  WORKSPACE GRID │  │  DCF / Ratios │ │        │ Charts / Trends │
             │  (Pillar B)     │  │  Peers / WC   │ │        │  Growth         │
             │  edit cells ────┼──┼──── read ─────┘ │        └─────────────────┘
             └──────────┬──────┘  └──────────────────┘
                        │ write cell
                        ▼
             notifyModelUpdated()  ──▶  every useModelData() reader re-extracts  ──▶ UI live-updates
                        │
                        ▼
             WORKSPACE-CONTEXT store (§9): {datasetId, sheet, selection, activeCell, range}
                        │
                        ▼   (consumed later, no rework)
             T14 grounded-AI  ·  memo/export  ·  audit trail
```

Golden rules for every surface after this lands:

1. **Read** through `useModelData(...)` / selectors. Never keep a private copy of financial data.
2. **Write** through the store write API (§7.2), which sets `userOverridden` + provenance and
   calls `notifyModelUpdated()`. Never mutate a dataset object in place in a component.
3. **No empty state** when a dataset exists. Empty state only when `datasets.length === 0`.
4. **One import path.** `/import` produces a dataset via `addDataset`. Nothing else "loads data".

---

## 6. DECISION GATE — spreadsheet engine: build vs. buy

The brief demands Excel-parity (virtualization, fill handle, drag-select, resize, fast paste,
smooth scroll, native typing). Hand-building that on `contentEditable` is a multi-month trap
(the current caret-jump workarounds prove it). Two real options:

**Option A (recommended) — adopt a canvas/virtualized grid, skin it with our tokens.**
- **`@glideapps/glide-data-grid`** (MIT): canvas-rendered, virtualized to 100k+ rows, built-in
  fill handle, drag-select, copy/paste, column resize, custom cell renderers. Themed via a prop
  object — we feed it our CSS tokens read from `getComputedStyle` (same approach `chart-theme.ts`
  already uses for Recharts). ~ one dependency, weeks not months, Excel-feel out of the box.
- Trade-off: canvas means we render cells via its API, not DOM/CSS — provenance dots, confidence
  shading, and sign coloring become custom cell renderers (doable; spec in §8.4).

**Option B — build a lean virtualized DOM grid.** Absorb-only-visible-rows windowing +
**single floating input overlay** (one `<input>` positioned over the active cell) instead of
per-cell `contentEditable`. Full control over DOM/CSS/provenance; but you own fill handle,
resize, virtualization, and every Excel edge case. Higher risk on the "native typing" bar.

**My recommendation: Option A.** It hits the brief's bar fastest and most reliably, keeps our
design language via theming, and lets the team spend its effort on the *integration* magic
(write-back, live sync, provenance, AI context) that is Fundalyst's actual differentiator —
not on reinventing a grid. Confirm this before Phase 2; everything else in this doc is
engine-agnostic. If licensing/canvas-provenance is a blocker, fall back to Option B with the
overlay-input model (do **not** revive `contentEditable`-per-cell).

> Whichever wins: the grid is a **controlled view over the canonical model** (§8.2). The engine
> choice must not leak into tool pages — they only ever see the store API.

---

## 7. Pillar A — Unified data flow (engine-agnostic; do this first)

### 7.1 Canonical shape stays; add a sheet dimension
`CanonicalFact` already has `statement` (`income_statement | balance_sheet | cash_flow | …`).
Derive **worksheet tabs** from it: Income Statement · Balance Sheet · Cash Flow · Assumptions ·
(All). No schema change required — group `facts` by `statement`. Add an `Assumptions` pseudo-sheet
for tool inputs that aren't source facts (DCF growth/WACC/terminal, etc.) so those live *in the
model* too, provenance = `default`/`manual`.

### 7.2 Add a write API to `global-data-store` (the missing wire)
New actions (pure, then `notifyModelUpdated()`):

```ts
// writes a value for (metric, period); marks userOverridden; keeps provenance/units
writeCell(datasetId: string, metric: string, periodLabel: string, value: number | null): void;
// upsert / rename / delete facts (grid row ops)
upsertFact(datasetId: string, fact: Partial<CanonicalFact> & { metric: string; periodLabel: string }): void;
renameMetric(datasetId: string, from: string, to: string): void;
deleteFact(datasetId: string, metric: string, periodLabel: string): void;
addPeriod(datasetId: string, periodLabel: string): void;
// batch (paste): one notify at the end, not per cell
applyEdits(datasetId: string, edits: CellEdit[]): void;
```

Rules: immutable update of the `datasets[]` entry; set `userOverridden: true` and preserve
`sourceRow/Col/sourceTableId` for provenance; **debounce** `notifyModelUpdated()` (~50–120ms) so
a fast typist or a big paste triggers one downstream recompute, not hundreds. Add one audit event
per logical edit (reuse `enterprise-store.addAuditEvent`, category `data`).

### 7.3 Live propagation (already 90% there)
`useModelData` readers already re-extract on `onModelUpdate`. Once §7.2 notifies, the brief's
cascade (revenue → charts → growth → DCF → ratios → exports) is automatic. **Verify** each tool
page consumes `useModelData`/selectors and holds **no** independent financial state. Where a tool
keeps local `useState` copies of figures (DCF currently mirrors rows into local state), refactor
to read from the model and write via §7.2.

### 7.4 Kill empty states & duplicate import (model-first surfaces)
For every tool + research + charts page:
- If `getActiveDataset()` exists → render populated immediately from selectors. **No** "Import
  data" empty state, **no** "Load sample" button on the page.
- Empty state shows **only** when `datasets.length === 0`, and it points to the **one** import
  path (`/import`). Sample data becomes a single global "Load sample dataset" affordance on the
  empty workspace/home, which calls `addDataset(sampleDataset)` — after that it's just the active
  dataset like any other (no per-tool sample).
- Delete `TOOL_DEFAULTS` seeding in `ToolSpreadsheet`; defaults now come from the model (or the
  Assumptions sheet).

### 7.5 The workspace shell (entity-first framing)
`workspace/page.tsx` becomes the home of the active document: header = document identity
(name, periods, fact count, provenance summary) + a **sheet/lens switcher**, body = the grid or
the selected lens. This is the "you're working on Financial-Results.pdf" surface. It should share
the same active dataset with routes (deep-links still work). Full multi-panel tiling is **T17** —
don't build tiling here; build the single-canvas workspace + grid, and leave clean seams (a
`<ToolModule>`-style separation) so T17 can host multiple lenses later.

---

## 8. Pillar B — The Excel-grade spreadsheet ("Workspace Grid")

New component `src/components/workspace/WorkspaceGrid.tsx` (replaces `ToolSpreadsheet` as the
canonical editor). Engine per §6. Requirements are **acceptance-testable** (§12).

### 8.1 It is a view of the model
- Reads: `datasetToGrid(dataset, sheet)` → columns = periods, rows = metrics for that sheet.
- Writes: every commit → store write API (§7.2). The grid holds **only ephemeral UI state**
  (selection, active cell, column widths, edit buffer) — never the authoritative numbers.
- Round-trips units/currency: display formatted (₹ Cr etc. via `lib/format.ts` `fmtINR`), store
  canonical numeric.

### 8.2 Controlled, not `contentEditable`
Single source of truth = model. Editing model = the **overlay-input** or engine's native editor.
Never scatter authoritative text across DOM nodes. This kills caret-jump/lost-focus by design.

### 8.3 Excel interaction parity (the checklist you implement)
Single-click select · double-click / Enter / F2 to edit · **type-to-replace** (typing on a
selected cell clears+enters edit) · Esc cancels edit (restores) · Arrows / Tab / Shift+Tab /
Enter / Shift+Enter navigation · Ctrl+Arrow jump to data edge · Home/End/Ctrl+Home/End · shift+
arrows and drag to extend range · Ctrl+A · Ctrl+C/X/V (multi-cell, TSV to/from Excel & Sheets) ·
Ctrl+Z/Y undo/redo (model-level history) · **fill handle** (drag to copy/series) · **fill-down
Ctrl+D / fill-right Ctrl+R** · column resize (drag + double-click auto-fit) · row insert/delete ·
right-click context menu · paste that grows rows/periods as needed.

### 8.4 Fundalyst superpowers rendered *in* the grid (this is the moat)
Each cell/row carries meaning the engine must render (custom cell renderer if canvas):
- **Provenance dot** per value: imported (green) · manual/override (slate) · computed (slate) ·
  default (caution) · unavailable (muted) — reuse `ProvenanceBadge` semantics/tokens.
- **Confidence shading** on low-confidence imported facts (subtle) so review targets pop.
- **Sign/arrow** on change columns (never color-only — §DESIGN, color-blind rule).
- **"Source" affordance**: click a cell → reveal the source row/table it came from
  (`sourceTableId`/`sourceRow`) — the provenance differentiator, now inline (relates to T5/T9).
- Edited-by-user cells visibly flagged (userOverridden) so imported vs. hand-entered is obvious.

### 8.5 Performance bar (non-negotiable, measurable)
- Virtualized rows+cols; only visible cells rendered. Virtualization invisible to the user.
- Typing latency: keystroke→glyph ≤ 1 frame (~16ms); **no full-grid re-render per keystroke**
  (write buffer commits on cell-exit / debounced; downstream recompute is the debounced notify).
- Paste 5,000 cells completes < ~300ms and triggers **one** downstream recompute.
- 60fps scroll at 10k rows. Selection/nav feel instant.
- Downstream tools recompute off the debounced notify, not synchronously on each cell.

### 8.6 Formula support — **Phase 3, optional, scoped**
Brief lists "formula bar (if implemented)". Treat as opt-in later: a lightweight engine
(e.g. HyperFormula, or a small internal evaluator) over the same model, `=` prefix, formula bar
above the grid. Do **not** block Pillars A/B on it. If skipped, the grid still fully satisfies
the "living workspace" goal. Flag clearly if you start it.

---

## 9. AI context substrate (build now, AI consumes later via T14)

New `src/store/workspace-context-store.ts` — a tiny zustand store that always reflects "what the
user is looking at", so no feature ever has to ask:

```ts
interface WorkspaceContext {
  activeDatasetId: string | null;      // mirrors global-data-store
  activeSheet: StatementType | 'assumptions' | 'all';
  selection: { anchor: CellRef; focus: CellRef } | null; // range
  activeCell: CellRef | null;          // {metric, periodLabel}
  // derived helpers
  getSelectedFacts(): CanonicalFact[]; // resolves selection → facts
  describeContext(): string;           // e.g. "Reliance / Income Statement / Revenue FY24 selected"
}
```

- The grid updates `selection`/`activeCell` on every selection change (cheap).
- `describeContext()` + `getSelectedFacts()` are exactly the payload a future "Explain this"
  (T14) needs — highlight a row, and the assistant already has company + sheet + the selected
  facts with provenance. **Ship the store and wire the grid to it now.** Do not ship an answer
  UI; leave a `// T14: consume workspace-context` seam where the assistant will read it.
- Keep it derivable/ephemeral (not persisted) — it's a pointer into the model, not data.

---

## 10. Phasing — each phase is independently shippable & verifiable

**Phase 0 — Instrument & prove the gap (1–2 days).** Add `writeCell` (§7.2, debounced notify) and
wire the *existing* `SpreadsheetInput.onDataChange` to it behind a flag. Prove: editing revenue in
DCF live-updates the trends chart. This validates the spine before any UI rebuild.

**Phase 1 — Unify data flow (Pillar A).** Full write API (§7.2); refactor every tool/research/
charts page to model-read + model-write; delete per-tool empty states, Load-sample, and local
financial state (§7.4); one import path; audit events. **Ship.** Now it's one dataset, live —
even on the old grid.

**Phase 2 — Workspace Grid (Pillar B).** Engine per §6; `WorkspaceGrid` bound to the model
(§8.1–8.5); provenance/confidence/source rendering (§8.4); make it the canonical editor in the
workspace shell (§7.5); retire `ToolSpreadsheet`/`SpreadsheetInput`. **Ship.**

**Phase 3 — Context + polish (+ optional formulas).** Workspace-context store + grid wiring (§9);
source-reveal on cell click; sheet tabs; optional formula bar (§8.6). **Ship.**

Each phase must pass §11 gates before merge. Update `HANDoFF.md` at each phase boundary.

---

## 11. Design & code constraints (do not violate)

- **Tokens only.** No raw hex/rgba/px/font literals in `app/**`/`components/**`
  (`DESIGN.md §2–4`). Canvas grid reads colors via `getComputedStyle` (like `chart-theme.ts`).
- **Provenance stays visible** and semantic-colored (imported=green, override/computed=slate,
  default=caution). Color = meaning, never decoration.
- **Keep `src/lib/calculations.ts` pure.** Live updates come from the notify→re-extract loop, not
  from calculations reaching into stores.
- **No network, no credentials, no fake enterprise/AI.** Privacy promise intact.
- **A11y:** grid is keyboard-complete; focus-visible rings; `prefers-reduced-motion`;
  `hover:none`; 44px touch targets; ≥16px mobile input font (mobile grid may be read-first with
  an explicit edit affordance — don't ship a janky mobile edit).
- Preserve Playwright route coverage; add specs for the new grid + live-sync.

---

## 12. Acceptance criteria & the "benchmark against Excel" gate

**Data flow (Pillar A):**
1. Import once → DCF, ratios, WC, peers, trends, growth, charts, workspace all render populated
   with **zero** further loading and **zero** empty states.
2. Edit a value in the grid → within one debounced tick, charts + growth + DCF + ratios + memo
   preview reflect it. No refresh/Apply button anywhere.
3. There is exactly **one** import entry point; no per-tool "Load sample"; no duplicate datasets
   for the same document.
4. No component holds an authoritative copy of financial numbers (grep for tool-local financial
   `useState`; should be gone).

**Spreadsheet (Pillar B) — every box must be a "yes":**
5. Full §8.3 interaction checklist works and matches Excel muscle memory.
6. Typing shows no caret jump, no lost focus, no whole-grid flicker; keystroke→glyph ≤ ~1 frame.
7. Paste 5k cells < ~300ms → one downstream recompute; 60fps scroll @ 10k rows.
8. Provenance/confidence/source render correctly per cell (§8.4); override vs. imported is
   obvious; click-to-source resolves to the right fact.
9. Undo/redo operate at model level and survive across the live-sync.

**Benchmark questions (answer yes to all, per brief):** Is each interaction as fast as Excel?
Fewer clicks? Does it ever interrupt flow? Would an equity-research analyst use it all day? Does
it feel like a desktop app, not a browser? If any "no" → keep refining before ticking done.

**Context (Phase 3):**
10. `workspace-context-store.describeContext()` + `getSelectedFacts()` return correct data for any
    selection; the T14 seam is present and documented (no AI answer shipped).

---

## 13. Risks, non-goals, and things to explicitly NOT do

- **Non-goals:** real backend/cloud/multi-user; live market data; a shipped answering AI;
  multi-panel tiling (that's T17 — leave seams, don't build). Formula engine is optional (§8.6).
- **Risk — canvas provenance:** if Option A, prototype the custom cell renderer for the
  provenance dot + confidence shading **first**; it's the one place canvas fights us. If it's
  ugly, that's the signal to reconsider Option B.
- **Risk — over-notify:** forgetting to debounce `notifyModelUpdated()` will make typing lag as
  DCF/charts recompute per keystroke. Debounce is mandatory (§7.2, §8.5).
- **Risk — scope creep into T17/T14:** stop at the single-canvas workspace + context substrate.
- **Do NOT** revive `contentEditable`-per-cell, keep tool-local financial state, add a second
  import path, or introduce a color/gradient that isn't meaning-bearing.

---

## 14. Verify before ticking done

```bash
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run build
npx playwright test          # incl. new grid + live-sync specs
```
Grep gates: no financial `useState` in tool pages; no `var(--x)` undefined; no inline
hex/px/font in `app/**`/`components/**`; `notifyModelUpdated` is debounced; one `/import` path.
Manual: import a real annual report; edit revenue; watch trends/DCF/ratios move; paste 5k cells;
scroll 10k rows; full keyboard pass; provenance + source-reveal; both themes; reduced-motion.

---

## 15. Coordination

This is architectural — announce a "starting" note in `HANDoFF.md` before Phase 1 (per
`AGENTS.md`), and coordinate with any in-flight **T8/T10/T11/T17/T14** work since this absorbs
much of it. Mark the relevant `CODEX_TICKETS.md` boxes `[~]` with your agent/date as you take
each phase, and fold their acceptance criteria in. Flag ambiguity in `HANDoFF.md` rather than
guessing.

---

### Appendix — why this is the right redesign, not just a bigger one

The seductive failure mode is to rewrite everything and end up with a prettier version of the
same disconnection. The actual revolution here is a single wire and a single view: **make the
grid write to the model that already exists, and make every screen a reader of it.** Do that, and
Fundalyst stops being six tools that happen to share an importer and becomes one instrument where
the document *is* the workspace — Excel's hands, Bloomberg's seriousness, Figma's "every surface
already knows the file." Everything else in this doc serves that one wire.
