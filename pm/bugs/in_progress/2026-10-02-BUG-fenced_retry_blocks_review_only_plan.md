# Fenced creation retry rejects a review-ready plan

- ID: `2026-10-02-BUG-fenced_retry_blocks_review_only_plan`
- Type: `BUG`
- Status: `in_progress`
- Reported: 2026-10-02 during live GWEN campaign coordination.
- Authorization: stakeholder approved review-only fenced retry on a safe idle campaign pair.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
- UAT: [explicit unknown-outcome creation retry](../../uat/campaign-orchestration.md#arc-explicit-unknown-outcome-creation-retry).
- Pattern observation: [phase-specific retry readiness](../../debugging-pattern-observations/2026-10-02-phase_specific_retry_readiness.json).
- Traceability: implements REQ-CAMPAIGN-ORCHESTRATION

## Confirmed cause

A STARTED original `CREATE_WORKER` can retain an unknown host outcome while its
plan advances from implementation-ready to review-ready. The fenced retry
required `planIsRunnable` unconditionally. It rejected the review-only plan
before considering a safe original idle campaign pair, leaving its unresolved
creation receipt in place and no authorized review dispatch.

## Resolution and acceptance

The exact authorized retry may select an implementation-ready plan as before,
or a review-ready sprint on a safe idle original campaign pair. The latter
creates a `REVIEW_WORKER` successor for that sprint, not a new session or a
product-edit lease. It preserves the original STARTED receipt and capacity
reservation, revokes the original capability, and remains idempotent. Without
the safe pair, it refuses without mutating the ledger. Initial `STUB` planning
and provisioned, attached, or delivered originals remain ineligible.

Focused fixture proof passes; live GWEN retry remains pending separate direct
authorization for the exact original action and successful authenticated host
dispatch. This issue stays in progress until that acceptance is observed.
