<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration

[Back to requirements index](index.md)

**Identifier:** `REQ-CAMPAIGN-ORCHESTRATION`

**Approval:** Approved by explicit stakeholder direction on 2026-09-29.

**Source:** The stakeholder reported on 2026-09-29 that campaign coordinators
lose track of parallel Codex sessions, fail to merge completed work, and
sometimes assign one plan to a second session after forgetting the first
assignment. The stakeholder required deterministic, programmatic support for
scheduling, integration, and worker cleanup. Later that day, the stakeholder
clarified that Ponytail must also validate and inventory the complete configured
plan root because incomplete campaign metadata makes the no-input campaign
report ambiguous and prevents an accurate operational view.

## Repository-wide campaign inventory

Ponytail must validate and inventory every plan under the configured plan root,
not only the campaign containing one selected plan. Every plan inside a
configured lifecycle directory must have supported campaign metadata. A legacy
flat-layout plan may remain unmanaged when the host explicitly permits the
legacy layout, but the repository inventory must identify it as unmanaged and
must not infer an active lifecycle or campaign for it.

Repository-wide validation must detect malformed or missing campaign metadata,
duplicate plan identities, unresolved or cyclic parent and dependency edges,
invalid lifecycle placement, invalid sprint or tasklet state, and campaign-root
closure violations. It must return deterministic diagnostics that identify
every plan whose state cannot be classified safely.

A no-input campaign report must describe the repository-wide inventory rather
than stop at an opaque active-campaign ambiguity. It must report zero or one
valid active campaign, every active plan within it, and every active lifecycle
plan that cannot be assigned safely. If plans in one top-level worktree resolve
to more than one active campaign, the inventory must report every conflicting
campaign and plan with a deterministic diagnostic and exit `1`; it must not
choose one. An explicit plan input continues to select and report only that
plan's campaign.

Each top-level worktree may have at most one campaign coordinator and one active
campaign. Several plans within that campaign may be active concurrently.
Distinct top-level worktrees, including distinct user-owned worktrees of one Git
repository, have independent coordinator and active-campaign scopes. Activity
in one top-level worktree must not change another top-level worktree's
assignments, availability, or integration order.

A top-level worktree is the user-selected checkout in which the coordinator
session runs and whose branch receives campaign integration. A worktree created
and owned by Codex for a dispatched worker is not top-level for this purpose,
regardless of its filesystem location or Git worktree representation.

Ponytail must distinguish a directly selected top-level worktree from a
Codex-managed worker worktree. A worker worktree is not another coordinator
scope. When a command runs in a worker, Ponytail must use host-authenticated
ownership metadata to identify its owning top-level worktree and campaign. A
read-only command may execute against that owner and must disclose both the
invocation and effective worktrees. A mutating coordinator command must either
be securely proxied through the owning coordinator's authority or fail with an
actionable diagnostic. If ownership is missing, stale, ambiguous, or points to
an unavailable top-level worktree, Ponytail must fail rather than infer an owner
from path shape, branch names, Git common-directory membership, or chat history.

The repository-wide human and versioned JSON reports must distinguish valid,
invalid, and unmanaged plans without presenting uncertain membership as fact.
The JSON contract must retain enough plan-level diagnostics for an agent to
repair missing or contradictory campaign documentation without reconstructing
the inventory from stderr or chat history. A complete inventory containing an
invalid managed plan must exit `1`; a fully valid inventory must exit `0`; and
an invocation, configuration, I/O, or tool failure that prevents a complete
inventory must exit `2`. JSON output for exits `0` and `1` is exactly one typed
document plus one trailing newline.

## Operational campaign status

Ponytail must provide a campaign coordinator with one current, deterministic
view of:

- each campaign plan's assigned Codex session and Git worktree;
- every not-yet-active plan whose direct plan dependencies are complete and
  which can therefore start immediately;
- each worker worktree that requires rebasing and each rebased worktree that is
  ready for integration; and
- every campaign worker session and worktree that is idle and safe to reuse.

The view must be derived from canonical campaign lifecycle and dependency
records, durable operational assignments, live Codex session observations, and
Git worktree and ancestry observations. It must survive coordinator context
loss and session resumption. It must fail closed on contradictory, stale, or
unavailable evidence rather than guess, and it must identify the exact evidence
that prevents an action.

Ponytail must prevent concurrent or repeated coordinator activity from assigning
one plan to more than one active worker. Before dispatch, it must durably and
atomically associate the selected plan, session, worktree, branch, and campaign
integration revision. A retry after interruption must resume or reconcile that
same assignment rather than create another one.

For each unassigned dependency-ready plan, the coordinator must schedule it on
an idle campaign worker when one is safe to reuse, or create a new worker
session and worktree when none is available. A worker is not idle while it has
active work, unintegrated work, a dirty worktree, or incomplete cleanup.

When assigned plan work completes, Ponytail must determine from durable plan
evidence and Git state whether the worker must rebase or is ready to merge. It
must not accept a worker's conversational completion claim as sufficient
evidence. Integration must preserve the campaign's serialized join order and
must use a fast-forward merge after proving that the current campaign
integration revision is an ancestor of the worker revision.

After a worker revision has been verified as integrated, the coordinator must
archive the worker session and remove its managed worktree. Cleanup failure must
remain visible and retryable; it must not make the worker appear idle or allow
the assignment to disappear. Recoverable archival of the worktree before its
checkout is removed satisfies this requirement.

Scheduling, integration, and cleanup actions must be programmatically
selectable, idempotent, auditable, and safe to resume after partial failure. A
coordinator must be able to execute the next valid action without reconstructing
campaign state from chat history. Ponytail must not infer throughput or an
estimated completion time.

Repository-wide validation must run at campaign coordination and resumption,
before dispatch, after a campaign relationship or lifecycle change, and through
the host's ordinary plan-documentation QA gate. Multiple active campaigns or
coordinator bindings in one top-level worktree block campaign actions there.
The same condition in one top-level worktree must not block validated actions
in a distinct top-level worktree.

Acceptance coverage:
[Campaign orchestration Suite](../uat/campaign-orchestration.md).
