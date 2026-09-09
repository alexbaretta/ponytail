# Dependency-Parallel Plan Execution

- Plan ID: `2026-08-26-dependency-parallel-execution`
- Status: `DONE`
- Approval: the user explicitly requested this change on 2026-08-26: “Amend
  the plan-execution rule in the ponytail repo ... to allow for the best
  parallelization, then install it.”

## Objective

Replace V2's mandatory numeric sprint checkpoint and one-tasklet dispatch
limits with an immutable V3 orchestration contract that selects every safe
dependency-ready sprint and dispatches bounded ordered tasklet packets while
retaining one canonical orchestrator, exact-path isolation, atomic tasklet
evidence, and safe Git ownership across subagents, worktree sessions, and
additional Codex instances.

## Scope

- Add immutable V3 sprint and tasklet scheduling readers and latest-only V3
  selector semantics while preserving V1 and V2 exactly.
- Reject unordered cross-sprint path ownership before dependency-parallel
  execution.
- Add deterministic ordered tasklet packet selection that amortizes worker
  startup and reconciliation without combining tasklet acceptance.
- Define canonical-checkout, shared-checkout subagent, isolated-worktree, Git,
  validation, resource-isolation, and convergence ownership.
- Synchronize focused tests, the versioned-contract manifest, generated
  OpenClaw skill, and installed Codex/CLI copies.

## Exclusions

- Creating worktrees, starting implementation of a consumer plan, migrating a
  consumer plan to V3, changing product approval or external-mutation
  authority, or weakening exact-path and validation gates.

## Sprints

1. [S01](sprints/S01.md): implement, validate, install, and commit V3
   dependency-parallel execution. Status: `DONE`.

## Acceptance

- V1 remains dependency-ready/scalar and V2 remains numeric-checkpoint/wave
  compatible.
- V3 returns every dependency-ready reviewed sprint with no unordered path
  overlap and rejects an advanced sprint whose dependencies are unfinished.
- V3 packet selection returns deterministic path-disjoint packets whose first
  tasklet is globally ready and whose later tasklets depend only on completed
  work or earlier tasklets in the same packet.
- The orchestrator remains the sole plan-state and canonical-Git owner; only
  isolated worktree workers may create source-only packet commits.
- Focused tests, full repository acceptance, generated copies, and
  `./scripts/install.sh` succeed.

## Final Validation

- Completed: `2026-08-26T12:17:35-07:00`.
- Focused selector, policy, generated-copy, rule-copy, version, and whitespace
  checks passed.
- `npm test` passed: 249 core tests, installer checks, 23 Pi tests, and 4 MCP
  tests.
- `./scripts/install.sh` completed and the installed Codex `plan-execution`
  skill and both selector scripts matched the canonical files byte-for-byte.
