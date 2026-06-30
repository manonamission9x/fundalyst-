# Codex — Verify & Push (Fundalyst, round 2)

You're on the Windows machine (native binaries work; Claude's Linux sandbox can't run the app or push — no git creds there).

## State
- Local `main` has commit **`e789b79`** on top of pushed `4069571`. It contains ONLY two files (a clean +50-line delta, no deletions):
  - `src/app/tools/peer/page.tsx` — **C3**
  - `src/components/layout/Nav.tsx` — **C4**
- `tsc --noEmit` = 0 errors. `eslint` = 0 errors (pre-existing warnings only).

## ⚠️ Important — reconcile the working tree first
`git status` shows OTHER modified files NOT in commit `e789b79`: `globals.css`, `research/filing/page.tsx`, `calculations.ts`, `calculations.test.ts`, `importer/ocr.ts`, `importer/xbrl-parser.ts`, `HANDoFF.md`. Claude did NOT touch these this round. They are either (a) DeepSeek's uncommitted D1–D6 work, or (b) noise from a flaky sandbox filesystem that was truncating files. **Decide per file:** if it's real D1–D6 work, commit it; if it's truncated/garbage, `git checkout -- <file>` to restore from HEAD. Verify each isn't cut off (ends properly) before committing.

## What changed (verify these)
**C3 — multi-company peer compare**
- Import 2+ companies (so `datasets.length >= 2`). Go to `/tools/peer`.
- [ ] A gold "Compare N saved companies" button appears above the spreadsheet.
- [ ] Clicking it fills the grid + results table with one column per saved company, pulled from the canonical model (revenue/profit/assets/debt), and highlights best/worst.
- [ ] With <2 saved companies the button is hidden; CSV paste + "Try with example data" still work.

**C4 — global memo export**
- [ ] With an active dataset, the nav shows a "Memo" button (download icon). Clicking downloads a `.md` investment memo for the active company.
- [ ] With no dataset, the button is absent. (Palette's "Export investment memo" still routes to /import when empty.)

## Checks
```
npx tsc --noEmit      # 0 errors
npx eslint .          # 0 errors, ~7 known warnings
npm test              # vitest
npm run dev           # click through C3/C4 + a quick page sweep (filing, dcf, ratios, peer, workspace, home)
```

## Push
If green: `git push origin main` (commit `e789b79`, plus any D1–D6 commits you reconciled above).

## Still TODO (Claude's lane, not done)
- **C2** — remove demo-data injection + real empty states (invasive: all stores + filing page).
- **C5** — nav IA restructure + Workspace identity (invasive: routing/nav).
Claude is holding these for a verified batch rather than pushing invasive UI to main unseen.
