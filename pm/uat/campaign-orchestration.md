<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-CAMPAIGN-ORCHESTRATION`](../requirements/campaign-orchestration.md),
approved 2026-09-29.

## Arc: Inventory every campaign and active plan

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Ponytail CLI user or campaign coordinator.
- **Prerequisites:** One top-level worktree containing plans from two candidate
  active campaigns, valid inactive campaigns, one active lifecycle plan missing
  campaign metadata, one malformed managed campaign, and one permitted legacy
  flat-layout plan.
- **Profiles:** Automated production-module and real CLI profile.
- **External effects:** None; inventory and validation are read-only.

1. Run the no-input campaign report in human and JSON modes.
   - Both inventories identify both conflicting candidate campaigns and every
     active plan, the invalid active plan without invented membership, the
     malformed campaign diagnostics, and the unmanaged legacy plan.
   - The command exits `1` and does not select a current campaign.
2. Run repository-wide campaign validation.
   - It validates every independently classifiable plan and campaign in stable
     order, returns nonzero, and reports all deterministic repair diagnostics
     for the missing and malformed metadata.
3. Repair those records and reconcile the lifecycle so every active plan
   belongs to one campaign, then repeat validation and reporting.
   - Validation succeeds, the active plans resolve to the one active campaign,
     and the permitted legacy plan remains explicitly unmanaged.
4. Report one campaign through an explicit member-plan input while the other
   campaign is malformed.
   - The selected valid campaign still reports successfully and contains no
     records or diagnostics from the unrelated campaign.

## Arc: Enforce top-level coordinator ownership

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Two campaign coordinators.
- **Prerequisites:** One top-level worktree with a bound coordinator and active
  campaign, a second coordinator session in that same worktree, a distinct
  user-selected top-level worktree, and a Codex-managed worker worktree with
  authenticated ownership metadata.
- **Profiles:** Automated multi-session adapter contract profile and live Codex
  host profile.
- **External effects:** A coordinator may mutate only its top-level worktree's
  campaign state.

1. Attempt to bind the second coordinator or activate another campaign in the
   first top-level worktree.
   - Ponytail rejects the operation with both conflicting identities and
     performs no external effect.
2. Bind and advance a campaign in the distinct top-level worktree.
   - It succeeds independently and does not alter the first worktree's
     coordinator, campaign, assignments, or integration order.
3. Run read-only status from the managed worker worktree.
   - Ponytail authenticates its ownership, evaluates status against the owning
     top-level worktree, and reports both invocation and effective worktrees.
4. Run a mutating coordinator command from that worker.
   - Ponytail either proxies it through authenticated owning-coordinator
     authority with the same idempotency identity or rejects it without an
     effect.
5. Remove or contradict the worker ownership mapping and repeat the commands.
   - Both fail closed; Ponytail does not infer ownership from directory names,
     branches, Git common-directory membership, or chat history.

## Arc: Rehydrate one authoritative scheduling view

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** A valid campaign with completed, blocked, ready, active,
  merge-pending, and cleanup-pending plans represented across test-owned Codex
  session snapshots and Git worktrees.
- **Profiles:** Automated contract and Git integration profile; live Codex host
  profile for host-state equivalence.
- **External effects:** Status inspection is read-only.

1. Request campaign status, discard coordinator conversational context, and
   request it again from the same durable state.
   - Both responses identify the same plan/session/worktree assignments,
     dependency-ready plans, rebase and merge readiness, idle workers, and
     blocking diagnostics in deterministic order.
2. Remove or contradict one live session or Git observation.
   - Status fails closed for the affected action and identifies the exact stale
     or contradictory evidence; it does not report the worker as idle.

## Arc: Dispatch each ready plan exactly once

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** At least two dependency-ready unassigned plans, one idle
  reusable worker, and capacity to create another worker.
- **Profiles:** Automated scheduler and adapter contract profile; live Codex
  host profile for session/worktree creation and reuse.
- **External effects:** Creates or reuses campaign worker sessions and managed
  worktrees.

1. Advance the campaign once.
   - Ponytail atomically records the selected plan, session, worktree, branch,
     integration revision, and idempotency identity before dispatching it to the
     idle worker.
2. Repeat the same interrupted or concurrent request.
   - Ponytail resumes or reports the existing assignment; no second active
     assignment is created for the plan, session, or worktree.
3. Advance after no safe idle worker remains.
   - Ponytail records one assignment and creates one new session and managed
     worktree for the next deterministically selected ready plan.

## Arc: Rebase and fast-forward completed work

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** A worker reports completion with durable plan evidence and
  a clean branch; another integration may advance the campaign branch.
- **Profiles:** Automated Git integration profile and live Codex worker profile.
- **External effects:** Requests worker rebases and fast-forward merges verified
  worker revisions into the campaign integration branch.

1. Reconcile the completed worker while its branch does not contain the current
   campaign integration revision.
   - Ponytail reports `REBASE_REQUIRED` and does not merge.
2. Rebase the worker and reconcile again.
   - Ponytail proves the current integration revision is an ancestor of the
     worker revision and reports `READY_TO_MERGE`.
3. Advance the campaign.
   - Ponytail performs only a fast-forward merge and records the exact merged
     worker revision.
4. Repeat the merge action after interruption.
   - Ponytail recognizes the already integrated revision and does not create a
     duplicate merge or lose the assignment.

## Arc: Archive only integrated workers

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** One completed but unmerged worker and one worker whose
  exact revision is present on the campaign integration branch.
- **Profiles:** Automated adapter contract profile and live Codex host profile.
- **External effects:** Archives a Codex session and removes its managed
  worktree after preserving any supported recoverable snapshot.

1. Attempt cleanup of the unmerged worker.
   - Ponytail refuses cleanup and retains the assignment.
2. Advance cleanup for the integrated worker.
   - Ponytail archives the session, archives/removes the managed worktree, and
     marks the assignment archived only after both effects are confirmed.
3. Interrupt cleanup after its first external effect and resume it.
   - Ponytail reports `CLEANUP_PENDING`, retries only the missing effect, and
     never exposes the worker as idle while cleanup remains incomplete.
