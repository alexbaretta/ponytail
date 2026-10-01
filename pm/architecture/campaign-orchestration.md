<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration

[Back to architecture index](index.md) · Governing requirement:
[`REQ-CAMPAIGN-ORCHESTRATION`](../requirements/campaign-orchestration.md)
and [retained workers](../requirements/worker-worktree-retention.md).

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
the configured active-work lifecycle. Any number is valid. The latest V3
repository-inventory writer therefore omits the former ambiguity diagnostic;
the immutable V2 reader remains available for historical values. The existing
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
documentation set in one pass. The campaign command subtree is the only CLI
boundary that instantiates the campaign census; ordinary project QA remains
independent of campaign state.

A top-level worktree has one exclusive coordinator session, which may own
several campaign bindings. A distinct user-selected top-level worktree has its
own scope, even when both worktrees share Git object storage or a remote.
Single-campaign commands infer a campaign only when exactly one is active;
otherwise they require explicit input and report every candidate.

### Campaign lifecycle projection

`campaign list` reads the repository inventory and projects each valid campaign
to one normalized status. Any active-work member makes the campaign `active`;
otherwise the root lifecycle maps to `pending`, `closed`, `deferred`, or
`rejected`. Listing is read-only and never invents membership for invalid data.

`campaign activate` resolves the selected member to its validated root. It is
idempotent for an active campaign and accepts only a pending-to-active
transition. Before relocating the root directory, it calculates every relative
Markdown link whose source or target moves, plus the canonical manifest status
line. It then applies the relocation and rewrites those known files, retaining
lifecycle placement as the state owner and validating the relocated campaign.

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

Without an explicit plan, status selects the sole active campaign or fails with
all candidates. With a plan, it returns the same contract filtered to that
plan's campaign. A verified worker invocation returns its owner's campaign view
rather than treating the worker as another coordinator root.

The scheduler never treats missing host state as idle state and never treats a
worker's final message as completion evidence.

The coordinator-agent adapter persists one immutable V1 host observation per
campaign worktree scope through `campaign observe`. It contains a collection
timestamp, the exact session IDs for which collection was complete, and one
normalized state, reported worktree, and managed-worktree verdict for each of
those IDs. A session omitted from a partial collection remains unknown; the
adapter must query ledger-known session IDs directly before declaring them
missing. Status identifies an observation older than five minutes as stale,
and the transition engine refuses mutation until the coordinator refreshes it.

Status V2 retains the V1 scheduling projections and adds normalized
session-to-assignment, worktree-to-assignment, active-work-plan, working,
waiting, finished, idle, and reusable projections. Diagnostics carry affected
identities and are sorted deterministically. Physical ledger parsing remains
structural so contradictory cross-record state can be reported completely;
the transition engine refuses every mutation while diagnostics remain.

Status V3 replaced the scalar pending-action projection with the complete
ordered `pendingActions` collection. Ledger V2 owns that same collection and
normalizes an immutable V1 ledger's optional scalar action into zero or one
current actions. Recovery adds immutable action V2, ledger V3, status V4, and
ready-actions V2 contracts. Host-selected recovery paths add action V3, ledger
V4, status V5, and ready-actions V3. Session-addressed cleanup adds action V4,
ledger V5, status V6, and ready-actions V4. Current writers emit only those
latest physical versions while readers retain every earlier version.

### Ready-action projection

The read-only executable-action interface is:

```text
ponytail campaign ready-actions [<plan-name-or-path>] [--json]
```

Ready-actions V1 identifies the campaign, invocation and effective worktrees,
and integration revision, then returns unchanged V1 host-action envelopes in
`actions`. Rebase and cleanup actions are ready while pending. Create and reuse
actions are ready only while `payload.dispatch.ready` is true and its state is
`NOT_STARTED`; dependency-blocked or already-started dispatches remain visible
in status for recovery but are absent from this executable view. Later
ready-action versions retain that shape while carrying their corresponding
current action envelopes. Blocking status
diagnostics fail the projection closed; typed recovery-required and verified
post-delivery checkout-loss diagnostics remain visible and nonblocking.

The projection never creates an assignment, materializes an action, or performs
a host effect. `advance` owns serial transitions; `schedule-ready` owns batch
dispatch reservations. The coordinator
advances to persist work, reads ready actions, executes every returned action,
and records each named result.

### One-step transition engine

The census derives runnable tasklet IDs from the canonical execution-sprint
selector and the tasklet selector's immediately-ready ranking, not the longer
sequential batch that may contain tasks unlocked only by earlier batch tasks.
The orchestration core joins that nonempty projection with campaign prerequisite
completion in one predicate. `campaign runnable-plans` exposes its read-only V1
summary, including active plans; status limits its dispatch view to unassigned
initial plans. Both dispatch engines and unstarted retry validation consume
the same predicate. Planning and acceptance-only work are not tasklet dispatch.

`campaign schedule-ready` fills all currently eligible dispatch reservations
under the existing project and ledger locks, reusing proven idle pairs first.
It returns current executable V4 action envelopes, never starts host effects
itself, and never performs rebase or merge. Repeated calls preserve reservations
and actions. Host observation, ownership, capacity, and integration-target gates
remain unchanged. The installed Codex app-server protocol exposes `thread/start`
but no managed-worktree creation operation; it does not replace the supported
desktop actuator boundary described below.

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

Per-top-level-project ledgers form the retained worker pool across campaigns.
Integrated, closed assignments release their pair for reuse without deleting
the session, checkout, or resource claim. Deterministic idle selection uses
fresh complete host evidence and clean Git state, excluding outstanding
assignments in any campaign of that project. Fifteen retained pairs plus
unfulfilled creation reservations is the project limit; the main checkout and
other user-owned top-level projects do not consume that pool. At capacity the
core emits `CAMPAIGN_WORKER_CAPACITY_REACHED` and waits for safe reuse.
Historical automatic cleanup actions are superseded with a retained outcome,
not executed or reported as deletion success.

`READY_TO_MERGE` requires a clean worker worktree, complete plan-owned evidence
at the recorded worker revision, and proof that the current campaign integration
revision is an ancestor of the worker revision. Integration uses only
fast-forward merge. A changed integration head moves the assignment back to
`REBASE_REQUIRED`.

Workers persist that evidence through `campaign deliver`: an authenticated
assignment records its exact clean revision and committed evidence paths in a
separate immutable V1 delivery store. Host completion plus a delivery matching
the observed worker revision replaces whole-plan closure as the readiness
signal. The assignment may therefore reach `MERGED` while its plan remains in
active work. Closure occurs only after final acceptance on the integrated tree;
only then does reconciliation advance `MERGED` to `CLEANUP_PENDING`. A newer
delivery after a failed integrated gate returns the same assignment to the
ordinary ancestry and merge flow.

If the checkout disappears after delivery, reconciliation projects the
delivery's recorded revision and clean-at-delivery proof instead of replacing
them with an unverified missing-worker observation. A complete host observation
must still report the session as completed, and Git must still resolve the
delivered commit. Status emits
`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY`, which remains visible but is not a
mutation blocker. The ordinary `CAMPAIGN_WORKTREE_MISSING` diagnostic remains
blocking when any of those proofs is absent. Integration stays
fast-forward-only; worker-owned recovery remains available independently of
coordinator mutation gates.

Before delivery, a missing checkout can instead become
`CAMPAIGN_WORKTREE_RECOVERY_REQUIRED`. Reconciliation requires a fresh complete
host observation of the same waiting or completed managed session, an exact
authenticated binding, and a branch commit that contains the assignment's
dispatch revision. For active tasklet work, the plan must also satisfy the
runnable-plan predicate before a coordinator recovery reminder is exposed.
Delivered integration recovery does not require further product tasklets.
Advance records one `RECOVER_WORKTREE` V4 action containing
the existing session, previous path, branch, and preserved revision. Readers
normalize historical actions to the current V4 envelope. Worker recovery does
not require this action or coordinator initiation. V2 authenticated bindings
record the main-worktree path and Git-directory identity; V1 binding readers
remain immutable and enroll missing provenance explicitly on capability-owned
recovery. `src/worker-worktrees.js` reconstructs the original exact path from
the preserved branch through Git, validating source, target, registration, and
branch ownership. CLI and hook routing recognize recovery before looking up
the absent cwd. Prompt hooks re-emit durable worker recovery context. A matching
existing action is acknowledged from clean same-path Git proof without
fabricating a host observation; live host session continuity remains separately
verified. Project adoption follows restoration. Native snapshots are preserved
because branch reconstruction restores committed content only.

A delivered assignment in `REBASE_REQUIRED` follows the same recovery action
when its checkout is missing. The branch tip must equal its authenticated
delivery revision, the completed managed session and binding must still match,
and that revision must contain the dispatch revision. Recovery keeps the
delivery record, restores the checkout in the same session, and returns the
assignment to active work. Reconciliation then requires the ordinary rebase
and a new delivery at the rebased revision before integration. Rebase actions
are never selected while that assignment's checkout remains missing.

When a transition requires a supported Codex host effect, advance persists one
V4 host-action envelope and returns status containing every outstanding action.
One invocation adds at most one action. The coordinator records each tool
result through `ponytail campaign action-result <campaign> <action-id> --result
<json>`. Repeating an identical recorded result returns the already applied
outcome.

Outstanding actions are partitioned by effect. Assignment-local dispatch and
recovery actions may coexist for distinct assignments. One integration-lane
action may coexist with those actions, but a pending rebase prevents another
rebase or a fast-forward merge until its result is reconciled. Repeated advance
therefore fills available independent dispatch work without weakening the
serialized join invariant. An externally changed integration revision fails
closed while a rebase still names its earlier target. Action-result routing
removes only the named action.
Create and reuse actions also carry an open-payload dispatch record. The host
records `STARTED` with its stable host identity as soon as the external effect
begins. If graph changes make the plan unready, `NOT_STARTED` may retire only a
dispatch that the host proves never began; a started action remains pending
with the same action, attachment, host, and idempotency identities. Retiring an
unstarted action leaves its assignment queued and permits selection of another
ready plan.
The current ledger is stored under Ponytail user data, keyed by canonical top-level
worktree and campaign, and is replaced atomically under an exclusive scope
lock. A second worktree-scoped lock surrounds every advance operation so two
campaign-specific ledgers in the same worktree cannot concurrently dispatch or
integrate workers. That project critical section records process ownership;
elapsed time alone cannot steal a live owner's lock. Dead-owner reaping is
serialized before another process may claim the scope.

Successful integrated acceptance and plan closure release the logical
assignment to `ARCHIVED` while leaving physical archive flags false and the
worker idle. Reuse rotates the assignment attachment capability but preserves
the session and checkout; recovery identity survives idle periods. No ready
work is not authority to delete the pair. Explicit human-requested retirement
is separate from automatic scheduling.

Worker-owned recovery also reconciles historical replacement-path bindings
with the native session's original cwd. Fresh complete host evidence and the
initial authenticated dispatch plus completed recovery result establish the
two owned paths. With both checkouts clean, registered, and at their proven
checkpoints, recovery detaches the replacement and attaches the preserved branch
in the original checkout, then updates binding and ledger under project locks.
The replacement remains present; merged/delivery state and completed actions
remain intact. Git state proves the completed prefix on an interrupted retry.

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
the core persists typed action envelopes, the coordinator executes only those
actions with supported Codex tools, and the core records each named result.
Further advance calls may select compatible assignment-local work while a host
effect remains outstanding. Scheduling remains entirely in the deterministic
core rather than in conversational memory.

Worker ownership uses an authenticated attach handshake rather than path
inference. The scheduler first records a pending assignment and random attach
identity under plugin-local storage. The coordinator passes that identity when
creating or reusing the worker. A worker lifecycle hook binds the host-supplied
session identity and invocation directory to the pending assignment exactly
once. Subsequent worker observations must match that binding. Read-only worker
commands may then re-root through it. Mutating campaign commands invoked in a
worker fail closed; this version does not claim an authenticated command proxy
that the host does not expose.

Before attachment, the original started `CREATE_WORKER` can record
`PROVISIONED` with the supported ready session and its exact native cwd.
Fresh complete host evidence must establish managed-worktree provenance and
exclusive ownership. The V1 bootstrap payload freezes that identity, dispatch
checkpoint, and canonical main-worktree source without changing assignment
state or completing the original creation. Its original attachment capability
then authorizes the shared exact-path recovery engine independently of later
observation freshness. Recovery V2 permits a null branch for this detached
bootstrap checkpoint; V1 readers remain unchanged. Adoption precedes setup,
then canonical branch establishment and authenticated attachment complete the
original creation. No replacement session or native path is inferred.

For explicit human-requested retirement of a legacy cleanup action,
`ARCHIVE_WORKTREE` carries both the bound session and exact
worktree. The worker first performs the invoking project's canonical resource
cleanup. The coordinator archives the original worker chat and refreshes its
complete host observation. `campaign retire-worktree` verifies that session is
archived, the original cleanup action and worker binding match, the plan is
closed, and the clean worker revision is integrated. It executes the invoking
project's generation-fenced lifecycle adapter for only that worktree's claim,
then verifies physical absence and Git unregistration before recording the
original action result. The ordinary checkout is never switched. Thread handoff
is not used because it can change thread identity without retiring the source.
An interrupted or unavailable worker remains `CLEANUP_PENDING`; Ponytail never
falls back to deleting an inferred path.

### Failure and recovery

Explicit `campaign reconcile` reserves pre-existing unassigned active plans
as V1 DISPATCH_PENDING records under the canonical locks. It corrects only
unassigned-plan diagnostics and leaves host identities null; it cannot adopt
an inferred session or suppress another conflict. Ordinary advancement selects
a queued dependency-ready leaf and emits its usual attach-protected action.
Reservations for unfinished parents remain queued until children close.

Every external effect has a pending state recorded before execution and a
confirmed state recorded afterward. Reconciliation classifies a missing
session, missing worktree, dirty worktree, divergent branch, moved integration
head, incomplete plan, and partially completed cleanup separately. No failure
deletes the assignment or releases its uniqueness constraints until its
integration, acceptance, and outstanding obligations are reconciled. Logical
release never proves physical retirement is appropriate.
