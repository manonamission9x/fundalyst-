# Fundalyst — agent playbooks

Copy-paste prompt templates for recurring work, so you don't re-explain context each time. Each already points agents at the right files, which keeps context small. Fill the `<...>` slots.

**Token habit:** paste the *specific* playbook + name the *specific* files. Never say "read the repo" or "read the whole audit."

---

## P1 — Kick off a Codex ticket
```
Read AGENTS.md, then implement <T-id> from CODEX_TICKETS.md exactly as specced.
Touch only the files listed in that ticket. Obey DESIGN.md (tokens; no raw hex/px/font in app/** or components/**).
Don't redesign; flag ambiguity instead of guessing.
When done, run: npm.cmd exec tsc -- --noEmit && npm.cmd run lint && npm.cmd run build, and the affected Playwright routes.
Report only: files changed, the diff summary, and verification output.
```

## P2 — Kick off a DeepSeek task
```
Read AGENTS.md, then do <F-id/D-id> from DEEPSEEK_TASKS.md.
Implement exactly as specced — no architectural changes. Don't touch Claude-owned items or restyle the command palette.
Preserve: tabular-nums mono numerics, ghost-only buttons, muted semantic colors, single accent for interactivity, provenance/confidence system, a11y.
Tick the checkbox in DEEPSEEK_TASKS.md when confirmed against live code.
```

## P3 — Update the handoff (run after any meaningful change)
```
Update HANDoFF.md: set "Last updated" to <date>. Under "Recently Completed" add a 1-2 line entry for <what changed>.
Move any now-shipped item out of "Known Risks / Later Work". Keep it terse — no duplication of AGENTS.md/DESIGN.md.
Then output the 3-line summary a fresh agent needs to resume.
```

## P4 — Turn a new audit item into a ticket
```
From FUNDALYST_DESIGN_AUDIT.md item <ref>, write one CODEX_TICKETS.md entry:
- [ ] Tn — <title> [owner] <target files>
  <what to build, imperative, ≤4 lines>
  Done: <acceptance criteria>
Match the existing ticket format. Don't paste audit prose; distill.
```

## P5 — Design-token compliance check
```
Grep app/** and components/** for violations of DESIGN.md:
inline fontSize:/borderRadius:/hex/rgba/font-family literals; var(--x) referencing an undefined token.
List each hit with file:line and the token it should use. Don't fix yet — just the report.
```

## P6 — Pre-merge verification (use a subagent for high-stakes)
```
Verify the pending diff: npm.cmd exec tsc -- --noEmit, npm.cmd run lint, npm.cmd run build,
and Playwright for the affected routes (/, /workspace desktop+mobile, and any changed tool route).
Confirm no provenance/trace regressions and no new inline literals. Report pass/fail per check.
```

## P7 — Start a NEW conversation for a new task
Don't extend a long thread — token cost scales with transcript length. Begin fresh with:
```
Task: <one line>. Read AGENTS.md + <the one relevant file>. <the playbook above>.
```
