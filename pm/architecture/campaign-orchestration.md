<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration

[Back to architecture index](index.md) · Governing requirement:
[`REQ-CAMPAIGN-ORCHESTRATION`](../requirements/campaign-orchestration.md)

## Architecture

Campaign orchestration is a separate component above the read-only campaign
census. The census continues to own membership, lifecycle validation, and
normalized plan, sprint, and tasklet facts. The orchestration component adds
dependency readiness, ephemeral worker assignments, live-host reconciliation,
Git integration readiness, and idempotent lifecycle actions without changing
the selected-campaign census report's read-only contract.

### Repository inventory

The census gains a repository-wide mode that scans every configured lifecycle
location plus explicitly supported legacy flat-plan locations. It classifies
each physical plan as:

- a valid member of one campaign;
- invalid, with deterministic plan-level diagnostics; or
- unmanaged legacy data with no inferred lifecycle or campaign.

Classification is content- and graph-derived rather than location-derived. A
plan with no campaign block is provisionally unmanaged wherever it appears. A
managed plan's direct parent or dependency reference promotes a matching
unmarked plan to invalid missing-metadata data; malformed blocks are invalid
without requiring a reference.

Campaign membership edges are reciprocal at the documentation boundary. The
member P owns the structured `parent_plan_id` reference to campaign parent C;
C owns the human-readable Markdown reference to P. A missing C-to-P reference
is the sole stranded-plan condition. Malformed metadata, missing targets,
duplicate identities, dependencies, and cycles use invalid-plan diagnostics
instead.

The inventory derives a sorted `activeCampaigns` collection from valid plans in
the configured active-work lifecycle. Zero or one entry is valid for a
top-level worktree. More than one remains fully represented for diagnosis but
makes the inventory invalid and prevents coordinator actions. The existing
selected-campaign path remains isolated from unrelated campaign defects when
the caller supplies a plan.

The no-input `ponytail campaign report` becomes the human repository inventory.
Its next versioned JSON representation contains normalized campaigns, plans,
active campaign and active plan identities, unmanaged legacy plans, and
plan-scoped diagnostics. An invalid plan is visible but never assigned invented
membership. Explicit plan input retains the selected-campaign report.

Repository-wide strict validation is exposed as:

```text
ponytail campaign validate --all [--json]
```

It evaluates all independently classifiable plans and campaigns in stable
order, returns nonzero when any managed record is invalid, and retains all
deterministic diagnostics in its JSON form so agents can repair the complete
documentation set in one pass. Ordinary project QA runs this mode for managed
plan inputs.

A top-level worktree has at most one exclusive coordinator binding and one
active campaign. A distinct user-selected top-level worktree has its own scope,
even when both worktrees share Git object storage or a remote. Repository status
can show conflicting candidates for repair, but no mutating action proceeds
until the worktree has one unambiguous active campaign and coordinator.

### Worktree ownership resolution

The orchestration core distinguishes three identities:

- the invocation worktree containing the running command;
- the coordinator's user-selected top-level worktree; and
- a Codex-managed worker worktree owned by that coordinator and campaign.

The Codex host adapter persists an authenticated mapping from each managed
worker identity and canonical path to its owning top-level worktree, campaign,
coordinator session, and assignment. Git worktree relationships are supporting
observations, not sufficient ownership evidence: a shared Git common directory
does not identify which user-selected worktree commissioned a worker.

When a command starts in a verified worker worktree, `campaign status` re-roots
to the available owning top-level worktree and includes both worktree
identities in structured output. Other campaign reads and every coordinator
mutation fail with an actionable ownership error. Unknown, stale, ambiguous,
or unavailable ownership also fails closed. A later physical contract may
extend re-rooting without changing the immutable V1 report or validation
contracts.

### Durable campaign graph

A new campaign metadata physical version adds authored direct plan dependencies
to each plan's existing identity and direct-parent metadata. Writers emit only
the new version after adoption; the V1 reader remains immutable. Ponytail
derives reverse dependencies, ready plans, and blocked paths. Parentage does not
imply execution order, and lifecycle remains derived from the configured status
directory.

### Operational assignment ledger

A versioned campaign-scoped ledger outside Git records each active or retained
assignment. Every record contains the campaign and plan identities, Codex
session identity, managed worktree, branch, dispatch revision, observed worker
revision, action state, and idempotency identity. The existing exclusive
campaign-coordinator binding authorizes mutation of this ledger.

Atomic compare-and-set transitions enforce one active assignment for each plan,
session, and worktree. An assignment is persisted before dispatch. Retrying an
interrupted operation either observes its completed result or continues the
same operation; it never allocates a second worker silently.

The ledger owns operational facts only. Plan lifecycle, campaign membership,
dependencies, acceptance evidence, and Git ancestry remain in their canonical
owners and are reconciled on every read.

### Reconciled scheduler

The scheduler combines four inputs:

1. the repository inventory or one validated campaign census and its direct
   dependency graph;
2. the operational assignment ledger;
3. a Codex-host snapshot of session and managed-worktree state; and
4. Git worktree, cleanliness, branch, commit, and ancestry observations.

It produces a versioned normalized status document containing assignments,
dependency-ready unassigned plans, active workers, idle reusable workers,
workers requiring rebase, workers ready for fast-forward integration, completed
integrations awaiting cleanup, and deterministic blocking diagnostics.

The CLI exposes that document through:

```text
ponytail campaign status [<plan-name-or-path>] [--json]
```

Without an explicit plan, status returns the repository-wide operational view:
the top-level worktree's active campaign, active plans, coordinator,
assignments, sessions, and worktrees, plus conflicting, invalid, or unmanaged
plans that cannot participate safely. With a plan, it returns the same contract
filtered to that plan's campaign. A verified worker invocation returns its
owner's view rather than treating the worker as another coordinator root.

The scheduler never treats missing host state as idle state and never treats a
worker's final message as completion evidence.

### One-step transition engine

The mutating interface is:

```text
ponytail campaign advance [<plan-name-or-path>] [--json]
```

One invocation performs or requests at most one deterministic transition and
then returns the reconciled status. Repeated invocations converge without
duplicating an action:

```text
UNASSIGNED -> DISPATCH_PENDING -> ACTIVE -> WORK_COMPLETE
  -> REBASE_REQUIRED -> READY_TO_MERGE -> MERGED
  -> CLEANUP_PENDING -> ARCHIVED
```

The transition engine prioritizes a dependency-ready source-proven repair over
independent coverage expansion when worker capacity requires a choice, as
required by `plan-execution`. It otherwise uses stable plan identity ordering.

`READY_TO_MERGE` requires a clean worker worktree, complete plan-owned evidence
at the recorded worker revision, and proof that the current campaign integration
revision is an ancestor of the worker revision. Integration uses only
fast-forward merge. A changed integration head moves the assignment back to
`REBASE_REQUIRED`.

When a transition requires a supported Codex host effect, advance persists and
returns one V1 host-action envelope. The coordinator records the tool result
through `ponytail campaign action-result <action-id> --result <json>` before
advancing again. Repeating advance returns the same pending action, and
repeating an identical recorded result returns the already applied outcome.
The V1 ledger is stored under Ponytail user data, keyed by canonical top-level
worktree and campaign, and is replaced atomically under an exclusive scope
lock.

Cleanup begins only after the integration branch contains the exact worker
revision. It archives the Codex session, preserves a recoverable managed-
worktree snapshot when supported, removes the checkout, and retains
`CLEANUP_PENDING` until every required effect is confirmed.

### Codex host adapter

The deterministic core does not reach into undocumented Codex application
state. A thin Codex-native adapter supplies session snapshots and executes
create, message, wait, archive-session, and managed-worktree archival/removal
actions through supported host capabilities. The core validates requested
actions and records their idempotent results.

Current Ponytail plugin hooks can observe a session identity, invocation
directory, and plugin-local storage, but the installed plugin contract exposes
no callable desktop chat or managed-worktree lifecycle API. Those supported
operations are available to the coordinator agent as Codex app tools. The
accepted adapter therefore uses a narrow trusted coordinator-agent actuator:
the core persists and returns one typed action envelope, the coordinator
executes only that action with the supported Codex tool, and the core records
and reconciles the result before selecting another action. Scheduling remains
entirely in the deterministic core rather than in conversational memory.

Worker ownership uses an authenticated attach handshake rather than path
inference. The scheduler first records a pending assignment and random attach
identity under plugin-local storage. The coordinator passes that identity when
creating or reusing the worker. A worker lifecycle hook binds the host-supplied
session identity and invocation directory to the pending assignment exactly
once. Subsequent worker observations must match that binding. Read-only worker
commands may then re-root through it. Mutating campaign commands invoked in a
worker fail closed; this version does not claim an authenticated command proxy
that the host does not expose.

For cleanup, the coordinator requests the bound worker to archive its own
attached managed worktree through the supported recoverable worktree-archive
operation, verifies the checkout is gone, and then archives the worker chat.
An interrupted or unavailable worker remains `CLEANUP_PENDING`; Ponytail never
falls back to deleting an inferred path.

### Failure and recovery

Every external effect has a pending state recorded before execution and a
confirmed state recorded afterward. Reconciliation classifies a missing
session, missing worktree, dirty worktree, divergent branch, moved integration
head, incomplete plan, and partially completed cleanup separately. No failure
deletes the assignment or releases its uniqueness constraints until the
integrated revision and cleanup outcome are proven.
