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

## What is NOT the problem
Small in-repo `.md` files that agents only read when referenced. They're cheap and save tokens overall by preventing re-explanation. The cost is *long threads* and *big reads held in context*, not having good docs.
