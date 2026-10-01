# 2026-10-01-BUG-missing_checkout_rebase_result

**Title:** Accept a verified rebase result after delivered checkout loss

**Type:** `BUG`

**Status:** `in_progress`

**Report:** The GWEN observe-success worker authenticated delivery
`bf7c4b8ed5a654ce7647f5db0834e2fec074d4d4` for assignment
`33e5eb5b-890c-4733-a0b6-360d3e6da0a5`, then its original checkout
disappeared. Ponytail's scheduler classified that exact delivery as
`READY_TO_MERGE` with informational `CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY`,
but `campaign action-result` for the existing `REQUEST_REBASE` action
`b5897b3d-7a52-49b7-929a-927332cbab91` failed with
`CAMPAIGN_WORKER_BINDING_MISSING`.

**Intended behavior:** The original rebase result may be recorded without the
physical checkout when the authenticated delivery still names the exact
assignment branch tip, a fresh complete host observation confirms the same
idle managed session and path, and the result contains the requested integration
revision. Missing or stale proof must remain a hard rejection. This is the
already approved [campaign delivery preservation](../../requirements/campaign-orchestration.md)
contract, covered by the [missing-checkout integration Arc](../../uat/campaign-orchestration.md).

**Confirmed root cause:** `validateActionResultBinding` unconditionally
required `fs.existsSync(binding.worktree)` for `REQUEST_REBASE`. The scheduler's
missing-after-delivery reconciliation used durable delivery, host, branch-tip,
and ancestry proof instead. Thus the two gates disagreed on the same verified
delivery. The worker's subsequent successful original-path recovery confirmed
that the binding and commit were preserved; it did not make the earlier
action-result rejection correct.

**Authorization and requirements reconciliation:** The stakeholder authorized
continued diagnosis and repair of confirmed Ponytail blockers on 2026-10-01.
The approved requirement already states that an authenticated delivery remains
authoritative after checkout loss and must not block integration. No new
requirement is introduced. The existing UAT Arc now explicitly exercises the
original rebase action result at that boundary.

**Acceptance:** A real-Git regression must fail on the old gate, then accept
the exact delivered result after checkout loss. Changed branch tips and stale
host observations still reject the action. The existing action ID, session,
assignment, delivery, and independent pending actions remain intact.

**Evidence:** The focused test reproduced the reported
`CAMPAIGN_WORKER_BINDING_MISSING` before repair and all 32
`tests/campaign-orchestration.test.js` tests pass after repair. Live use of the
new gate after installation remains unverified; the GWEN worker recovered its
original checkout before the coordinator retried the action result.

**Pattern observation:**
[2026-10-01-divergent_delivery_gates](../../debugging-pattern-observations/2026-10-01-divergent_delivery_gates.json).

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_checkout_rebase_result
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_checkout_rebase_result
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-01-BUG-missing_checkout_rebase_result
