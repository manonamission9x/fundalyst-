# Codex Work Order — C2 & C5 (implement in the dev + e2e loop)

You're on the Windows machine (native binaries + git creds). Claude implemented C1/C3/C4 and resynced the tree; it can't run the app, run e2e, or push. These two are invasive UI/behavior changes that need eyes + e2e, so they're yours.

## Start
- `main` is `6182760`. There is one unpushed local commit on top: **`2d4583b`** (handoff update — exact C2/C5 specs). Push it: `git push origin main`.
- Baseline must be green first: `npm test` (58), `npm run build` (14 routes), `npm run test:e2e` (25).
- Full specs with file/line refs are in **`HANDoFF.md` → "Pending — C2 & C5"**. Summary + the parts only-a-human-with-a-browser can do are below.

## C2 — Remove auto-injected demo data (do first, own cycle)
**Both the code change AND the e2e update are required — this change breaks current e2e by design.**
1. Code (per HANDoFF.md): blank sample defaults in `src/store/index.ts` (match each `clear()`; don't bump `version`); delete the on-mount demo blocks in `research/filing/page.tsx` (~L114-130) and `tools/dcf/page.tsx` (~L126-159); make `research/trends/page.tsx` (~L43-60) and `research/growth/page.tsx` (~L76) start empty when no import. Move each removed sample into an explicit `loadSample()` button. Keep all canonical-model prefill. WC/ratios/peer already clean.
2. Clean up any now-unused refs/state (`isSampleLoaded`, `autoDemoRef`) so lint stays at 0 errors.
3. **Visual (dev server):** every tool with no data shows the polished empty state (D5) + a working "Load sample" button; importing real data still prefills; nothing renders blank-and-dead.
4. **e2e:** update the specs that assert on demo values (filing Q1-Q4, DCF intrinsic value, trends series) to first click "Load sample" or import a fixture. Preserve route coverage (handoff rule).
5. Green `tsc`/`lint`/`test`/`build`/`e2e` → commit → push.

## C5 — Nav IA: collapse tabs + Workspace identity (own cycle, after C2)
Pure interaction — build with the dev server open; tsc cannot catch nav bugs.
1. `src/components/layout/Nav.tsx`: collapse the 9 flat desktop tabs into ~4 section triggers (Research/Valuation/Data/Tools) that open a dropdown/popover of their tools. Mobile overlay already groups — keep it.
2. Make Workspace the primary hub/landing; tools stay deep-links from Workspace + the command palette.
3. **Verify:** keyboard nav + focus-trap through dropdowns, Esc closes, mobile hamburger unaffected, active-state correct, no layout shift (F-17 reserves the 2px), all routes still reachable (e2e). Don't touch the command palette (`CommandPalette.tsx` / `.cmdk-*`).
4. Green everything → commit → push.

## Acceptance
- No fake company data auto-loads anywhere; each tool has an explicit "Load sample"; empty states clean.
- Nav collapsed to grouped triggers; every route reachable; keyboard + mobile verified.
- `npm test`, `npm run build`, `npm run test:e2e` all green (e2e specs updated, not deleted).
- Both pushed to `main`. Report commit hashes + anything that needed a judgment call.
