# Checkpoint Sprint Orchestration

- Plan ID: `2026-08-26-checkpoint-sprint-orchestration`
- Status: `DONE`
- Approval: The user approved implementation on 2026-08-26 with
  "Make the change."

## Objective

Replace parallel sprint execution with sequential sprint checkpoints and move
safe parallelism into disjoint tasklet waves inside the active sprint, with
feature and sprint convergence gates.

## Scope

- Revise the canonical `plan-execution` orchestration policy.
- Add immutable V2 sprint and tasklet scheduling metadata contracts while
  retaining exact V1 readers for completed historical plans.
- Make the sprint readiness selector return at most the next sequential
  execution checkpoint.
- Make the tasklet selector return a maximal deterministic wave of ready,
  path-disjoint tasklets across independently ready features.
- Keep sprint records, tasklet status, the Git index, reconciliation, and
  commits orchestrator-owned during parallel execution.
- Synchronize generated host adapters and the versioned-contract manifest.
- Add focused regression coverage and run final repository acceptance.

## Exclusions

- A daemon, queue, remote scheduler, worktree manager, or automatic merge
  system.
- Parallel implementation of multiple sprints.
- Parallel edits to one file, even when line ranges appear disjoint.
- Changing approval, deployment, testing-cadence, or safety boundaries beyond
  the orchestration ownership needed by this change.

## Repositories And Boundaries

- Management repository: this repository.
- Component repository: this repository.
- Canonical policy: `skills/plan-execution/SKILL.md`.
- Selectors: `skills/plan-execution/scripts/`.
- Contract inventory: `versioned-data-contracts.json`.
- Focused tests: `tests/`.
- Generated adapters are synchronized from canonical sources.

## Acceptance Criteria

- Sprint implementation readiness is strictly sequential and a later sprint
  cannot start before every earlier sprint is `DONE`.
- The active sprint is fully reviewed for atomic tasklets, frozen write paths,
  dependencies, feature gates, and sprint validation before dispatch.
- Concurrent tasklets have disjoint exact write paths and no unresolved
  producer-consumer dependency.
- Disjoint ready features may contribute tasklets to the same parallel wave.
- Each feature converges through exactly one validation tasklet before it is
  complete, and the sprint converges only after every feature and sprint proof
  passes.
- Implementation subagents cannot mutate shared plan or sprint records, stage,
  or commit.
- V1 physical metadata remains readable; ordinary new writers use V2.
- Focused and final repository validation passes.

## Sprints

1. [S01](sprints/S01.md): implement and validate checkpoint sprint
   orchestration. Status: `DONE`.

## Questions

- None. The user resolved the architecture and authorized implementation in
  the preceding discussion.

## Final Validation

- Focused sprint gate: 128 tests passed across the checkpoint policy,
  selectors, V1/V2 contract inventory, build-impact contract checks, and
  generated OpenClaw copies.
- `npm test`: passed 245 core Node tests, installer validation, 23 Pi-extension
  tests, and 4 Ponytail MCP tests.
- `node scripts/check-rule-copies.js`: all 8 rule copies matched.
- `node scripts/check-versions.js`: all 7 version files remained pinned at
  `4.8.4`.
- Build: not applicable; Ponytail declares no build target.
- Journaling: the initial action started, but wrapped-command and subagent
  telemetry was unavailable when the sandbox denied the local PostgreSQL Unix
  socket. Durable Git records and direct validation remained complete.
