# Authenticated campaign review-only dispatch

- Plan ID: `2026-10-02-campaign-review-only-dispatch`
- Status: in_progress
- Approval: the stakeholder requested programmatic assignment of idle,
  same-campaign workers to unfinished plans at maximum safe parallelism.
- Issue: [worker review dispatch deadlock](../../../bugs/in_progress/2026-10-02-BUG-worker_review_dispatch_deadlock.md).

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-02-campaign-review-only-dispatch","parent_plan_id":null,"depends_on":[]}
-->

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-campaign-review-only-dispatch
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from plan 2026-10-02-campaign-review-only-dispatch

## Objective and scope

Break the confirmed tasklet-review dispatch cycle with a distinct typed,
authenticated review-only reuse action. Keep implementation readiness,
unknown-creation retry, worktree retention, campaign provenance, and physical
worker capacity unchanged. One Ponytail repository owns the CLI, contracts,
focused tests, requirements, UAT, and canonical skill; no cloud resource or
GWEN project mutation is in scope for this plan.

## Acceptance

The [review-only Arc](../../../uat/campaign-orchestration.md#arc-assign-an-idle-campaign-worker-for-tasklet-review-without-granting-implementation)
passes at the core boundary. Existing V1–V4 actions and V1–V6 ledgers remain
readable without changing their physical shapes. A live original campaign
worker attaches and reviews only after the repository implementation has been
committed and independently accepted; that external host proof is a separate
final gate. Do not close this plan on automated proof alone.

## Execution

[S01](sprints/S01.md) is approved and reviewed for implementation. The
starting core test checkpoint is the passing full suite at `f2e2523`; later
commits before this plan changed only PM prose. Run focused tests during the
sprint and the configured full core acceptance after final QA-relevant edits.
No prior action result, reserved worker, or review flag is manufactured to
obtain a passing test.
