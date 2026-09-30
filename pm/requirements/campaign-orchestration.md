<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration

[Back to requirements index](index.md)

**Identifier:** `REQ-CAMPAIGN-ORCHESTRATION`

**Approval:** Approved by explicit stakeholder direction on 2026-09-29 and
clarified by explicit stakeholder direction on 2026-09-30.

**Source:** The stakeholder reported on 2026-09-29 that campaign coordinators
lose track of parallel Codex sessions, fail to merge completed work, and
sometimes assign one plan to a second session after forgetting the first
assignment. The stakeholder required deterministic, programmatic support for
scheduling, integration, and worker cleanup. Later that day, the stakeholder
clarified that Ponytail must also validate and inventory the complete configured
plan root because incomplete campaign metadata makes the no-input campaign
report ambiguous and prevents an accurate operational view. The stakeholder
further clarified that an unmarked plan remains valid legacy non-campaign data
unless a managed campaign plan references it and thereby proves that it is an
intended campaign member. The stakeholder then defined a stranded plan exactly
as a plan P that references campaign parent C when C does not reference P. On
2026-09-30, the stakeholder approved concurrent active campaigns when a command
selects one explicitly, repository-wide inventory without selection, campaign
listing by lifecycle status, and campaign activation from any member plan.

## Repository-wide campaign inventory

Ponytail must validate and inventory every plan under the configured plan root,
not only the campaign containing one selected plan. A plan with no
`ponytail-plan-campaign` block is valid unmanaged legacy data regardless of its
location under that root. The inventory must not infer campaign membership or
active-campaign state from its directory, prose, or name. A present but
malformed block is invalid managed data.

When a managed plan names an unmarked plan as its `parent_plan_id` or in
`depends_on`, that authored reference proves that the unmarked plan is intended
to participate in the campaign. Repository-wide validation must then report
both the unresolved managed reference and the referenced plan's missing
campaign metadata. The unmarked plan remains invalid until it receives one
supported metadata block.

For every managed parent edge, plan P declares campaign parent C and C must
contain a human-readable reference to P. P is stranded exactly when that
reciprocal reference is absent. Other malformed or unresolved managed records
are invalid, but are not stranded.

Repository-wide validation must detect malformed campaign metadata, campaign-
referenced plans with missing metadata,
duplicate plan identities, unresolved or cyclic parent and dependency edges,
invalid lifecycle placement, invalid sprint or tasklet state, and campaign-root
closure violations. It must return deterministic diagnostics that identify
every plan whose state cannot be classified safely.

A no-input campaign report must describe the repository-wide inventory rather
than select one active campaign. It must report every valid active campaign,
every active plan within each one, and every active lifecycle plan that cannot
be assigned safely. Several active campaigns are valid and do not by themselves
make repository-wide report or validation fail. An explicit plan input
continues to select and report only that plan's campaign.

Each top-level worktree may have one campaign coordinator session. That session
may coordinate several active campaigns when each single-campaign command names
its campaign explicitly. Several plans within each campaign may be active
concurrently. Distinct top-level worktrees, including distinct user-owned
worktrees of one Git repository, have independent coordinator scopes. Activity
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

## Campaign lifecycle commands

Ponytail must list campaign roots deterministically. `ponytail campaign list`
lists active campaigns. `--active`, `--pending`, `--closed`, `--deferred`, and
`--rejected` select that normalized campaign status, with at most one status
filter per invocation. A campaign is active when any valid member is in the
configured active-work lifecycle. Otherwise its status follows its root plan:
the configured initial, successful-completion, deferred, and rejected roles
normalize respectively to pending, closed, deferred, and rejected.

`ponytail campaign activate <plan-name-or-path>` must resolve the supplied
member recursively through its parent links to the campaign root. An already
active campaign succeeds without mutation. A pending campaign moves its root
plan from the configured initial lifecycle to active work, synchronizes the
canonical manifest status text and every affected relative Markdown link, and
must leave the selected campaign valid. Other source states fail without
mutation. Lifecycle placement and campaign metadata remain the only sources of
campaign state; activation must not create a second current-campaign record.

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

All campaign advancement in one top-level worktree must also use one worktree-
scoped critical section so two campaign-scoped ledgers cannot race while
observing or changing their shared integration branch.

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
the host's ordinary plan-documentation QA gate. When several campaigns are
active, status and advancement without campaign input must fail with every
candidate rather than choose one. Explicitly selected operations remain
available. Action-result recording must name its campaign explicitly; worker
attach remains uniquely scoped by its authenticated token. Several campaign
bindings are permitted only when they name the same coordinator session for
the top-level worktree. Another session is rejected until that coordinator has
released every binding. A session with several bindings must not use an
unscoped composer enqueue command. None of these conditions in one top-level
worktree may block validated actions in a distinct top-level worktree.

Acceptance coverage:
[Campaign orchestration Suite](../uat/campaign-orchestration.md).
