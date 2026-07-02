# Keeping token use low

Why tokens disappear fast, and the habits that fix it. Ranked by impact.

## The one thing that matters most
**Every message re-sends the entire conversation.** A long thread bills its whole history on *every* new turn, so a session that has read big files and run many tools gets expensive fast — even for a tiny follow-up question.

→ **Start a fresh conversation for each new task.** This is the single biggest lever. Don't run one endless thread across unrelated work.

## Fixed overhead you can't change
The system prompt + tool definitions load every turn. That's a floor. It means *short sessions with few big reads* are far cheaper than long ones — plan around it.

## Habits that cut usage (high → low impact)
1. **New thread per task.** (see above)
2. **Name specific files, not "the repo."** "Read `Nav.tsx`" costs a page; "read the repo" costs everything.
3. **Point to the small file.** Hand agents `CODEX_TICKETS.md` (a few KB), not `FUNDALYST_DESIGN_AUDIT.md` (~48 KB ≈ 12k tokens re-billed each turn it stays in context).
4. **Don't re-read files you just edited.** The tools track file state; re-reading to "check" wastes tokens.
5. **Keep auto-loaded files tight.** `CLAUDE.md` → `AGENTS.md` load every session. They're already lean — keep them that way; link to detail, don't inline it.
6. **Use the playbooks.** `AGENT_PLAYBOOKS.md` templates are pre-scoped to the right files, so you don't re-paste context.
7. **Batch a task's questions upfront** instead of many small back-and-forths (each round-trip re-bills history).
8. **Prune dead docs.** Duplicate/stale `.md` files get read and re-read. One source of truth per topic (see the `AGENTS.md` doc-map).

## Quick diagnostics
- Run `/context` to see what's consuming the window right now.
- If a thread feels sluggish/expensive, that's the signal to start fresh and re-anchor with one playbook + one file.

## Fundalyst-specific diagnosis

This project gets expensive when a single chat mixes many lanes:

- architecture discussion
- backend setup
- Prisma/npm repair
- audit/security checks
- frontend implementation
- design review
- broad doc updates

When those happen in one thread, every follow-up has to carry the whole history. The repo itself is not huge; the expensive part is the **long-lived agent context** plus large files like `FUNDALYST_DESIGN_AUDIT.md`, `HANDOFF_SPREADSHEET_DATAFLOW.md`, and full command outputs.

## New-thread bootstrap

Use this when starting a fresh Codex/Claude/Cursor task:

```text
Repo: C:\Users\kingo\Desktop\fundalyst-next
Read only:
1. AGENTS.md
2. HANDoFF.md
3. The specific file(s) for this task

Task:
<one concrete change>

Constraints:
- Do not read the whole repo.
- Do not read large audits unless directly needed.
- Use rg for targeted search.
- Before editing, tell me which files you will touch.
- Verify with the smallest relevant command first.
```

For backend work, add:

```text
Also read BACKEND.md and DATABASE.md. Do not run npm audit fix --force.
```

For UI work, add:

```text
Also read DESIGN.md and the target component/page only.
```

For bug fixes, add:

```text
Start by reproducing or locating the failing code. Do not refactor unrelated files.
```

## Platform notes

| Platform | Token-saving move |
|---|---|
| Codex desktop | Start a new thread per ticket; ask it to read `AGENTS.md` + the target file only. |
| Claude Code | Avoid broad "scan the project" prompts; mention exact paths and run `/context` when usage jumps. |
| Cursor | Disable broad auto-context for narrow edits; include only the relevant files in context. |
| ChatGPT | Do not paste entire docs repeatedly; paste the compact bootstrap plus exact error/output. |

## Current Fundalyst context packet

As of 2026-07-02:

- App: Next.js 16, React 19, TypeScript, Zustand, local-first financial analysis.
- Backend direction: optional Next.js API backend with future Python workers if document extraction needs it.
- Database direction: Prisma/Postgres has been introduced, but the local-first privacy promise remains.
- Security note: `npm audit fix --force` is unsafe here because it attempts to downgrade Next to 9.3.3 and Prisma to 6.19.3; do not run it.
- Known unresolved advisory: `xlsx` has no npm fix available; keep current mitigations in `docs/xlsx-risk-plan.md`.

## What is NOT the problem
Small in-repo `.md` files that agents only read when referenced. They're cheap and save tokens overall by preventing re-explanation. The cost is *long threads* and *big reads held in context*, not having good docs.
