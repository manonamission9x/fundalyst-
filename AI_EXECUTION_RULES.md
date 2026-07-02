# AI Execution Rules

**Canonical rules for any AI agent (Claude, Codex, DeepSeek, Hermes, …) working in this repo.**
Short, binding, and linked from `AGENTS.md`, `HANDoFF.md`, `CODEX_TICKETS.md`, and `STYLE.md`. If any other doc conflicts with this file on the points below, this file wins.

---

## Sandbox verification

The execution sandbox may report **false** TypeScript syntax errors caused by truncated or NUL-corrupted file mounts.

- Do **not** assume compiler output from the sandbox is authoritative.
- When sandbox compiler output conflicts with editor-visible code, treat the **repository contents as the source of truth**.
- **Never rewrite working code solely to satisfy phantom sandbox syntax errors.** (Symptoms of the artifact: "Unterminated string literal", "Invalid character", "JSX element has no corresponding closing tag", or "N files corrupted" appearing across files you never touched — often a file that reads as all `NUL`/`0x00` bytes through the mount but is intact via the editor.)

Before considering **any** implementation complete, run on the **real local checkout** (Windows → use `npm.cmd`):

```bash
npm install                    # if package.json / deps changed
npm exec tsc -- --noEmit       # must be 0 errors
npm run lint                   # ~known pre-existing warnings only (see HANDoFF.md)
npm run build
npx playwright test            # the routes your change affects
```

An implementation is **not** "done" until these pass on a real checkout. If you could not run them (e.g. you only had the sandbox), say so explicitly in `HANDoFF.md` and the ticket — never imply a green build you did not see.

---

## Working rules (recap — full detail in `AGENTS.md`)

- Mandatory startup: read `AGENTS.md`, `HANDoFF.md`, then only task-specific files. Use `rg`; do not scan the whole repo or large audits by default.
- Obey `DESIGN.md`: use tokens, never raw hex/px/font literals in `app/**` or `components/**`.
- Keep `src/lib/calculations.ts` pure (no store access, no side effects).
- No network calls from core analysis code — the privacy promise is non-negotiable.
- All runtime config flows through `src/lib/env.ts` (the only file that may read `process.env`).
- Don't blindly `npm audit fix --force` (known `xlsx` advisory).
- Preserve Playwright route coverage; test affected routes.
- Claim a ticket in `CODEX_TICKETS.md` (`[~] — <agent> <date>`) before starting; flip to `[x]` when done.
- Implement, don't redesign; flag ambiguity instead of guessing.
