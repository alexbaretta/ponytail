# Bootstrap adoption repair cannot reach an original pending worker

- ID: `2026-10-01-BUG-bootstrap_adoption_upgrade_deadlock`
- Type: BUG
- Status: in_progress
- Authority: the stakeholder authorized fixing confirmed Ponytail blockers
  while exercising the live GWEN campaign at maximum safe parallelism.

Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-01-BUG-bootstrap_adoption_upgrade_deadlock
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from issue 2026-10-01-BUG-bootstrap_adoption_upgrade_deadlock

## Observations and confirmed mechanism

The original effect-disposition and gate-race workers were dispatched at
`4f855ec3e5ac23ad012a13a4053436457f66c486`. Their canonical adoption scripts
cannot allocate a slot because all slots in that revision are claimed. The
approved two-slot repair must first enter the integration checkout. Bootstrap
instructions nevertheless require adoption and branching at the old dispatch
revision before attachment. Newer adoption tooling cannot reach these workers
through that protocol.

`workerRecoveryBinding` requires bootstrap revision to equal dispatch revision;
`recoverCheckout` requires a detached registration at that checkpoint. An
informal detached checkout update therefore makes subsequent recovery reject
the registration. `bindWorker` accepting a descendant is not a durable upgrade
protocol and does not remove the skill's contradictory exact-checkpoint gate.
This is distinct from a missing native creation receipt, host authorization
refusal, or an authenticated worker's ordinary rebase.

## Intended repair and acceptance

Clarify [worker continuity](../../requirements/worker-worktree-retention.md):
the original provisioned worker can use a capability-owned canonical upgrade
to an exact integrated descendant, before immediate adoption and original
attachment. Keep dispatch provenance immutable and checkpoint upgrade intent
before changing Git state. Retry and recovery must finish the same transition.
Wrong session, unrelated commit, changed source, occupied/locked registration,
dirty checkout, or ignored-file overwrite must fail without replacing workers
or discarding content. No main-worktree configuration is imported.

The [subordinate plan](../../plans/in_progress/2026-10-01-bootstrap-adoption-upgrade/plan.md)
owns implementation and acceptance. Requirements reconciliation begins with
this implementation activation. Fixture proof is separate from live adoption
of the two GWEN workers, which also needs the approved client capacity repair.

## Resolution

Pending focused reproduction and implementation. No live checkout, slot,
session, campaign action, or client-project configuration was modified.
