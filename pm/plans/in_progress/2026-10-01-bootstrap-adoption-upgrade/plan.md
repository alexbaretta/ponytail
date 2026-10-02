# Original-worker bootstrap adoption upgrade

- Plan ID: `2026-10-01-bootstrap-adoption-upgrade`
- Status: in_progress
- Management and component repository: Ponytail, this fixed checkout.
- Approval: the active stakeholder instruction authorizes diagnosis and repair
  of confirmed Ponytail blockers in the live campaign. This bounded correction
  stays inside the approved worker-continuity boundary. Initial intake and
  implementation activation are reconciled in this change-set.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-01-bootstrap-adoption-upgrade","parent_plan_id":"2026-10-01-worker-worktree-retention","depends_on":[]}
-->

Traceability: plans-implementation REQ-WORKER-WORKTREE-RETENTION from plan 2026-10-01-bootstrap-adoption-upgrade
Traceability: plans-verification REQ-WORKER-WORKTREE-RETENTION from plan 2026-10-01-bootstrap-adoption-upgrade

## Objective and boundary

Resolve the [confirmed bootstrap deadlock](../../../bugs/in_progress/2026-10-01-BUG-bootstrap_adoption_upgrade_deadlock.md)
under the [worker-continuity requirement](../../../requirements/worker-worktree-retention.md).
An original provisioned, still-unattached worker must be able to receive an
integrated adoption repair without losing exact-path recovery. Retain original
dispatch/action/client/session/token identity and immediately adopt before
setup. No resource provisioning, new checkout/session, arbitrary revision,
authenticated-worker rebase, or cross-project configuration reads are added.

## Architecture and restart contract

`ponytail worktree upgrade <attachment-token> --revision <commit>` is a worker
capability operation routed before cwd lookup. The trusted hook verifies the
original enrolled session. The orchestration owner validates the original
STARTED creation and DISPATCH_PENDING assignment, same source, and exact
owning integration HEAD. The target contains both dispatch and current
bootstrap checkpoints. A clean detached original checkout is required.

Bootstrap V2 retains V1 identity/source fields, adds immutable
`dispatchRevision` and nullable `pendingRevision`, and keeps `revision` as the
last completed checkpoint. Exact V1 remains immutable and normalizes with
dispatch equal to revision and no pending intent. New enrollment emits V2.
Upgrade persists intent under project/ledger locks before Git movement. Git
uses no-overwrite-ignore detached switching; completion persists the new
checkpoint and clears intent. Recovery/upgrade retry accepts only the proven
old or target checkpoint and completes the same intent, including when the
checkout disappeared on either side of movement. Attachment rejects pending
intent and verifies the completed checkpoint. Replayed PROVISIONED results
compare immutable identity and cannot erase an upgrade.

## Execution and acceptance

[S01](sprints/S01.md) is approved and atomically reviewed. Source checkpoint
`bca0693` is clean and has passing full acceptance (517 core, installer,
23 Pi, four MCP, 80 TSTS tests; 599-file structure; 250 traceability links).
Reuse unchanged baseline evidence. Run focused test-first proof, real-Git
upgrade/recovery/attachment controls, hook and CLI proof, then configured final
core acceptance, build impact, generated copies, traceability, versions, and
rule-copy checks. Keep live GWEN acceptance distinct; the parent retains its
independent host-continuity/automatic-retention gates.

Questions: [RESOLVED] No policy or resource-topology choice is introduced.
Only the exact integrated descendant can receive the repair; failures preserve
existing ownership and user content.

Final validation: pending.
