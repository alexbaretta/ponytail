# Ready merge starved by unrelated assignment reconciliation

- ID: `2026-10-02-BUG-ready_merge_starved_by_reconciliation`
- Type: `BUG`
- Status: `closed`
- Reported: 2026-10-02 during GWEN campaign integration.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md) requires immediate priority for verified ready merges and serial fast-forward integration.
- UAT: [optimistic worker join](../../uat/campaign-orchestration.md#arc-workers-optimistically-rebase-and-coordinator-joins).
- Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-ready_merge_starved_by_reconciliation

## Confirmed mechanism

The GWEN ledger held multiple `READY_TO_MERGE` deliveries on clean branches,
yet an `advance` left the integration revision unchanged. `advanceLedger`
returned after reconciling the first unrelated assignment-state difference,
before it checked the ready merge. Independent worker state changes could
therefore repeatedly precede the serialized join. A focused fixture reproduces
the failure with a previously merged worker resuming active work while another
worker has a verified ready delivery.

## Resolution and acceptance

Once the integration revision is synchronized, choose a still-verified
persisted `READY_TO_MERGE` delivery before ordinary assignment bookkeeping.
Merge only its exact reconciled revision with `git merge --ff-only` and retain
the existing short worktree-scoped lock. A stale ready state must not outrank
its reconciled state; other assignment transitions remain durable on later
advances. The focused regression and full core suite must pass.

## Resolution evidence

Ponytail commit `4c6a543` gives a verified persisted ready merge priority over
unrelated assignment bookkeeping. The focused regression and full core suite
passed. GWEN subsequently joined delivered worker milestones through the
canonical fast-forward integration lane without this reconciliation stall.
