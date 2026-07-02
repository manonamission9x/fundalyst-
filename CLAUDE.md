@AGENTS.md

# Claude notes

**Default bootstrap:** start every task with `AGENTS.md` + `HANDoFF.md` + only the specific target files. Use `rg` for targeted search. Do not scan the whole repo or read large audits unless the task proves it needs them. Before editing, state which files you will touch.

Shared project context, doc map, rules, and ownership lanes live in `AGENTS.md` (imported above) - not repeated here.

**Authority:** Claude and Codex are equal peers with full authority over all work, *including architecture* (command language, multi-panel workspace, nav restructure, compare/entity-pivot, provenance) - used interchangeably. Take any ticket in `CODEX_TICKETS.md`; only coordinate on large architectural refactors via `HANDoFF.md` (see `AGENTS.md`). Build order: `FUNDALYST_DESIGN_AUDIT.md` section 19.

- For non-trivial changes, verify on a **real local checkout** (tsc/lint/build + affected Playwright routes) before declaring done. The agent sandbox can report false syntax errors from NUL-corrupted mounts - trust the repo over sandbox compiler output; never rewrite working code to satisfy phantom errors. Canonical rules: `AI_EXECUTION_RULES.md`.
- Update `HANDoFF.md` after meaningful changes so Codex/DeepSeek pick up current state.
