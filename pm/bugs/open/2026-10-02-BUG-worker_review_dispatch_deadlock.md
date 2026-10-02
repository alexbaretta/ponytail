# Worker review gate prevents assignment

- ID: `2026-10-02-BUG-worker_review_dispatch_deadlock`
- Type: `BUG`
- Status: `open`
- Reported: 2026-10-02 during the live GWEN campaign.

## Confirmed mechanism

The V3 execution selector requires the executing agent to review the atomic
tasklets before setting `execution.tasklets_reviewed: true`. Campaign
`schedule-ready` admits only a plan with a nonempty set of immediately runnable
tasklets; its canonical selector excludes that unreviewed sprint. A worker
therefore cannot be assigned to do the review that would make implementation
dispatch possible. At the 2026-10-02T23:41:21Z GWEN observation, all 19
retained or provisioned sessions were waiting, one original pair was reusable,
four plans were theoretically tasklet-runnable, and no worker was executing.
The planning-only QA and capacity repair plans could not use that idle pair.

This is a scheduler/skill circular gate, not evidence that unreviewed tasklets
are implementation-ready. The separate capacity and QA prerequisites also
remain unresolved.

## Decision required before implementation

The approved [campaign orchestration requirement](../../requirements/campaign-orchestration.md)
explicitly excludes planning dispatch, and the
[plan-execution skill](../../../skills/plan-execution/SKILL.md) requires the
executing agent to author and review tasklets. A distinct authenticated
review-only assignment of an original campaign worker would break the cycle
without granting implementation authority, but it changes that approved
dispatch boundary. The stakeholder has been asked whether to allow it or to
make coordinator-owned review the canonical alternative. Do not set a review
flag without a real review, broaden implementation readiness, or dispatch a
worker outside the current protocol while this decision is pending.

## Acceptance candidate

1. The approved ownership choice supplies a deterministic way to complete
   tasklet review without a circular dispatch prerequisite.
2. Product implementation remains gated by the existing reviewed selector;
   no coordinator or scheduler fabricates review evidence.
3. Any worker assignment remains campaign-provenanced, authenticated,
   idempotent, and safe for the original retained pair.

No requirements, UAT, or implementation claim is made at intake.
