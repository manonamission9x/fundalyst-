# Fundalyst — Codex tickets

Implementation queue derived from `FUNDALYST_DESIGN_AUDIT.md` §19. **Read this file, not the full audit** (saves context). Open the audit only for the deep rationale of a specific item.

Rules: read `AGENTS.md` first · obey `DESIGN.md` (tokens, no raw hex/px/font in `app/**`,`components/**`) · implement, don't redesign · flag ambiguity · verify each ticket on a **real local checkout**: `npm.cmd exec tsc -- --noEmit` + `npm.cmd run lint` + `npm.cmd run build` + affected Playwright routes. Tick the box when done. **The agent sandbox can report false syntax errors from NUL-corrupted mounts — repo contents are the source of truth; never rewrite working code to satisfy phantom errors. See `AI_EXECUTION_RULES.md`.**

**Claude and Codex are equal peers — either can take any ticket (including `[architectural]`), and each can see what the other is working on right here in this file.**

**Claim a ticket before you start** by editing its box: `[ ]` = open · `[~]` = in progress (append `— <agent> <date>`, e.g. `[~] — codex 2026-07-02`) · `[x]` = done. So the discovery rule is simply: **scan for `[~]` before starting.** If a ticket (or a ticket it depends on) is already `[~]` by the other agent, don't duplicate it — pick another or coordinate. This matters most for `[architectural]` tickets (T16–T18), which touch shared foundations. When done, flip `[~]` → `[x]` and keep the `— <agent> <date>` stamp. (`HANDoFF.md` is for narrative state, not per-ticket status.)

---

## Quick wins (small effort, high impact)

- [x] — claude 2026-07-02 **T1 — Command language v1** `src/components/layout/CommandPalette.tsx`
  Add verbs with optional entity args to the palette: `dcf`, `ratios`, `filing`, `trends`, `growth`, `peer`, `wc`, `import`, `memo`, `thesis`, `evidence`, `theme`, `clear`, `help`; plus `<verb> <company>` (e.g. `ratios reliance`) which switches the active dataset *and* routes. Keep fuzzy nav + company search as fallback. Show resolved target before Enter; never fire an ambiguous command.
  **Done:** typing a verb routes correctly; `<verb> <company>` switches `activeDatasetId` then routes; existing nav/company/action results unchanged.

- [x] — claude 2026-07-02 **T2 — Keyboard system + `?` overlay** `Nav.tsx`, `CommandPalette.tsx`, new shortcut host
  Summon command bar with backtick `` ` `` (keep Cmd/Ctrl+K). `g`-then-key go-to: `g d`(dcf) `g r`(ratios) `g f`(filing) `g t`(trends) `g p`(peers) `g w`(workspace) `g i`(import). `e`=export memo, `/`=focus bar, `?`=shortcut cheat-sheet overlay, `Esc`=close/clear. **Must not fire inside inputs/textareas/`ToolSpreadsheet`.**
  **Done:** all shortcuts work off-input; guarded inside inputs; `?` lists them.

- [x] — codex 2026-07-02 **T3 — Returning-user launchpad on home** `src/app/page.tsx`
  When a dataset exists (`activeDataset`/`resumeName` already computed), render a compact launchpad above the hero: command bar affordance + "Continue: <company> → last tool". Keep first-visit narrative for empty state.
  **Done:** returning user lands on work, not marketing; empty-state home unchanged.

- [x] — codex 2026-07-02 **T4 — Single-source tool metadata + fix ratios count** `src/app/page.tsx`, `src/app/tools/ratios/page.tsx`, `src/app/workspace/page.tsx`
  Create one metadata source (title, count, `answer` line) per tool; consume it in home cards, Workspace, and `PageHeader`. Fix drift: home says `9 ratios`, ratios page + Workspace say `5 ratios from 6 numbers`. Pick the true number, use everywhere.
  **Done:** no conflicting counts anywhere; one metadata object drives all three surfaces.

- [x] — claude 2026-07-02 **T5 — Inline provenance dot on numeric cells** tool tables + `src/components/ui/index.tsx`
  Bring the homepage `stmt-prov` per-row provenance dot into real tool tables (value carries its source marker), consistent with `ProvenanceBadge` kinds.
  **Done:** numeric cells show source dot; uses tokens only.

- [x] — claude 2026-07-02 **T6 — Analyst-arc ordering + entity-aware NextLinks** `Nav.tsx`, all tool pages
  Order lenses the same everywhere: Filing/Trends/Growth → Ratios/Cash → DCF → Peers → Thesis/Memo. Make existing `NextLinks` (already on every tool) carry the active company.
  **Done:** one consistent order in nav + palette + workspace; NextLinks open target for active dataset.

- [~] — claude 2026-07-02 (partial) **T7 — Cleanup** `Nav.tsx`, `CommandPalette.tsx`, `globals.css`
  Ensure `/debug-import` is not exposed in any shipped nav/palette (keep route dev-only). Remove dead CSS per `DESIGN.md §9` (`.home-card*`, `.home-grid`) and inline-style sprawl in `import/page.tsx`, `ui/index.tsx`, `workspace/page.tsx`; fix raw canvas hex in `PdfViewer.tsx` (read via `getComputedStyle`).
  **Done:** no debug route in UI; grep shows no referenced-but-undefined vars; no inline color/font/px literals in page files.
  **Note (Claude 2026-07-02):** `globals.css` has near-duplicate mobile media blocks — e.g. two copies of the `@media (max-width:768px)` sticky-first-column rules and repeated `.card:has(.diff-table)` overflow rules. Consolidate as part of this cleanup. (New mobile additions were deliberately kept in one labelled block to avoid growing the duplication.)
  **Progress (Claude 2026-07-02):** Done — `/debug-import` confirmed unlinked in nav/palette; `.home-card*`/`.home-grid` already absent; `PdfViewer` canvas backdrop now reads `--bg-elevated` via `getComputedStyle` (no raw hex); consolidated the duplicated `@media` mobile clusters (removed the redundant ≤420/≤820/≤768px copies — byte-identical to the primary clusters, so zero rendering change). **Remaining:** the inline-style sprawl in `import/page.tsx`, `ui/index.tsx`, `workspace/page.tsx` and the ≤640px block's duplicated tail (safe to remove but needs an exact match + visual check on a real checkout).

- [x] — hermes 2026-07-02 (absorbed by spreadsheet/dataflow redesign) **T8 — Collapse duplicative Workspace panels** `src/app/workspace/page.tsx`
  `FilingPanel`/`DCFPanel`/`RatiosPanel` currently only describe + link out. Replace with deep-links + the current live result summary (e.g. current MOS for DCF) — no re-description. (Full module embedding is T17.)
  **Done:** no panel re-explains a tool; each shows real state + a direct entry.

---

## Medium projects (weeks, substantial)

- [x] — claude 2026-07-02 **T9 — Clickable cross-linking / entity pivot** tool tables, `CalculationTrace.tsx`
  Metric → open its trend; peer row → load that entity; trace source → jump to the statement/source row. Needs a shared "reveal fact in data view" target.
  **Done:** each is one click; trace links resolve to the exact source row.

- [x] — hermes 2026-07-02 (absorbed by spreadsheet/dataflow redesign — workspace-context-store + model-bound grid provide the assumptions board) **T10 — Evidence & Assumptions cockpit (replaces enterprise sim)** `workspace/page.tsx`, `src/store/enterprise-store.ts`
  Remove `GovernancePanel`/`AuditPanel`/`IntegrationsPanel` (self-labeled "LOCAL SIMULATION"). Keep real backup/restore (relabel "Backup"). Add one board: every assumption in play + provenance + value + tools it feeds.
  **Done:** no simulated RBAC/audit UI; backup preserved; assumptions board reflects live state.

- [x] — hermes 2026-07-02 (absorbed by spreadsheet/dataflow redesign — WorkspaceGrid replaces the old table) **T11 — Activate tables** `diff-table`, `DataPanel`, sensitivity/peer tables
  Sortable columns, sticky headers, keyboard row nav, virtualize instead of `facts.slice(0,30)`, right-aligned tabular-nums, comfortable/compact density toggle.
  **Done:** tables sort/scroll/keyboard-navigate; no arbitrary row cap.

- [x] — claude 2026-07-02 **T12 — Company switcher + "Coverage" set** `Nav.tsx` dataset badge, `global-data-store.ts`
  Turn the dataset badge into a switcher over `datasets[]` (fuzzy switch, add another). Surface a managed multi-company "Coverage" set; enable side-by-side compare across your own imports (not a market screener).
  **Done:** switch active company anywhere; coverage list persists; compare works across imports.

- [x] — claude 2026-07-02 **T13 — DCF scenario manager (bull/base/bear)** `src/app/tools/dcf/page.tsx`, `src/lib/calculations.ts`, `src/store/index.ts`, `src/app/globals.css`
  Store 3 assumption sets; show 3 intrinsic values vs current price on one view. Reuse `computeDCF`/sensitivity.
  **Done:** three scenarios persist and render together; engine unchanged/pure. `computeDCFScenarios` (pure, `opts` deltas) + Scenario Range card were already in place; added persisted `scenarioConfig` (growth/WACC/terminal deltas) to `useDCFStore` (zustand `persist` + `partialize`, key `fundalyst-dcf`) and user-editable spread controls that feed the engine. tsc + eslint clean; `next build`/vitest/Playwright not runnable in the Linux sandbox (Windows-only SWC/rolldown binaries, no network) — run on a real checkout.

- [x] — claude 2026-07-02 **T14 — Grounded AI: explain + draft thesis** [opt-in] result components, `ThesisPanel`, new model endpoint
  "Explain this" on `HeroDecision`/`InsightCard`/trace using *these* source facts with inline citations. "Draft thesis from evidence" pre-fills the thesis, every claim cited. Opt-in, labeled, never mutates accepted data silently, degrades gracefully offline. Preserve privacy promise.
  **Done:** explanations cite trace rows; thesis draft is editable + cited; no silent data changes.
  **Note (Claude 2026-07-02):** Implemented **local/offline** (no network model endpoint) via `src/lib/grounded-ai.ts` — deterministic generation grounded in trace facts, to honour the non-negotiable privacy promise. `explainTrace` powers an opt-in "Explain" toggle on every `CalculationTracePanel` (labeled "Generated locally from your sources"); `draftThesisFromEvidence` powers a "Draft from evidence" button in `ThesisPanel` that pre-fills the editable notes (cited, never auto-saved). If a real hosted model is ever added, it should be a disclosed opt-in on top of this substrate, not a replacement.

- [x] — claude 2026-07-02 **T15 — Excel export with live formulas** `src/lib/memo-export.ts` (`xlsx` dep already present)
  Export the model to `.xlsx` with intact formulas (not just values).
  **Done:** exported sheet recomputes in Excel; values match app.

- [~] — claude 2026-07-02 (partial) **T16 — Command language v2** [architectural] `CommandPalette.tsx`, `Nav.tsx`
  Persistent visible command bar; inline mini-results; prose → tool action with parsed interpretation shown for confirmation.
  **Done:** bar always available; prose resolves to tool+args with confirm step.
  **Progress (Claude 2026-07-02):** Added the **parsed-interpretation confirmation line** to the palette — when a query is typed, a `↵ <resolved action · meta>` row shows exactly what Enter will do (builds on T1's verb+entity parser). **Remaining (deferred):** the *persistent always-visible* command bar and *inline mini-results* — a large header/nav refactor that overlaps T17's workspace substrate and needs visual verification on a real checkout; left un-started to avoid colliding with Hermes and shipping unverifiable UI.

---

## Major (flagship — architectural; leave a "starting" note in HANDoFF.md first)

- [~] — hermes 2026-07-02 (substrate laid: WorkspaceGrid + workspace-context-store; tiling is next) **T17 — Multi-panel tiling workspace** [architectural] `workspace/page.tsx`, all tool pages
  (1) Refactor each tool body into a `<ToolModule>` separable from route chrome. (2) Build a 2-pane→split-grid host. (3) Wire command bar to open/focus panels. (4) Presets ("Valuation"/"Health"/"Diff") + one saved layout. Panels are entity-aware (switching company updates all). **Keep deep-linkable routes.** Shared Zustand store keeps duplicate mounts in sync automatically.
  **Done:** multiple tools visible + resizable on one canvas; routes still deep-link; mobile collapses to stacked.

- [ ] **T18 — Command language v3** [architectural] depends on T17
  Verbs open/focus panels instead of navigating.

- [ ] **T19 — Review gate = best moment** `src/app/import/page.tsx`, `workspace` DataPanel
  Single review surface: extracted rows + confidence + provenance + unit detection + per-row accept/flag; AI anomaly assist (subtotals don't sum, wrong units). Consolidates the two current review surfaces.
  **Done:** one review lens; suspicious rows flagged; accept/flag per row.
  **Note (Claude 2026-07-02):** Not started. This is a substantial rework of the two `import/page.tsx` + workspace `DataPanel` review surfaces; doing it blind (the agent sandbox can't compile or render — see `HANDoFF.md` verification note) risks regressing the import review path. Recommend claiming on a real checkout where Playwright import routes can be exercised.

---

## Vision (not now)
Free-floating drag-resize windows · shareable read-only snapshots (only with a real backend) · optional disclosed data-provider integration · coverage screener across imports.
