@AGENTS.md

# Claude notes

Shared project context, doc map, rules, and ownership lanes live in `AGENTS.md` (imported above) — not repeated here.

**Authority:** Claude and Codex are equal peers with full authority over all work, *including architecture* (command language, multi-panel workspace, nav restructure, compare/entity-pivot, provenance) — used interchangeably. Take any ticket in `CODEX_TICKETS.md`; only coordinate on large architectural refactors via `HANDoFF.md` (see `AGENTS.md`). Build order: `FUNDALYST_DESIGN_AUDIT.md` §19.

- For non-trivial changes, use a subagent to verify (tsc/lint/build + affected Playwright routes) before declaring done.
- Update `HANDoFF.md` after meaningful changes so Codex/DeepSeek pick up current state.
