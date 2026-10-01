# 2026-10-01-BUG-inflight_recovery_blocks_campaign

**Title:** Preserve independent campaign actions during in-flight worker recovery

**Type:** `BUG`

**Status:** `in_progress`

**Report:** GWEN dispatched a typed `RECOVER_WORKTREE` action to an existing
worker. A fresh complete host observation then correctly reported that session
as `working` while its original checkout was still absent. Ponytail replaced
the prior source-proven recovery diagnosis with ordinary worker/worktree-missing
diagnostics and blocked `advance` globally until the checkout reappeared.

**Intended behavior:** The exact pending recovery action, authenticated binding,
managed host session at its assigned path, and unchanged branch revision keep
this interval source-proven and nonblocking for unrelated actions. A working
session without that pending action, or with changed proof, remains blocking.

**Confirmed root cause:** The recovery predicate accepted only host states
`waiting` and `completed`. It discarded the pending recovery action when the
same session became `working`. Missing-checkout observation also projected the
old binding revision over the durable delivered revision, so the delivered
rebase predicate could not recognize the in-flight action.

**Requirements reconciliation:** Clarifies
[campaign recovery](../../requirements/campaign-orchestration.md) and its
[UAT Arc](../../uat/campaign-orchestration.md). No additional worker or host
effect is authorized.

**Authorization:** The stakeholder authorized correction of Ponytail blockers
reported by the GWEN coordinator on 2026-10-01.

**Acceptance:** The real-Git regression first reproduced blocking diagnostics
after the session changed to `working` with a pending recovery action. After
the correction, unrelated dispatch remains available while the exact pending
action and branch proof match; an absent action or changed branch still blocks.
All 32 campaign-orchestration tests and the full `npm test` suite pass,
including TSTS over 576 files. Rule-copy, version, and traceability checks
pass. Live recurrence remains pending.

**Pattern observation:**
[2026-10-01-inflight_recovery_state_gap](../../debugging-pattern-observations/2026-10-01-inflight_recovery_state_gap.json).

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-inflight_recovery_blocks_campaign
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-inflight_recovery_blocks_campaign
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-inflight_recovery_blocks_campaign
