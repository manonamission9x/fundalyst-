# Fundalyst

**A client-side financial-analysis workspace for investment research.** Import financial statements from CSV, Excel, PDF, or screenshots and run valuation models, ratio analysis, peer comparisons, and filing reviews — all from one interface. No backend, no sign-up, no data leaves the device.

## Who it's for

Individual equity-research analysts, value investors, and anyone who wants to run fundamental analysis on Indian-market (₹ Cr/Lakh) company filings without uploading data to a server or paying for a data terminal.

## What's real today

| Capability | Status |
|---|---|
| Import CSV / XLSX / PDF / screenshot / OCR / manual entry | ✅ Real |
| Filing comparison (period-over-period with highlights) | ✅ Real |
| Trend charts across periods | ✅ Real |
| Growth rates (CAGR, YoY) | ✅ Real |
| DCF valuation with sensitivity analysis | ✅ Real |
| Cash conversion cycle (DSO, DIO, DPO, CCC) | ✅ Real |
| Financial ratios (margin, ROE, leverage, turnover) | ✅ Real |
| Peer comparison (multi-company benchmarking) | ✅ Real |
| Research workspace with backup/restore | ✅ Real |
| Investment memo export (Markdown) | ✅ Real |
| Provenance + calculation trace on every result | ✅ Real — the product's differentiator |
| Multi-panel tiling workspace | ⏳ T17 — in progress |
| Command language v2 (prose → tool action) | ⏳ T16 — not started |
| Grounded AI explanations | ⏳ T14 — substrate built, not shipped |
| Multi-user / cloud / auth / RBAC | ❌ Not real — privacy promise |

## What it is NOT

- **Not a real-time data terminal.** No live prices, no market data feeds.
- **Not a cloud platform.** No account, no server upload, no multi-user.
- **Not an AI product.** There is no LLM in the core loop. The AI substrate (workspace context store) is built for future use but no AI answer is shipped.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Import a financial report → every tool pre-fills automatically.

## Doc map

For contributors and AI agents, start at `AGENTS.md` — it has the full doc map, hard rules, and agent coordination protocol.

## Design language

See `DESIGN.md` for the visual system: institutional minimalism, tokenised colours, mono-for-data, provenance-first.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Zustand + localStorage · Recharts · PDF.js · Vitest · Playwright · global CSS (tokens in `src/app/globals.css`). Windows: use `npm.cmd`.
