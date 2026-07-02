# Fundalyst Product Design Audit: Godel Terminal Lessons

Date: 2026-07-02

Scope note: this audit uses Godel Terminal's public site, public documentation, and unauthenticated app shell. Logged-in workflows were not available, so deeper workspace behavior is inferred from observable UI, official copy, and docs. Sources: [Godel homepage](https://godelterminal.com/), [financial terminal page](https://godelterminal.com/financial-terminal/), [docs](https://godelterminal.com/docs), [public app/login shell](https://app.godelterminal.com/?page=login), [pricing](https://godelterminal.com/pricing/).

## 1. Executive Summary

Fundalyst should not copy Godel's Bloomberg-style terminal. Godel is optimized for live market operators who need quote, news, filings, financials, options, and watchlists in one command-driven workspace. Fundalyst is better positioned as a defensible financial research and modeling workspace that turns source documents into traceable analysis.

The biggest lesson from Godel is not "add more windows." It is "make every task instantly addressable, composable, and context-preserving." Fundalyst currently has strong provenance, local import, spreadsheet-like tools, and calm visual language, but its workflow is still page-based and tool-fragmented. The next product leap is a persistent company/workspace cockpit with command-first navigation, source-linked panels, and side-by-side research surfaces.

Highest-leverage direction: make Fundalyst feel less like a collection of calculators and more like an analyst operating system for one company at a time.

## 2. Key Lessons Learned From Godel Terminal

- Commandability matters. Godel's docs expose global shortcuts for focusing the terminal, cycling windows, moving/resizing windows, snapping to screen edges, changing terminal scale, and undoing window close. This turns navigation into muscle memory.
- The workspace is the product. Godel markets one workspace covering quotes, filings, financials, news, and options, rather than isolated feature pages.
- Density is earned by structure. Godel can show quote monitor, chart, news, info, watchlists, focus shortcuts, and options in the unauthenticated shell because every object is panelized.
- Context switching is treated as the enemy. Public copy repeatedly stresses SEC filings rendered in-product, standardized financials tied to filings, and ticker-filtered news without tab switching.
- Landing page clarity is strong: specific command names such as DES, QM, CF, FA, N, WEI, EM/ANR explain the workflow rather than vague marketing claims.

## 3. What Fundalyst Already Does Well

- Clear philosophical center: provenance, quiet visual hierarchy, local/private processing, and defensible numbers.
- Import pipeline supports CSV, XLSX, PDF, screenshot/OCR, Indian-market units, aliases, confidence, and review gates.
- Tool pages already lead with decisions: DCF margin of safety, filing changes, risk flags, sensitivity tables, and calculation trace panels.
- Command palette exists and covers navigation, company switching, memo export, theme, and clearing data.
- Workspace page already contains the seed of a research cockpit: workflow steps, governance simulation, audit trail, integrations, thesis, and backup.

## 4. Weaknesses In The Current Product

- Tool fragmentation: the user moves between pages instead of arranging research around a company, source, and decision.
- Search is too shallow: it jumps to pages/actions, but does not search metrics, filings, assumptions, rows, saved notes, or calculations.
- Workspace is a checklist hub, not yet a working surface. It links out to tools instead of letting users compare filing, model, thesis, and source side by side.
- AI is not a first-class workflow. There is no analyst assistant that can explain deltas, find source rows, draft thesis bullets, or challenge assumptions.
- Navigation uses product taxonomy ("Research", "Valuation", "Data") more than analyst intent ("Import source", "Review facts", "Build view", "Write memo").
- Screeners, watchlists, transcripts, live quotes, and news are either absent or outside the current local-first scope.

## 5. High-Impact UX Improvements

1. Persistent company cockpit: convert Workspace into the default post-import surface with panels for Source, Facts, Analysis, Model, Thesis, and Memo. Priority: High. Impact: Very high. Complexity: Medium.
2. Universal command/search bar: extend Cmd/Ctrl+K into "go, ask, find, act" across pages, companies, metrics, calculations, source documents, and exports. Priority: High. Impact: High. Complexity: Medium.
3. Source-linked split view: every analysis result should open its source row/document excerpt beside it. Priority: High. Impact: High. Complexity: Medium.
4. Tool readiness map: show what each tool can/cannot do with the current dataset and what missing metric unlocks it. Priority: High. Impact: High. Complexity: Low/Medium.
5. Replace "Load sample" duplication with a global demo dataset mode. Priority: Medium. Impact: Medium. Complexity: Low.

## 6. Workflow Improvements

- Current: Import -> confirm mapping -> choose a tool -> run analysis -> export memo.
- Recommended: Select company/workspace -> ingest source -> review facts -> open task panels -> ask/check/challenge -> finalize thesis -> export memo.
- Add workflow states: Source Uploaded, Facts Reviewed, Assumptions Accepted, Analysis Complete, Thesis Drafted, Memo Exported.
- Make "next best action" contextual: if DCF lacks shares, link directly to the missing cell/source/import correction instead of a generic empty state.

## 7. Information Architecture Recommendations

- Top-level IA should be: Workspace, Search, Import, Analysis, Memo. Analysis can contain Filing, Trends, Ratios, DCF, Cash, Peers.
- Treat company/dataset as the primary object. All tools should feel like views of the same object, not separate apps.
- Move governance/audit/integrations under a workspace settings area so they do not compete with the analyst workflow.
- Add a persistent left rail or panel switcher in Workspace for Source, Facts, Tools, Thesis, Memo, History.

## 8. AI Workflow Recommendations

- Add an "Analyst Copilot" side panel with strict source-grounded behavior: summarize filing changes, explain calculation traces, identify missing metrics, draft memo sections, and challenge assumptions.
- Do not make AI a generic chat toy. It should operate on selected company, selected source, selected metric, or selected model cell.
- Recommended commands: "explain this change", "find source", "stress test assumptions", "draft memo", "what is missing?", "compare to peers".
- Show citations/provenance for every AI claim. If it cannot cite a source row or user assumption, label it as inference.

## 9. Navigation Recommendations

- Keep the current restrained nav, but make Workspace the default analytical surface after import.
- Add a global company/dataset switcher next to search.
- Rename "Upload Reports" to "Import Source" or "Add Source" for professional language.
- Add recent workspaces and recent commands to the command palette.
- Add breadcrumbs only where they reduce uncertainty, not on every page.

## 10. Search And Command System Recommendations

- Evolve Cmd/Ctrl+K into a terminal-like command system without copying Bloomberg syntax.
- Support queries such as "revenue", "dcf", "export memo", "show missing metrics", "find FY24 EBITDA", "open source", "compare periods", "switch Reliance".
- Add scoped search results: Companies, Source Documents, Metrics, Assumptions, Analysis Views, Actions.
- Add keyboard hints directly in the palette, not as static documentation.
- Rejected: command codes like DES/FA/CF as the primary beginner interface. They fit Godel's audience, but Fundalyst should use natural language plus optional aliases.

## 11. Workspace And Layout Recommendations

- Add a panel layout inside Workspace before adding freeform windows. Freeform window management is powerful but expensive and can overwhelm beginners.
- Suggested layout: left rail for workflow, center panel for active tool/source, right panel for Copilot/Trace/Notes.
- Add saved "views": Review Extraction, DCF Build, Filing Review, Memo Draft.
- Future: resizable/splittable panels and saved layouts. Adopt Godel's snap/grid idea only after core panels are mature.

## 12. Keyboard Shortcut Opportunities

- Cmd/Ctrl+K: command/search.
- G then W/I/D/F/M: Workspace, Import, DCF, Filing, Memo.
- Cmd/Ctrl+Enter: run current analysis.
- Cmd/Ctrl+Shift+E: export memo.
- Esc: close panel/dialog.
- Alt/Option+Left/Right: switch panels.
- Shift+?: shortcut help.
- Add discoverable shortcut hints in buttons/tooltips and the command palette.

## 13. Data Presentation Improvements

- Standardize all tables around sticky metric columns, clear unit/currency labels, confidence/provenance, and compact row actions.
- Add row-level context menus: find source, edit mapping, ignore metric, add to DCF, add to memo, explain change.
- Add hover affordances sparingly: source badge hover should reveal source file, period, confidence, and mapping reason.
- Add "data quality" as a persistent compact strip, not just per page.
- For financials, move toward standardized statement views by issuer and period, similar in spirit to Godel's standardized financials tied to filings.

## 14. Cognitive Load Audit

- Import page has too much explanatory copy and repeated reassurance. Keep the review gate, but reduce step cards once users understand the flow.
- Workspace has many concepts at once: workflow, backup, governance, audit, integrations, thesis, tools. Separate analyst work from admin/simulation.
- Empty states should be task-specific and action-oriented. Avoid restating what the page does when the next action can be inferred.
- Tool pages are stronger after results than before results. Improve pre-result states with readiness, missing metrics, and recommended next action.

## 15. Professional Workflow Audit

- Fundalyst is strongest for bottom-up document-driven research.
- It is not yet a real-time terminal, and should not pretend to be one.
- Missing professional capabilities: watchlists, saved company workspaces, collaboration/review, source document library, version history that feels real, transcript/filing search, robust export formats, and peer/screener workflows.
- The biggest professional gap is continuity: analysts need to come back tomorrow and see exactly where the research stands.

## 16. Recommended New Features

- Company Workspace: saved object containing sources, accepted facts, assumptions, outputs, thesis, and exports. Priority: High. Complexity: Medium.
- Source Library: all imported filings/screenshots/files with extracted tables and status. Priority: High. Complexity: Medium.
- Metric Search: search across canonical facts, periods, source labels, and assumptions. Priority: High. Complexity: Medium.
- Analyst Copilot: source-grounded assistant tied to selected object. Priority: Medium/High. Complexity: High.
- Watchlist Lite: saved companies/workspaces and research status, not real-time quote monitor initially. Priority: Medium. Complexity: Medium.
- Filing/Transcript Search: useful long-term, especially if Fundalyst adds external data ingestion. Priority: Medium. Complexity: High.
- Saved Layouts: useful after Workspace panelization. Priority: Low/Medium. Complexity: High.

## 17. Features To Avoid

- Do not copy Godel's ticker-code command vocabulary as the main UX.
- Do not add freeform floating windows before the product has stable panels and saved views.
- Do not add real-time news/options unless Fundalyst's strategy shifts toward active markets and data licensing.
- Do not make AI generate uncited investment opinions.
- Do not overbuild Bloomberg-like density for beginners; Fundalyst's advantage is clarity plus defensibility.

## 18. Features To Remove Or Simplify

- Simplify duplicated sample-loading CTAs across tool pages.
- Move local governance simulation out of the main analyst workflow until it has production backing.
- Reduce instructional marketing copy inside tool surfaces after first use.
- Consolidate backup/import workspace controls into Settings.
- Replace static tool cards with contextual readiness/action cards.

## 19. Prioritized Roadmap

### Quick Wins

- Add command palette results for metrics, datasets, recent pages, and missing-metric actions.
- Add shortcut help and button/tooltips for existing keyboard flows.
- Add tool readiness cards after import.
- Rename nav/actions around analyst intent: Import Source, Review Facts, Build Model, Draft Memo.
- Reduce import/tool empty-state copy and make primary actions more contextual.

### Medium Projects

- Redesign Workspace into the primary company cockpit.
- Add Source Library and source-linked split view.
- Add row-level context menus on tables.
- Add persistent data quality/readiness strip.
- Add saved company workspaces and recent workspaces.

### Major Platform Improvements

- Build panelized Workspace with resizable Source/Facts/Tool/Trace/Notes regions.
- Build source-grounded Analyst Copilot.
- Add collaboration-grade version history, review states, and audit trails backed by real storage.
- Add searchable filing/transcript/document corpus if external data becomes strategic.

### Future Vision

- Fundalyst becomes a calm analyst operating system: one company workspace, source-grounded facts, editable assumptions, explainable models, AI critique, memo generation, and saved research history.
- The best evolved version is not Godel for India or Godel for value investors. It is the fastest path from messy source document to defensible investment judgment.
