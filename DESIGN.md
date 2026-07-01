# Fundalyst Design Language

The single source of truth for Fundalyst's visual system. If a change contradicts
this document, either the change is wrong or this document needs updating first —
don't let the code drift silently.

All tokens live in `src/app/globals.css` under `:root` (dark, default) with light-mode
overrides in the `@media (prefers-color-scheme: light)` and `[data-theme="light"]` blocks.

---

## 1. Philosophy

**Trust comes from competence, not marketing.** The interface is a quiet instrument
for reading financial data, not a promotional surface.

- **Restraint over decoration.** No saturated fills, no gradients, no glossy shadows.
  Interactive weight comes from *inversion* (`--text` on `--bg`), never from a brand hue.
- **Provenance is visible.** Every value shows where it came from. Colour is reserved
  for meaning (up/down, source of a number), never for flair.
- **Monospace for data, sans for prose.** Numbers, labels, and codes are mono and
  tabular; body copy and headings are the Inter/system sans stack.
- **The page has one focal point.** On any screen, the primary action or the single
  "decision number" should win the eye. Supporting elements recede.

---

## 2. Colour

Use tokens **only** — never a raw hex or `rgb()` in a component. If you need a colour
that isn't here, add a token first.

### Neutrals
| Token | Use |
|---|---|
| `--bg`, `--bg-elevated`, `--bg-surface`, `--bg-field` | Surfaces, dark → light layering |
| `--bg-hover`, `--bg-active` | Interactive surface states |
| `--border`, `--border-light`, `--border-strong` | Dividers; `-light` recedes, `-strong` emphasises |
| `--border-focus` | Focus rings only |
| `--text`, `--text-secondary`, `--text-tertiary`, `--text-muted` | Text, most → least prominent |

### Accent
`--primary` (slate) is the **only** general accent — wayfinding and interactive hints.
It is never a fill behind text. `--primary-subtle` is the faint wash for active states.

### Semantic (meaning only)
| Token | Meaning |
|---|---|
| `--green` / `--green-strong` / `--green-subtle` | Positive, growth, "imported / ready" |
| `--red` / `--red-strong` / `--red-subtle` | Negative, risk, danger |
| `--caution` / `--caution-subtle` | Warning, "default assumption used" |
| `--violet` / `--violet-subtle` | **Provenance only** — the "inferred" badge. Not a general accent. |

**Rule:** semantic colours mark *state or meaning*, never brand identity. A success
banner is a subtle green wash with an accent rule (`.import-success`), not a green fill.

---

## 3. Typography

Two families: `--font-inter` (prose, headings) and `--font-ibm-plex-mono` (all numbers,
labels, codes). Numbers use `font-variant-numeric: tabular-nums`.

### The scale — use tokens, never raw `px`
| Token | Size | Use |
|---|---|---|
| `--text-nano` | 9px | **Data-viz microlabels only** (chart axes, single-char keys). Never body text. |
| `--text-micro` | 10px | Governed floor for mono uppercase labels & footnotes |
| `--text-3xs` | 11px | Smallest body/label text outside data-viz |
| `--text-2xs` | 12px | Dense table cells, meta |
| `--text-xs` | 13px | Secondary body, hints |
| `--text-sm` | 14.5px | Default body |
| `--text-base` | 16px | Emphasised body |
| `--text-lg` | 18px | Sub-headings, secondary metric display |
| `--text-xl` | 22px | Metric values |
| `--text-2xl` | 28px | Page titles |
| `--text-3xl` | 36px | Hero / the one "decision number" per tool page |

**Floor:** nothing below `--text-nano` (9px), and 9px is for data-viz only. Real body
text bottoms out at `--text-3xs` (11px). Weights: 400 default, 500 labels, 600 emphasis.

---

## 4. Spacing, radius, motion

- **Spacing** is a strict 4px grid: `--space-1`…`--space-12` (4→48px). No off-grid margins.
- **Radius:** `--radius-sm` 4px (inputs, chips, primary button), `--radius-md`/`--radius-lg`
  8px (cards, panels), `--radius-pill` for toggles.
- **Elevation:** the restrained `--shadow-sm/base/md/lg` scale. Cards use `--shadow-base`.
  No custom shadows, and never a coloured shadow.
- **Motion:** `--transition-fast` (0.12s) for state, `--transition` (0.18s) for larger
  changes. All hover effects are disabled under `(hover: none)` and `prefers-reduced-motion`.

---

## 5. Component patterns

- **Primary button** — `.btn-primary`. Inverted (`--text` on `--bg`), `--radius-sm`, 600
  weight. One per view. Auto-inverts in light mode.
- **Default / secondary button** — `.btn` (transparent, `--border-strong`, hover → `--primary`).
  `.btn-sm` for compact, `.btn-ghost` for the quietest tier.
- **Secondary CTA on marketing pages** — `.home-cta-ghost`: a quiet underlined text link,
  never a second bordered button competing with the primary.
- **Card** — `.card` + `.card-header` / `.card-body` / `.card-actions`. `--bg-elevated`,
  `--border`, `--shadow-base`.
- **Decision number** — `.hero-decision-value`: the single largest, sign-coloured number
  on a tool page (`.positive` / `.negative`).
- **Metric cell** — `.metric-cell` in `.metric-grid`; `.good` / `.warn` / `.neutral` map to
  green / red / caution.
- **Provenance badge** — `ProvenanceBadge`: imported=green, manual=slate, default=caution,
  inferred=violet, unavailable=muted.
- **Insight / warning cards** — left accent rule (`3px`/`2px`) in the semantic colour, subtle
  border otherwise. This is the canonical "coloured but restrained" pattern — copy it instead
  of filling a block with colour.

---

## 6. Do / Don't

- ✅ `background: var(--green-subtle); border-left: 3px solid var(--green);`
  ❌ `background: linear-gradient(135deg, #065f46, #047857);`
- ✅ `color: var(--text); background: var(--bg);` for a primary button
  ❌ a brand-hue fill behind button text
- ✅ `font-size: var(--text-micro);`  ❌ `font-size: 10px;` / `fontSize: 10`
- ✅ one focal element per screen (CTA or decision number)
  ❌ a hero CTA competing with an equally heavy preview card beside it
- ✅ colour = meaning (up/down, source)  ❌ colour = decoration

---

## 7. Cleanup backlog

Known drift not yet resolved (safe to tackle incrementally):

- **Inline-style sprawl** — `src/app/import/page.tsx` still carries layout-only inline
  styles (margins/flex in raw px). Migrate to `--space-*` tokens and utility classes.
  Other offenders: `components/ui/index.tsx`, `app/workspace/page.tsx`.
- **Dead CSS** — `.home-card*` and `.home-grid` rules are unused in TSX (superseded by
  `.home-tool-card` / `.home-preview`). Remove once confirmed no longer referenced.
- **Canvas colour** — `PdfViewer.tsx` sets a raw `#1a1a2e` canvas fill. Canvas can't read
  CSS vars directly; read it via `getComputedStyle` to respect the theme.
- **Off-grid pixel sizes** — a few `15/17/20px` display sizes were snapped to `--text-sm/-lg`;
  if a distinct "metric display" tier is wanted, define a token rather than reintroducing raw px.
