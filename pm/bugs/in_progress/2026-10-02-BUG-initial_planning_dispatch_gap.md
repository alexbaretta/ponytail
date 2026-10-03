# Initial planning sprint cannot receive a campaign worker

- ID: `2026-10-02-BUG-initial_planning_dispatch_gap`
- Type: `BUG`
- Status: `in_progress`
- Reported: 2026-10-02 during live GWEN campaign coordination.
- Authorization: the stakeholder requested maximum safe plan parallelism and
  asked how zero-tasklet plans can be started.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
- UAT: [initial planning dispatch](../../uat/campaign-orchestration.md#arc-assign-an-initial-planning-sprint-without-inventing-runnable-tasklets).
- Pattern observation: [initial planning dispatch gap](../../debugging-pattern-observations/2026-10-02-initial_planning_dispatch_gap.json).
- Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-initial_planning_dispatch_gap

## Confirmed cause

GWEN's approved integration-scaffolding repair has a dependency-ready initial
`STUB` sprint and no tasklets. The canonical planning selector returns S01,
but `schedule-ready` admits only immediately runnable tasklets and
`schedule-review-ready` admits only approved V3 tasklet graphs awaiting review.
Consequently neither command can assign an available original campaign worker
to author the graph. This is a missing typed planning dispatch, not evidence
that empty or unreviewed tasklets should become executable. The separate
`PLANNING` and `READY_FOR_REVIEW` states do not satisfy the initial `STUB`
selector and must not be silently promoted.

## Resolution and acceptance

Add an authenticated, idempotent initial-planning action that reuses only a
safe original campaign pair and names the selector-chosen sprint. Preserve
implementation and review gates, completed-plan dependencies, started action
identity, and the existing worker limit. Prove simultaneous independent
implementation/planning reservations, unready-before-start postponement,
started-action retention, CLI routing, and no product-edit authority from
planning attachment. Live GWEN acceptance requires the existing QA repair
plan to receive a real worker; a passing fixture test alone is not closure.
