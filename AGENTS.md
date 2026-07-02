<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fundalyst — shared agent brief

**Canonical context for every agent (Claude, Codex, DeepSeek). Read this first. Don't duplicate it elsewhere — link here.**

Client-side financial-analysis app. **No backend, no auth, no server, no live market data** — all in-browser. Import a filing → review/accept extracted facts with provenance → the accepted dataset pre-fills every tool. Indian-market skew (₹ Cr/Lakh).

**Stack:** Next.js 16 (App Router) · React 19 · TS strict · Zustand + `localStorage` · Recharts · PDF.js · Vitest · Playwright · global CSS (tokens in `src/app/globals.css`). Windows: use `npm.cmd`.

**Routes:** `/` · `/workspace` · `/import` · `/research/{filing,trends,growth}` · `/tools/{dcf,wc,ratios,peer}` · `/about` · `/debug-import` (dev-only, unlinked).

## Doc map — one source of truth per topic (don't restate, link)
| Topic | Canonical file |
|---|---|
| Design language / tokens (read before any UI change) | `DESIGN.md` |
| Product state: real vs not, risks, verify steps | `HANDoFF.md` |
| UX/IA audit vs Godel + prioritized roadmap (deep rationale) | `FUNDALYST_DESIGN_AUDIT.md` |
| Implementation tickets from the audit (read this, not the audit) | `CODEX_TICKETS.md` |
| Visual/theme + product fix queue (checklist) | `DEEPSEEK_TASKS.md` |
| Multi-agent collaboration + token-saving workflow | `AGENT_COLLABORATION.md` |
| Reusable prompt templates for recurring work | `AGENT_PLAYBOOKS.md` |
| How to keep token usage low | `TOKENS.md` |
| xlsx advisory + mitigation | `docs/xlsx-risk-plan.md` |
| Human-facing overview | `README.md` |

## Key files
- Command palette (Cmd/Ctrl+K; nav + 3 actions today): `src/components/layout/CommandPalette.tsx`
- Global nav / dataset badge / theme: `src/components/layout/Nav.tsx`
- Workspace cockpit (has local-sim Governance/Audit/Integrations — flagged for removal): `src/app/workspace/page.tsx`
- Reference tool-page pattern: `src/app/tools/dcf/page.tsx` + `src/components/ui/index.tsx`
- Provenance/trace (the differentiator): `src/components/shared/{ProvenanceBadge,CalculationTrace}.tsx`, `src/lib/calculation-trace.ts`
- Shared data / model pre-fill (why tools behave as modules): `src/store/{global-data-store,financial-model-selectors,use-model-data}.ts`
- Pure financial engine (keep pure): `src/lib/calculations.ts` · Import pipeline: `src/lib/importer/*` · Export: `src/lib/memo-export.ts`

## Hard rules
- Obey `DESIGN.md`: use tokens, never raw hex/px/font literals in `app/**` or `components/**`.
- Keep `src/lib/calculations.ts` pure.
- No fake enterprise/backend claims; never store credentials in frontend/localStorage.
- Don't blindly `npm audit fix --force` (known `xlsx` advisory).
- Preserve Playwright route coverage; test affected routes when changing spreadsheet/backup behavior.
- Verify before done: `npm.cmd exec tsc -- --noEmit` · `npm.cmd run lint` · `npm.cmd run build`.

## Agent coordination
- **Claude & Codex — equal peers, full authority** over all work *including architecture* (command language, multi-panel workspace, nav restructure, compare/entity-pivot, provenance). Either can take any ticket in `CODEX_TICKETS.md`; they're used interchangeably.
- **DeepSeek** — self-contained visual/theme + product tasks per `DEEPSEEK_TASKS.md` only. No architectural changes; don't restyle the command palette.
- **Avoiding collisions (the only real constraint):** `CODEX_TICKETS.md` is the shared ledger both agents read *and* write. Claim a ticket by marking its box `[~] — <agent> <date>` before you start; scan for existing `[~]` marks before taking one (especially `[architectural]` T16–T18). That's how each agent sees what the other has open. Flip to `[x]` when done. Small independent tickets: same lightweight claim.
- **Rule:** implement, don't expand scope beyond the ticket; flag ambiguity instead of guessing; tick checklist boxes in the owning doc; don't delete task files.
