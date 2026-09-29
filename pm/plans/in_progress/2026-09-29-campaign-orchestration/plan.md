# Deterministic campaign orchestration

- **Plan ID:** `2026-09-29-campaign-orchestration`
- **Status:** `in_progress`
- **Approval:** The stakeholder approved
  [`REQ-CAMPAIGN-ORCHESTRATION`](../../../requirements/campaign-orchestration.md)
  on 2026-09-29 and requested this plan. The stakeholder explicitly approved
  implementation on 2026-09-29 with the instruction, “Complete the campaign.”
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{
  "schemaVersion": 1,
  "id": "2026-09-29-campaign-orchestration",
  "parent_plan_id": null
}
-->

## Objective

Implement durable, deterministic campaign scheduling, integration, and worker
cleanup so a coordinator cannot forget assignments, dispatch the same plan
twice, omit a completed merge, or lose cleanup work after context loss.

## Scope

- Add direct plan dependencies to a new physical campaign metadata version
  while preserving the immutable V1 reader.
- Add repository-wide plan inventory and validation that reports every active
  campaign and active plan, while classifying malformed managed and permitted
  unmanaged legacy plans without guessing.
- Add a campaign-scoped operational assignment ledger with atomic uniqueness,
  idempotency, and recovery semantics.
- Add a reconciled status contract over campaign records, Codex sessions,
  managed worktrees, and Git ancestry.
- Add authenticated top-level-worktree and managed-worker ownership resolution,
  including safe read-only re-rooting and fail-closed coordinator mutations.
- Add programmatic one-step scheduling, rebase, fast-forward integration, and
  cleanup transitions.
- Add a supported Codex host adapter for session and managed-worktree effects,
  or retain a thin trusted actuator if the host exposes observations and
  actions only to the coordinator agent.
- Synchronize the canonical `plan-execution` policy, generated copies, command
  inventory, versioned-contract registry, traceability, and documentation.
- Prove the governing
  [campaign orchestration architecture](../../../architecture/campaign-orchestration.md)
  and [UAT Suite](../../../uat/campaign-orchestration.md).

## Exclusions

- No changes to unrelated campaigns, sessions, or worktrees.
- No machine- or Git-common-directory-global lock; the coordinator and active-
  campaign uniqueness scope is one user-selected top-level worktree.
- No inference of dependencies from campaign parentage, file overlap, or chat
  history.
- No non-fast-forward integration, automatic conflict resolution, throughput
  calculation, or completion-time estimate.
- No private or reverse-engineered Codex application API.
- No external installation, publication, deployment, or cloud resource.

## Proposed architecture

The read-only census remains the canonical campaign record reader. Its new
repository inventory classifies every configured plan, derives zero or one
valid active campaign per top-level worktree, and reports all conflicting
candidates without guessing. A separate orchestration core derives dependency
readiness, reconciles a versioned plugin-local assignment ledger with live
Codex and Git observations, and emits one normalized status document.
`ponytail campaign status` exposes that document. `ponytail campaign advance`
performs at most one idempotent state transition before returning the
reconciled result.

Assignments progress from unassigned through dispatch, active work, completion,
rebase, verified fast-forward readiness, merge, cleanup, and archival. Every
external effect has a durable pending state before execution. Plan, session,
and worktree uniqueness is claimed before dispatch and released only after the
exact worker revision is integrated and cleanup is confirmed.

A thin hook adapter supplies authenticated worker observations. A typed trusted
coordinator-agent actuator executes the core-selected Codex lifecycle effect.
The deterministic core retains all scheduling and transition decisions so the
host boundary cannot move authority back into coordinator memory.

The hook adapter also authenticates the ownership of every Codex-managed worker
worktree. Read-only commands invoked there re-root to the owning top-level
worktree. Coordinator mutations fail there; they never treat the worker as
another coordinator scope.

## Plan-wide acceptance

- The status contract reproduces the same complete scheduling state after
  coordinator context loss.
- The no-input report and repository status identify the active campaign,
  every active plan, and every conflicting, invalid, or unmanaged plan without
  selecting among multiple candidate campaigns.
- One top-level worktree permits at most one coordinator and active campaign;
  distinct top-level worktrees remain independent.
- Commands in managed worker worktrees either use authenticated owner re-rooting
  or fail closed without creating another coordinator scope.
- Repository-wide validation detects incomplete campaign documentation through
  the ordinary plan QA gate, while explicit selected-campaign reporting remains
  isolated from unrelated defects.
- Concurrent and repeated advances cannot create duplicate active assignments.
- Only dependency-ready plans are dispatched, reusing a safe idle worker before
  creating another.
- Completed work is classified from durable plan evidence and Git ancestry as
  requiring rebase or ready for fast-forward merge.
- Every accepted worker revision is fast-forward merged exactly once.
- Only integrated workers are archived and removed; partial cleanup remains
  visible and retryable.
- Focused tests, live host acceptance, build-impact-selected builds, full
  Ponytail acceptance, traceability, rule-copy, version, package, and structure
  checks pass against the final tree.

## Sprints

1. [S01](sprints/S01.md): define and implement the deterministic campaign
   graph, assignment ledger, reconciled status, and transition engine —
   APPROVED.
2. [S02](sprints/S02.md): integrate supported Codex host effects and complete
   end-to-end campaign acceptance — APPROVED; depends on S01.

## Questions and approval gates

- [RESOLVED] The stakeholder requires coordinator and active-campaign
  uniqueness per user-selected top-level worktree, not per machine, repository
  common directory, or Codex-managed worker worktree. Distinct top-level
  worktrees remain independent.
- [RESOLVED] Ponytail hooks expose session identity, invocation directory, and
  plugin-local storage but no direct desktop chat/worktree lifecycle API. Use
  the supported Codex app tools through a typed trusted coordinator-agent
  actuator. Authenticate worker ownership with a one-time pending-assignment
  attach identity bound to the host-supplied worker session and directory.
  Read-only worker commands re-root through that binding; worker mutations fail
  closed. Cleanup asks the worker to archive its attached managed worktree,
  verifies removal, and then archives its chat.
- [RESOLVED] The readiness tree based on revision
  `e15de56d625441b704aca90e5e6d2fc4d33d12a7` passed the complete configured
  test suite after all readiness records were staged. Build impact selected no
  targets.
- [RESOLVED] Both sprints have reviewed V3 tasklet graphs, exact path ownership,
  focused validation commands, and planned traceability registration.
- [RESOLVED] The completed user-acceptance-testing plan is closed with its
  committed evidence, and every existing lifecycle-directory plan now has V1
  campaign metadata. Configured flat-layout history remains unmanaged.

The requirement, architecture, both reviewed sprint graphs, and complete plan
implementation are approved.

## Starting checkpoint

On 2026-09-29, the complete staged readiness tree based on
`e15de56d625441b704aca90e5e6d2fc4d33d12a7` passed `npm test`: 376 core tests,
the Codex installer checks, 23 Pi tests, 4 MCP tests, 76 TSTS tests, and the
480-file TSTS structure check. The focused campaign, CLI, and policy selection
passed 36 tests. Traceability resolved 14 relationships; rule copies, all seven
version pins, campaign validation for the new and reconciled plans, tasklet
selectors, and `git diff --check` passed. Build impact returned no affected or
indeterminate target for every readiness path, so no build was required.

## Final validation record

Not started.
