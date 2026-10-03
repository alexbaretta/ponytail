# Empty plan-input claim fails normal queue draining

- ID: `2026-10-02-BUG-empty_plan_input_claim_failure`
- Type: `BUG`
- Status: `in_progress`
- Authority: the approved live Ponytail/GWEN coordination goal, after the
  coordinator reported an empty claim exiting 1 on 2026-10-02.
- Requirement: [Plan input queue](../../requirements/plan-input-queue.md).
- UAT: [Serialize ingestion](../../uat/plan-input-queue.md#arc-serialize-ingestion-before-resuming-the-plan).
- Pattern observation: [empty claim failure](../../debugging-pattern-observations/2026-10-02-empty_plan_input_claim_failure.json).

Traceability: introduces REQ-PLAN-INPUT-QUEUE from issue 2026-10-02-BUG-empty_plan_input_claim_failure
Traceability: plans-implementation REQ-PLAN-INPUT-QUEUE from issue 2026-10-02-BUG-empty_plan_input_claim_failure
Traceability: plans-verification REQ-PLAN-INPUT-QUEUE from issue 2026-10-02-BUG-empty_plan_input_claim_failure

## Confirmed cause and scope

`src/plan-input.js` returns status 1 with no output when `claim()` finds no
entry. The coordinator skill makes that empty result the normal termination of
FIFO draining. The exact empty-queue fixture reproduces status 1 before the
repair; no hook or campaign schema participates in that branch.

Return an explicit `null` with status 0 for `claim --json`, and a human-readable
empty result with status 0 without `--json`. Preserve real errors and all
entry claiming semantics. No queue entry, coordinator binding, or GWEN plan
record should change because a queue is empty.

## Acceptance

The empty queue is distinguishable from an error, the coordinator can proceed
to canonical selectors after draining, and existing FIFO and persistence
proofs remain green.

## Validation

The new empty-queue regression failed before the correction with status 1 and
passed afterward with explicit `null`, status 0, and no queue write. The
focused queue, hook, and coordinator-policy suite passes (20 tests).
The complete `npm test` command passes with local PostgreSQL access, as do
traceability, TSTS structure (636 files), rule-copy, version, pattern-schema,
and whitespace checks. Build impact reports no affected target.
Live coordinator consumption of the refreshed CLI remains to be verified
before closing this issue.
