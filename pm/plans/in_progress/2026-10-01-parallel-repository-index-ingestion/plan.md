# Parallel repository index ingestion

- **Plan ID:** `2026-10-01-parallel-repository-index-ingestion`
- **Status:** `in_progress`
- **Approval:** Explicit stakeholder implementation authorization on 2026-10-01
  for real worker-process commit ingestion, configurable worker count and
  transaction batching, isolated PostgreSQL acceptance, and thematic commits.
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-01-parallel-repository-index-ingestion","parent_plan_id":null,"depends_on":[]}
-->

Traceability: plans-implementation REQ-REPOSITORY-TEXT-INDEX from plan 2026-10-01-parallel-repository-index-ingestion
Traceability: plans-verification REQ-REPOSITORY-TEXT-INDEX from plan 2026-10-01-parallel-repository-index-ingestion

## Objective

Reduce cold repository-index build time by letting actual worker processes pull
complete commit batches from one coordinator-owned queue while preserving the
single writer lease, durable checkpoints, cancellation cleanup, progress
semantics, and atomic final publication.

## Scope

- Add `-j <n_workers>` and `-n <commits_per_db_transaction>` to
  `ponytail search update-index`.
- Use actual worker processes, one shared assignment queue, deterministic
  deadlock-safe shared-row insertion order, and one canonical commit-ingestion
  implementation.
- Stop assignment on interruption, drain workers, roll back unfinished
  transactions, retain durable batches, and leave no child process behind.
- Prove batching, parallelism, resumption, publication, progress, and
  cancellation against isolated Git and PostgreSQL fixtures.
- Synchronize requirements, architecture, UAT, CLI documentation,
  traceability, and plan evidence.

## Exclusions

- No schema migration, cloud resource, alternate queue service, remote fetch,
  change to Git state, second writer path, or fallback indexer.
- No operation against the active GWEN index writer or its checkout.
- No automatic parallel ingestion for `search query` or reference QA.

## Architecture decisions

- The parent indexing process retains the existing session advisory lock and
  final ref/overlay publication authority while child processes own only
  assigned history batches.
- The default worker count is `max(1, floor(number_of_cpus / 2))`; the default
  batch size is one commit for compatibility.
- A batch transaction contains only complete commits. Progress advances only
  after that transaction commits, so interruption can discard an unfinished
  batch without overstating durable progress.

## Sprint

1. [S01](sprints/S01.md): implement and accept parallel batched history
   ingestion — PENDING.

## Questions and approvals

- [RESOLVED] The stakeholder explicitly selected real worker processes pulling
  from one shared queue and approved `-j` and `-n` on 2026-10-01.
- [RESOLVED] The compatibility default for `-n` is one commit per transaction.
- [RESOLVED] The existing per-worktree writer lock and final atomic publication
  boundary remain unchanged.
- [RESOLVED] Only isolated fixtures may execute during development; the active
  GWEN index process and Git state are out of scope.

## Starting checkpoint

At clean product revision `ffdb368386a62bf17bc900b2a7cf75321404c144`,
`npm test` initially exposed a stale generated reverse-view locator. The
source-proven generated repair was committed independently as `4d5ceae`.
Against clean `4d5ceae`, `npm test` passed 516 core tests, Codex installer
checks, 23 Pi tests, four MCP tests, 80 TSTS tests, and the 595-file TSTS
structure check. `./scripts/test-project-index-postgres.sh` also passed against
its isolated fixture. The sandboxed full-test attempt was invalid because
local PostgreSQL connections were denied; the database-enabled rerun passed.

## Final validation record

Pending.
