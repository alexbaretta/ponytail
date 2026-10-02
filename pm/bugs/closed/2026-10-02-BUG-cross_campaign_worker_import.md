# Cross-campaign worker import and capacity coupling

- ID: `2026-10-02-BUG-cross_campaign_worker_import`
- Type: `BUG`
- Status: `closed`
- Authority: stakeholder instruction on 2026-10-02 that no cross-campaign
  worker import may exist and only sessions provably associated with the
  current campaign may consume its session limit.

Traceability: introduces REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-cross_campaign_worker_import
Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-cross_campaign_worker_import
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-02-BUG-cross_campaign_worker_import

## Confirmed cause

`prepareDispatches` copied idle workers from other campaign ledgers into the
selected ledger. `projectWorkerCount` then aggregated every ledger for the
same top-level project, including sessions unrelated to the current campaign.
Thus a foreign worker could become a reuse candidate, and fifteen foreign
slots could block current-campaign creation. Retained imported rows also
outlived the importer. Focused real-Git tests reproduced both behaviors
before the repair.

## Intended boundary

The selected campaign's successful `CREATE_WORKER` results provide durable
session-origin proof. Reuse and session capacity consider only those sessions
and that campaign's outstanding creation reservations. A changed checkout
path does not create a second session. Host idle state and a worker row alone
do not establish provenance. Historical foreign reuse reservations must not
be returned as executable. No session or checkout is deleted.

Requirement: [retained workers](../../requirements/worker-worktree-retention.md).
UAT: [retained-worker Suite](../../uat/worker-worktree-retention.md).

## Validation

The cross-campaign import and capacity tests failed before implementation,
then passed after the repair. The focused scheduler, worktree, and coordinator
policy selection passed 89 tests, and the one-working/three-independent-plans
regression passed. Full `npm test` passed after traceability regeneration,
including Node, bundled projects, TSTS unit tests, and the 626-file structural
check. Build impact reported no affected build target; version and rule-copy
checks passed. This closes the project-neutral tooling defect, not the live
GWEN campaign or its remaining dependency/host gates.
