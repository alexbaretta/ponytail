# Runnable-worker count treats any active turn as tasklet execution

- ID: `2026-10-02-BUG-runnable_worker_count_includes_non_tasklet_activity`
- Type: `BUG`
- Status: `open`
- Reported: 2026-10-02 while auditing the GWEN campaign shortfall.

## Observed defect

The V2 `ponytail campaign runnable-plans` implementation computes
`observedRunnableWorkers` by counting every listed plan whose assigned
session's native host state is `working`. A worker may be working only on a
semantic rebase, a delivery retry, integrated acceptance setup, recovery, or
a coordinator question while its plan still has runnable tasklets. In those
cases the count rises and `shortfall` falls without any tasklet execution.
The source is the `plans.filter(({ execution }) =>
execution.hostState === 'working')` calculation in
`src/campaign-orchestration.js`; native `working` is turn activity, not a
tasklet-level execution signal.

The approved [campaign requirement](../../requirements/campaign-orchestration.md)
explicitly says closure and rebase activity do not prove runnable product
tasklets are executing. The current metric does not satisfy that distinction
for a rebase of a plan that remains in the runnable list. This is separate
from the current live count of zero: the same defect can overstate progress as
soon as one affected worker becomes active.

## Acceptance criteria

1. With a tasklet-ready assigned plan and fresh complete host evidence, observe
   its worker as `working` only while it performs a delivered-branch rebase or
   recovery. The summary must not count that as observed tasklet execution or
   reduce a tasklet-execution shortfall on that basis alone.
2. A verified transition into execution of the plan's exact runnable tasklet
   must be distinguishable from mere native turn activity. The report must
   explain when tasklet activity is unknown rather than asserting zero or one
   without evidence.
3. Preserve the existing deterministic eligibility query, assignments,
   capacity accounting, and historical V1/V2 reader contract; do not create a
   worker or mutate the ledger to answer a read-only summary.

No tasklet-activity proof boundary or compatibility design is approved yet.
This intake records a confirmed source/contract mismatch, not an implemented
fix. The [concurrency-shortfall UAT Arc](../../uat/campaign-orchestration.md#arc-explain-and-resolve-runnable-plan-concurrency-shortfalls)
includes the failing case. The related live execution incident remains
[open](2026-10-01-BUG-runnable_campaign_workers_not_activated.md).
No prospective requirement relationship is introduced at issue intake.
