# Handoff — Returning-User Launchpad redesign ("Mission Control")

**For:** DeepSeek (full access granted for this task)
**From:** Claude
**Date:** 2026-07-02
**Status:** spec ready to implement
**Read first:** `AGENTS.md`, `DESIGN.md` (§1, §5, §8, §10). This doc is self-contained but obeys both.

---

## 0. One-sentence vision

When a returning analyst opens Fundalyst, the page should feel like sitting down at a
quiet, expensive instrument — a single **command console fused with the "continue where
you left off" card**, floating on subtle graphite depth, where every accent means
something. Bloomberg's density and seriousness, Raycast's command ergonomics, Patek's
restraint. No marketing, no chatbot cosplay, no decoration for its own sake.

We are redesigning **one surface**: the returning-user launchpad that renders at the top
of the home page when a dataset already exists (`resumeName` truthy in `src/app/page.tsx`).
Everything below the launchpad (hero, trust strip, sections, footer) and the first-visit
empty state stay as they are.

---

## 1. What the inspiration got right, and what we cut

The reference mock (charcoal UI with a "Continue research → Financial-Results.pdf" card and
an integrated command bar) is the right *direction*. Its own left-column critique is, almost
line for line, Fundalyst's `DESIGN.md`. Map:

| Inspo critique / recommendation | Fundalyst translation (what you implement) |
|---|---|
| "Weak visual hierarchy" → stronger hierarchy | One focal point: the command console. Title is the document, everything else recedes. |
| "CTA too visually heavy" | Demote the white **Open workspace** button to a quiet underlined link. The command bar is the primary interaction now. |
| "Command input feels disconnected" → integrated, premium | A full-width, input-styled command bar *inside* the launchpad card, borderless-premium, focus-ringed. |
| "Flat, generic background" → subtle dynamic depth | **Graphite Depth**: faint top radial glow + dissolving ledger-grid + a top-edge surface sheen, all via tokens (`DESIGN.md §8`). |
| "Green accent lacks meaning" → clear meaning behind accents | **Green = data ready / accepted only.** Strip decorative green. Slate (`--primary`) does all wayfinding. |
| "Feels intelligent, modern, premium" | Achieved through restraint + depth + motion discipline, not through color or gloss. |

**Deliberately cut from the inspo (do NOT copy these):**

1. **The "Ask anything about your research…" chatbot placeholder and the "Summarize
   findings / Explain anomalies" chips.** Fundalyst is 100% local, no backend, no LLM in
   the core loop. The command system is a **deterministic verb palette** (`dcf`, `ratios`,
   `compare`, `filing`, `<verb> <company>`…). The bar must read as a *command console*, not
   a chat box. Placeholder and chips below are the honest replacements.
2. **"Deep Navy" background.** Navy is a competing brand hue in a cool-charcoal + warm-ivory
   + slate system. We use **Graphite Depth** (neutral). No new hue enters the identity.
3. **Two stacked example command inputs / voice input / slash-only variants** from the
   inspo's lower panel. One console, one pattern.

---

## 2. Scope & files

**Touch:**
- `src/app/page.tsx` — replace the `resumeName && (<section className="lp-resume">…)` block
  (lines ~112–138) with the new `.lp-launch` markup in §6.
- `src/app/globals.css` — add the new tokens (§4) and the `.lp-launch*` / `.lp-cmdbar*` /
  `.lp-quick*` CSS (§5). You may retire the now-unused `.lp-resume*` rules (§7) or leave them
  (nothing else references them — confirm with grep).

**Do not touch:**
- `src/components/layout/CommandPalette.tsx` and the `.cmdk-*` styles. **Reuse** the palette;
  do not fork a second command parser. The bar *opens* the existing palette (see §5.4).
- Any tool page / tool surface. Ambient depth is marketing-surface only (`DESIGN.md §8`).
- The first-visit hero and sections below the launchpad.

**Reuse, don't reinvent:** `--glow-hero`, `--ledger-grid`, `--gradient-surface`, `--ease-out`,
`.fnd-reveal` + the `d(ms)` stagger helper, `.cmdk-kbd`, `.btn-primary`. They already exist and
carry the house style.

---

## 3. Layout & hierarchy (the shape)

Single card, three vertical zones. The command bar is the widest, heaviest element — it wins
the eye. "Open workspace" is a quiet link, top-right.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● CONTINUE RESEARCH                                    Open workspace →    │  ← zone A: identity
│                                                                            │
│  Financial-Results.pdf                                                      │     title = the document (--text-3xl)
│  76 accepted facts · 2 periods · updated 3m ago                            │     meta (mono, hairline sep)
│  [ FY2023–FY2024 ]  [ 10-K ]                                                │     tags (optional, mono chips)
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐    │  ← zone B: command console (FOCAL)
│  │ `  Type a command — try "dcf", "compare", "ratios reliance"     → │    │     full width, premium, opens palette
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  [↗ Build valuation]  [⇄ Compare periods]  [◱ Peer set]  [% Ratios]        │  ← zone C: real verb chips
└──────────────────────────────────────────────────────────────────────────┘
        ▲ graphite depth behind everything: top radial glow + dissolving ledger grid + surface sheen
```

Hierarchy order (most → least weight): **command bar → document title → verb chips →
meta/tags → open-workspace link**. If a viewer's eye doesn't land on the command bar first,
the hierarchy is wrong.

**Focal-point rule (`DESIGN.md §1`):** exactly one dominant element. Here it's the command
bar. That is why "Open workspace" must be a link, not a filled button — two heavy CTAs = no
focal point.

---

## 4. New tokens (add to `globals.css`)

Add inside the **v6 `:root` block** (the one at the "Living Ledger" banner, ~line 1852,
next to `--ledger-grid`). Values chosen to sit on the existing `--bg-elevated #141416`.

```css
  /* Launchpad ambient depth — graphite, neutral, DEPTH not colour (DESIGN §8). */
  --gradient-graphite: linear-gradient(
    180deg,
    rgba(255,255,255,0.045) 0%,
    rgba(255,255,255,0.010) 20%,
    rgba(0,0,0,0) 58%
  );
  --glow-launchpad: radial-gradient(
    120% 140% at 12% -25%,
    rgba(111,125,140,0.14),
    rgba(111,125,140,0) 55%
  );
```

Light mode: add overrides in **both** light blocks (`@media (prefers-color-scheme: light)
:root:not([data-theme="dark"])` and `[data-theme="light"]`) — on light surfaces white sheen
is invisible, so tint downward with a hairline shadow-toned gradient instead:

```css
  --gradient-graphite: linear-gradient(
    180deg,
    rgba(22,22,26,0.030) 0%,
    rgba(22,22,26,0.008) 20%,
    rgba(0,0,0,0) 58%
  );
  --glow-launchpad: radial-gradient(
    120% 140% at 12% -25%,
    rgba(90,107,124,0.10),
    rgba(90,107,124,0) 55%
  );
```

Do **not** introduce any raw hex/rgba outside these token definitions. Everything downstream
references the tokens.

---

## 5. CSS (paste-ready) — add near the `.lp-resume` rules (~line 2046)

### 5.1 Card shell + ambient depth

```css
/* ══ Returning-user launchpad — "mission control" ══════════════════════════ */
.lp-launch {
  position: relative;
  margin: var(--space-6) 0 var(--space-8);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
/* depth layer 1: graphite sheen + top-left radial glow */
.lp-launch::before {
  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: var(--gradient-graphite), var(--glow-launchpad);
}
/* depth layer 2: ledger grid, dissolving from the top-left */
.lp-launch::after {
  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: var(--ledger-grid);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(95% 130% at 12% 0%, #000, transparent 68%);
  mask-image: radial-gradient(95% 130% at 12% 0%, #000, transparent 68%);
  opacity: 0.5;
}
.lp-launch-inner {
  position: relative; z-index: 1;
  padding: var(--space-6) var(--space-6) var(--space-5);
}
```

### 5.2 Zone A — identity (kicker + live dot, title, meta, tags, open link)

```css
.lp-launch-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--space-4);
}
.lp-launch-kicker {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--font-ibm-plex-mono); font-size: var(--text-micro);
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);
}
/* GREEN HERE = "accepted data is ready" — this is the ONE meaningful green. */
.lp-launch-live {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--green); box-shadow: 0 0 0 3px var(--green-subtle);
  flex-shrink: 0;
}
.lp-launch-title {
  margin: var(--space-3) 0 0;
  font-family: var(--font-inter); font-size: var(--text-3xl); font-weight: 600;
  letter-spacing: -0.02em; line-height: 1.08; color: var(--text);
  text-wrap: balance; word-break: break-word;
}
.lp-launch-meta {
  display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
  margin-top: var(--space-2);
  font-family: var(--font-ibm-plex-mono); font-size: var(--text-2xs);
  color: var(--text-tertiary);
}
.lp-launch-meta .sep { color: var(--border-strong); }
.lp-launch-tags { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-3); }
.lp-launch-tag {
  font-family: var(--font-ibm-plex-mono); font-size: var(--text-micro);
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary);
  border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  padding: 3px 8px;
}
/* Open workspace demoted to a quiet link (fixes "CTA too heavy") */
.lp-launch-open {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary);
  text-decoration: none; border-bottom: 1px solid var(--border-strong);
  padding-bottom: 2px; transition: color var(--transition-fast), border-color var(--transition-fast);
}
.lp-launch-open:hover { color: var(--text); border-bottom-color: var(--text-tertiary); }
.lp-launch-open svg { transition: transform var(--transition-fast); }
.lp-launch-open:hover svg { transform: translateX(2px); }
```

### 5.3 Zone B — the command console (the focal element)

```css
.lp-cmdbar {
  display: flex; align-items: center; gap: var(--space-3);
  width: 100%; margin-top: var(--space-5);
  min-height: 52px; padding: 0 var(--space-4);
  background: var(--bg-field);
  border: 1px solid var(--border-strong); border-radius: var(--radius-md);
  cursor: text; text-align: left;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}
.lp-cmdbar:hover { border-color: var(--primary); }
.lp-cmdbar:focus-visible,
.lp-cmdbar.is-active {
  outline: none; border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--primary-subtle); background: var(--bg-elevated);
}
.lp-cmdbar-kbd {
  font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-tertiary);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 2px 7px; flex-shrink: 0;
}
.lp-cmdbar-placeholder {
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--text-muted); font-family: var(--font-inter); font-size: var(--text-base);
}
.lp-cmdbar-go { display: inline-flex; color: var(--text-muted); flex-shrink: 0; }
.lp-cmdbar:hover .lp-cmdbar-go { color: var(--text-tertiary); }
```

### 5.4 Behavior of the command bar (important)

The bar is a **`<button>` styled as an input** that opens the existing palette — this keeps
one command engine and matches `DESIGN.md`'s single-source rule. It fires the event the
current code already listens for:

```js
onClick={() => window.dispatchEvent(new Event('fundalyst:open-palette'))}
```

- It must be keyboard-focusable and Enter/Space activatable (a native `<button>` gives this
  free). `aria-label="Open command bar"`.
- Do **not** build a real text input with its own parser here. (If we later want keystroke
  passthrough — type in the bar, palette opens pre-seeded — that's a Claude/Codex engine
  follow-up under T16; leave a `{/* T16: passthrough */}` comment, don't implement.)
- The `` ` `` (backtick) global shortcut already opens the palette; the kbd chip advertises it.

### 5.5 Zone C — real verb chips

```css
.lp-quick { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-3); }
.lp-quick-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--text-xs); color: var(--text-secondary);
  background: var(--bg-hover); border: 1px solid var(--border-light);
  border-radius: var(--radius-sm); padding: 6px 11px;
  text-decoration: none; cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.lp-quick-btn:hover { background: var(--bg-surface); border-color: var(--border); color: var(--text); }
.lp-quick-btn svg { color: var(--text-muted); flex-shrink: 0; transition: color var(--transition-fast); }
.lp-quick-btn:hover svg { color: var(--text-tertiary); }
```

Chips are **real routes** (deterministic, honest), each carrying the active dataset via the
existing nav pattern. Verbs: **Build valuation → `/tools/dcf`**, **Compare periods →
`/research/filing`**, **Peer set → `/tools/peer`**, **Ratios → `/tools/ratios`**. No
"Summarize" / "Explain anomalies" (those imply generation we don't do in-core).

---

## 6. JSX (paste-ready) — replace the `.lp-resume` block in `page.tsx`

Uses only data already in scope (`resumeName`, `activeDataset`, `resumeTool`). Add the
Phosphor icons to the existing import (`TrendUp`, `ArrowsLeftRight`, `SquaresFour`, `Percent`,
plus `ArrowRight` already imported). Derive a period-range tag from `activeDataset.periods`.

```tsx
{resumeName && (
  <section className="lp-launch fnd-reveal">
    <div className="lp-launch-inner">
      <div className="lp-launch-top">
        <div>
          <span className="lp-launch-kicker">
            <span className="lp-launch-live" aria-hidden="true" />
            Continue research
          </span>
          <h2 className="lp-launch-title">{resumeName}</h2>
          <div className="lp-launch-meta">
            <span>{activeDataset?.facts.length || 0} accepted facts</span>
            <span className="sep">·</span>
            <span>
              {activeDataset?.periods.length || 0} period
              {activeDataset?.periods.length === 1 ? '' : 's'}
            </span>
          </div>
          {(activeDataset?.periods.length ?? 0) > 0 && (
            <div className="lp-launch-tags">
              <span className="lp-launch-tag">
                {activeDataset!.periods[0]}
                {activeDataset!.periods.length > 1
                  ? `–${activeDataset!.periods[activeDataset!.periods.length - 1]}`
                  : ''}
              </span>
            </div>
          )}
        </div>
        <Link href={resumeTool.href} className="lp-launch-open">
          Open workspace
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>

      <button
        type="button"
        className="lp-cmdbar"
        aria-label="Open command bar"
        onClick={() => window.dispatchEvent(new Event('fundalyst:open-palette'))}
      >
        <span className="lp-cmdbar-kbd">`</span>
        <span className="lp-cmdbar-placeholder">
          Type a command — try &ldquo;dcf&rdquo;, &ldquo;compare&rdquo;, &ldquo;ratios {resumeName.split(' ')[0].toLowerCase()}&rdquo;
        </span>
        <span className="lp-cmdbar-go" aria-hidden="true">
          <ArrowRight size={15} weight="bold" />
        </span>
      </button>

      <div className="lp-quick">
        <Link href="/tools/dcf" className="lp-quick-btn"><TrendUp size={13} weight="regular" /> Build valuation</Link>
        <Link href="/research/filing" className="lp-quick-btn"><ArrowsLeftRight size={13} weight="regular" /> Compare periods</Link>
        <Link href="/tools/peer" className="lp-quick-btn"><SquaresFour size={13} weight="regular" /> Peer set</Link>
        <Link href="/tools/ratios" className="lp-quick-btn"><Percent size={13} weight="regular" /> Ratios</Link>
      </div>
    </div>
  </section>
)}
```

> The old block also had a secondary `.lp-cmd` "Type a command" button in the hero
> (lines ~174–182). Leave that hero button as-is, OR (preferred) remove it now that the
> launchpad owns the command affordance — having it twice on one screen dilutes the focal
> point. Your call; if you remove it, drop the now-orphan `.lp-cmd` hero usage only, not the
> class (the class may be reused elsewhere — grep first).

---

## 7. Cleanup (optional, safe)

`.lp-resume`, `.lp-resume-kicker`, `.lp-resume h2/p`, `.lp-resume-actions` and their two
responsive rules (~line 2083) become dead once the block above replaces them. Grep to confirm
no other file references `lp-resume`, then delete. Don't leave commented-out CSS.

---

## 8. Motion

- The whole card enters with the existing `.fnd-reveal` (already on the section). One calm
  rise, ~0.7s, `--ease-out`. Do not stagger the internal elements — the launchpad is a single
  focal object, it arrives as one.
- Hover transitions only on the command bar, chips, and open link (specced above), all via
  `--transition-fast`.
- `@media (prefers-reduced-motion: reduce)` already neutralizes `.fnd-reveal` — verify the
  card is fully visible with motion off. No new keyframes.

---

## 9. Responsive

Add to the v6 responsive block (~line 2068+):

```css
@media (max-width: 640px) {
  .lp-launch-inner { padding: var(--space-5) var(--space-4); }
  .lp-launch-top { flex-direction: column; }
  .lp-launch-open { align-self: flex-start; }
  .lp-launch-title { font-size: var(--text-2xl); }
  .lp-cmdbar { min-height: 48px; }
  .lp-cmdbar-placeholder { font-size: var(--text-sm); }
  .lp-quick { gap: var(--space-2); }
}
```

- Mobile: identity stacks, open link drops below title, command bar stays full-width and
  remains the focal element. Chips wrap.
- Touch: `min-height` on the command bar and 44px effective tap targets on chips (padding
  gives ~34px; bump chip `padding` to `8px 12px` under `(hover: none)` if QA shows <44px).
- The card must not horizontally scroll at 360px. `word-break: break-word` on the title
  handles long file names.

---

## 10. Accessibility

- Command bar is a real `<button>` → focusable, Enter/Space works, `aria-label` set.
- Focus ring uses `--border-focus` + `--primary-subtle` glow (specced), visible in both themes.
- Contrast: title/meta/placeholder all ≥ 4.5:1 on `--bg-elevated` in dark and light. The
  green live-dot conveys "ready" but is never the *only* signal — the "N accepted facts" text
  carries the same meaning (color-blind safe).
- The ambient depth layers are `pointer-events: none` and `aria-hidden` by nature (pseudo-
  elements); they never trap focus or reduce text contrast (they sit at low opacity behind a
  `z-index:1` content layer).

---

## 11. Acceptance criteria (Definition of Done)

1. Returning user (a dataset exists) sees the `.lp-launch` card; first-visit users see the
   unchanged hero. No regressions below the launchpad.
2. The command bar is unmistakably the heaviest element; clicking it (or pressing `` ` ``)
   opens the existing command palette. No second parser was created.
3. **Open workspace** is a quiet link, not a filled button. Exactly one focal point.
4. Green appears **only** as the "data ready" live dot (meaning), nowhere decorative. Slate
   `--primary` does all wayfinding/hover.
5. Graphite depth is visible but subtle — remove it mentally and the layout still reads calm
   and intentional (`DESIGN.md §8 rule of thumb`). No gradient/colour sits behind any text.
6. Verb chips route to the four real tools and carry the active dataset.
7. Works dark + light, 360 → 1600px, `prefers-reduced-motion`, `hover: none`.
8. **Token discipline:** no raw hex/rgba/px/font literals in `page.tsx` or in the new CSS
   outside the `:root`/light-block token definitions in §4.

---

## 12. Verify before you tick done

```bash
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run build
# Playwright: at least the "/" route, desktop + mobile
```

Grep gates (from `DESIGN.md` / `DEEPSEEK_TASKS.md` validation):

```bash
# no raw literals introduced in the page or new CSS usage
grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(|[^-]px|fontSize|'Inter'|'IBM Plex" src/app/page.tsx
# every var referenced is defined (spot-check the new ones)
grep -n "gradient-graphite\|glow-launchpad" src/app/globals.css
# confirm lp-resume is fully removed if you deleted it
grep -rn "lp-resume" src/
```

Visual pass @ 1440 / 1366 / 768 / 420 / 360; color-blind sim (green dot must not be the sole
carrier of "ready"); reduced-motion; both themes.

---

## 13. When done

- Tick nothing in `CODEX_TICKETS.md` (this is a design-lane task, not a numbered ticket) —
  but **do** add a short entry to `HANDoFF.md` under a new dated "Latest change" block
  describing the launchpad redesign + the two new tokens, and update `DESIGN.md §10` to
  document the `.lp-launch` pattern and `--gradient-graphite` / `--glow-launchpad` so the doc
  doesn't drift from the code.
- If anything here is ambiguous or fights the live code, **flag it — don't guess** (house
  rule). Ping via `HANDoFF.md`.

---

### Appendix — why this is the right restraint

The temptation with "make it revolutionary" is to add: a glass command bar, a colored glow,
an AI shimmer, a big gradient. Every one of those would make Fundalyst look like the generic
AI SaaS `DESIGN.md §1` explicitly rejects. The revolution here is *subtraction*: one focal
command console, depth you feel but can't point to, and color that only ever tells the truth
about the data. That's the Patek move — the sophistication is in what's not there.
