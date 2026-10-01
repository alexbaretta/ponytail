# 2026-10-01-BUG-global_pending_action_serializes_dispatch

**Title:** Allow independent dispatch while integration is pending

**Type:** `BUG`

**Status:** `closed`

**Report:** A campaign with dependency-ready plans cannot dispatch another
worker while a rebase action is pending because the scheduler permits only one
outstanding host action for the entire campaign.

**Intended behavior:** Outstanding actions for independent assignments may
proceed concurrently. Worker dispatch may proceed alongside the single
serialized integration lane; integration ordering itself remains serialized.

**Scope:** Campaign ledger and status contracts, deterministic transition and
action-result routing, coordinator policy, architecture, automated coverage,
and acceptance documentation.

**Acceptance criteria:**

- A pending rebase remains durable and retryable while advance selects a
  dependency-ready unassigned plan for worker dispatch.
- Several dispatch actions may remain outstanding without duplicate plan,
  session, or worktree assignments.
- At most one rebase action is outstanding, and no fast-forward integration
  advances while that rebase is unresolved.
- Action results update only the named outstanding action and remain
  idempotent.
- Persisted V1 ledgers remain readable; writers emit the new physical ledger
  version.

**Confirmed root cause:** The V1 ledger stores one scalar `pendingAction`, and
`advanceLedger` returns it before reconciliation or selection. The serialized
integration requirement was therefore applied to every host effect instead of
only the join lane.

**Authorization:** Explicit stakeholder instruction to fix on 2026-10-01.

**Requirements reconciliation:** The existing approved campaign-orchestration
requirement already requires all dependency-ready plans to be scheduled and
only the integration join order to be serialized. This issue clarifies that
outstanding assignment-local host actions do not form a global campaign gate.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-global_pending_action_serializes_dispatch

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-global_pending_action_serializes_dispatch

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-global_pending_action_serializes_dispatch

**Requirement:**
[Campaign orchestration](../../requirements/campaign-orchestration.md)

**UAT:**
[Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Validation evidence:** The failing-first regression returned the outstanding
`REQUEST_REBASE` instead of selecting an independent `CREATE_WORKER`. The
corrected focused campaign, hook, and coordinator-policy suite passes all 35
tests, including concurrent dispatch, named result routing, serialized rebase,
and pinned integration-revision coverage. Traceability, rule-copy, and version
checks pass.

**Resolution:** Ledger V2 persists assignment-local `pendingActions`; Status V3
reports them deterministically. Advance may create independent dispatch actions
while retaining one outstanding rebase, never creates a second action for the
same assignment, and never merges or retargets the integration lane while that
rebase is unresolved. Action results consume only their named action. V1
ledgers remain readable and normalize to the V2 model on mutation.
