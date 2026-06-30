# Codex — Visual Verification & Push (Fundalyst)

You are on the Windows machine where the app actually runs (native build binaries present). Claude did the work on a Linux sandbox and could typecheck/lint but **could not run the app**. Your job: visually verify, run the test suite, and if green, commit + push.

## What changed (verify these specifically)
- **Command palette (NEW, by Claude)** — `src/components/layout/CommandPalette.tsx`, mounted in `src/app/layout.tsx`, opener also wired to a `⌘K` button in `src/components/layout/Nav.tsx`. Styles `.cmdk-*` / `.nav-cmdk-trigger` in `src/app/globals.css`.
- **Terminal Gold theme + light mode (by DeepSeek)** — `globals.css` v3 tokens, `ThemeToggle` in `Nav.tsx`.
- **Dead-code cleanup (by Claude)** — removed unused `provenanceMap` param in `lib/memo-export.ts` and unused `InstitutionalResult` import in `tools/peer/page.tsx`.

## Setup
```
npm install        # ensure deps present
npm run dev        # start Next dev server
```
Open the app in a browser. Keep the devtools console visible.

## Automated checks (must pass)
```
npx tsc --noEmit           # expect: 0 errors
npx eslint .               # expect: 0 errors, ~7 pre-existing warnings (img + exhaustive-deps) — OK
npm test                   # vitest — expect all pass
```

## Visual checklist
**Boot**
- [ ] App loads, no red console errors.
- [ ] Default theme is dark gold (`--primary #C8962E`). Body font is Inter, numerics are IBM Plex Mono (NOT system Arial).

**Theme**
- [ ] Theme toggle (nav) cycles dark → light → auto; light mode is readable, gold accent becomes the darker `#B07D1F`.
- [ ] Floating surfaces cast a shadow (open a dropdown / right-click the spreadsheet context menu / the command palette) — no flat, shadowless panels.

**Command palette (the new feature)**
- [ ] `Ctrl/Cmd+K` opens it; the nav `⌘K` button also opens it; `Esc` and backdrop click close it.
- [ ] Typing filters fuzzily (e.g. "dcf", "peer", "import"). ↑/↓ move the highlight, `Enter` runs it, mouse hover highlights.
- [ ] "Navigate" entries route to the right page.
- [ ] Import a dataset, reopen palette: a **Companies** section appears. Selecting a company switches the active dataset (nav badge updates). "Export investment memo" downloads a `.md`. "Clear all data" works.
- [ ] With NO data, "Export investment memo" routes to /import instead of erroring.

**Regression sweep (each must load + render, no crash)**
- [ ] /research/filing, /research/trends, /research/growth
- [ ] /tools/dcf, /tools/wc, /tools/ratios, /tools/peer
- [ ] /import, /workspace, /about, / (home)
- [ ] Charts render (DCF bars, trend lines). Tables render. Mobile width (≤640px): hamburger nav works, palette button hidden, layout intact.

## If everything is green
```
git add -A
git commit -m "feat: command palette (Cmd-K), Terminal Gold theme + light mode, dead-code cleanup"
git push
```

## Report back to the user
- Anything broken, any console error, any visual glitch (with the page + what you saw).
- Confirm tsc/eslint/test results.
- Confirm the push succeeded (branch + commit hash).

> Note: the Linux sandbox had a flaky filesystem (it truncated several files mid-write during the session; Claude rebuilt them from `git show HEAD` + verified). If anything looks truncated/cut-off, flag it — but tsc was clean, so it should be intact.
