# 2026-10-01-BUG-delivered_rebase_worker_checkout_missing

**Title:** Recover a delivered rebasing worker after checkout loss

**Type:** `BUG`

**Status:** `closed`

**Report:** The force-cancel and state-spawn campaign items have authenticated
delivery commits and evidence, completed worker sessions, and preserved branch
tips, but their checkouts are missing. Both assignments require rebase.
`ready-actions` reports ordinary `CAMPAIGN_WORKTREE_MISSING` and blocks all
actions, including unrelated dispatch.

**Intended behavior:** A delivered worker in `REBASE_REQUIRED` can recover its
managed checkout in the same session when the host observation, binding,
branch, delivery, and Git ancestry prove its identity and exact revision.
Recovery preserves the original delivery and requires the ordinary rebase and
new authenticated delivery before merge readiness.

**Scope:** Campaign recovery selection and diagnostics, rebase action gating,
focused regression, coordinator policy, requirements, architecture, and UAT.

**Acceptance criteria:** The scheduler exposes `RECOVER_WORKTREE` and unrelated
dispatch for proven missing delivered rebasing workers. A missing checkout
cannot receive `REQUEST_REBASE`. Recovery validates the replacement checkout,
preserves the authenticated delivery and action identity on retry, and does
not permit merge until rebase and delivery. Missing or contradictory proof
remains blocking.

**Authorization:** The stakeholder explicitly authorized the scoped Ponytail
bugfix on 2026-10-01 in the GWEN coordinator chat.

**Confirmed root cause:** `recoverableWorkerRevision` accepted only `ACTIVE`
assignments without delivery, while the nonblocking delivered-checkout
diagnostic covered only merge-ready or later states. A delivered
`REBASE_REQUIRED` assignment therefore had no recoverable classification and
blocked both `advance` and `ready-actions`.

**Debugging-pattern observation:**
[Delivered rebase recovery state gap](../../debugging-pattern-observations/2026-10-01-delivered_rebase_recovery_state_gap.json).

**Requirements reconciliation:** Clarifies the existing campaign delivery and
worker recovery requirement without changing the serialized action contract.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-delivered_rebase_worker_checkout_missing

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-delivered_rebase_worker_checkout_missing

Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-delivered_rebase_worker_checkout_missing

**Requirement:** [Campaign orchestration](../../requirements/campaign-orchestration.md)

**Architecture:** [Campaign orchestration](../../architecture/campaign-orchestration.md)

**UAT:** [Campaign orchestration Suite](../../uat/campaign-orchestration.md)

**Validation evidence:** The focused recovery and related scheduler proofs passed
4/4, the full campaign suite passed 30/30, coordinator policy passed 5/5,
debugging checks passed 7/7, and traceability passed 188 relationships. Build
impact reported no affected targets. The full Node suite reached three
pre-existing restricted-`PATH` installer fixture failures (`codex or npm is
required`); all campaign tests passed in that run. The standalone installer
suite passed, as did Pi (23/23), Ponytail MCP (4/4), and TSTS unit tests
(80/80). After the new records were staged, the repository directory-structure
check passed for 561 files. Rule copies and version pins passed.

**Resolution:** The existing `RECOVER_WORKTREE` path now accepts a missing
delivered worker in `REBASE_REQUIRED` only when the completed managed session,
authenticated binding, branch tip, exact delivery revision, and dispatch
ancestry agree. Rebase selection waits for an available checkout. Recovery
retains the original delivery and session, while merge eligibility still
requires rebase and a new authenticated delivery. Unrelated ready dispatch may
proceed alongside the pending recovery action.
