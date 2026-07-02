# Fundalyst — Product Design Audit & Feature Integration

**Author role:** Lead Product Designer / UX Architect / Product Strategist
**Benchmark studied:** Godel Terminal (godelterminal.com) + Bloomberg, Koyfin, AlphaSense, Linear, Raycast, Notion, VS Code, Superhuman, Perplexity, Stripe.
**Scope:** Full audit of Fundalyst as it exists in this repo, first-principles comparison against Godel and best-in-class software, prioritized recommendations ready to hand to an implementation agent.
**Date:** 2026-07-02

> **How to read this document.** Every recommendation is written so it can be implemented without re-deriving context. Where a change touches real code, the exact file/route is named. Priority tags: **[QUICK WIN]**, **[MEDIUM]**, **[MAJOR]**, **[VISION]**, **[REJECT]**. Each substantive recommendation carries: *Problem → Value → Impact → Trade-offs → Complexity → Priority.*

---

## 0. Grounding: what Fundalyst actually is today

Before comparing, the honest baseline (from the code, not the marketing):

- **Client-only app.** Next.js 16 / React 19, Zustand + `localStorage`, no backend, no auth, no server, no live market data. Everything runs in the browser. (`HANDoFF.md`, `src/store/*`.)
- **Core loop:** Import a filing (CSV / XLSX / PDF / screenshot / OCR / manual) → review & accept extracted facts with confidence + provenance → the accepted dataset pre-fills every analysis tool. (`src/lib/importer/*`, `src/store/global-data-store.ts`.)
- **Routes / IA:** `/` home, `/workspace` cockpit, `/import`, `/research/{filing,trends,growth}`, `/tools/{dcf,wc,ratios,peer}`, `/about`. Full-page route navigation between siloed tools.
- **Navigation:** top bar with three hover/click dropdown sections (Research, Valuation, Data), a primary Workspace tab, a Cmd/Ctrl+K command palette, an Import CTA, memo export, theme toggle, and an "active dataset" badge. (`src/components/layout/Nav.tsx`.)
- **Command palette exists** but is **navigation + 3 actions only** (jump to company, jump to route, export memo / toggle theme / clear data). No command *language*, no verbs on entities. (`src/components/layout/CommandPalette.tsx`.)
- **Tool page pattern:** one spreadsheet-style input (`ToolSpreadsheet`) → Calculate → a results panel with a single "decision number" (`HeroDecision`), a metric grid, an insight card, a **calculation-trace panel** showing source facts, a chart, and provenance badges. (`src/app/tools/dcf/page.tsx` is the reference implementation.)
- **Design language is already excellent and finance-native:** dark-default, restrained, monospace-for-data, "colour = meaning only," provenance-first, no gradients inside tools. (`DESIGN.md`.) This is philosophically closer to Bloomberg/Koyfin than to generic SaaS — a real asset.
- **The genuine differentiator:** *provenance + source-linked calculation trace.* Every number knows where it came from (imported / computed / manual / default). Godel ties financials to filings; Fundalyst ties **every downstream calculation** to its source facts. That is a stronger transparency story than Godel's, and it is Fundalyst's moat.

**The single most important framing for everything below:** Godel is a *real-time, multi-asset, data-terminal for research teams with a data budget.* Fundalyst is a *local, single-company, filing-driven fundamental-analysis instrument for an individual analyst.* Most of Godel's **content** (live quotes, options Greeks, tape, news wires, universe screeners) does not transfer, because Fundalyst has no data feed and a different user. Almost all of Godel's **interaction model** (command language, multi-panel workspace, entity pivoting, keyboard-first, density, cross-linking) transfers extremely well and is exactly what Fundalyst is missing. **Copy the grammar, not the vocabulary.**

---

## 1. Executive Summary

Fundalyst has a rare combination: a disciplined, professional visual system and a genuinely differentiated provenance engine. What it lacks is the *interaction architecture* of a professional instrument. Today it behaves like a well-designed multi-page website with a set of calculators bolted to a shared dataset. Godel behaves like an instrument — one canvas, one command line, many modules, no page reloads, hands never leave the keyboard.

The highest-leverage move is **not to add features**. It is to change three structural things:

1. **Introduce a real command language** (not just a nav palette). A single input where an analyst types a verb + optional entity (`dcf`, `ratios reliance`, `compare fy24 fy23`, `import`) and lands directly in the tool with data loaded. This is the cheapest, highest-impact change and it builds directly on the palette that already exists.
2. **Add a multi-panel workspace** so an analyst can see DCF, ratios, filing-diff, and the source statement *at the same time* instead of navigating between full pages and losing context. This is the core lesson of Godel/Bloomberg and it is Fundalyst's biggest structural gap.
3. **Make cross-linking and entity-pivoting first-class** — every number, metric, and peer should be a jumping-off point. Provenance data already models the graph; the UI just doesn't expose it as navigation yet.

Everything else — keyboard shortcuts, denser tables, empty-state upgrades, AI over the provenance graph, deduplicating the Workspace panels against the real tool pages — is either a quick win that follows from these three, or a medium project that compounds them.

The three biggest things to **stop doing**: (a) the Workspace's "Governance / Audit / Integrations" **local-simulation enterprise theater**, which adds cognitive load and a credibility risk for zero user value; (b) **duplicating tool descriptions** inside Workspace panels that just link back out to the real tool; (c) chasing Godel's real-time/market-data surface, which Fundalyst cannot honestly deliver without a backend and which would dilute the "numbers you can defend" positioning.

---

## 2. Key Lessons Learned from Godel Terminal

Each lesson is stated as the *principle* behind the decision, then whether it transfers to Fundalyst.

**L1 — The command line is the primary UI, not a shortcut.** In Godel you press `` ` `` (backtick) from anywhere and type `DES AAPL`, `FA`, `N`, `CF`. The command bar is *the* way you work; the mouse is optional. The principle: for a repeated-daily professional workflow, typing a known mnemonic is faster than hunting menus, and muscle memory compounds. **Transfers strongly.** Fundalyst has a palette but treats it as a search box, not a command language.

**L2 — Modules, not pages.** Godel opens up to six independent, resizable panels on one canvas; you compose your own layout and run many modules at once. The principle: research is comparative and non-linear — you hold several views in working memory simultaneously, and page navigation destroys that. **Transfers strongly.** This is Fundalyst's largest gap.

**L3 — Entity-first, verb-second pivoting.** The workflow is "pick a ticker, then fan out: `DES` → `FA` → `N` → `CF` → `HDS`, all about the same company." The principle: the analyst's mental model is centered on the *company*, and every tool is a lens on it. **Transfers, with adaptation** — Fundalyst's "entity" is the imported dataset, and its lenses are DCF/ratios/trends/filing/peers.

**L4 — Source is attached to the number.** Godel's standardized financials tie each line item back to the underlying filing; no tab-switching to find the source. The principle: trust in a terminal comes from traceability. **Already a Fundalyst strength** — and Fundalyst goes further (full calculation trace). Validation, not a gap.

**L5 — Mnemonic density over discoverability.** Godel deliberately uses terse codes (`QM`, `HDS`, `EM`, `GIP`) that are opaque to beginners but instant for pros, and offsets the learning cost with `HELP` and docs. The principle: optimize the *common* path for the expert; make the *rare* path (learning) discoverable but not intrusive. **Transfers partially** — Fundalyst should offer terse aliases for pros *and* legible labels for newcomers (dual-track), because its audience skews less specialist than Godel's.

**L6 — Keyboard is the speed story.** `` ` `` opens the bar, Enter executes, Esc closes/clears, arrows scroll tables. Everything is reachable without a pointer. **Transfers strongly.**

**L7 — Honest scope.** Godel's own beginner guide lists "What Godel Cannot Do (Yet)." The principle: stating limits builds trust with sophisticated users. **Fundalyst already lives this** (the "no server, no sign-up, every number keeps its source" line and the explicit "local simulation" labels) — but it currently *over-corrects* into enterprise-simulation theater (see §18).

**L8 — Persistent monitoring surfaces (watchlists / QM).** Godel keeps a live quote monitor as a standing panel. The principle: some views are ambient, not task-driven. **Transfers weakly** in literal form (no live prices) but the *pattern* — a persistent "portfolio of companies I'm researching" surface — is valuable and Fundalyst half-has it (multiple datasets exist in the store but aren't surfaced as a managed set).

---

## 3. What Fundalyst Already Does Well

Do not regress these. They are competitive strengths, several of which are *ahead* of Godel.

- **Provenance + calculation trace.** `ProvenanceBadge` (imported / computed / manual / default) plus `CalculationTracePanel` (`src/components/shared/CalculationTrace.tsx`, `src/lib/calculation-trace.ts`) give every result an auditable lineage. This is the product's soul. Godel ties financials to filings; Fundalyst ties *derived analysis* to source facts — a stronger claim.
- **A real design system with a written constitution.** `DESIGN.md` is unusually rigorous: tokenized colour with "colour = meaning," a typographic scale with a hard floor, mono-for-data, one focal element per screen. This is exactly the aesthetic a serious instrument needs, and it already reads as "quiet, trustworthy tool" rather than "startup dashboard."
- **A coherent core loop.** Import → review/accept → tools pre-fill from one canonical dataset (`financial-model-selectors.ts`, `use-model-data.ts`). The "one review gate, then every tool uses the accepted dataset" idea is genuinely good product thinking.
- **The tool result template.** `HeroDecision` (one decision number) → `MetricGrid` → `InsightCard` → trace → chart → sensitivity is a strong, repeatable pattern that most fintech tools lack. The DCF page is a model other tools should conform to.
- **Local-first privacy as a feature.** "No sign-up, no server upload" is a real differentiator for a suspicious analyst audience and is stated with restraint.
- **A command palette foundation** already wired to Cmd/Ctrl+K with fuzzy matching (`CommandPalette.tsx`). The scaffolding for the #1 recommendation already exists.
- **Import breadth.** CSV/XLSX/PDF/OCR/screenshot/manual with confidence scoring is more ingestion flexibility than most tools at this stage.

---

## 4. Weaknesses in the Current Product

Ordered by severity.

**W1 — No multi-panel workspace. Everything is a full-page route.** The analyst cannot see DCF and the source statement and the filing diff at once. Every tool switch is a navigation that unloads the previous view. This is the defining gap versus every professional terminal. (All of `src/app/*/page.tsx`.)

**W2 — The command palette is a nav menu, not a command language.** It jumps to routes and runs 3 actions. It has no verbs-on-entities, no arguments, no "do X to the active dataset," no inline results. (`CommandPalette.tsx`.) The most Godel-like thing in the app is under-built.

**W3 — The Workspace duplicates the tools instead of composing them.** `FilingPanel`, `DCFPanel`, `RatiosPanel` in `src/app/workspace/page.tsx` are mostly a paragraph of description + an "Open X →" link to the real page. The Workspace is supposed to be the cockpit; instead it's a table of contents that re-explains tools the user can reach from the nav. High redundancy, low leverage.

**W4 — Enterprise-simulation theater.** Governance / Audit Trail / Integrations panels simulate roles, approval gates, retention policy, and connectors that are explicitly "LOCAL SIMULATION … NOT enforced." This adds real cognitive load, screen weight, and a credibility hazard (a sophisticated user reads "simulated RBAC" as a warning sign) for no analyst value. (`GovernancePanel`, `AuditPanel`, `IntegrationsPanel`.)

**W5 — Weak cross-linking / no entity pivoting.** Nothing links laterally. You can't click a peer to load it, click a metric to see its trend, or click a trace source to jump to the statement row. The provenance graph exists in data but is not navigable.

**W6 — Thin keyboard model.** Only Cmd/Ctrl+K and in-palette arrows. No global "go to DCF," no "focus command bar," no per-table keyboard navigation, no shortcut help overlay. (Contrast Godel: fully operable by keyboard.)

**W7 — No AI, despite owning the perfect substrate for it.** Fundalyst has structured, provenance-tagged financial facts and a calculation trace — the ideal input for grounded, citeable AI ("explain this DCF," "what changed YoY and why," "draft the thesis from the evidence"). There is zero AI surface today.

**W8 — Marketing-heavy home relative to a returning pro.** The homepage (`src/app/page.tsx`) is a good *first-visit* narrative but there is no "returning analyst" fast path — a power user landing on `/` sees a hero and six explainer cards, not their in-progress work + a command line.

**W9 — Tables are static and low-density.** `diff-table` renders fixed slices (e.g. `facts.slice(0, 30)` in `DataPanel`), no sort, no filter, no sticky headers, no keyboard nav, no column pivoting. A terminal audience expects dense, sortable, navigable tables.

**W10 — Single-company mental model, even though multiple datasets exist.** The store holds `datasets[]` and an `activeDatasetId`, but there is no managed "companies I'm researching" surface, no fast switch, no side-by-side. The multi-entity capability is latent.

**W11 — Inconsistent tool depth.** DCF is rich (sensitivity, trace, chart); other tools are comparatively thin. The Workspace claims "5 ratios from 6 numbers" while the homepage says "9 ratios" — small, but the kind of drift that erodes trust in a numbers product. (Reconcile `RatiosPanel` copy vs `page.tsx` toolCards.)

---

## 5. High-Impact UX Improvements

**U1 — Ship a real command bar (the "Godel command line").** [MAJOR → but start as QUICK WIN]
*Problem:* W2 — the fastest input in the app is a nav menu. *Value:* Turns Fundalyst from "site you browse" into "instrument you drive." Directly ports Godel's L1/L6. *Impact:* High — it becomes the primary way pros work and the fastest onboarding path for newcomers ("type what you want"). *Trade-offs:* Requires a small command grammar + argument parsing; must stay legible for beginners. *Complexity:* Low for v1 (extend `CommandPalette.tsx`), higher for full grammar. *Priority:* **Highest.**
- v1 (quick win): add **verbs with arguments** to the existing palette: `dcf`, `ratios`, `filing`, `trends`, `peer`, `import`, `memo`, `clear`, plus `open <company>` to switch active dataset. Keep fuzzy nav as fallback.
- v2 (medium): add a persistent, always-visible command input (Bloomberg/Godel style) pinned in the nav, summoned by a dedicated key (see K-shortcuts §12). Support `verb + entity` (`ratios reliance`) and inline mini-results (e.g. `memo` shows a confirm chip; `dcf` shows the current MOS).
- v3 (major): commands can **open modules into the multi-panel workspace** (§11) rather than navigate.

**U2 — Tighten the existing "answer" line for consistency and prominence.** [QUICK WIN]
Every tool already passes an `answer=` prop to `PageHeader` (verified across `dcf/peer/ratios/wc` and `research/filing|trends|growth` + `import`) — a real strength. *Problem:* the wording and prominence vary, and the line sits below the title where it can be missed. *Value:* orients newcomers, reduces "what is this for" load. *Impact:* Medium. *Complexity:* Trivial (normalize copy from the single-source tool metadata in CL5; consider elevating it visually). *Priority:* Quick win.

**U3 — Make the calculation-trace clickable back to the source row.** [MEDIUM]
*Problem:* W5 — trace shows source facts but you can't jump to them. *Value:* completes the provenance promise; the analyst can verify a number in one click, which is the whole trust story. *Impact:* High for the core differentiator. *Trade-offs:* needs a shared "reveal fact in data view" target. *Complexity:* Medium. *Priority:* Medium, high-strategic.

**U4 — Replace the enterprise-simulation panels with an analyst-relevant "Evidence & Assumptions" surface.** [MEDIUM]
*Problem:* W4. *Value:* reclaims the most valuable screen (the cockpit) for something real — a single place showing every assumption in play, its provenance, and every place it feeds. *Impact:* High (removes noise + adds a genuinely useful audit that matches the product's soul). *Complexity:* Medium. *Priority:* Medium. (See §18 for the removal, §16 for the replacement.)

**U5 — Add a "resume where you left off" fast path on home and a compact returning-user header.** [QUICK WIN]
*Problem:* W8. *Value:* respects the repeat professional. *Impact:* Medium. *Complexity:* Low (the home already computes `resumeName`; expand it into a proper "Continue: <company> → last tool" card and surface the command bar above the hero for returning users). *Priority:* Quick win.

**U6 — Densify and activate tables.** [MEDIUM] Sortable columns, sticky headers, keyboard row navigation, show-all with virtualization instead of `slice(0,30)`. *Impact:* Medium-high for the pro feel. *Complexity:* Medium. *Priority:* Medium. (See §13.)

---

## 6. Workflow Improvements

**WF1 — Collapse the four-step "workspace workflow" into the tools themselves, and make progress ambient.** The Workspace sidebar (Overview / Import / Data / Filing / DCF / Ratios / Thesis) re-implements navigation that the top nav already provides, and its panels mostly link back out. Replace the "click a step to read about a tool" model with: a **persistent progress rail** (Import → Review → Analyze → Conclude, which already exists as `ws-progress`) + **direct entry into live tools**, not descriptions. *Priority:* Medium.

**WF2 — Make the review gate the strongest moment in the product.** Import → review/accept is the trust-defining step, but review currently lives partly in `/import` and partly in Workspace's `DataPanel` (which just lists 30 facts). Consolidate into one review surface: extracted rows, confidence, provenance, unit detection, and an explicit "Accept / flag" per suspicious row (the handoff already flags OCR row-count mismatches as future work). *Priority:* Medium-high. This is where Fundalyst out-trusts Godel; invest here.

**WF3 — "Analyze this filing" should fan out like Godel's ticker pivot.** After acceptance, offer a one-action "open the standard analyst set" that lays out (in the multi-panel workspace) the source statement + filing diff + ratios + DCF for the accepted company — the Fundalyst equivalent of typing `DES → FA → N → CF`. *Priority:* Medium (depends on §11).

**WF4 — Thesis/memo as the closing ritual, pulling from live state.** The memo export already aggregates DCF + ratios + thesis (`memo-export.ts`, `handleExportMemo`). Tighten the loop: from any tool, "Add to memo" pins the current result (with its trace) so the memo assembles itself from evidence the analyst actually looked at, rather than re-deriving. *Priority:* Medium.

**WF5 — Reduce clicks from home to first number.** Today: home → Import → (review) → tool. Add: command bar `dcf` from anywhere loads DCF with the active dataset; `import` from anywhere opens the picker. Target: **any tool reachable in one keystroke + a few characters** from any screen. *Priority:* High (falls out of U1).

---

## 7. Information Architecture Recommendations

**IA1 — Reframe the top-level model from "pages" to "one workspace + lenses on the active company."** Today IA is: marketing home, a cockpit that duplicates tools, and tool pages. Target IA:
- **Home** = first-visit narrative *and* returning-analyst launchpad (command bar + resume).
- **Workspace** = the actual working canvas (multi-panel), not a table of contents.
- **Tools** = lenses that can run either as full routes (deep focus, keeps SEO/deep-linkability) *or* as panels inside the workspace (comparative work). Same component, two mounts.
*Priority:* Major (this is the §11 architecture).

**IA2 — Group by analyst intent, not by internal category.** Current nav groups: Research / Valuation / Data. These are fine, but the mental model an analyst uses is *"understand the business → check the health → value it → compare it → conclude."* Consider ordering lenses along that arc (Filing/Trends/Growth → Ratios/Cash → DCF → Peers → Thesis/Memo) consistently across nav, command bar, and workspace so one order is learned once. *Priority:* Quick win (reorder + relabel).

**IA3 — Promote "the active company" to a persistent, global object.** The dataset badge in the nav is the seed. Make it a **company switcher** (click → list of datasets, fuzzy switch, "add another") that is present everywhere, so the analyst always knows and can change what they're looking at. This is Godel's ticker context made explicit. *Priority:* Medium.

**IA4 — Kill dead ends.** `/debug-import` is a live route but (verified) is *not* linked from nav or palette — keep it that way (dev-only) and ensure no future surface exposes it. Confirm `/about` is the docs home and link `HELP`/`?` to it. Remove unreferenced dead CSS noted in `DESIGN.md §9`. *Priority:* Quick win.

**IA5 — One canonical "Data / Evidence" home.** Right now imported data is viewable in `/import` review and Workspace `DataPanel` (30-row slice). Make a single Evidence lens (full, sortable, provenance-annotated, the source of truth for what's loaded) and link everything to it. *Priority:* Medium.

---

## 8. AI Workflow Recommendations

Fundalyst has no AI today (W7) but owns the ideal substrate: structured, provenance-tagged facts + a calculation trace. The strategic principle: **AI in Fundalyst must be grounded and citeable, never a floating chatbot.** Every AI statement should point back to a source fact or an assumption — same standard as the rest of the product. This is the Perplexity/AlphaSense lesson (answers with citations) fused with Fundalyst's provenance.

**AI1 — "Explain this" on every result.** [MEDIUM] A button on `HeroDecision`/`InsightCard`/trace that produces a plain-English explanation of *this* calculation using *these* source facts, with inline citations to the trace rows. *Value:* turns the trace from a table into a narrative; huge for newcomers, fast sanity-check for pros. *Trade-offs:* needs a model endpoint (this app is client-only today — either a bring-your-own-key client call or a thin serverless function; keep the privacy promise front-and-center and make it opt-in). *Complexity:* Medium. *Priority:* Medium, high-strategic.

**AI2 — "Draft the thesis from the evidence."** [MEDIUM] Assemble a first-draft investment thesis from accepted facts + DCF verdict + ratios + filing diffs, every claim cited to a number. Replaces the blank `ThesisPanel` textarea with a grounded starting point the analyst edits. *Priority:* Medium.

**AI3 — Natural-language command → tool action.** [MEDIUM] Let the command bar accept prose ("value this at 12% WACC") that resolves to a tool + pre-filled assumptions, with the parsed interpretation shown for confirmation (never silent). Bridges beginner intent to the mnemonic layer. *Priority:* Medium (after U1).

**AI4 — Import assist / anomaly explanation.** [MEDIUM] At the review gate, AI flags suspicious extractions ("this row's values don't sum to the subtotal," "units look like ₹ Lakh not Cr") in language, complementing the existing confidence score. Directly supports WF2. *Priority:* Medium.

**AI-guardrails (apply to all):** opt-in and clearly labeled; never mutate accepted data without confirmation; always cite; degrade gracefully with no key/offline; never send data anywhere the privacy copy doesn't disclose. **Reject:** an ungrounded general chatbot, AI that silently changes numbers, or auto-generated "insights" with no citation — all three would poison the trust position.

---

## 9. Navigation Recommendations

**N1 — Add a persistent command entry point in the nav, not just Cmd/Ctrl+K.** The current `nav-cmdk-trigger` says "Search"; relabel/reshape it as the command bar affordance and show the shortcut hint. *Priority:* Quick win.

**N2 — Make the dataset badge a company switcher (IA3).** *Priority:* Medium.

**N3 — Reorder tools along the analyst arc (IA2) and use one order everywhere.** *Priority:* Quick win.

**N4 — Make the existing lateral links entity-aware.** `NextLinks` is already present on every tool/research page (verified) — e.g. DCF's "Compare peers," "Review filings." *Problem:* the links navigate but don't explicitly carry/confirm the active company, and the targets are static. *Fix:* make each link entity-aware (open the target for the currently-active dataset) and, post-§11, have it open a panel rather than navigate. *Priority:* Quick win.

**N5 — Keep deep-linkable routes.** Do **not** throw away URL routes when adding the workspace canvas — deep links, browser back, and shareable tool URLs are real advantages Godel (single-canvas app) gives up. Fundalyst should keep both. *Priority:* Principle.

---

## 10. Search & Command System Recommendations

This is the section to hand your implementer verbatim for the #1 initiative.

**The model to build (adapted from Godel's command bar + Raycast's UX):**

A single input that accepts three kinds of entry, disambiguated as the user types:
1. **Verb** — a tool/action mnemonic. `dcf`, `rat` (ratios), `fil` (filing), `trd` (trends), `grw` (growth), `peer`, `cash`/`wc`, `imp` (import), `memo`, `thesis`, `evidence`/`data`, `theme`, `clear`, `help`.
2. **Verb + entity** — `dcf reliance`, `ratios tcs` → switch active dataset to the matched company *and* open the lens.
3. **Free text** — falls back to today's fuzzy nav + company search (unchanged), so nothing regresses.

**Behavioral spec:**
- Summon from anywhere with a dedicated key (§12) and with Cmd/Ctrl+K (keep both).
- Show grouped results (**Do** [verbs] / **Companies** / **Go to** [routes] / **Actions**), verbs first when the query matches a verb prefix.
- Terse aliases *and* full labels both match (dual-track for pros + newcomers, per L5). Display the full label, show the alias as a hint chip.
- **Inline affordances:** an action like `memo` shows a one-line confirm ("Export memo for <company>?") rather than firing blind; `dcf` shows the current margin-of-safety if a result exists.
- **Arguments preview:** when a verb takes an entity, show the resolved target ("→ open DCF for Reliance Industries") before Enter. Never execute an ambiguous command silently.
- **Recents & suggestions:** empty state shows recent commands + the contextually-likely next step (mirrors Workspace's `ws-next-step` logic, which already computes the next workflow action).

**Implementation anchor:** extend `src/components/layout/CommandPalette.tsx`. Its `Command` registry, fuzzy scorer, section grouping, and keyboard handling are already the right bones. Add a `verb`/`args` concept and an argument-resolution step; route verbs either to `router.push` (v1) or to "open panel" (v3, after §11).

**Priority:** v1 **[QUICK WIN]**, v2 **[MEDIUM]**, v3 **[MAJOR]**.

**Reject:** a separate second search UI. One command surface, one grammar, learned once.

---

## 11. Workspace & Layout Recommendations

**The core structural recommendation of this entire audit.**

**Problem:** W1/W3 — full-page routing prevents comparative work, and the current Workspace is a table of contents, not a canvas.

**What to build — a tiling panel workspace (Godel/Bloomberg lesson L2), adapted to Fundalyst's reality:**
- The `/workspace` route becomes a **canvas that hosts panels**, each panel mounting an existing tool as a module. Because tools are already self-contained components driven by a shared Zustand store, they can be mounted in a panel *or* a full route with little change — the store is the single source of truth, so two mounts of "DCF" stay in sync automatically. This is the key architectural gift the current design gives you: **shared-store tools are already "modules" in all but framing.**
- **Layout primitives:** start simple — a 1/2/3-pane split (not free-floating windows). Free-floating drag-resize (true Godel) is more delight but much more work and rarely needed on the fundamental-analysis workflow; defer it to Vision. A 2×2 / split-grid covers 90% of "see DCF + statement + ratios + diff together."
- **Saved layouts / presets:** ship 2–3 presets ("Valuation view" = statement + DCF + sensitivity; "Health view" = ratios + cash + trends; "Diff view" = filing diff + statement). Let the user save one custom layout to `localStorage` (there is already a workspace export/restore mechanism to extend).
- **Panels are entity-aware:** all panels reflect the globally-active company (IA3); switching the company updates every panel at once — the Godel ticker-pivot, but for fundamentals.
- **Command bar opens panels** (§10 v3): `dcf` adds/focuses a DCF panel instead of navigating.

**Value:** eliminates the single biggest thing that makes Fundalyst feel like a website instead of an instrument. Enables genuine comparative analysis (the actual job). **Impact:** Very high. **Trade-offs:** real engineering (layout state, panel lifecycle, focus management, responsive collapse to stacked on mobile). Must preserve deep-linkable routes (N5). **Complexity:** Major. **Priority:** **[MAJOR]** — the flagship project.

**Sequencing that de-risks it:** (1) refactor each tool page so its body is a `<ToolModule>` cleanly separable from route chrome; (2) build a 2-pane split host; (3) wire the command bar to open panels; (4) add presets + one saved layout; (5) later, free-floating windows **[VISION]**.

---

## 12. Keyboard Shortcut Opportunities

Godel is fully keyboard-operable (L6). Fundalyst has Cmd/Ctrl+K + palette arrows only (W6). Add a coherent, discoverable set:

- **Command bar:** a dedicated summon key in the Godel spirit. `` ` `` (backtick) is the literal Godel key and is ergonomic; keep Cmd/Ctrl+K as the cross-app-standard alias. (Guard against firing inside text inputs / the spreadsheet editor.)
- **Go-to (`g` then key)** — `g d` DCF, `g r` ratios, `g f` filing, `g t` trends, `g p` peers, `g w` workspace, `g i` import. (Linear's proven pattern.)
- **Actions:** `e` export memo, `/` focus command bar, `?` open shortcut cheat-sheet overlay, `Esc` close panel/overlay/clear.
- **Tables:** arrow keys move the active cell/row, `Enter` drills in (to a trace or source row), sort with a key on the focused column. (See §13.)
- **Panels (after §11):** number keys focus panel N; a key to cycle; a key to close the focused panel.
- **Shortcut discoverability:** a `?` overlay listing all shortcuts (Superhuman/Linear pattern). Also surface the relevant shortcut as a hint chip on the corresponding button (the nav already shows an `esc` chip in the palette — extend that habit).

*Trade-offs:* must not hijack keys inside `ToolSpreadsheet`/textareas. *Complexity:* Low–Medium. *Priority:* **[QUICK WIN]** for summon key + go-to + `?` overlay; **[MEDIUM]** for table/panel navigation.

---

## 13. Data Presentation Improvements

Fundalyst's tables are static and capped (W9); a terminal audience expects dense, active tables.

**D1 — Activate tables.** Sortable columns, sticky headers, no arbitrary `slice(0,30)` (virtualize instead), keyboard row navigation, and right-aligned tabular-nums for all numeric columns (the mono/tabular tokens already exist in `DESIGN.md`). Apply to `diff-table`, `DataPanel`, sensitivity, projected-cash-flow, and peer tables. *Priority:* Medium.

**D2 — Make every numeric cell a pivot point (cross-linking, W5).** Click a metric → open its trend; click a peer row → load that entity; click a trace source → jump to the statement row (U3). This is the highest-value presentation change because it converts static output into navigation. *Priority:* Medium-high.

**D3 — Inline provenance on the number, not just in a legend.** The homepage statement preview already shows a per-row provenance dot (`stmt-prov`). Bring that into real tool tables so the source marker sits on the value, consistent with L4 and Fundalyst's own soul. *Priority:* Quick win.

**D4 — Consistent number formatting & units.** One formatter (`src/lib/format.ts` exists) applied everywhere; always show the unit/currency context (₹ Cr / Lakh) at the table or column level so a value is never ambiguous. This matters doubly for a product whose promise is "numbers you can defend." *Priority:* Quick win.

**D5 — Micro-visualization in tables.** Sparklines for multi-period rows, tiny bars for YoY, a heat scale for the sensitivity grid (it already color-codes up/down — extend to a proper gradient scale within the restrained palette). *Priority:* Medium.

**D6 — Density mode.** A comfortable/compact toggle. Pros want more rows per screen (Godel/Bloomberg density); newcomers want breathing room. Defaults to comfortable. *Priority:* Low-Medium.

---

## 14. Cognitive Load Audit

Where the product makes the user think more than necessary, and the fix.

- **CL1 — The Workspace duplicates the nav's tools and re-explains them (W3).** The user must reconcile "the Workspace step called DCF" with "the DCF nav item" — same thing, two doors, described differently. *Fix:* Workspace hosts the live tool; stop re-describing. (§6, §11.)
- **CL2 — Enterprise-simulation panels (W4).** Governance/Audit/Integrations force the user to parse "is this real?" — and the answer is "no, it's simulated." Pure load, zero payoff. *Fix:* remove (§18).
- **CL3 — Two review surfaces.** Extracted data lives in `/import` and in Workspace `DataPanel`. *Fix:* one Evidence lens (IA5, WF2).
- **CL4 — Opaque-vs-legible tension in labels.** Newcomers need legible labels; pros want terse. *Fix:* dual-track command aliases (L5, §10) and legible on-screen labels — don't force Godel's opacity on a broader audience.
- **CL5 — Copy drift ("9 ratios" vs "5 ratios from 6 numbers").** In a numbers product, inconsistent counts undermine trust. *Fix:* single source of truth for tool metadata (title, count, "answers" line) reused by home cards, Workspace, and the tool header. *Priority:* Quick win.
- **CL6 — Marketing sections between a returning user and their work (W8).** *Fix:* returning-user launchpad (U5).
- **CL7 — Ambiguous units.** Any unlabeled number is a thinking tax. *Fix:* D4.

**Guiding rule:** one focal element per screen (already in `DESIGN.md`) — extend it from styling to *information*: each surface should answer one question. The Workspace currently tries to answer six.

---

## 15. Professional Workflow Audit

How a real analyst's day maps onto Fundalyst, and where it breaks.

- **Land a new name → understand the business.** In Godel: `DES`. In Fundalyst: import the filing → review. *Strong,* but the pivot to "now show me everything about this company at once" is missing (needs §11 + WF3).
- **Assess health.** Ratios + cash efficiency + trends. *Present,* but siloed — can't view them together, and can't click a weak ratio to see its trend (D2).
- **Value it.** DCF is the strongest surface. *Good.* Add scenario management (bull/base/bear) — currently "DCF scenario manager remains future work" per handoff. Pros think in scenarios, not a single point estimate.
- **Compare.** Peer comparison exists but doesn't need imported data (it's the one `needsData:false` tool) and isn't wired to pivot into a peer's own dataset. *Weak entity model* (W10, D2).
- **Conclude.** Thesis + memo. *Present,* but the thesis starts blank; memo assembles from state. *Improve* with AI2 + WF4 (evidence-pinning).
- **Return next day.** No fast resume, no saved layout, no "companies I'm tracking." *Weak* (W8, W10, §11 presets).

**Biggest professional-credibility wins:** (1) scenario manager on DCF; (2) side-by-side multi-panel; (3) clickable provenance/verification; (4) a managed multi-company set. Each is a "this is a serious tool" signal.

---

## 16. Recommended New Features

Each: *why it earns its place.* Priority in brackets.

- **F1 — Command language** (§10). [MAJOR/QUICK-WIN hybrid] The identity change.
- **F2 — Multi-panel workspace** (§11). [MAJOR] The structural change.
- **F3 — DCF scenario manager (bull/base/bear).** [MEDIUM] Pros value in ranges; today's single point estimate under-serves them. Store three assumption sets, show the three intrinsic values + current price on one axis. Reuses `computeDCF`/sensitivity engine.
- **F4 — "Evidence & Assumptions" cockpit panel** (replaces enterprise theater, U4). [MEDIUM] One board: every assumption currently in play, its provenance, its value, and every tool it feeds. This *is* the audit trail an analyst wants — and it's honest (no simulated RBAC), matching the product's soul.
- **F5 — Grounded AI "Explain / Draft thesis"** (§8). [MEDIUM] Leverages the provenance substrate; citeable by construction.
- **F6 — Managed multi-company set ("Coverage").** [MEDIUM] Surface `datasets[]` as a switchable, side-by-side-able list — the fundamentals analog of Godel's `QM` watchlist. Enables "compare Reliance vs TCS ratios" without re-import.
- **F7 — Clickable cross-links / entity pivot** (D2, U3). [MEDIUM] Turns output into navigation.
- **F8 — Keyboard system + `?` cheat sheet** (§12). [QUICK WIN]
- **F9 — Excel export with live formulas.** [MEDIUM] Handoff notes memo export is Markdown-only and "Excel-native memo export with live formulas is not built." Godel's FA exports to Excel; analysts live in Excel. A model export with intact formulas (not just values) is a concrete, high-demand feature that fits the `xlsx` dependency already present.
- **F10 — Saved workspace layouts / presets** (§11). [MEDIUM]

**Deliberately NOT recommended as "new features"** (they'd chase Godel into terrain Fundalyst can't win): real-time quotes, options chains/Greeks, time & sales, news wires, universe-wide screeners, institutional holders. See §17.

---

## 17. Features to Avoid

Fashionable or Godel-native, but wrong for Fundalyst.

- **A17.1 — Real-time market data / quotes / tape (`QM`, `TAS`, `FOCUS`, `MOST`).** [REJECT] Requires paid data feeds + a backend; contradicts the "no server, local, private" positioning; targets active traders, not fundamental analysts. This is Godel's audience, not Fundalyst's.
- **A17.2 — Options chains & Greeks (`OPT`, `OVME`).** [REJECT] Same reason; entirely different user.
- **A17.3 — News wires (`N`, `TOP`).** [REJECT] Needs licensed real-time feeds and a server; off-mission.
- **A17.4 — Universe-wide equity screener (`t`).** [REJECT for now] Fundalyst has no universe — it has the companies you imported. A screener over 1–20 local datasets is not a screener. (A *filter across your own coverage set* is fine — that's F6, not a market screener.)
- **A17.5 — Free-floating draggable windows as a v1.** [DEFER → VISION] High build cost, marginal benefit over a split-grid for this workflow. Ship splits first.
- **A17.6 — Cryptic Godel-style opacity everywhere (`HDS`, `GIP`, `EM`).** [REJECT as default] Offer terse aliases for pros, but keep legible primary labels; Fundalyst's audience is broader than Godel's institutional base.
- **A17.7 — Social/gimmick modules (Godel's `CHAT`, `WJI` Wojak Index, `NEJM`).** [REJECT] Off-brand for a "quiet instrument."
- **A17.8 — An ungrounded AI chatbot.** [REJECT] Violates the provenance ethic (§8 guardrails).
- **A17.9 — Brokerage connect / trade execution (`BROK`).** [REJECT] Out of scope, adds compliance/security surface, contradicts the local-only model.

---

## 18. Features to Remove or Simplify

- **R18.1 — Remove the enterprise-simulation trio: Governance, Audit Trail, Integrations.** [MEDIUM] (`GovernancePanel`, `AuditPanel`, `IntegrationsPanel` in `src/app/workspace/page.tsx`; `src/store/enterprise-store.ts`; `IconNav*`/roles/members plumbing.) They self-describe as "LOCAL SIMULATION … NOT enforced." *Problem:* cognitive load (CL2), screen weight, and a credibility hazard. *What to keep:* the *real* backup/restore (export/import workspace JSON) is genuinely useful — keep it, relabel as "Backup." Fold any honest version-snapshot value into F4's Evidence cockpit. *Trade-offs:* if a future enterprise pivot is planned, keep the store code but stop shipping the simulated UI. *Priority:* Medium.
- **R18.2 — Collapse the duplicative Workspace tool panels** (FilingPanel/DCFPanel/RatiosPanel that only describe + link out). [QUICK WIN] Replace with live modules (§11) or, pre-§11, with direct deep-links + the current result summary (not a re-description).
- **R18.3 — Consolidate the two data-review surfaces into one Evidence lens** (CL3/IA5). [MEDIUM]
- **R18.4 — Remove `/debug-import` from any shipped nav/palette surface** (keep as dev-only). [QUICK WIN]
- **R18.5 — Prune dead CSS / inline-style sprawl** already catalogued in `DESIGN.md §9` (`.home-card*`, `.home-grid`; inline styles in `import/page.tsx`, `components/ui/index.tsx`, `workspace/page.tsx`; raw canvas hex in `PdfViewer.tsx`). [QUICK WIN] Reduces drift and enforces the token system.
- **R18.6 — Simplify the homepage for returning users** (U5/CL6): keep the first-visit narrative, but gate a compact launchpad above it when a dataset already exists. [QUICK WIN]
- **R18.7 — Reconcile tool metadata drift** (CL5: "9 ratios" vs "5 ratios"). [QUICK WIN]

---

## 19. Prioritized Roadmap

Sequenced for maximum impact-per-unit-effort, with dependencies noted.

### Quick Wins (days, high impact)
1. **Command language v1** — verbs + args in the existing palette (`dcf`, `ratios reliance`, `import`, `memo`, `open <company>`). Highest impact per hour in the whole doc. (§10)
2. **Keyboard: summon key (`` ` `` + keep Cmd/Ctrl+K), `g`-then-key go-to, `?` cheat-sheet overlay.** (§12)
3. **Returning-user launchpad on home** (command bar + "Continue: <company>"). (U5)
4. **Single source of truth for tool metadata** (title / count / `answer` line), reused by home cards, Workspace, and tool headers; fix the "9 ratios" (home) vs "5 ratios from 6 numbers" (ratios page + Workspace) drift. (CL5, U2)
5. **Inline provenance dot on numeric cells** in tool tables. (D3)
6. **Reorder tools along the analyst arc** everywhere; standardize entity-aware `NextLinks`. (IA2, N3/N4)
7. **Remove `/debug-import` from shipped nav; prune dead CSS/inline styles.** (R18.4/R18.5)
8. **Collapse duplicative Workspace description-panels into deep-links + live result summaries.** (R18.2)

### Medium Projects (weeks, substantial improvement)
9. **Clickable cross-linking / entity pivoting** — metric→trend, peer→load, trace→source row. (D2, U3, F7)
10. **Consolidated Evidence & Assumptions cockpit** replacing the enterprise-simulation trio. (F4, R18.1, R18.3, IA5, WF2)
11. **Activate tables** — sort/sticky/virtualize/keyboard, density toggle. (D1, D6)
12. **Company switcher + "Coverage" managed multi-company set.** (IA3, F6)
13. **DCF scenario manager (bull/base/bear).** (F3)
14. **Grounded AI: "Explain this" + "Draft thesis from evidence."** (AI1/AI2 — requires an opt-in model endpoint; preserve privacy promise)
15. **Excel export with live formulas.** (F9)
16. **Command language v2** — persistent bar + inline results + prose→action (AI3).

### Major Platform Improvements (the flagship)
17. **Multi-panel tiling workspace** (split-grid host, tools-as-modules, entity-aware panels, presets + one saved layout). Refactor tool bodies into `<ToolModule>` first. (§11, F2, F10)
18. **Command language v3** — commands open/focus panels instead of navigating. (§10)
19. **Make the review gate the best moment in the product** (single review surface, per-row accept/flag, AI anomaly assist AI4). (WF2)

### Future Vision (direction, not now)
20. **Free-floating, drag-resize windows** and multi-monitor-style layouts (true Godel canvas). (A17.5 deferred)
21. **Collaboration / shareable read-only workspace snapshots** — *only* if paired with a real backend; never as localStorage "simulation."
22. **Optional data-provider integration** (real fundamentals API) behind an explicit, disclosed boundary — the one honest path toward Godel-like live data without betraying the current promise.
23. **Fundamentals "coverage screener"** — filter/rank across the analyst's own imported set once F6 makes multi-company real.

---

## Appendix A — Godel → Fundalyst transfer map (at a glance)

| Godel pattern | Principle | Transfer to Fundalyst | Verdict |
|---|---|---|---|
| Backtick command bar, `CMD TICKER` | Keyboard-first command language | Command language over verbs + active dataset | **Adopt (evolve)** — §10 |
| Up to 6 resizable panels | Comparative, non-linear research | Split-grid workspace, tools-as-modules | **Adopt** — §11 |
| Ticker pivot (`DES→FA→N→CF`) | Entity-centered lenses | Company-centered lenses, entity-aware panels | **Adopt (adapt)** — WF3/IA3 |
| Financials tied to filings | Source attached to number | Already exceeded via calculation trace | **Already ahead** — extend clickability |
| Terse mnemonics (`QM`,`HDS`) | Optimize the expert path | Dual-track aliases + legible labels | **Adopt partially** — L5 |
| `HELP`, honest limits | Trust via transparency | `?` overlay; keep honest scope | **Adopt** — §12 |
| `QM` watchlist | Persistent monitoring surface | "Coverage" multi-company set (no live prices) | **Adopt (adapt)** — F6 |
| Real-time quotes/options/news/tape | Live trading data | Requires backend/feeds; off-mission | **Reject** — §17 |
| Universe screener `t` | Scan the market | No universe; only your imports | **Reject as-is** — §17 |
| `CHAT`, `WJI`, `NEJM` | Community/gimmick | Off-brand for a quiet instrument | **Reject** — §17 |

## Appendix B — Key files for the implementer

| Concern | File(s) |
|---|---|
| Command bar (extend for §10) | `src/components/layout/CommandPalette.tsx` |
| Global nav / dataset badge / shortcuts host | `src/components/layout/Nav.tsx` |
| Workspace canvas (rebuild for §11) | `src/app/workspace/page.tsx` |
| Enterprise-sim to remove (§18) | `GovernancePanel`/`AuditPanel`/`IntegrationsPanel` in `workspace/page.tsx`; `src/store/enterprise-store.ts` |
| Tool module reference pattern | `src/app/tools/dcf/page.tsx` + `src/components/ui/index.tsx` |
| Provenance / trace (differentiator to extend) | `src/components/shared/ProvenanceBadge.tsx`, `src/components/shared/CalculationTrace.tsx`, `src/lib/calculation-trace.ts` |
| Shared dataset / model pre-fill (why tools = modules) | `src/store/global-data-store.ts`, `src/store/financial-model-selectors.ts`, `src/store/use-model-data.ts` |
| Formatting / units (D4) | `src/lib/format.ts` |
| Memo / Excel export (F9, WF4) | `src/lib/memo-export.ts` |
| Design constitution (obey + update) | `DESIGN.md` |

---

*Prepared as a hand-off spec. Recommendations are prioritized by leverage; §19 is the build order. The three moves that matter most, in order: command language (§10), multi-panel workspace (§11), clickable provenance/entity pivoting (D2/U3). Everything else compounds these.*

