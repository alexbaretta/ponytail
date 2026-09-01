# Serial Plan Execution

- Plan ID: `2026-08-30-serial-plan-execution`
- Status: `IN_PROGRESS`
- Approval: the user explicitly requested disabling plan-execution
  parallelization, removing its delegation language, updating Ponytail's
  canonical skill, and installing the result on 2026-08-30.

## Objective

Replace dependency-concurrent orchestration with one deterministic serial
execution path: one ready sprint, one complete tasklet batch, one executing
agent, one review and validation cycle, and one commit before reselection.

## Scope

- Rewrite the canonical plan-execution policy around serial execution.
- Make both readiness selectors return at most one selection while preserving
  immutable V1-V3 metadata readers and their physical schemas.
- Preserve V3 batching of one ranked root with up to sixteen ordered
  descendants so setup, review, validation, and commit costs are amortized.
- Add an upfront batch-readiness review and final-input validation cadence.
- Replace delegation-focused tests with serial-policy and selector proofs.
- Regenerate the published OpenClaw copy, run Ponytail acceptance, and execute
  `./scripts/install.sh` under the user's explicit authority.

## Exclusions

- No change to V1-V3 serialized metadata shapes or reader registries.
- No migration of existing consumer plans.
- No change to unrelated project-journal work already present in the working
  tree.

## Sprint

- [S01](sprints/S01.md): implement, validate, install, and commit serial plan
  execution. Status: `IN_PROGRESS`.

## Acceptance

- The skill contains no concurrent-execution, delegation, secondary-task, or
  worktree orchestration policy.
- Planning and execution sprint selectors return zero or one sprint.
- V2 returns zero or one tasklet and V3 returns zero or one bounded ordered
  batch; V1 remains scalar.
- A selected V3 batch is implemented, reviewed, validated, and committed as
  one unit while retaining atomic tasklet evidence.
- Immutable V1-V3 readers and the versioned-contract manifest remain valid.
- Focused tests, full repository acceptance, generated-copy checks, and the
  complete installer pass.
