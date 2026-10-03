# Worker review gate prevents assignment

- ID: `2026-10-02-BUG-worker_review_dispatch_deadlock`
- Type: `BUG`
- Status: `in_progress`
- Reported: 2026-10-02 during the live GWEN campaign.
- Authorization: the stakeholder requested programmatic assignment of idle,
  same-campaign workers to unfinished plans at maximum safe parallelism.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
- Plan: [review-only dispatch](../../plans/in_progress/2026-10-02-campaign-review-only-dispatch/plan.md).
- Pattern observation: [review prerequisite circularity](../../debugging-pattern-observations/2026-10-02-review_required_before_worker_dispatch.json).

## Confirmed mechanism

The V3 execution selector requires the executing agent to review atomic
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

## Resolution boundary

The requirement's “no planning dispatch” restriction is inside the explicit
retry of an unknown `CREATE_WORKER` outcome. It prevents expanding that risky
retry operation; it is not a general prohibition on separately authenticated
review-only reuse of an existing campaign worker. Preserve the implementation
selector and unknown-creation retry unchanged. The review-only assignment must
identify one approved, dependency-ready V3 sprint with a validated tasklet
graph, and must reuse a safe original same-campaign pair without creating a
session or worktree. The worker may review and reconcile plan metadata, but
must not edit product paths until ordinary reviewed tasklet selection passes.

## Acceptance

1. A deterministic review-only action lets an original idle campaign worker
   complete an unreviewed sprint's tasklet review without falsely reporting
   runnable implementation tasklets.
2. Product implementation remains gated by the existing reviewed selector;
   no coordinator or scheduler fabricates review evidence.
3. Assignment provenance, authenticated attachment, idempotency, and the
   existing creation capacity and retry fences remain intact.

Implementation and live host acceptance remain pending.
