# Detailed planning review lacked a campaign dispatch path

- ID: `2026-10-02-BUG-detailed_planning_review_not_dispatchable`
- Type: `BUG`
- Status: `in_progress`
- Reported: 2026-10-02 during GWEN capacity-repair planning.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
- UAT: [assign detailed planning for independent review](../../uat/campaign-orchestration.md#arc-assign-detailed-planning-for-independent-review-before-approval).

## Confirmed mechanism

The coordinator had authored detailed S01 and S02 planning with
`planning.status: READY_FOR_REVIEW` and `execution: null`. Ponytail's planning
dispatch selected only `STUB` sprints; its review dispatch selected only
approved execution sprints with `tasklets_reviewed: false`. Neither selector
could assign an original idle worker to review the authored planning without
falsely resetting it to `STUB` or approving it without review.

## Resolution and acceptance

The canonical planning-review selector now requires `READY_FOR_REVIEW`,
`execution: null`, and approved planning dependencies. The campaign graph
exposes a detailed sprint with a validated nonempty tasklet graph through its
existing review-only lane. `schedule-review-ready` retains the same original
campaign-pair, authenticated `REVIEW_WORKER` action, and no product-edit lease.
The focused sprint-selector, campaign-census, and orchestration suites pass.
On GWEN's integrated capacity plan, the graph exposes S01 for review while S02
waits for S01's approval; neither is implementation-runnable. Live host
dispatch and integrated worker review remain to be verified by the coordinator.
