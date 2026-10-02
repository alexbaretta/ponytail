# Idle assigned plan can lose its path to final acceptance

- ID: `2026-10-02-BUG-idle_assigned_plan_has_no_continuation_action`
- Type: `BUG`
- Status: `open`
- Reported: 2026-10-02 after the stakeholder asked how a worker whose
  tasklets are done can still be shepherded through rebase, merge, and closure.

## Confirmed mechanism

`planIsRunnable` requires a nonempty immediately runnable tasklet set.
`scheduleReadyPlans` calls `scheduleWorker`, which reserves only an unassigned
or queued runnable plan; it never selects an existing authenticated session
for post-tasklet obligations. `readyActions` exposes pending host actions but
has no continuation for an idle assigned worker whose plan remains open.
`advanceLedger` can reconcile and fast-forward an already delivered revision,
yet after a merge it has no transition that wakes the same waiting session to
finish integrated acceptance or plan closure. The skill tells that worker to
continue autonomously, but Codex may end its turn after delivery or while
waiting for the coordinator. An idle native session is not a running process.

This is a liveness gap, not evidence that completed tasklets should become
runnable again. In the live GWEN optimistic-join test the original worker
needed follow-up host prompting around integration; the same session remained
assigned and no duplicate dispatch was needed. The exact post-tasklet idle
case is not yet covered by a real-Git scheduler regression.

## Intended outcome and design boundary

The scheduler should expose a deterministic, idempotent continuation of the
**existing** assignment when it has an actionable remaining obligation, even
if its tasklet set is empty. It must preserve session, worktree, branch,
delivery, and assignment identity. A new-worker CREATE or REUSE action remains
limited to the existing runnable-tasklet predicate. `READY_TO_MERGE` is a
coordinator join, not a worker redispatch. A reported manual/environment gate
or missing checkout must use its own recovery/blocker protocol rather than
spin repeated prompts. Merely incomplete but unreviewed or dependency-blocked
plans are not automatically executable.

The product boundary still needs a versioned continuation result and a host
acknowledgment design before implementation. The stakeholder is choosing
whether `schedule-ready` should surface this as a distinct existing-session
continuation or broaden dispatch eligibility. Do not implement the broad
predicate by changing `planIsRunnable` alone; that would permit duplicate or
unready dispatch without solving the idle-session obligation.

## Acceptance to prove

1. With all tasklets done, an open plan, and a fresh waiting original session,
   the scheduler identifies the exact remaining acceptance/closure obligation
   and original session without creating another assignment or checkout.
2. A delivered stale branch can be rebased by that original worker, then the
   coordinator fast-forwards it. The worker can resume after the join, verify
   final gates, and deliver closure, even across process restart or turn end.
3. A blocked human handoff, stale/incomplete host observation, changed branch,
   missing checkout, or unreviewed work does not trigger an unsafe or repeated
   worker prompt. Independent runnable-plan dispatch remains available.
4. No action is emitted after successful plan closure and logical assignment
   release; retries preserve action identity and do not count an accepted
   message as completed work.

Requirement candidate: [campaign orchestration](../../requirements/campaign-orchestration.md).
Related live proof: [worker-autonomous optimistic join](../in_progress/2026-10-02-FEAT-worker_autonomous_optimistic_join.md).
No requirement annotation or UAT pass is claimed at intake.
