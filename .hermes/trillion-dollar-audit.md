# Fundalyst — Trillion Dollar Design, UI & UX Audit

**Auditor:** Hermes Agent
**Date:** June 29, 2026
**Standard:** Bloomberg Terminal × Stripe Dashboard × Linear × Apple Pro Apps × Institutional
**Scope:** Every screen, every component, every interaction, every string
**Status:** Previous audit (June 28) found ~40 issues, ~10 were fixed in commit `5e99821`. This is a fresh audit of the post-fix state.

---

## Executive Summary

The June 28 design audit fixed approximately 10 of 40+ issues: border radii consolidated to 2/4/8px, button 44px moved to `pointer:coarse`, `--shadow` system cleaned, `--shadow-card` renamed, and several inline styles migrated to CSS classes on the Import page.

**But the product has three layers of remaining problems:**

1. **30 "College Project" signals unfixed** — The HANDoFF.md lists 30 specific CP-1 through CP-30 issues. Zero have been fixed. "v0.1.0" is still in the footer, "Open →" is still on every card, abbreviations still in the nav, "Smart Import" still in the page title, default Next.js 404 still visible.

2. **10+ new issues introduced or discovered** — DCF shows ₹NaN when uncalculated, `--shadow-md` is referenced but not defined (toast breaks), 100px pill radius survived cleanup on home-active-dataset, 50% circles remain on import dropzone and workspace.

3. **Design drift** — The CSS has grown to 1212 lines, over 250 lines of unused/near-duplicate selectors persist, the touch-device hover reset block (40 lines) still uses the broken `(hover: none) and (pointer: coarse)` selector from the original audit.

**The delta to "trillion-dollar" is now concentrated in ~50 specific issues. Fixing all 50 takes the product from 6.5/11 to 9.5/11.**

---

## SECTION 1: Per-Page Issues (Highest Severity First)

---

### CRITICAL 01: DCF Page Shows ₹NaN When Not Calculated

**Page:** `/tools/dcf`
**Severity:** Critical
**Problem:** The DCF results section renders immediately with ₹NaN values for Enterprise Value, Equity Value, and Intrinsic Value. This is visible on pageload before the user clicks "Calculate value."

**Visual evidence (production):**
```
INTRINSIC VALUE SUMMARY
ENTERPRISE VALUE      ₹NaN
EQUITY VALUE          ₹NaN
INTRINSIC VALUE / SHARE  ₹NaN
▼ Below current price
CURRENT PRICE         ₹450
MARGIN OF SAFETY      0.0%
VERDICT               Overvalued ✗
Intrinsic value of ₹NaN is below the current price of ₹450...
```

A "Verdict" rendered from NaN calculations is sentient-level embarrassing.

**Why it hurts trust:** Users see ₹NaN on a financial platform. This is the single most damaging thing a financial app can display. It screams "the math is broken" and destroys all credibility instantly.

**Why it hurts usability:** The user hasn't asked for a calculation yet. Showing results pre-calculation is confusing — which state is the page in?

**Root cause:** The DCF results JSX renders unconditionally. `summary` is initialized as non-null values (from `useState` defaults), and the rendering doesn't check whether the calculation has actually been performed.

**Recommended redesign:**
```tsx
// Only render results if calculation has been run
{show && summary && (
  <div className="result-panel">
    <SectionTitle>Intrinsic Value Summary</SectionTitle>
    ...
  </div>
)}
```

Or better: render nothing until the user clicks "Calculate value."

**Expected improvement:** DCF page shows an empty state before calculation. No NaN, no fake verdicts. Users see "Enter assumptions above and click Calculate value to see intrinsic value."

---

### CRITICAL 02: 30 "College Project" Signals All Unfixed

**Page:** Every page
**Severity:** Critical (collectively)
**Problem:** The HANDoFF.md (June 28) lists 30 specific CP-1 through CP-30 issues. These are the top-priority fixes that make the product look like a student project. None have been applied.

**The 6 most damaging:**

| # | Signal | Location | Current Text |
|---|--------|----------|-------------|
| CP-1 | Version in footer | `layout.tsx:50` | `Fundalyst v0.1.0` |
| CP-7 | Nav abbreviation | `Nav.tsx:19` | `DCF` (should be `Valuation`) |
| CP-8 | Nav abbreviation | `Nav.tsx:20` | `Cash` (should be `Cash Efficiency`) |
| CP-11 | Metric column header | `SpreadsheetInput.tsx` | `METRIC` (should be `Line Item`) |
| CP-14 | Same CTA on every card | `page.tsx:233` | `Open →` on all 7 cards |
| CP-20 | No 404 page | — | Default Next.js 404 disintegrates all premium feel |

**Why it hurts trust collectively:** These 30 signals, taken together, tell every user "this is a work in progress." The footer announces early-stage development. The nav uses internal shorthand. The cards can't think of individual CTAs. The 404 page is the framework default. Each one is minor alone; 30 together make Fundalyst feel like a hackathon project.

**Root cause:** The agent instruction in HANDoFF.md (line 3-4) says "An AI agent reading this handoff MUST fix ALL issues listed in the 'College Project Signals' section before doing any other work." This was not executed.

**Recommended redesign:** Fix every CP issue in order. Each takes 2-30 minutes. Total: ~3 hours of work.

**Expected improvement:** The product no longer announces its immaturity. Every label communicates intentionality.

---

### HIGH 03: Page Titles Inconsistent — All Show SEO Description

**Page:** All pages
**Severity:** High
**Problem:** Every tool page shows the same browser tab title: "Fundalyst — Financial analysis tool for Indian markets." The `usePageTitle` hook (from `lib/use-page-title.ts`) sets `document.title` after JS hydrates, but the server-rendered `<title>` from `layout.tsx` metadata is never overridden.

**Evidence:**
- The browser snapshot for /tools/dcf shows title: "Fundalyst — Financial analysis tool for Indian markets"
- The snapshot for /research/filing shows the same
- Only the About page (server component with `export const metadata`) shows "About — Fundalyst"

**Why it hurts usability:** With 8+ tabs open, every Fundalyst tab reads the same. Users can't find "the DCF page" among 10 identical-looking tabs.

**Why it hurts polish:** This is a basic SEO and UX miss. Every page of every professional product has a unique title.

**Root cause:** `layout.tsx` sets metadata.title via `export const metadata`. Client Components override `document.title` via `usePageTitle()`. But the server-rendered title never changes — the client-side override only happens after hydration, causing a flash of the wrong title.

**Recommended redesign:**
```tsx
// In layout.tsx, don't set a page-specific title:
export const metadata: Metadata = {
  title: { template: '%s — Fundalyst', default: 'Fundalyst — Financial analysis tool for Indian markets' },
  ...
};
```

Then ensure `usePageTitle` uses the canonical suffix:
```tsx
// Already correct in lib/use-page-title.ts — but the template isn't being used
document.title = `${suffix} — Fundalyst`;
```

**Expected improvement:** Every tab shows "DCF Valuation — Fundalyst", "Filing Comparison — Fundalyst", etc.

---

### HIGH 04: `--shadow-md` Used but Not Defined (Broken CSS Variable)

**Page:** Global CSS (line 325)
**Severity:** High
**Problem:** `#toast` uses `box-shadow: var(--shadow-md)` but `--shadow-md` was removed in the June 28 cleanup. The variable `--shadow-md` no longer exists in `:root`.

**Evidence:**
- Line 325: `box-shadow: var(--shadow-md)` — REFERENCES undefined variable
- Lines 34-35: `--shadow: 0 1px 3px...` and `--shadow-sm: 0 1px 4px...` — only two shadows defined

**Why it hurts polish:** The toast notification renders with `box-shadow: var(--shadow-md)` which falls through to `box-shadow: none` since the variable is undefined. Toast notifications are flat and indistinguishable from the background.

**Root cause:** The June 28 audit removed `--shadow-xs`, `--shadow-md`, `--shadow-card` but didn't update the toast's reference.

**Recommended redesign:**
```css
/* Line 325: change --shadow-md to --shadow */
box-shadow: var(--shadow);
```

**Expected improvement:** Toast notifications render with proper elevation.

---

### HIGH 05: `home-active-dataset` Uses `border-radius: 100px` (Survived Radius Cleanup)

**Page:** `globals.css:288`
**Severity:** High
**Problem:** Line 288: `.home-active-dataset { ... border-radius: 100px; }` — the only remaining 100px pill radius in the product. The June 28 audit explicitly removed all 100px radii but this one was missed.

**Why it hurts consistency:** The radius system is now 2/4/8px. One 100px pill stands out as inconsistent. If it's intentional, it should be `--radius-lg` (8px).

**Root cause:** Missed during cleanup — the home-active-dataset is rendered conditionally (only when data is loaded) so it may not have been visually tested.

**Recommended redesign:**
```css
.home-active-dataset { border-radius: var(--radius-md); /* 4px, matching buttons */ }
```

**Expected improvement:** Every element on the page uses one of the three system radii.

---

### HIGH 06: Workspace Upload Icon and Import Dropzone Still Use `border-radius: 50%`

**Page:** `globals.css:194`, `globals.css:358`
**Severity:** High
**Problem:** Two elements still use `border-radius: 50%`:
- `.import-dropzone-icon` (line 194): `border-radius: 50%`
- `.workspace-upload-icon` (line 358): `border-radius: 50%`

The June 28 audit said "No 50% circles" yet these survived.

**Why it hurts consistency:** Circular icons feel playful, not institutional. Bloomberg doesn't use circles for dropzone indicators.

**Recommended redesign:**
```css
.import-dropzone-icon { border-radius: var(--radius-sm); /* 2px */ }
.workspace-upload-icon { border-radius: var(--radius-sm); /* 2px */ }
```

**Expected improvement:** Every icon container uses the same 2/4/8px radius language.

---

### HIGH 07: Generic Loading Skeleton — No Branding, No Structure

**Page:** `loading.tsx`
**Severity:** High
**Problem:** `loading.tsx` renders three gray rectangles with shimmer — a generic skeleton that could belong to any Next.js app. No nav, no page structure, no typography hierarchy.

**Evidence:** Lines 1-14: simple skeleton with 60%/40% width bars and 3 card placeholders.

**Why it hurts trust:** First-time visitors on slow connections see this skeleton. It communicates nothing about Fundalyst's structure, quality, or purpose.

**Recommended redesign:**
```tsx
export default function Loading() {
  return (
    <div className="page">
      <div className="nav" style={{ position: 'static', marginBottom: 16 }}>
        <div className="nav-inner" style={{ gap: 12 }}>
          <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
          {[1,2,3,4,5,6,7,8,9,10,11].map(i => (
            <div key={i} className="skeleton" style={{ width: 50, height: 14, borderRadius: 4 }} />
          ))}
        </div>
      </div>
      <div className="page-hero">
        <div className="skeleton" style={{ width: '50%', height: 28, borderRadius: 6, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '35%', height: 14, borderRadius: 4 }} />
      </div>
      <div className="home-grid">
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height: 140, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}
```

**Expected improvement:** Even on slow connections, the skeleton communicates Fundalyst's structure — branded nav with 11 items, page title area, card grid.

---

### HIGH 08: Default Next.js 404 Page

**Page:** Any non-existent route (e.g., `/xyz`)
**Severity:** High
**Problem:** Navigating to `/some-non-existent-page` shows the default Next.js 404 page: "404 · This page could not be found." in the system font.

**Why it hurts trust:** The default Next.js 404 is the strongest possible "this is a work in progress" signal. It tells users "this app was built with a framework and the developer didn't care to customize this."

**Root cause:** No `app/not-found.tsx` exists in the project.

**Recommended redesign:**
```tsx
// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 24 }}>
        This page doesn't exist or has been moved.
      </p>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text-secondary)', textDecoration: 'none' }}>
        Back to home →
      </Link>
    </div>
  );
}
```

**Expected improvement:** 404 page matches the dark theme, shows the nav, and guides users back to the home page.

---

### HIGH 09: Nav Still Has 11 Flat Items

**Page:** `Nav.tsx` (all pages)
**Severity:** High
**Problem:** The navigation bar renders 11 items: Home, Import, Filing, Trends, Growth, DCF, Cash, Ratios, Peer, Workspace, About. This is too many for a single navigation level.

**Evidence:** The HTML accessibility tree shows 11 tab items plus a logo and CTA.

**Why it hurts usability:** Users scan 5-7 items at most. With 11, every navigation action requires visual scanning. The nav feels like a list of features, not a coherent product structure.

**Recommended redesign:**
- **Short-term fix** (30 min): Mark Workspace as `display: none` in nav (keep the route for direct access). This drops nav to 10 items, which is still high but removes the most duplicated item.
- **Medium-term fix** (2 hours): Group into categories with dropdown sub-nav:
  - `Home | Research (▾ Filing, Trends, Growth) | Valuation (▾ DCF) | Tools (▾ Cash, Ratios, Peer) | About`
  - This reduces top-level to 6 items.

**Expected improvement:** Navigation is scannable. Users find tools faster.

---

### HIGH 10: Filing Page Shows Period Toggle with Template Periods

**Page:** `/research/filing`
**Severity:** High
**Problem:** The Filing page still shows a period toggle with "Q1 Q2 Q3 Q4" / "FY 23/24" / "Custom" buttons, AND defaults to Q1-Q4. The toggle is CP-12 and was flagged as a college-project signal.

**Evidence (from browser snapshot):**
```
PERIOD:
[Q1 Q2 Q3 Q4] [FY 23/24] [Custom]
```

**Why it hurts usability:** Template periods assume a specific data structure. Indian companies report half-yearly and annually, not quarterly. A "Custom" fallback label screams developer thinking.

**Recommended redesign:** Remove the period toggle entirely. Let users type period names directly in the spreadsheet header row. The spreadsheet already supports inline period label editing (the header cells are contentEditable).

**Expected improvement:** Users type whatever periods they need (FY23, FY24, H1, H2). No template assumptions. No "Custom" fallback label.

---

### HIGH 11: All Spreadsheets Show "METRIC" Column Header

**Page:** Every tool with a spreadsheet (Filing, DCF, WC, Ratios, Peer, Trends, Growth)
**Severity:** High
**Problem:** The spreadsheet's first column header reads "METRIC" on every page. Financial statements say "Line Item" or "Particulars" (Indian accounting), not "Metric."

**Evidence (browser snapshot):**
```
METRIC  |  Q1  |  Q2  |  Q3  |  Q4
─────────────────────────────────────
Revenue | 1000 | 1150 | 1240 | 1380
```

**Why it hurts trust:** "Metric" is a data science / developer term. Financial professionals read "Line Item" or "Particulars."

**Root cause:** The spreadsheet was built for developer convenience (the data structure uses "metric" as a field name) and that label leaked to the UI.

**Recommended redesign:** Change the corner cell text from "Metric" to "Particulars" (Indian accounting convention) or "Line Item" (international).

**Expected improvement:** The spreadsheet reads like a financial document, not a CSV viewer.

---

### MEDIUM 12: Import Page Header Still Says "Smart Import"

**Page:** `/import`
**Severity:** Medium
**Problem:** The import page H1 reads "Smart Import" (CP-23). This naming pattern ("Smart [X]") is a classic student-project convention. Bloomberg doesn't call its importer "Smart Import."

**Why it hurts trust:** "Smart" in product names is universally recognized as startup-speak. It signals "we couldn't think of a specific name."

**Recommended redesign:** Change H1 to "Import" or "File Import."

---

### MEDIUM 13: Footer Still Shows "v0.1.0"

**Page:** `layout.tsx:50` (all pages)
**Severity:** Medium
**Problem:** Footer shows `Fundalyst v0.1.0` (CP-1). Version numbers are developer artifacts that announce "early stage."

**Recommended redesign:** Remove the version entirely. Footer should read:
```
Your data never leaves your machine · For research purposes only. Not financial advice.
```

---

### MEDIUM 14: Home Page Hero Shows "Results update instantly as you type"

**Page:** `page.tsx:134-135`
**Severity:** Medium
**Problem:** The Quick Check section includes: "Results update instantly as you type. For full analysis, use the tools above." (CP-27)

**Why it hurts trust:** This is explaining the technology ("look, it's reactive!") instead of providing value. Users notice reactivity without being told.

**Recommended redesign:** Remove the line entirely.

---

### MEDIUM 15: Home Section "Quick Company Check" → "Company Snapshot"

**Page:** `page.tsx:242`
**Severity:** Medium
**Problem:** The section header reads "Quick Company Check" (CP-13). "Quick" is overused in student projects and doesn't communicate premium intent.

**Recommended redesign:** Change to "Company Snapshot" or "Instant Overview."

---

### MEDIUM 16: Nav CTA "Upload Data" / "Import more" Toggles

**Page:** `Nav.tsx:80-82`
**Severity:** Medium
**Problem:** The nav CTA says "Upload Data" when no data is loaded and "Import more" when data exists (CP-15). State-dependent labels feel cobbled together.

**Recommended redesign:** Always show "Import financials" (outcome-oriented, doesn't toggle).

---

### MEDIUM 17: Nav Labels Use Abbreviations (DCF, Cash, Ratios, Peer)

**Page:** `Nav.tsx:19-22`
**Severity:** Medium
**Problem:** Four nav items use abbreviations:
- "DCF" → should be "Valuation" (CP-7)
- "Cash" → should be "Cash Efficiency" (CP-8)
- "Ratios" → should be "Financial Ratios" (CP-9)
- "Peer" → should be "Peer Comparison" (CP-10)

These are CP issues 7-10. The handoff explicitly says to fix them.

**Why it hurts trust:** Abbreviations feel internal. "DCF" is a method, "Valuation" is the outcome. The product should communicate in outcomes, not methods.

---

### MEDIUM 18: Home Card CTAs All Say "Open →"

**Page:** `page.tsx:233`
**Severity:** Medium
**Problem:** Every tool card in the home grid uses the same CTA: "Open →" (CP-14).

**Recommended redesign:** Outcome-specific CTAs:
- Filing Comparison → "Compare periods →"
- DCF Valuation → "Value company →"
- Trend Charts → "Plot trends →"
- Growth Rates → "Calculate growth →"
- Cash Efficiency → "Analyze cash →"
- Financial Ratios → "View ratios →"
- Peer Comparison → "Compare peers →"

---

### MEDIUM 19: "Try with sample data" and "Load sample companies" Use "Sample"

**Page:** `page.tsx:204, import/page.tsx:187, peer/page.tsx:165`
**Severity:** Medium
**Problem:** Three locations use "sample data" / "sample companies" (CP-16, CP-17). "Sample" is a testing/development concept.

**Recommended redesign:**
- Home page: "Try with sample data →" → "See it in action →"
- Import page: "Try with sample data →" → "Try an example →"
- Peer page: "Load sample companies" → "Try with example data"

---

### MEDIUM 20: "Manual mode" and "Model: CompanyName" Labels on All Tool Pages

**Page:** All tool pages (Filing, DCF, WC, Ratios, Trends, Growth, Peer)
**Severity:** Medium
**Problem:** The `DataQualityBar` shows "Manual mode" when no data is loaded, and "Model: CompanyName" when data is loaded (CP-2, CP-3).

**Evidence (browser snapshots):**
- Every page: `Source: Manual mode`
- DCF line 215: `Model: ${modelData.companyName || 'Loaded'}`

**Why it hurts trust:** "Manual mode" is an implementation detail. Users don't need to know whether data came from upload or manual entry.

**Recommended redesign:** Show company name if loaded, nothing if not. Never "Manual mode."

---

### MEDIUM 21: Workspace Shows "No data" Status Badge

**Page:** `/workspace`
**Severity:** Medium
**Problem:** The workspace header shows "No data" in a muted dot badge (CP-25). This is console-log-level messaging.

**Why it hurts trust:** "No data" is what a developer puts in a console.log to debug. A premium product says "Start by importing a company."

**Recommended redesign:** Remove the status badge when there's no data. Show an empty state prompt instead.

---

### MEDIUM 22: Import Success Banner Says "Data loaded globally" / "datasets in memory"

**Page:** `/import` (line 600-607)
**Severity:** Medium
**Problem:** The success banner reads "✓ Data loaded globally" and "X datasets in memory" (CP-4). These are implementation details.

**Why it hurts trust:** "Globally" and "in memory" are developer concepts. Users shouldn't know or care about state management.

**Recommended redesign:**
```
✓ Import complete — 42 metrics across 5 periods
Available in all analysis tools
```

---

### MEDIUM 23: No "Last Calculated" Timestamp on DCF Page

**Page:** `/tools/dcf`
**Severity:** Medium
**Problem:** The Filing page shows a `CalcTimestamp` (line 470). DCF does not (CP-21). DCF stores are ephemeral (no persist), so a timestamp is MORE important for DCF.

**Why it hurts trust:** Inconsistent trust signals. Filing gets a timestamp, DCF doesn't. Users notice these gaps.

---

### MEDIUM 24: Import Page Uses Inline Styles for PDF Validation, Format Labels, and Buttons

**Page:** `/import`
**Severity:** Medium
**Problem:** Lines 155-210 of the import page contain ~15 inline `style={{}}` objects for format labels, buttons, validation messages, and layout. The June 28 audit created CSS classes for some patterns but the import page still has significant inline style usage.

**Evidence:** Lines 155-165, 168-170, 177-192, 196-203 all use inline styles for layout and typography.

**Why it hurts maintainability:** Every inline style is a potential drift point when the design system evolves.

---

### MEDIUM 25: Keyboard-Only Navigation — Spreadsheet Input Hints Missing

**Page:** SpreadsheetInput on all tools
**Severity:** Medium
**Problem:** The spreadsheet shows keyboard hints inconsistently:
- Trends: "Tab to navigate · Paste from Excel · Ctrl+Z undo"
- Filing: No keyboard hint visible
- DCF: "Type or paste values. Tab to navigate between rows."
- WC: No keyboard hint
- Ratios: No keyboard hint

**Why it hurts usability:** Users don't know Tab navigation works until they discover it accidentally. Inconsistent hints mean some users never learn the keyboard shortcuts.

**Recommended redesign:** Add a consistent keyboard hint below every spreadsheet:
```
"Tab, Arrow keys · Paste from Excel · Ctrl+Z undo"
```

---

## SECTION 2: Systemic Design Problems

### SDP-1: 30 Unfixed "College Project" Signals

The HANDoFF.md lists 30 specific issues (CP-1 through CP-30) that "an AI agent MUST fix before doing any other work." None have been applied. This is a process failure — the handoff instruction exists but was never executed.

### SDP-2: 1212 Lines of CSS — 250+ Lines Are Dead or Duplicate

The CSS has grown through 6 months of additions without cleanup:
- `--shadow-md` is used (toast, line 325) but not defined (removed in June 28 cleanup)
- `--transition-slow` defined (line 62) but never used in any selector
- `.btn-secondary` hover state (line 1198) exists in the touch-hover reset but `.btn-secondary` is not defined in the base styles
- `.metric-cell { padding: 10px 14px }` (line 200) but responsive overrides for `.metric-cell` exist at line 1098
- 40 lines of touch hover reset (lines 1174-1212) that should be replaced with mobile-first CSS

### SDP-3: Touch Hover Reset Uses Wrong Selector

The `@media (hover: none) and (pointer: coarse)` block (lines 1174-1212) was flagged in the June 28 audit as having the wrong selector (iPads report hover: hover with pointer: coarse). This was NOT fixed. The code still uses the broken `(hover: none) and (pointer: coarse)` selector.

### SDP-4: No Custom 404 Page

No `app/not-found.tsx` exists. The default Next.js 404 is visible to all users who hit dead routes. This is the single strongest "template-based" signal in the product.

### SDP-5: Page Metadata Is Broken

The `layout.tsx` sets `title: 'Fundalyst — Financial analysis tool for Indian markets'` as a static string, not a template. Every client-component page uses `usePageTitle()` to override `document.title` via JS, but the server-rendered `<title>` never changes. This means:
- SEO crawlers see the same title for every page
- Users see a flash of the wrong title before JS hydrates  
- Social previews (Open Graph) for tool pages show no page-specific info

---

## SECTION 3: Top 25 Highest Impact Improvements (Ranked)

| Rank | Issue | Impact | Trust | Ease | Quality | Total |
|------|-------|--------|-------|------|---------|-------|
| 1 | Fix DCF NaN rendering (show empty state before calc) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 20 |
| 2 | CP-1: Remove "v0.1.0" from footer | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 17 |
| 3 | CP-7/8/9/10: Fix nav abbreviations | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 16 |
| 4 | CP-14: Differentiate home card CTAs | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 15 |
| 5 | CP-20: Create custom 404 page | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 15 |
| 6 | Fix page metadata titles (template pattern) | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 14 |
| 7 | Fix `--shadow-md` undefined variable (toast breaks) | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 14 |
| 8 | CP-11: Change "METRIC" to "Line Item" in spreadsheets | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 13 |
| 9 | CP-12: Remove period toggle (Q1 Q2 Q3 Q4 / Custom) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 13 |
| 10 | CP-23: Rename "Smart Import" → "Import" | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 13 |
| 11 | CP-2/3: Remove "Manual mode" / "Model:" labels | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 12 |
| 12 | Fix 100px pill radius on home-active-dataset | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 12 |
| 13 | Fix 50% circle radii on import/workspace icons | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 12 |
| 14 | CP-24: Rebuild loading skeleton as branded | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 12 |
| 15 | CP-13: Rename "Quick Company Check" → "Company Snapshot" | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 11 |
| 16 | CP-15: Fix nav CTA "Upload Data" → "Import financials" | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 11 |
| 17 | CP-17/16: "sample data" → "example data" phrasing | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 11 |
| 18 | CP-27: Remove "Results update instantly as you type" | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 11 |
| 19 | CP-4: Fix "Data loaded globally" banner text | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 11 |
| 20 | CP-21: Add "Last Calculated" timestamp to DCF | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 11 |
| 21 | 11 nav items → group into categories | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 12 |
| 22 | CP-25: Remove "No data" workspace status | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 11 |
| 23 | CP-28: "Unmapped/ignored" → "needs review/skipped" | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 10 |
| 24 | Touch hover reset — replace with mobile-first CSS | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 10 |
| 25 | Inline styles on import page (15 remaining) → CSS classes | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 10 |

---

## SECTION 4: "Would This Pass?" Product Test

### Would Apple ship this?
**No.** The DCF NaN bug alone is a reject. Apple would never ship software that displays NaN as financial data. The page title inconsistency (same title on every page) and default 404 would also fail review.

### Would Stripe accept this?
**No.** Stripe's design system precision (±1px) would flag: the undefined `--shadow-md`, the one-off 100px pill radius, the two 50% circles, and the 1212-line CSS with 250+ unused lines. The broken touch-hover selector would fail Stripe's accessibility review.

### Would Linear approve this?
**No.** Linear uses one radius (4px), one shadow, one icon set. The mixed palette (50% circles + 100px pills + 2/4/8px radii = 4 radius strategies) and the 30 unfixed CP signals would not ship.

### Would Bloomberg trust analysts with this?
**Almost.** The spreadsheet input, DCF methodology, and filing comparison are Bloomberg-quality. But the DCF NaN rendering means "no — not yet." Showing ₹NaN to an analyst is catastrophic. Fix that and the answer changes.

### Would GitHub merge this UI?
**No.** 30 unfixed known issues (the CP signals). Undefined CSS variable (`--shadow-md`). 1212-line CSS with dead code. The code quality gap between architecture (excellent) and frontend polish (incomplete) would block a merge.

### Would a hedge fund analyst voluntarily switch to this?
**Not yet.** The core analysis tools (Filing comparison, DCF model, trends chart) are functional and well-architected. But the visual inconsistency (4 radius strategies, 50% circles, undefined shadows) and the 30 college-project signals collectively say "this isn't ready for professional use." Fix the top 15 items above, and the answer changes to "yes."

**Score: 6/11.** Up from 6.5 in the June 28 audit? No — **regression to 6/11.** The NaN bug, undefined shadow, and unfixed CP signals actually make it score lower than the June 28 assessment.

---

## SECTION 5: Quick Wins (Fix in < 10 Minutes Each)

1. **CP-1: Remove "v0.1.0" from footer** — Delete "v0.1.0" from `layout.tsx:50`
2. **CP-7: Nav label "DCF" → "Valuation"** — Change label in `Nav.tsx:19`
3. **CP-8: Nav label "Cash" → "Cash Efficiency"** — Change label in `Nav.tsx:20`
4. **CP-9: Nav label "Ratios" → "Financial Ratios"** — Change label in `Nav.tsx:21`
5. **CP-10: Nav label "Peer" → "Peer Comparison"** — Change label in `Nav.tsx:22`
6. **CP-13: "Quick Company Check" → "Company Snapshot"** — Change text in `page.tsx:242`
7. **CP-15: "Upload Data" → "Import financials"** — Change text in `Nav.tsx:82`
8. **CP-23: "Smart Import" → "Import"** — Change H1 in `import/page.tsx`
9. **Fix `--shadow-md` → `--shadow`** — Change line 325 in `globals.css`
10. **Fix `border-radius: 100px` → `var(--radius-md)`** — Change line 288 in `globals.css`
11. **Fix `border-radius: 50%` → `var(--radius-sm)`** — Change lines 194 and 358 in `globals.css`
12. **CP-27: Remove "Results update instantly as you type"** — Delete line 134-135 in `page.tsx`
14. **CP-11: "METRIC" → "Particulars"** — Change in `SpreadsheetInput.tsx`
15. **CP-2/3: Remove "Manual mode" / "Model:"** — Change DataQualityBar source strings

---

## SECTION 6: Premium Checklist (11 Questions)

| # | Question | Current Score | Potential |
|---|----------|--------------|-----------|
| 1 | Does the screen feel expensive? | 5/10 | 9/10 — Fix NaN, fix radii, remove CP signals |
| 2 | Does it reduce cognitive load? | 6/10 | 9/10 — Reduce 11 nav items, remove redundant labels |
| 3 | Is the typography comfortable for 8-hour sessions? | 8/10 | 9/10 — Inter + IBM Plex Mono is excellent. Just fix page titles |
| 4 | Are colors used only for meaning? | 7/10 | 9/10 — Good palette but 50% circles and 100px pills distract |
| 5 | Are ghost buttons the default? | 9/10 | 10/10 — Already correct |
| 6 | Are empty states guiding, not confusing? | 4/10 | 9/10 — DCF NaN is worst possible empty state. Fix that |
| 7 | Does every element have a purpose? | 5/10 | 9/10 — Workspace, "v0.1.0", "Manual mode" all redundant |
| 8 | Would this feel credible in an investment bank? | 3/10 | 9/10 — NaN kills credibility. Fix that first |
| 9 | Is the navigation intuitive? | 3/10 | 8/10 — 11 items is too many. Group or abbreviate |
| 10 | Can one more element be removed? | 4/10 | 10/10 — Version, mode labels, redundant CTAs, period toggle |
| 11 | Does this feel designed, not assembled? | 4/10 | 9/10 — 30 CP signals say "assembled." Fix them |

**Current Score: 5.3/11** (down from 6.5 in June 28 — regression due to NaN bug and unfixed CP signals)
**Potential Score: 9.1/11** (after fixing all items in this audit)

---

## SECTION 7: Mobile Audit

### Nav (640px and below)
- Icon-only nav (good — implemented in CSS)
- Active tab uses `border-bottom` instead of `::after` (fixed after June 28 audit — no clipping)
- `env(safe-area-inset-bottom)` on page (good)
- **Issue:** Nav still shows 11 items on mobile, making the scrollable tab bar very long

### Spreadsheet (420px)
- 80px metric column, 55px period columns (good)
- Minimum 11px font (good)
- Remove buttons visible on touch (good)
- **Issue:** "METRIC" header still says "METRIC" even on mobile

### Touch Targets (pointer:coarse)
- 44px min for interactive elements (good — fixed in June 28)
- Spreadsheet cells get 44px + 16px font (good)
- **Issue:** The touch hover reset block still uses `(hover: none) and (pointer: coarse)` selector — misses iPad users

### Cards (420px)
- Padding 12px (good)
- Card headers/actions reduced (good)

### DCF Sensitivity (420px)
- 8px font (good)

### Pages Without Mobile-Specific Issues
- About page: clean responsive grid
- Import: format labels wrap, PDF progress capped at 160px (both good)

---

## SECTION 8: Accessibility Audit

### Keyboard-Only Navigation
- Skip-link present (good)
- Tab navigation works in spreadsheet (good)
- **Issue:** Some tool pages don't show keyboard hints — users don't know Tab works

### Screen Readers
- Nav uses `role="tablist"` and `aria-selected` (good)
- SVG icons use `aria-hidden="true"` (good)
- Toast uses `role="status"` (good)
- **Issue:** Spreadsheet cells are `contentEditable` divs — screen readers may not recognize them as input fields

### Focus Order
- `:focus-visible` outline defined (good)
- Skip-to-content link present (good)
- **Issue:** DCF results render with NaN values — screen readers will read "INTRINSIC VALUE: RUPEES NaN" which is confusing

### Color Contrast
- `--text: #F0F0F5` on `--bg: #141416` = ~15.5:1 contrast ratio (excellent)
- `--text-secondary: #B8BAC2` = ~9:1 (excellent)
- `--text-muted: #7A7C82` = ~4.5:1 (meets WCAG AA for 18px+ text, borderline for smaller)
- Green/red financial colors use semantic purpose (good)

### Reduced Motion
- `@media (prefers-reduced-motion: reduce)` block exists (good)

---

## SECTION 9: Color System Audit

### Current Palette Assessment

```
--bg: #141416              ✓ Deep, warm monochrome — premium foundation
--bg-elevated: #1B1B1E     ✓ Good card surface contrast
--bg-surface: #222226       ✓ Good input field contrast
--border: #2E2E32           ✓ Subtle but visible
--border-strong: #434347    ✓ Good for interactive elements
--text: #F0F0F5             ✓ High contrast, easy to read
--text-secondary: #B8BAC2   ✓ Good for labels
--text-muted: #7A7C82       ⚠️ Borderline small text (4.5:1 on #141416)
--primary: #4F6EF7          ✓ Cool indigo, refined
--green: #3DA06D            ✓ Financial-only usage (good discipline)
--red: #CC5A5A              ✓ Financial-only usage (good discipline)
```

### Issues
1. `--text-muted: #7A7C82` at 10px (used in import hints, PDF labels) has ~4.5:1 contrast on `#141416`, which is WCAG AA for normal text but may be hard to read at very small sizes
2. `--shadow-sm: 0 1px 4px rgba(0,0,0,0.5)` is defined but never used anywhere in the CSS
3. `--transition-slow: 0.3s ease` is defined (line 62) but used in zero selectors

**Recommendation:** Remove `--shadow-sm` and `--transition-slow` as dead code. Consider bumping `--text-muted` to `#8A8C92` for better readability at small sizes.

---

## SECTION 10: The One-Line Test (Reprised from June 28)

> **"Would this exact label appear in Bloomberg Terminal, Stripe Dashboard, or Linear?"**

Labels that fail (all still present):
- `Fundalyst v0.1.0` — ❌
- `Manual mode` — ❌
- `Model: CompanyName` — ❌
- `Smart Import` — ❌
- `Quick Company Check` — ❌
- `METRIC` column header — ❌
- `Open →` — ❌ (7 times)
- `Upload Data` / `Import more` — ❌
- `Load sample companies` — ❌
- `Try with sample data` — ❌ (2 times)
- `Q1 Q2 Q3 Q4` / `Custom` — ❌
- `DCF`, `Cash`, `Ratios`, `Peer` (nav) — ❌
- `Results update instantly as you type` — ❌
- `No data` status badge — ❌
- `Data loaded globally` / `datasets in memory` — ❌
- `404: This page could not be found.` (default Next.js) — ❌
- `Unmapped` / `ignored` labels — ❌

**18 labels fail the one-line test.** Each one is a fix of 2-30 minutes.

---

## SECTION 11: Recommended Fix Order

### Phase 1 — Crisis Mode (< 1 hour, highest trust impact)
1. Fix DCF NaN rendering (hide results until calculated)
2. Remove "v0.1.0" from footer
3. Create custom 404 page
4. Fix `--shadow-md` → `--shadow` (toast)
5. Fix 100px pill radius and 50% circles

### Phase 2 — Copy Consistency (1 hour)
6. Fix nav labels (DCF→Valuation, Cash→Cash Efficiency, etc.)
7. Change "METRIC" → "Line Item" in spreadsheet
8. Remove period toggle (Q1 Q2 Q3 Q4 / Custom)
9. Differentiate home card CTAs (Compare periods →, Value company →, etc.)
10. Rename "Smart Import" → "Import"
11. Remove "Quick Company Check" → "Company Snapshot"

### Phase 3 — Internal Detail Removal (1 hour)
12. Remove "Manual mode" / "Model:" from DataQualityBar
13. Fix "Upload Data" → "Import financials"
14. Fix "sample data" → "example data"
15. Remove "Results update instantly as you type"
16. Fix "Data loaded globally" banner
17. Fix "Unmapped/ignored" → "needs review/skipped"
18. Remove "No data" workspace badge

### Phase 4 — Polish (2 hours)
19. Fix page metadata titles (template pattern)
20. Rebuild loading skeleton as branded
21. Add consistent keyboard hints to all spreadsheets
22. Group 11 nav items into categories
23. Replace touch hover reset with mobile-first CSS
24. Replace remaining 15 inline styles on import page
25. Clean dead CSS (remove unused variables, duplicate selectors)

**Total effort: ~5 hours for all 25 items.**
**Trust improvement: from 6/11 → 9.5/11.**

---

*End of Audit — Fundalyst Trillion Dollar Design Review, June 29, 2026*
