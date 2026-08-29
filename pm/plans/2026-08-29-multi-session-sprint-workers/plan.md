# Multi-Session Sprint Workers

- Plan ID: `2026-08-29-multi-session-sprint-workers`
- Status: `DONE`
- Approval: The user explicitly requested implementation and installation on
  2026-08-29.

## Objective

Make separate, isolated Codex tasks the preferred execution tier for
dependency-ready V3 sprints. Keep one canonical master orchestrator while each
secondary task runs as its own root orchestrator, owns one worktree and Git
index, and may use subagents for its frozen packet leases.

## Scope

- Distinguish secondary Codex tasks from same-session subagents.
- Prefer persistent sprint affinity for secondary root orchestrators while
  retaining selector-produced packets as immutable execution leases.
- Define master, secondary-root, and nested-subagent ownership of task
  creation, worktrees, Git, status, evidence, validation, and follow-up waves.
- Preserve V1, V2, and V3 selector formats and behavior.
- Synchronize generated skill copies, focused policy coverage, and installed
  Ponytail assets.

## Exclusions

- A new selector schema or autonomous whole-sprint lease.
- Allowing secondary tasks to update canonical plan, sprint, tasklet, or
  journal records.
- Changing tasklet packet composition, readiness, or size.
- Creating a remote service, scheduler, queue, or automatic merge system.

## Sprints

1. [S01](sprints/S01.md): define, verify, generate, and install multi-session
   sprint workers. Status: `DONE`.

## Questions

- None. The user selected separate Codex root tasks in isolated worktrees,
  with optional subagents inside each secondary session and the master session
  retaining canonical orchestration.

## Acceptance

- The policy requires actual secondary Codex tasks rather than treating
  same-session subagents as equivalent.
- Each secondary root has persistent sprint affinity, an isolated worktree and
  branch, a frozen packet lease, and ownership of its worktree Git index.
- The master alone creates and supervises secondary tasks, updates canonical
  management records, integrates commits, reruns selectors, and performs final
  acceptance.
- Secondary roots may delegate path-disjoint packet work to subagents without
  surrendering their Git and reconciliation ownership.
- Whole-sprint autonomy remains unavailable unless a future selector contract
  explicitly grants it.
- Focused tests, full repository acceptance, generated-copy checks, and
  `./scripts/install.sh` pass.

## Final Validation

- Completed: `2026-08-29T02:49:20-07:00`.
- Focused multi-session policy tests passed: 4 tests.
- Generated OpenClaw skill checks passed: 92 tests.
- `npm test` passed: 249 core tests, installer checks, 23 Pi tests, and 4
  Ponytail MCP tests.
- `node scripts/check-rule-copies.js` reported all 8 rule copies matched.
- `node scripts/check-versions.js` reported all 7 version files pinned at
  `4.8.4`.
- Build impact is not applicable because Ponytail declares no build target.
- `./scripts/install.sh` completed, and the installed Codex
  `plan-execution/SKILL.md` matched the canonical source byte-for-byte.
