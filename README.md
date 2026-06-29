# Fundalyst

Fundalyst is a financial analysis workspace for investment research. Import financial statements from CSV, Excel, PDF, or screenshots and run valuation models, ratio analysis, peer comparisons, and filing reviews — all from one interface.

## Features

- **Import financial data** — Upload CSV, XLSX, PDF, or screenshot files. Extract structured financial metrics automatically.
- **Filing Comparison** — Compare reporting periods side by side with automated highlight of revenue growth, margin changes, debt shifts, and risk flags.
- **Trend Charts** — Visualize financial trends across periods.
- **Growth Rates** — Calculate CAGR and YoY growth rates for key metrics.
- **DCF Valuation** — Estimate intrinsic value per share using projected free cash flows with sensitivity analysis across terminal growth and discount rates.
- **Cash Efficiency** — Analyze working capital and cash conversion cycles.
- **Financial Ratios** — Compute profitability, leverage, and efficiency ratios from imported financial data.
- **Peer Comparison** — Benchmark company metrics against industry peers.
- **Research Workspace** — Track your research workflow, write investment theses, and manage datasets from a single cockpit.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start. Import financial data, then use the analysis tools in the nav.

## Tech

Built with [Next.js](https://nextjs.org), React, Zustand for state management, and PDF.js for document extraction.
