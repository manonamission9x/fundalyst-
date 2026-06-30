# Fundalyst — Product Build Plan & Checklist

Master tracker. Two lanes: **DeepSeek** (low-stakes, well-specified, additive, low regression risk) and **Claude** (high-stakes, architectural, touches shared state/routing). Visual + theme work lives in `DEEPSEEK_TASKS.md` — this file is product/UX/IA on top of that.

---

## ALREADY BUILT — do NOT rebuild
Verified in source. These exist and work; only *surface/refine* them, never re-implement.

- [x] **Persistence** — `zustand/persist` on global data + every tool store (`store/global-data-store.ts`, `store/index.ts`). Survives refresh.
- [x] **Canonical "import-once" model spine** — `store/financial-model-selectors.ts` ("tools read, they don't store"). Every tool extracts from one `FundalystDataset`.
- [x] **Multi-dataset / multi-company** — `datasets[]` + `activeDatasetId` in global store.
- [x] **Investment memo / tearsheet export** — `lib/memo-export.ts` → full memo as Markdown + self-contained HTML (print-to-PDF ready), with provenance footnotes.
- [x] **Encrypted backup/restore** — `lib/enterprise-backup.ts` (AES-GCM, PBKDF2 150k, passphrase).
- [x] **Audit trail / governance / integrations** — `store/enterprise-store.ts`, surfaced in Workspace steps.
- [x] **Provenance / confidence / calc-trace** — `ProvenanceBadge`, `CalculationTrace`, `confidence.ts`.

**Implication:** the gaps are *discoverability, IA, and a few genuinely-missing surfaces* — not core engineering. Most value now is making the power already in the codebase reachable in <2 clicks, and removing the demo-data noise that hides it.

---

## CLAUDE LANE — high-stakes (I build these)
Architectural, touch shared state/routing, real regression risk. Done carefully, verified.

- [ ] **C1 · Command palette (Cmd-K)** — *genuinely missing.* Additive global overlay: jump to any tool, saved company (switch `activeDatasetId`), or metric. Fuzzy search, full keyboard nav, routes via `next/navigation`. Lowest regression risk of the lane (purely additive). Gold-theme styled. → biggest "terminal feel" win.
- [ ] **C2 · Remove demo-data injection + real empty states** — *highest-noise fix.* Strip hardcoded sample CSV/number defaults from every store in `store/index.ts` and the mount-injection logic in `research/filing/page.tsx`. Replace with genuine empty states + one explicit "Load sample company" action. Blast radius: all stores + tool pages → must verify each loads clean. Depends on nothing; unblocks the "users can't tell what's real" problem.
- [ ] **C3 · Multi-company compare** — *genuinely missing.* Peer Comparison currently reads only pasted CSV (`tools/peer/page.tsx` ignores saved datasets). Let it pull saved companies from the canonical model and rank them on any ratio. Reuses existing selectors.
- [ ] **C4 · Surface memo export + backup globally** — engine exists (`memo-export.ts`), buried in Workspace. Add a persistent "Export memo" affordance reachable from every tool (and the command palette). IA/wiring only — no new engine.
- [ ] **C5 · Nav IA restructure + Workspace identity** — collapse 9 flat tabs into grouped surfaces; decide Workspace = hub vs peer (today they overlap). Do LAST — highest blast radius (routing, active-state, mobile menu, every page's nav assumptions). Gate behind C1–C4 landing so we're not refactoring nav while other work is in flight.

**Build order:** C1 → C2 → C3 → C4 → C5. C1/C3 additive (safe first), C2 wide but mechanical, C5 last.

---

## DEEPSEEK LANE — low-stakes
**Lives entirely in `DEEPSEEK_TASKS.md`** (visual F-01→F-20, Terminal Gold + light theme, then product tasks D1–D6). That is the only file DeepSeek needs. He ticks boxes there as he goes — don't delete it; it's the change record. Don't feed him this file.

---

## Agreed sequence (no concurrent edits)
1. **DeepSeek runs his full lane** (`DEEPSEEK_TASKS.md`: visual + gold/light theme + D1–D6). ← in progress
2. **Claude builds C1–C5** (palette → demo-data cleanup → compare → memo surfacing → nav last). I pull DeepSeek's latest first, so I build on the renamed tokens/theme and his nav changes.
3. **DeepSeek re-runs his file** — picks up anything new/uncovered, finishes his part.
4. **Claude does a full framework audit** (architecture, types, dead code, perf, test coverage, regressions) — last.

## Status
- [x] Data-layer audit (corrected the product plan against real code)
- [ ] (1) DeepSeek lane — in progress
- [ ] (2) Claude lane C1–C5 — holding for step 1
- [ ] (3) DeepSeek second pass
- [ ] (4) Claude full framework audit

I (Claude) own C1–C5 and keep this file updated as each lands. DeepSeek owns D0–D6.
