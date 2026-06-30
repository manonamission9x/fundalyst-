# Fundalyst — Fix Queue (implementer spec)

Implement, don't redesign. One token = one place. Preserve: tabular-nums+mono numerics, ghost-only buttons, muted semantic colors, single indigo accent, static charts (`isAnimationActive={false}`), provenance/confidence/data-quality system, a11y (focus-visible, reduced-motion, hover:none, 44px touch, 16px mobile inputs).

## P0 — silent failures (broken now)
- **F-01** `--shadow-md` is used (`globals.css:881` context-menu, `:967` suggestions) but never defined → those surfaces have no shadow. Define `--shadow-md` in `:root` + full elevation scale (sm/base/md/lg).
- **F-02** `--font-mono` is used in inline styles (`ui/index.tsx:455,471,524`; `import/page.tsx` ~15×; `PdfViewer.tsx:252,263,297,379`; `ProvenanceBadge.tsx:38`) but never defined → those render in Inter, not mono. Define `--font-mono` in `:root`.
- **F-03** Fonts loaded via `next/font` as `--font-inter`/`--font-ibm-plex-mono` (`layout.tsx`), but `globals.css` uses literal `'Inter'`/`'IBM Plex Mono'` family names → optimized fonts may never apply (falls to system/sans). Route `body` + all mono rules through the CSS vars. Validate on a machine with no fonts installed: computed `body` font must be the Next family, not `sans-serif`.
- **F-20** `layout.tsx:35` renders `<div className="bg-noise">` with no matching CSS (texture is `body::before`). Remove it.

## P1 — consistency
- **F-06** `chart-theme.ts:71` uses `IBM Plex Sans` (never loaded). Use Inter var.
- **F-07** Two color systems: `globals.css` tokens vs hardcoded hex in `chart-theme.ts:8-29`. They disagree — `--primary #4F6EF7` (UI) vs `CHART_COLORS.primary #7BA1D0` (charts). Make chart-theme derive from CSS tokens; if charts intentionally differ, name `--chart-accent`.
- **F-08** `ui/index.tsx:527-540` hardcodes off-palette `rgba(245,158,11…)`/`rgba(34,197,94…)`/`rgba(148,163,184…)`. Replace with `--amber`/`--green`/muted tokens.
- **F-04** Inline `fontSize:8/9/10/11` bypass the scale (`import/page.tsx:193,217,400,431,464`; badges in `ui/index.tsx`). Add `--text-3xs:11px`; replace raw px with tokens.
- **F-10** `import/page.tsx` + `PdfViewer.tsx` built from inline `style={{}}` literals. Migrate to classes/tokens. No inline px/color/font in page files.

## P2 — polish
- **F-09** `.nav` bg `rgba(13,13,15,0.98)` ≠ `--bg #141416`. Derive nav bg from `--bg`.
- **F-11** Off-scale radii (`borderRadius:10/3`, pills). Add `--radius-pill:100px`; tokenize all.
- **F-05** Mono text drops to 7-9px on mobile (`globals.css:1202,1257,1331,1348`). Floor: 11px data / 10px labels.
- **F-12** Inline one-off spinner (`ui/index.tsx:374`). Promote to shared `.spinner`.
- **F-16** Charts have no empty/loading/error state. Add shared wrapper (skeleton→empty→error→chart) reusing existing `state-card`/`empty-state`.
- **F-14** Change cells encode gain/loss by color alone. Make sign/arrow mandatory (color-blind: ~8% of audience).

## P3 — brand/cleanup
- **F-19** Remove unused `@keyframes skeleton-pulse` (`globals.css:521`); one shimmer.
- **F-17** `.nav-tab.active` adds 2px bottom border others lack → layout shift. Reserve the space.
- **F-13** Two custom icon sets + lucide. Standardize on the custom currentColor set; one stroke/size spec.
- **F-18** Brand color `#4F6EF7` hardcoded in 3 places (`layout.tsx`, `Nav.tsx`). Tokenize; make one shared logo component.

## Theme re-skin — dark default (Terminal Gold) + light mode
Folds into F-07/F-08: define these as the single token source; charts derive from them. Two themes via `:root` (dark default) + `:root[data-theme="light"]`; add a toggle, respect `prefers-color-scheme`. **Build order: ship Terminal Gold (dark) fully first; add the light theme second once the dark token set is stable.** **Collision rule:** gold accent = wayfinding/interactive ONLY — never for data. Gain=green, Loss=red, Caution=burnt-orange (distinct hue from gold so accent never reads as a status).

**Dark (default):**
`--bg #0E0E0F` · `--bg-elevated #161617` · `--bg-surface #1D1D1F` · `--bg-hover #242426` · `--bg-field #131314` · `--border #29292B` · `--border-strong #3C3C3F` · `--text #EDEDE8` · `--text-secondary #B6B5AE` · `--text-tertiary #908F88` · `--text-muted #76756E` · `--primary #C8962E` / hover `#DCA93C` / subtle `rgba(200,150,46,.07)` · `--green #3DA06D` · `--red #CC5A5A` · `--caution #C2703D` / subtle `rgba(194,112,61,.08)`

**Light (`[data-theme="light"]`):**
`--bg #FAF9F6` · `--bg-elevated #FFFFFF` · `--bg-surface #F3F1EC` · `--bg-hover #ECEAE3` · `--bg-field #FFFFFF` · `--border #E2E0D8` · `--border-strong #CBC8BD` · `--text #1A1A1A` · `--text-secondary #4A4A45` · `--text-tertiary #6E6C64` · `--text-muted #86847C` · `--primary #B07D1F` / hover `#946716` / subtle `rgba(176,125,31,.08)` · `--green #1E7A4C` · `--red #B23A3A` · `--caution #B0612E`

Migration: every current `--amber*` use → `--caution*` (it was both brand-ish and warning; now warning only). `--border-focus` follows `--primary`. Logo/brand color (F-18) = `--primary`. Verify contrast: text ≥4.5:1 on its surface in both modes; gold accent on `--bg` ≥3:1 for focus rings.

## Global standards (apply throughout)
Type: Inter prose / mono numerics via vars; scale `--text-3xs:11px`(floor)→`--text-3xl`. Spacing: `--space-*` only. Radius: sm2/md4/lg8/pill100. Elevation: sm/base/md/lg tokens, every floating surface uses one. Color: CSS tokens canonical, chart-theme derives; `--primary`=interactive only; no rgba color literals. No inline `style` literals for color/font/spacing in page files.

## Validation
- Grep: no `var(--x)` referencing an undefined var (diff uses vs `:root`).
- Grep: no literal `'Inter'`/`'IBM Plex Mono'`/`'IBM Plex Sans'` families; no inline `fontSize:`/`borderRadius:`/hex/rgba in `app/**`,`components/**`.
- No-font-installed render test (F-03).
- Visual pass @ 1366/1440/1600/768/420px.
- Color-blind sim on tables/charts.
- reduced-motion + hover:none intact.
- Every floating surface casts a tokenized shadow.

**Done =** clean-font machine renders Inter+IBM Plex Mono; every referenced var defined; one each of color system / type scale / elevation / radius / icon set / loading language; no inline literals in page files; provenance system intact.

---

## Product tasks (do after the visual/theme work above)
Low-stakes, self-contained. Tick each box when done; don't delete this file.

- [x] **D1 — Move "About" out of primary nav → footer.** Remove the About `nav-tab` from `Nav.tsx` (desktop tabs + mobile overlay); add an About link to `site-footer` in `layout.tsx`. Keep the `/about` route. Done: no About tab in nav; footer links to it.
- [x] **D2 — Lazy-load OCR (tesseract.js).** Dynamic `import()` tesseract only inside the OCR path (`lib/importer/ocr.ts`), triggered when the user imports a scanned/image file; show a small "preparing OCR…" state. Text-PDF path must NOT load tesseract. Done: initial bundle excludes tesseract; OCR still works on demand.
- [x] **D3 — Privacy front-door signal.** Add one calm line/badge to the home hero (`app/page.tsx`): lock glyph + "Runs entirely in your browser. Your data never leaves this device." Use existing `trust-badge` styling/tokens, no new colors. Done: home shows it, no mobile regression.
- [x] **D4 — Nav active-tab no layout shift.** Reserve the 2px active border on inactive tabs (transparent border or inset shadow) in `globals.css` `.nav-tab`. Done: switching tabs causes zero vertical shift. *(same as F-17)*
- [x] **D5 — Empty-state copy polish.** Update strings passed to `EmptyState` (don't change its API): headline names the space, one-line body, verb-first action, sentence case, no "Nothing here yet", no exclamation marks. Done: every empty state reads as an invitation.
- [x] **D6 — Consolidate number formatting.** One shared `fmtINR`/`fmtPct`/`fmtNum` module; re-export from `memo-export.ts`, `chart-theme.ts`, `lib/calculations.ts`. No behavior change. Done: single implementation imported everywhere.

Rules: implement exactly as specced; preserve all design principles above; no architectural changes; if a spec is ambiguous, flag it instead of guessing. Claude owns the high-stakes work (command palette, demo-data removal, compare, nav restructure) separately — don't touch those.
