# Fundalyst

**A hybrid financial-analysis workspace for investment research.** Import financial statements from CSV, Excel, PDF, or screenshots and run valuation models, ratio analysis, peer comparisons, and filing reviews — all from one interface. Core analysis is local-first (no data leaves the device); optional backend services provide accounts, persistence, and document processing.

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
| Backend infrastructure (Phase 1) | ✅ Real — PostgreSQL, Prisma, Better Auth, BullMQ, Valkey |
| Command language v2 (prose → tool action) | ⏳ T16 — not started |
| Grounded AI explanations | ⏳ T14 — substrate built, not shipped |
| Multi-user / cloud / auth / RBAC | ⏳ Phase 2 — backend ready, UI pending |

## What it is NOT

- **Not a real-time data terminal.** No live prices, no market data feeds.
- **Not a cloud-only platform.** Core analysis works offline, client-side.
- **Not an AI product.** There is no LLM in the core loop. The AI substrate (workspace context store) is built for future use but no AI answer is shipped.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure (PostgreSQL + Valkey — optional, needed for backend features)
docker compose up -d

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your BETTER_AUTH_SECRET (openssl rand -base64 32)

# 4. Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate dev --name init

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000. Import a financial report → every tool pre-fills automatically.

For backend features (auth, accounts, persistence), ensure Docker is running and Prisma is migrated. The frontend-analysis-only workflow works without any backend.

## Doc map

For contributors and AI agents, start at `AGENTS.md` — it has the full doc map, hard rules, and agent coordination protocol.

## Design language

See `DESIGN.md` for the visual system: institutional minimalism, tokenised colours, mono-for-data, provenance-first.

## Stack

**Frontend:** Next.js 16 (App Router) · React 19 · TypeScript strict · Zustand + localStorage · Recharts · PDF.js · Vitest · Playwright · global CSS (tokens in `src/app/globals.css`). Windows: use `npm.cmd`.

**Backend (optional):** PostgreSQL 17 + PostGIS · Prisma 7 · Better Auth · BullMQ + Valkey · Zod · Docker Compose.
