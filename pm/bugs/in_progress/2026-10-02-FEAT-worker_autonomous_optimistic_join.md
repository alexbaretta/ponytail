# Worker-autonomous optimistic campaign joins

- ID: `2026-10-02-FEAT-worker_autonomous_optimistic_join`
- Type: `FEAT`
- Status: `in_progress`
- Approved: stakeholder direction on 2026-10-02.

After completing an assigned milestone, each authenticated worker must deliver
its clean commit, semantically rebase onto the current coordinator revision
without waiting for a coordinator rebase request, and repeat if another merge
advances that revision first. The coordinator only performs the verified
fast-forward join. No long-lived branch lock or coordinator-owned rebase action
is required for new deliveries. Existing pending rebase actions retain their
identity and result path until resolved.

The retry argument assumes a finite set of competing deliveries and progress:
each contention is caused by another successful merge, so a remaining worker
eventually becomes the last contender. It does not require round-robin fairness
or promise a wall-clock deadline; an indefinitely idle coordinator or worker
still prevents completion.

The worker must remain able to run its post-merge acceptance in the same
session, without a new dispatch. Preserve authenticated delivery, clean exact
revisions, semantic conflict review, current-head ancestry checks, and the
existing short critical section around coordinator merge/ledger mutation.

Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
Acceptance: [campaign orchestration Suite](../../uat/campaign-orchestration.md).
Plan: [autonomous join](../../plans/in_progress/2026-10-02-worker-autonomous-join/plan.md).

Live evidence on 2026-10-02: the original GWEN authentication session
independently rebased and redelivered after its first delivery became stale;
the coordinator's canonical advance fast-forwarded the resulting exact clean
commit without a new rebase action. The same session resumed integrated
acceptance. This is a partial pass of the
[optimistic-join UAT Arc](../../uat/campaign-orchestration.md#arc-workers-optimistically-rebase-and-coordinator-joins),
not proof of two-worker contention or final acceptance.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-FEAT-worker_autonomous_optimistic_join
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-FEAT-worker_autonomous_optimistic_join
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-FEAT-worker_autonomous_optimistic_join
