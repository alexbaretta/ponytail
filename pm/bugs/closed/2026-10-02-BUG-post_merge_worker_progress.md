# Post-merge worker progress blocks unrelated campaign actions

- ID: `2026-10-02-BUG-post_merge_worker_progress`
- Type: BUG
- Status: closed
- Authority: stakeholder authorization to repair confirmed Ponytail blockers
  while testing the GWEN campaign at maximum safe parallelism.

Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-post_merge_worker_progress
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-post_merge_worker_progress

## Confirmed diagnosis

GWEN assignment `a9e4a968-adad-4ae0-9b40-6275babfc319` integrated its activation
at `96b3608ec1f42e7ddd8526df5989e60de5844c21`, then its original worker committed
T040 at `f527c6ee0548a4a87260a26c5b94d74d7ac0da4a` and continued T041.
Reconciliation substitutes the current worker HEAD for the milestone revision
but keeps `MERGED` until a new authenticated delivery arrives. The cleanup
ancestry invariant then misclassifies ordinary unfinished work and blocks
`ready-actions` and scheduler mutations across the campaign.

A real-Git differential probe changes only the observed worker revision:
the integrated revision permits actions; a new undelivered descendant produces
`CAMPAIGN_CLEANUP_UNINTEGRATED` and `CAMPAIGN_STATUS_BLOCKED`.

## Requirements and repair

The existing [milestone requirement](../../requirements/campaign-orchestration.md)
and [milestone acceptance Arc](../../uat/campaign-orchestration.md) require the
same open-plan assignment to continue after integration. Clarify its return
to active execution; no new capability or lifecycle schema is required.

Return a surviving worker with new unintegrated or dirty work in an active
plan from `MERGED` to `ACTIVE`. Preserve authenticated delivery, clean merge,
missing-checkout recovery, closed-plan cleanup, and retained-pair gates.
Do not edit the consumer ledger or force premature delivery.

## Acceptance

Extend the existing real-Git second-delivery regression to cover the interval
before delivery, independent scheduler access, and a closed-plan negative
control. Prove the original assignment survives both deliveries, then run
focused scheduler and required final core acceptance. Record causal observation
after the regression passes; live installation and consumer proof are separate.

## Validation and resolution

The failing-first second-delivery regression rejected `MERGED` for resumed
dirty work. After repair it passes dirty and committed undelivered work,
unchanged identity, ready-action access, both authenticated deliveries and
fast-forward joins, and the closed-plan negative control. All 42 scheduler
tests pass. Build impact reports no affected or indeterminate targets.

Full `npm test` passed all 525 core, installer, 23 Pi, 4 MCP, and 80 TSTS tests.
Its final structural check initially rejected the two new untracked records;
after exact staging, the failed `npm run check:tsts` selection passed all 611
files. The earlier run stopped at a stale reverse view, repaired by canonical
generation before the full unit run. Traceability checks 266 relationships;
rule copies, versions, observation schema, and diff checks pass. Full output:
`tmp/post-merge-worker-progress-full-test.log`.

The [causal observation](../../debugging-pattern-observations/2026-10-02-post_merge_worker_progress.json)
records the phase/evidence invariant. Resumed active-plan work now transitions
to `ACTIVE`; closed-plan cleanup and authenticated merge gates are retained.
Core repair acceptance is complete; live consumer installation and recovery
remain separately verified outcomes, not campaign completion.
