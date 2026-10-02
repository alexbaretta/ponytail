# Integrated waiting worker is not released for reuse

- ID: `2026-10-02-BUG-waiting_worker_reuse`
- Type: BUG
- Status: closed
- Authority: stakeholder authorization to fix confirmed Ponytail blockers
  while exercising the GWEN campaign at maximum safe parallelism.

Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-waiting_worker_reuse
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-waiting_worker_reuse

## Confirmed mechanism

The original observe-success worker delivered and integrated its closure at
`13809a45492c69285c479339aa4df78cfb893b81`. Its native session is idle,
reported as `waiting`, while its assignment remains `CLEANUP_PENDING`.
`reusableCleanupAssignments` accepts only host state `completed`; reconciliation
already classifies both `waiting` and `completed` as idle. This narrower second
classification prevents logical assignment release and retained-pair reuse.

The real-Git focused test varies only host state: the completed case passes,
while the waiting case creates a new worker instead of releasing the original
assignment. This is distinct from an unfinished acceptance gate, dirty or
missing checkout, outstanding action, or missing native creation receipt.

## Repair and acceptance

Reuse the canonical idle-session classification when releasing a completed
assignment. Preserve all existing closed/integrated assignment, pending-action,
managed-checkout, and cleanliness gates. Retain the session and checkout;
logical assignment archival must not physically retire either.

The existing [requirement](../../requirements/worker-worktree-retention.md)
already requires deterministic inactive-pair reuse. Clarifying the two idle
host states adds no feature scope. Implement this as a standalone confirmed
bug repair. Prove both completed and waiting cases reuse the same surviving
checkout, then run applicable focused and final core acceptance. Live reuse
remains separate evidence; no GWEN ledger mutation is authorized here.

## Validation

Before repair: `node --test --test-name-pattern='integrated (completed|waiting)
workers become reusable' tests/campaign-orchestration.test.js` passes completed
and fails waiting with unexpected `CREATE_WORKER`.

After repair: both differential cases pass; `node --test
tests/campaign-orchestration.test.js` passes all 42 tests. Build-impact reports
no affected or indeterminate targets. Full `npm test` passes with normal local
PostgreSQL access, including bundled products, 80 TSTS tests, and the 609-file
structural check. The initial sandboxed run failed on localhost socket `EPERM`,
not this repair; the same command passed with normal escalation. Rule-copy,
version, observation-schema, traceability, and diff checks pass. Full logs are
retained in `tmp/waiting-worker-reuse-full-test-authorized.log`.
The [causal observation](../../debugging-pattern-observations/2026-10-02-waiting_worker_reuse.json)
records the proved classification invariant.

## Resolution

Cleanup release now uses canonical `idleSessions`, retaining its other gates.
Standalone repair acceptance is complete. Live GWEN reuse and host retention
are not claimed by fixture acceptance and remain part of campaign verification.
