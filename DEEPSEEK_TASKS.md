# Fundalyst — Fix Queue (implementer spec)

> **Read `AGENTS.md` first** for shared project context, stack, rules, verify commands, and ownership lanes (include it alongside this file in your context). This file is DeepSeek's task queue only — it does not restate project context.

> Most of this is already implemented (first pass done). Treat this as the canonical spec for your **second-pass verification** — re-check each item against the live code and tick the box when confirmed. Don't redesign.

Implement, don't redesign. One token = one place. Preserve: tabular-nums+mono numerics, ghost-only buttons, muted semantic colors, single accent (gold) for interactivity only, static charts (`isAnimationActive={false}`), provenance/confidence/data-quality system, a11y (focus-visible, reduced-motion, hover:none, 44px touch, 16px mobile inputs).

## P0 — silent failures
- [ ] **F-01** `--shadow-md` used (context-menu + suggestions) but never defined → no shadow. Define `--shadow-md` in `:root` + elevation scale (sm/base/md/lg).
- [ ] **F-02** `--font-mono` used in inline styles (`ui/index.tsx`; `import/page.tsx`; `PdfViewer.tsx`; `ProvenanceBadge.tsx`) but never defined → rendered in Inter. Define `--font-mono`.
- [ ] **F-03** Fonts loaded via `next/font` as `--font-inter`/`--font-ibm-plex-mono` but `globals.css` used literal `'Inter'`/`'IBM Plex Mono'` → optimized fonts may never apply. Route `body` + all mono rules through the CSS vars. Validate on a no-fonts machine.
- [ ] **F-20** `layout.tsx` `<div className="bg-noise">` has no matching CSS (texture is `body::before`). Remove it.

## P1 — consistency
- [ ] **F-06** `chart-theme.ts` used `IBM Plex Sans` (never loaded). Use Inter var.
- [ ] **F-07** Two color systems: `globals.css` tokens vs hardcoded hex in `chart-theme.ts`. Make chart-theme derive from CSS tokens; if charts intentionally differ, name `--chart-accent`.
- [ ] **F-08** `ui/index.tsx` badges hardcoded off-palette `rgba(245,158,11…)`/`rgba(34,197,94…)`/`rgba(148,163,184…)`. Replace with `--caution`/`--green`/muted tokens.
- [ ] **F-04** Inline `fontSize:8/9/10/11` bypass the scale. Add `--text-3xs:11px`; replace raw px with tokens.
- [ ] **F-10** `import/page.tsx` + `PdfViewer.tsx` use inline `style={{}}` literals. Migrate to classes/tokens. No inline px/color/font in page files.

## P2 — polish
- [ ] **F-09** `.nav` bg literal != `--bg`. Derive nav bg from `--bg`.
- [ ] **F-11** Off-scale radii. Add `--radius-pill:100px`; tokenize all.
- [ ] **F-05** Mono text drops to 7-9px on mobile. Floor: 11px data / 10px labels.
- [ ] **F-12** Inline one-off spinner (`ui/index.tsx` Toolbar). Promote to shared `.spinner`.
- [ ] **F-16** Charts have no empty/loading/error state. Add shared wrapper (skeleton/empty/error/chart) reusing `state-card`/`empty-state`.
- [ ] **F-14** Change cells encode gain/loss by color alone. Make sign/arrow mandatory (~8% color-blind).

## P3 — brand/cleanup
- [ ] **F-19** Remove unused `@keyframes skeleton-pulse`; one shimmer.
- [ ] **F-17** `.nav-tab.active` 2px border others lack → layout shift. Reserve the space.
- [ ] **F-13** Two custom icon sets + lucide. Standardize on the custom currentColor set; one stroke/size spec.
- [ ] **F-18** Brand color hardcoded in `layout.tsx`/`Nav.tsx`. Tokenize; one shared logo component.

## Theme re-skin — dark default (Terminal Gold) + light mode
Single token source; charts derive. Two themes via `:root` (dark default) + `:root[data-theme="light"]`; toggle, respect `prefers-color-scheme`. **Build order: ship Terminal Gold (dark) first; add light second once dark is stable.** **Collision rule:** gold = wayfinding/interactive ONLY, never data. Gain=green, Loss=red, Caution=burnt-orange (distinct hue from gold).

**Dark (default):** `--bg #0E0E0F` · `--bg-elevated #161617` · `--bg-surface #1D1D1F` · `--bg-hover #242426` · `--bg-field #131314` · `--border #29292B` · `--border-strong #3C3C3F` · `--text #EDEDE8` · `--text-secondary #B6B5AE` · `--text-tertiary #908F88` · `--text-muted #76756E` · `--primary #C8962E` / hover `#DCA93C` / subtle `rgba(200,150,46,.07)` · `--green #3DA06D` · `--red #CC5A5A` · `--caution #C2703D`

**Light (`[data-theme="light"]`):** `--bg #FAF9F6` · `--bg-elevated #FFFFFF` · `--bg-surface #F3F1EC` · `--bg-hover #ECEAE3` · `--bg-field #FFFFFF` · `--border #E2E0D8` · `--border-strong #CBC8BD` · `--text #1A1A1A` · `--text-secondary #4A4A45` · `--text-tertiary #6E6C64` · `--text-muted #86847C` · `--primary #B07D1F` / hover `#946716` · `--green #1E7A4C` · `--red #B23A3A` · `--caution #B0612E`

Migration: every `--amber*` → `--caution*` (warning only). `--border-focus` follows `--primary`. Logo/brand color (F-18) = `--primary`. Contrast: text >=4.5:1 both modes; gold accent on `--bg` >=3:1 for focus rings.

## Global standards
Type: Inter prose / mono numerics via vars; scale `--text-3xs:11px`(floor)->`--text-3xl`. Spacing `--space-*` only. Radius sm2/md4/lg8/pill100. Elevation sm/base/md/lg tokens — every floating surface uses one. Color: CSS tokens canonical, chart-theme derives; `--primary`=interactive only; no rgba color literals. No inline `style` literals for color/font/spacing in page files.

## Validation
- Grep: no `var(--x)` referencing an undefined var.
- Grep: no literal `'Inter'`/`'IBM Plex Mono'`/`'IBM Plex Sans'` families; no inline `fontSize:`/`borderRadius:`/hex/rgba in `app/**`,`components/**`.
- No-font-installed render test (F-03).
- Visual pass @ 1366/1440/1600/768/420px.
- Color-blind sim on tables/charts.
- reduced-motion + hover:none intact.
- Every floating surface casts a tokenized shadow.

**Done =** clean-font machine renders Inter+IBM Plex Mono; every referenced var defined; one each of color system / type scale / elevation / radius / icon set / loading language; no inline literals in page files; provenance intact.

---

## Product tasks (do after the visual/theme work)
Low-stakes, self-contained. Tick each box when done; don't delete this file.

- [ ] **D1 — About out of primary nav -> footer.** Remove About `nav-tab` from `Nav.tsx` (desktop + mobile); add About link to `site-footer` in `layout.tsx`. Keep `/about`.
- [ ] **D2 — Lazy-load OCR (tesseract.js).** Dynamic `import()` only inside the OCR path (`lib/importer/ocr.ts`) when a scanned/image file is imported; show "preparing OCR…". Text-PDF path must NOT load tesseract.
- [ ] **D3 — Privacy front-door signal.** One calm line/badge on home hero (`app/page.tsx`): lock glyph + "Runs entirely in your browser. Your data never leaves this device." Use `trust-badge` styling, no new colors.
- [ ] **D4 — Nav active-tab no layout shift.** Reserve the 2px active border on inactive tabs in `globals.css` `.nav-tab`. (= F-17)
- [ ] **D5 — Empty-state copy polish.** Update strings passed to `EmptyState` (not its API): headline names the space, one-line body, verb-first action, sentence case, no "Nothing here yet", no "!".
- [ ] **D6 — Consolidate number formatting.** One shared `fmtINR`/`fmtPct`/`fmtNum` (`lib/format.ts`); re-export from `memo-export.ts`, `chart-theme.ts`, `lib/calculations.ts`. No behavior change.

Rules: implement exactly as specced; preserve all principles above; no architectural changes; flag ambiguity instead of guessing. Ownership lanes are in `AGENTS.md` — don't touch architectural items owned by Claude/Codex (command palette, compare, nav restructure, workspace architecture) or restyle the command palette (`components/layout/CommandPalette.tsx`, mounted in `layout.tsx`, styles `.cmdk-*` + `.nav-cmdk-trigger` in `globals.css`).
