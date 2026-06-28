# Fundalyst — "College Project" Signal Audit

**What makes this look like a student project instead of a trillion-dollar platform?**

Not the features. Not the architecture. The features are solid. The architecture is professional. What creates the "college project" impression is a set of specific naming, labeling, and UX choices that leak internal thinking to the user.

---

## Category 1: Implementation Details Visible to Users (6 signals)

### CP-1: "v0.1.0" in the Footer

**File:** `layout.tsx` (line 49)
**Text:** `Fundalyst v0.1.0`

**Why it screams college project:** Version numbers are for developers. No trillion-dollar product shows `v0.1.0` to users. It announces "this is early stage" every time someone looks at the bottom of the page. Stripe doesn't show "Stripe v3.2.1". Bloomberg doesn't show "Terminal v8.4".

**Fix:** Remove the version number entirely. The footer should be:
```
Your data never leaves your machine · For research purposes only. Not financial advice.
© 2026 Fundalyst
```

### CP-2: "Manual mode" Label in DataQualityBar

**Files:** DCF (line 215), WC (line 99), Ratios (line 159), Trends (line 103)
**Text:** `Manual mode`

**Why it screams college project:** "Manual mode" is a developer concept — the tool has two modes (auto-populated from model vs user-entered) and the code surfaces this distinction to the user. A trillion-dollar product just works. Users never need to know whether data came from an upload or manual entry.

**Fix:** Change to just the company name or remove entirely:
- `source={modelData.companyName || 'Manual entry'}` → `source={modelData.companyName || undefined}`
- If no company name, don't show "manual mode" — just show nothing or "Data entry"

### CP-3: "Model: CompanyName / Loaded" Source Labels

**Files:** Trends (line 103), DCF (line 215)
**Text:** `Model: ${modelData.companyName || 'Loaded'}`

**Why it screams college project:** "Model" is internal architecture. Users don't know or care about a "model". They loaded some data. It's either there or it isn't.

**Fix:** Just show the company name. Not "Model: Tata Motors". Just "Tata Motors".

### CP-4: "Data loaded globally" in Import Success Banner

**File:** `import/page.tsx` (lines 605-612)
**Text:** `✓ Data loaded globally` ... `${globalCount} datasets in memory`

**Why it screams college project:** "Globally" and "datasets in memory" are implementation details. No premium product tells users "your data is now in memory." It's just loaded. Done.

**Fix:**
```
✓ Import complete — 42 metrics across 5 periods
Available in all analysis tools
```

### CP-5: "enter at least Revenue and Net Profit" Hint

**File:** `tools/ratios/page.tsx` (line 172)
**Text:** `hint="Fill in at least Revenue and Net Profit"`

**Why it screams college project:** This sounds like minimum system requirements for software installation. "At least 4GB RAM required." A trillion-dollar product guides users without setting minimum bars.

**Fix:** `hint="Add Revenue and Net Profit to see net margin — add more for full ratio analysis"`

### CP-6: "Not financial advice" Is the Only Legal Disclaimer

**File:** `layout.tsx` (line 50)
**Text:** `For research purposes only. Not financial advice.`

**Why it screams college project:** One line of disclaimer. Compare to Bloomberg's 5,000-word legal page, or TradingView's comprehensive disclaimers. Financial software that doesn't take legal protection seriously looks like a hobby project. 

**Fix:** Expand the disclaimer section. Doesn't have to be 5,000 words in the footer, but the About page should have a proper legal section.

---

## Category 2: Abbreviation-Heavy, Internal-Tool Naming (7 signals)

### CP-7: "DCF" as a Nav Item and Page Title

**File:** `Nav.tsx` (line 19)
**Text:** `{ id: 'dcf', label: 'DCF', href: '/tools/dcf' }`

**Why it screams college project:** "DCF" is a financial acronym. While finance professionals know it, the nav label uses the shortest possible form — exactly what a developer building internal tools would do. A trillion-dollar product would say "Valuation" or "Intrinsic Value" — the outcome, not the method.

**Fix:** Change nav label to `Valuation` (or keep DCF as shorthand but have the page H1 say "Intrinsic Value Estimator")

### CP-8: "Cash" as a Nav Item

**File:** `Nav.tsx` (line 20)
**Text:** `{ id: 'wc', label: 'Cash', href: '/tools/wc' }`

**Why it screams college project:** "Cash" is too short and ambiguous. Cash what? Cash flow? Cash efficiency? Cash in the bank? The tool is about working capital and the cash conversion cycle. "Cash" as a single-word label screams internal developer shorthand.

**Fix:** `Cash Efficiency` (the tool's full title on the page)

### CP-9: "Peer" as a Nav Item

**File:** `Nav.tsx` (line 22)
**Text:** `{ id: 'peer', label: 'Peer', href: '/tools/peer' }`

**Why it screams college project:** "Peer" is financial jargon. "Peer Comparison" is fine. Just "Peer" is incomplete.

**Fix:** The nav item already links to "Peer Comparison" page — keep nav consistent with the full tool name.

### CP-10: "Ratios" as a Nav Item

**File:** `Nav.tsx` (line 21)
**Text:** `{ id: 'ratios', label: 'Ratios', href: '/tools/ratios' }`

**Why it screams college project:** Same issue. "Financial Ratios" is the tool name. "Ratios" alone sounds like a math homework tool.

**Fix:** Use full name or group under a category.

### CP-11: "Metric" Column Header in Spreadsheet

**File:** `SpreadsheetInput.tsx`
**Text:** The first column is labeled "Metric"

**Why it screams college project:** Financial spreadsheets don't say "Metric." They say "Line Item," "Account," or "Particulars" (Indian financial statements). "Metric" is a data science / developer term.

**Fix:** Change the corner label to "Line Item" or "Particulars"

### CP-12: "Q1 Q2 Q3 Q4" / "FY 23/24" / "Custom" Period Toggle

**File:** `research/filing/page.tsx` (lines 275-297)
**Text:** `{ label: 'Q1 Q2 Q3 Q4', ... }, { label: 'FY 23/24', ... }, { label: 'Custom', ... }`

**Why it screams college project:** These are template patterns that assume a specific structure. "Custom" is a developer fallback — "if none of the templates match, here's the generic option." A trillion-dollar product would let users name their own periods without offering rigid templates.

**Fix:** Remove the toggle entirely. Let users type period names in the spreadsheet header row. The period toggle is a crutch for when the spreadsheet didn't have inline header editing.

### CP-13: "Quick Company Check" Section Name

**File:** `page.tsx` (line 228)
**Text:** `Quick Company Check`

**Why it screams college project:** "Quick Check" sounds like a weekend hackathon feature name. It's informal, says nothing about what it does, and uses "Quick" which is overused in student projects. A trillion-dollar product would name it "Instant Health Overview" or "Company Snapshot."

**Fix:** `Company Snapshot` — more premium, still communicates speed without being informal.

---

## Category 3: CTA and Button Copy That Feels Like Internal Tools (4 signals)

### CP-14: "Open →" on Every Tool Card

**File:** `page.tsx` (line 220)
**Text:** `Open →`

**Why it screams college project:** "Open" is what you do to files in a file explorer. It tells the user nothing about what will happen. Every card says the same thing. This is a placeholder CTA from a template.

**Fix:** Outcome-specific CTAs:
- Filing Comparison → "Compare periods →" or "Run comparison →"
- DCF Valuation → "Value company →"
- Cash Efficiency → "Analyze cash →"
- Trend Charts → "Plot trends →"
- Growth Rates → "Calculate growth →"
- Financial Ratios → "View ratios →"
- Peer Comparison → "Compare peers →"

### CP-15: "Upload Data" / "Import more" Nav CTA

**File:** `Nav.tsx` (lines 80-83)
**Text:** `{activeDataset ? 'Import more' : 'Upload Data'}`

**Why it screams college project:** "Upload Data" is generic. Every web app has "Upload Data." The label toggles based on state, which is a detail most users won't notice and the state-dependent wording feels cobbled together.

**Fix:** `Import financials` — specific, outcome-oriented, doesn't toggle.

### CP-16: "Load sample companies" Button

**File:** `tools/peer/page.tsx` (line 165)
**Text:** `Load sample companies`

**Why it screams college project:** "Sample" is a development/testing concept. "Load sample data" is what you click when you're testing the app. A trillion-dollar product says "Try with example data" or "See how it works."

**Fix:** `Try with example data` — frames it as a demonstration, not a debug action.

### CP-17: "Try with sample data →" on Home Page and Import Page

**Files:** `page.tsx` (line 191), `import/page.tsx` (line 187)
**Text:** `Try with sample data →`

**Why it screams college project:** Same issue as CP-16. If you have sample data, frame it as a demo, not a test. 

**Fix:** `See it in action →` or `Try an example →`

---

## Category 4: Half-Finished Features (3 signals)

### CP-18: Workspace Page Does Nothing

**File:** `workspace/page.tsx` (all 464 lines)
**Issue:** The Workspace is a nav wrapper. Filing, DCF, and Ratios panels just show a description and link to the real tool. Only the Thesis panel has unique functionality. This page exists but doesn't do anything.

**Why it screams college project:** A page that was started but never finished is the single strongest "college project" signal. It tells users "this product is incomplete."

**Fix:** Either remove from nav entirely, or build real content:
- Show a dashboard of key metrics from loaded data
- Show quick links to the most relevant tools based on what data exists
- Or just redirect to the tools they already have

### CP-19: Investment Thesis Panel Uses Raw HTML Textarea + localStorage

**File:** `workspace/page.tsx` (lines 368-463)
**Issue:** The thesis editor is a bare `<textarea>` with placeholder text and direct `localStorage.getItem()` calls (not through Zustand).

**Why it screams college project:** A plain textarea with placeholder text looks like a prototype. And accessing localStorage directly instead of through the store breaks the architectural pattern used everywhere else.

**Fix:** 
- Use a contentEditable div or styled textarea
- Move localStorage access to a Zustand store (like everything else)
- Add character count, auto-save indicator

### CP-20: No 404 Page

**File:** `loading.tsx` exists but no `not-found.tsx` is visible

**Why it screams college project:** Every professional product has a custom 404. The default Next.js 404 page is a dead giveaway that design was not a priority.

**Fix:** Create `app/not-found.tsx` with a clean 404 page.

---

## Category 5: Trust-Building Gaps (3 signals)

### CP-21: No "Last Calculated" Timestamp on DCF Page

**File:** `tools/dcf/page.tsx` (DCFResults component)
**Issue:** The Filing page shows `CalcTimestamp` (line 470). DCF does NOT. But DCF stores are ephemeral (no persist), so a timestamp is MORE important for DCF than for Filing.

**Why it screams college project:** Inconsistent trust signals. Filing gets a timestamp, DCF doesn't. Users notice these gaps. Either all tools show timestamps, or none do.

### CP-22: Filled Button on Import Page Is Inconsistent

**File:** `import/page.tsx` (line 168-170)
**Issue:** The import page has a `<span className="upload-label">` that acts like a filled button, while all other buttons in the product are ghost-style. This one button has a primary-color background and white text.

**Why it screams college project:** One filled button among 50 ghost buttons is a design inconsistency that signals "this page was designed by a different person."

### CP-23: "Smart Import" Name Trend

**File:** `import/page.tsx` (page title and references)
**Text:** "Smart Import"

**Why it screams college project:** Naming things "Smart [X]" is a classic student project pattern. "Smart Calendar," "Smart Todo," "Smart Import." It tries to sound advanced but actually signals lack of specificity. Bloomberg doesn't call its data importer "Smart Import."

**Fix:** Just "Import" — simpler, more professional. Or "File Import" if disambiguation is needed.

---

## Category 6: Visual and Behavioral Tells (5 signals)

### CP-24: Generic Loading Skeleton

**File:** `loading.tsx`
**Text:** Three gray rectangles with shimmer animation.

**Why it screams college project:** A generic skeleton with no branding, no structure, and no relationship to the actual page content. Next.js default skeleton pattern.

**Fix:** A branded skeleton that shows the nav bar, page title area, and content area with proper proportions for each route.

### CP-25: "No data" Workspace Status

**File:** `workspace/page.tsx` (lines 55-58)
**Text:** `No data` with a muted dot.

**Why it screams college project:** "No data" is what a console.log says. A trillion-dollar product would say "Start by importing a company" or hide the status entirely when there's nothing to report.

**Fix:** Remove the status badge when there's no data. Show a prompt instead.

### CP-26: Confidence Badges Show Low Scores to Users

**File:** `import/page.tsx` (ConfidenceBadge component, line 703)
**Issue:** The badge shows "60%" in amber, "20%" in red. Users see low confidence scores.

**Why it screams college product:** Showing "this data might be wrong" as a prominent badge erodes trust. If confidence is below 80%, the system should either auto-correct, ask for manual input, or silently use a lower weight — not show a red badge screaming "I'm not sure about this."

**Fix:** Show confidence badges only for high-confidence (>80%) mappings. For low confidence, show a softer "Review needed" indicator instead of a percentage.

### CP-27: "Results update instantly as you type" Note

**File:** `page.tsx` (line 134)
**Text:** `Results update instantly as you type. For full analysis, use the tools above.`

**Why it screams college project:** This is explaining the technology — "look, it's reactive!" — instead of the benefit. Users don't need to be told the app updates. They'll notice.

**Fix:** Remove. Or replace with "For a deeper analysis, open any tool above."

### CP-28: "Metric" Label on Import Quality Summary

**File:** `import/page.tsx` (lines 399-414)
**Text:** `42 metrics mapped (80%)` / `3 unmapped` / `5 ignored`

**Why it screams college project:** "Unmapped" and "ignored" are filter/processing terms. They describe what the system did, not what the user should do. A trillion-dollar product would say "3 items need review" or "5 items were skipped."

**Fix:** `42 items matched` / `3 need review` / `5 skipped`

---

## Category 7: Missing Premium Finishes (4 signals)

### CP-29: No Tool-Specific Page Descriptions for SEO

**File:** All pages use `usePageTitle()` which only sets `document.title`. The pages don't export `metadata` or `generateMetadata`.

**Why it screams college project:** The About page has proper `export const metadata` (Server Component), but every Client Component page relies only on `document.title`. No meta descriptions, no Open Graph tags for individual tools. This is an incomplete SEO setup.

**Fix:** Create a metadata hook or export `generateMetadata` from each page.

### CP-30: Inline SVG Favicon (Data URI)

**File:** `layout.tsx` (line 26)
**Text:** `url: 'data:image/svg+xml,...'`

**Why it screams college project:** An inline SVG favicon works, but it's what you do when you haven't bothered to create a proper favicon.ico or PNG. Every platform Slack, Discord, browser tabs — they all show this tiny inline icon instead of a proper multi-resolution favicon.

**Fix:** Generate a proper favicon pack (favicon.ico + PNG + SVG) and place in `public/`.

---

## SUMMARY: The 10 Biggest College-Project Tells

| # | Signal | File | Fix Difficulty |
|---|--------|------|----------------|
| 1 | **"v0.1.0" in footer** | `layout.tsx:49` | 2 min |
| 2 | **"Manual mode" / "Model:" labels** | Every tool page | 5 min |
| 3 | **"Open →" on every card** | `page.tsx:220` | 5 min |
| 4 | **Abbreviated nav (DCF, Cash, Peer, Ratios)** | `Nav.tsx:19-22` | 5 min |
| 5 | **"Metric" column header** | `SpreadsheetInput.tsx` | 2 min |
| 6 | **Workspace page does nothing** | `workspace/page.tsx` | 30 min (remove) |
| 7 | **"Quick Company Check" name** | `page.tsx:228` | 2 min |
| 8 | **"Load sample companies" / "Try with sample data"** | Multiple pages | 5 min |
| 9 | **"Data loaded globally" banner** | `import/page.tsx:605` | 5 min |
| 10 | **Generic loading skeleton** | `loading.tsx` | 15 min |

---

## The One-Line Test

For every string of text in the UI, ask:

> "Would this exact label appear in Bloomberg Terminal, Stripe Dashboard, or Linear?"

If the answer is no — change it.

- Bloomberg: never says "manual mode"
- Stripe: never says "v0.1.0"  
- Linear: never says "Open →" on every card
- TradingView: never says "sample data"

**Fix the labels. The architecture is already trillion-dollar. The copy is what's holding it back.**
