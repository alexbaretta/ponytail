# 2026-10-01-BUG-waiting_delivery_checkout_loss

**Title:** Preserve a waiting worker's delivery when its checkout disappears

**Type:** `BUG`

**Status:** `in_progress`

**Report:** Four GWEN workers had authenticated deliveries and idle native
sessions reported as `waiting`. Their original checkouts disappeared before
the coordinator reconciled those deliveries. Ponytail replaced each delivered
revision with its old binding revision and blocked `advance` and
`ready-actions` with ordinary missing-worker and missing-worktree diagnostics.

**Intended behavior:** An authenticated clean delivery remains usable while
its exact commit is still the assigned branch tip and a fresh complete host
observation identifies the managed session as waiting or completed at its
assigned path. A working session, changed branch tip, or absent proof remains
blocking. Divergent delivered work still requires recovery, rebase, and a new
authenticated delivery before integration.

**Confirmed root cause:** Reconciliation treated a delivered worker as complete
only when the host state was `completed`, both with the checkout present and
after it disappeared. Codex reports an idle retained chat as `waiting` after
its turn ends, so the scheduler ignored the durable delivery. The previous
missing-checkout path also checked only that the delivered commit survived,
without proving the assigned branch still pointed to it.

**Requirements reconciliation:** Clarifies the approved
[campaign delivery preservation](../../requirements/campaign-orchestration.md)
contract for Codex's idle `waiting` state. The
[campaign UAT](../../uat/campaign-orchestration.md) covers the exact branch-tip
proof and the blocking mismatch case. This follows the
[completed-session fix](../closed/2026-10-01-BUG-missing_delivered_worktree_blocks_campaign.md).

**Authorization:** The stakeholder authorized diagnosis and repair of
Ponytail blockers reported by the GWEN coordinator on 2026-10-01.

**Acceptance:** Real Git regression first reproduced `ACTIVE` for a waiting
delivered worker with its checkout present, then `ACTIVE` plus blocking
missing-checkout diagnostics after its checkout disappeared. With the fix,
Ponytail classifies a matching delivery for integration or required rebase,
keeps the missing checkout visible, and permits unrelated ready actions.
Changed branch refs and stale host observations remain blocking.

**Evidence:** The coordinator verified that all four affected assignment
branch tips exactly matched their recorded delivery revisions. The two focused
regressions and all 32 campaign-orchestration tests passed after implementation.
The full `npm test` command passed, including TSTS over 574 files; rule-copy,
version, and traceability checks passed. Live GWEN repeat-loss verification
remains pending.

**Pattern observation:**
[2026-10-01-waiting_delivery_not_recognized](../../debugging-pattern-observations/2026-10-01-waiting_delivery_not_recognized.json).

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-waiting_delivery_checkout_loss
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-waiting_delivery_checkout_loss
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-waiting_delivery_checkout_loss
