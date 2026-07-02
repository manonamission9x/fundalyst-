# Fundalyst agent collaboration

Use this file when Codex, Claude, and DeepSeek are working in parallel. It is a small coordination layer only; product context stays in `AGENTS.md`.

## First read

Read only:

1. `AGENTS.md`
2. This file
3. The one queue file for your lane:
   - Codex / Claude: `CODEX_TICKETS.md`
   - DeepSeek: `DEEPSEEK_TASKS.md`

Open `FUNDALYST_DESIGN_AUDIT.md` only for deep rationale on a specific ticket. Do not read the whole repo to get oriented.

## Lanes

- Codex and Claude are equal peers. Either can take any `CODEX_TICKETS.md` ticket, including architecture.
- DeepSeek owns visual/theme/product checklist work in `DEEPSEEK_TASKS.md`.
- If a change crosses lanes, leave a short note in `HANDoFF.md` before starting and summarize what files are likely to move.

## Claiming work

Before starting a ticket, edit its checkbox:

- `[ ]` open
- `[~] - <agent> <YYYY-MM-DD>` in progress
- `[x] - <agent> <YYYY-MM-DD>` done

Scan for `[~]` before taking anything. Do not touch another agent's in-progress ticket unless the user explicitly asks.

## Handoff shape

When pausing mid-work, add or update `HANDoFF.md` with:

- Current ticket/task ID
- Files touched
- What is done
- What is not validated
- Exact next command to run
- Any dirty files that are unrelated and must not be reverted

Keep it short. The goal is a restart note, not a diary.

## Token-saving rules

- Start a fresh conversation for each substantial task.
- Paste one playbook from `AGENT_PLAYBOOKS.md`, not a full audit section.
- Name specific files instead of saying "read the repo."
- Prefer queue files over long audit docs.
- Do not re-read large files unless the task depends on details inside them.
- After a verification-only pass, update checkboxes and report the remaining blockers instead of continuing to browse.

## Verification

For code changes, run:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run build
```

Run affected tests or Playwright routes when the touched ticket asks for them. For docs-only edits, say that no code validation was needed.
