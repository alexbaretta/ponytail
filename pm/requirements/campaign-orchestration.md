<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration

[Back to requirements index](index.md)

**Identifier:** `REQ-CAMPAIGN-ORCHESTRATION`

**Approval:** Approved by explicit stakeholder direction on 2026-09-29 and
clarified by explicit stakeholder direction on 2026-09-30 and 2026-10-01.

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
The stakeholder further clarified on 2026-09-30 that only commands in the
`ponytail campaign` subtree may enforce campaign validity or uniqueness.
On 2026-10-01, the stakeholder approved revalidation of stale worker dispatches
and integration of a verified worker delivery before whole-plan closure, while
retaining final integrated acceptance as the closure and cleanup gate. The
stakeholder further clarified that an outstanding integration action must not
prevent dispatch of independent dependency-ready plans. The stakeholder then
selected `ready-actions` as the coordinator-facing name for the deterministic
list of host actions that are executable now and required its use to be
documented in the plan-execution skill. The stakeholder further clarified that
a missing worker checkout must not block a campaign when the completed
session's authenticated delivery already preserves the exact clean commit and
validation evidence. The stakeholder then instructed Ponytail to provide a
canonical scheduler action that recovers the same authenticated worker when
its checkout disappears before delivery but its assignment branch commit is
still preserved.
The 2026-10-01 GWEN incident clarified the host-state boundary: after a
worker's delivered turn ends, Codex may report the retained session as
`waiting` while it awaits another prompt. That idle state does not invalidate
the authenticated delivery.
On 2026-10-02 the stakeholder approved worker-autonomous optimistic semantic
rebasing in place of coordinator-issued rebase requests. A finite set of
competing deliveries needs no round-robin ordering: each retry caused by
contention follows another successful join. Completion still requires the
coordinator and remaining workers to keep making progress; no wall-clock bound
is implied.

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

Campaign validity and uniqueness are command-local concerns of the `ponytail
campaign` subtree. A command outside that subtree must not invoke campaign
validation, emit campaign inventory as a side effect, or fail because campaign
data is invalid or ambiguous.

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

A newly created managed checkout may be detached. Before authenticated worker
attachment, the worker must verify the assigned checkout and dispatch revision,
then use the host project's canonical tooling to adopt it and establish its
assignment branch at that revision. This prerequisite bootstrap does not
authorize plan execution before authentication. A prerequisite failure retains
the same session, checkout, assignment, and attachment token for retry; it must
not cause replacement-worker creation or weakening of the branch check.
This clarifies the stakeholder's detached-worktree recovery instruction on
2026-09-30; it adds no product capability or alternative ownership mechanism.

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

### Explicit retry of unknown creation outcomes

Approved by direct stakeholder direction on 2026-10-02. A bound coordinator
may retry an exact original CREATE_WORKER recorded as STARTED with unknown
outcome, supplying a non-secret reference to direct human retry authorization.
Absence from a partial native inventory is not proof that creation never began.
Preserve the complete original action and receipt as unknown and superseded;
atomically revoke its capability before exposing one idempotent successor.
Reject late original attachment/results. Provisioned identities, authenticated
bindings, deliveries and assigned sessions/checkouts are ineligible.

Require fresh complete retained-session observation, ordinary campaign validity,
and either immediately runnable tasklets or one review-ready sprint. Prefer
safe idle reuse. A review-only retry requires an original safe idle campaign
pair and produces `REVIEW_WORKER` for that exact sprint, without product-edit
authority; it cannot create another worker. Every unresolved original keeps
its capacity reservation independently of its successor; fresh implementation
creation still obeys the fifteen-worker limit. Without applicable capacity or
safe reuse, reject without supersession. No deletion, missing-checkout
replacement or initial planning dispatch.

Authenticated create/reuse completion assigns the original worker; it does not
itself move the tracked plan. While that worker activates its assigned plan,
the coordinator checkout may still show the initial lifecycle. Matching
successful dispatch and authenticated binding make this bootstrap interval
valid without hiding unproven assignment/lifecycle mismatches. A worker must
activate its own plan before delivering a milestone; its clean activation
delivery can enter the ordinary serialized rebase/fast-forward join before the
coordinator contains that lifecycle move. Activation still requires existing
exact path leases and readiness gates. Attachment is not product execution.

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

The versioned programmatic view must expose, in deterministic order:

- every retained campaign assignment with its plan, session, assignment state,
  plan lifecycle, and worktree;
- the assigned sessions that are currently working, idle while waiting for
  coordinator input, finished, archived, missing, or not observable;
- the assigned campaign item for every such session and the session assigned
  to every item currently being worked;
- every associated worktree with its session, item, existence, and
  host-confirmed Codex-managed-worktree classification; and
- the subset of workers that is safe to reuse, which is narrower than the set
  of sessions that merely have no active turn.

Live session observations must enter through a supported authenticated Codex
host boundary. An observation identifies its collection time and the exact
session identities for which it is complete. Absence from a partial listing is
unknown, not missing. A retained observation may support recovery after
coordinator context loss, but status must identify missing or incomplete live
evidence. Evidence older than five minutes is stale, must be diagnosed, and
must block mutation until refreshed.

Status must report structured diagnostics carrying the affected plan,
assignment, session, and worktree identities whenever available. It must
separately diagnose a missing worker worktree, a missing or archived session
whose worktree remains, a worker running in the coordinator worktree, a worker
not proven to use a Codex-managed worktree, duplicate active use of a plan,
session, or worktree, a non-root active-work plan without an assignment, and
an assignment whose state is incompatible with the plan lifecycle. Expected
dispatch-before-activation and completion/integration/cleanup lifecycle pairs
are not contradictions.

Contradictory operational records must remain inspectable. Read-only status
must return their complete diagnostics instead of aborting at the first
cross-record conflict; every mutating campaign operation must fail closed until
all blocking diagnostics are resolved.

Missing-checkout recovery follows the
[worker-owned recovery requirement](worker-worktree-retention.md). The
authenticated worker may reconstruct its original path from recorded main
worktree provenance without coordinator initiation or a usable repository cwd.
Fresh complete host observations still govern scheduler classification and
host-continuity evidence; their absence may block the coordinator but must not
prevent capability-owned physical recovery. Existing recovery actions retain
their original identity and can be acknowledged by verified same-path worker
recovery. It is not delivery or integration evidence: the same worker must
still record authenticated delivery through the ordinary flow.

For pre-existing active campaigns, an authenticated coordinator must have an
explicit, idempotent reconciliation command that corrects unassigned-plan
diagnostics by reserving queued work without inventing worker observations.
`ponytail campaign reconcile <campaign> --json` may repair only these named
diagnostics; any other conflict still prevents mutation. Reservations retain
null host identities until the ordinary authenticated attach handshake. They
do not change plan lifecycle, approval, completion, or acceptance. Parents
remain queued while their child plans are unfinished. This clarification
implements the stakeholder-authorized scheduler recovery of 2026-09-30.

Ponytail must prevent concurrent or repeated coordinator activity from assigning
one plan to more than one active worker. Before dispatch, it must durably and
atomically associate the selected plan, session, worktree, branch, and campaign
integration revision. A retry after interruption must resume or reconcile that
same assignment rather than create another one.

A pending create-or-reuse dispatch must be re-evaluated against the current
campaign dependency graph and canonical tasklet readiness before every retry.
The host adapter must record
whether the external worker operation has started. A dispatch proven not to
have started may be postponed when its plan is no longer dependency-ready so
unrelated ready work can proceed; the existing assignment and attachment
identity remain durable for later dispatch. Once creation or reuse has started,
Ponytail must preserve the same action, host identity, session or pending-
session identity, worktree, attachment token, and retry identity rather than
postpone it or create a replacement.

For each unassigned dependency-ready plan, the coordinator must schedule it on
an idle campaign worker when one is safe to reuse, or create a new worker
session and worktree when none is available. A worker is not idle while it has
active work, unintegrated work, a dirty worktree, or incomplete cleanup.

The read-only `campaign runnable-plans` summary must return precisely the plans
whose campaign prerequisites (including unfinished child plans) are met and
whose canonical execution-runnable sprint has a nonempty set of immediately
runnable tasklets. It identifies each plan, current path, lifecycle, sprint,
and ready tasklet IDs on the integration checkout. It includes eligible active
plans as well as unassigned plans; planning-only work, unreviewed tasklets,
blocked sprints, and all-DONE tasklet sets are excluded. It must not mutate the
ledger or require a host observation to answer this repository-state query.
For V3 sprint metadata, runnable selection resumes an existing `IN_PROGRESS`
sprint before selecting a `PENDING` sprint, with approval, tasklet review, and
completed execution dependencies still required. The ordinary sprint-start
selector remains `PENDING`-only; historical V1/V2 selection is unchanged.

The same predicate must govern new and queued dispatch, retries of unstarted
dispatch, and coordinator recovery reminders for active product work. Recovery
needed for an authenticated delivered integration remains independently ready.
Workers retain their own recovery authority.

The stakeholder's request to assign safe idle campaign workers to unfinished
plans also covers the review needed before V3 implementation becomes runnable.
Keep that separate from `runnable-plans` and `schedule-ready`: a review-only
selection identifies an approved V3 sprint with incomplete tasklet review,
completed execution dependencies, and a validated nonempty tasklet graph. It
does not assert that any tasklet is implementation-ready. A deterministic
`campaign schedule-review-ready` operation may reserve such a plan only on a
safe idle session/worktree pair originally created for this campaign. It never
creates or imports a session, consumes a new worker slot, or retries an unknown
creation. The typed host action names the exact plan, sprint, original session,
worktree, and attachment identity. Successful authenticated attachment grants
the worker only plan/tasklet review and reconciliation authority; product-path
edits require the ordinary reviewed execution selector to pass. Repeating the
operation preserves the assignment and action identities, and a competing
implementation assignment cannot own the same plan or pair.

Detailed planning awaiting review is also review-only work. When a V3 sprint
has `planning.status: READY_FOR_REVIEW`, `execution: null`, a validated nonempty
tasklet graph, and approved planning dependencies, the same
`campaign schedule-review-ready` operation may reserve one original safe idle
campaign pair for that exact sprint. This does not approve planning, set
`tasklets_reviewed`, or grant product-path edits. The authenticated worker
reviews the authored graph and delivers any approved planning change through
the ordinary join; later execution still requires its separate approval and
review gates.

The same maximum-parallelism request covers an approved campaign member whose
first dependency-ready sprint is still a planning `STUB` and therefore has no
tasklets. `campaign schedule-planning-ready` selects that exact sprint through
the canonical planning selector, after campaign prerequisites are complete.
It may reserve only a safe idle session/worktree pair originally created for
this campaign; it neither imports nor creates a worker. Its typed `PLAN_WORKER`
action authorizes authenticated planning and metadata delivery for the named
sprint, not product-path edits or automatic approval. Repeating the command
preserves action and assignment identities. An unstarted action becomes
non-executable when its sprint ceases to be planning-ready; a started action
retains its original host identity for reconciliation. A zero-tasklet total
alone is not planning readiness: aggregate plans and non-`STUB` planning
states require their own ordinary lifecycle or prerequisite reconciliation.
After planning joins, the same assignment continues through actual tasklet
review, implementation selection, and final acceptance without a replacement
worker. While its planning action is pending, a clean fast-forward of the
same authenticated worker branch to an integrated descendant may refresh the
same attachment capability and revision. A dirty or unintegrated revision may
not refresh it. A completed planning action must round-trip through the
current ledger reader so its successful result remains durable.

An approved sprint may declare a hard prerequisite on a tasklet in another
plan of the same campaign using V4 tasklet metadata
`external_depends_on`, keyed by the dependent local tasklet ID with exact
`plan_id` and `tasklet_id` targets. The campaign graph validates target
existence, rejects cross-plan tasklet cycles and completed dependents with
unfinished prerequisites, and evaluates target DONE status from the
coordinator's integrated tree. An unfinished target withholds review and
implementation dispatch for the affected sprint, not unrelated sprints or
plans. Prose references do not create scheduler edges; authors must encode
them in the versioned graph. A worker's local selector alone cannot prove an
external prerequisite has joined the integrated tree.
Target existence includes a tasklet in a frozen sprint with an authored graph
but `execution: null`. That sprint remains non-executable and contributes zero
execution tasklets to the campaign census; its target cannot satisfy the edge
until it has an execution lease and the DONE record is integrated.
An authenticated worker can query the exact cross-plan edges and target
statuses from the coordinator's integrated tree without changing checkouts.

The scheduler must also report continuation of an existing unfinished
assignment independently of new-plan dispatch. For each assigned plan still in
active work, status identifies its original session and checkout, the next
kind of work (currently runnable tasklets, tasklet review, worker-owned
integration, or remaining plan work), whether that exact session can be woken,
and the evidence blocking a wakeup. It may mark the assignment ready to resume
only after a fresh, complete host observation proves the original session is
waiting or completed, its matching managed checkout exists, no host action is
pending for that assignment, and no other live assignment owns the same plan,
session, or checkout. A working session is already active, not a resume
candidate. Missing checkouts and unknown sessions remain blocked, not replaced.
Closure cleanup is not worker continuation. Waking the original worker does not
waive the normal planning, review, tasklet, delivery, or acceptance gates and
does not create a new reservation or session.

The stakeholder clarified on 2026-10-01 that runnable eligibility alone is
insufficient operational diagnosis. The runnable-plan summary must also report
each eligible plan's assignment, original session/checkout, pending host action,
fresh observed activity, and anomalies preventing execution. Derive missing
checkouts and unavailable/stale host evidence from authoritative state. Host
review refusals and required human actions must be recorded durably through a
coordinator-owned reporting operation; do not infer them from inactivity.
Reports identify the exact assignment/action, failed phase, non-secret reason,
required next action, and whether the blocker remains unresolved. Reporting or
resolving a blocker does not grant authority, start a worker, cancel a started
effect, complete an action, or allocate a replacement.

The same summary must compare observed working sessions with theoretically
achievable runnable-plan concurrency, accounting for existing assignments,
creation reservations, safe reusable pairs, and available slots in this
campaign's fifteen-pair pool. Distinguish all observed active workers
from workers assigned to runnable plans; closure/rebase activity is not proof
that runnable product tasklets execute. Missing, incomplete, or stale host
evidence makes observed concurrency unknown rather than zero. A shortfall must
remain visible alongside its per-plan blockers and capacity evidence.

The coordinator must monitor this comparison and work with the exact affected
worker to resolve anomalies. When the next step genuinely requires the human,
request the necessary information, narrowly scoped authorization, or manual
operation with the exact targets and retained identities. Preserve existing
requests rather than repeatedly asking the same question. Continue independent
ready work, refresh evidence after repair, and resume the same action only
after its preconditions and authority are established. Never bypass a refusal,
treat a report as approval, or fill capacity with unready plans.

`campaign schedule-ready` must deterministically reserve all eligible plans
within the selected campaign's capacity in one atomic operation,
using safe retained pairs before new creation reservations. It must preserve
existing action identities on retry, retain started effects, enforce the
ordinary fresh-host and assignment gates, and leave joins serialized. It may
not report a worker started merely because an assignment was reserved. Native
session/worktree activation must be programmatic if the supported host exposes
that capability to the CLI; otherwise only the host actuator may perform those
effects, without making plan eligibility decisions.

Outstanding host actions are assignment-local rather than a global campaign
gate. Worker create and reuse actions for distinct dependency-ready plans may
remain outstanding concurrently. New worker deliveries do not create a
coordinator rebase action; the worker prepares its own rebased delivery while
other workers and dispatches proceed. Historical pending rebase actions retain
their identity and serialized result path until resolved. Recording an action
result must update only the named action and preserve every other outstanding
action.

When assigned plan work completes, Ponytail must determine from durable plan
evidence and Git state whether the worker must rebase or is ready to merge. It
must not accept a worker's conversational completion claim as sufficient
evidence. Integration must preserve the campaign's serialized join order and
must use a fast-forward merge after proving that the current campaign
integration revision is an ancestor of the worker revision.

A worker must record a delivery containing its exact clean commit and at least
one committed plan-owned validation-evidence path. This delivery, together
with a fresh complete host observation that the managed session is working,
waiting, or completed in its authenticated worktree and its branch still names
the delivered commit, is the merge-readiness evidence; whole-plan closure is
not. Ponytail may integrate that delivery while the plan remains in active
work. A working session must not be classified as completed merely because it
has a dirty checkout or an obsolete delivery. The plan stays open until the
worker runs the applicable final acceptance against the integrated tree and
records its outcome. A failed integrated gate may return the same worker and
assignment to delivery and integration without inventing a replacement.

After delivery, the worker checks the current campaign integration revision.
If the delivered commit is not based on it, the worker semantically rebases its
own commits onto that revision, reruns applicable focused proof, and records a
new authenticated exact-clean delivery. If another successful join changes the
integration revision before its merge, the worker repeats. The coordinator
only performs the verified fast-forward join under the existing short
worktree-scoped critical section and gives ready merges immediate priority;
neither side holds a lock while a worker rebases. The worker retains its
session and continues plan-owned acceptance after integration without a new
coordinator request. It delivers and joins any further acceptance or closure
commit in the same manner. The worker may report a genuine external gate but
must not require the coordinator to trigger ordinary rebase or acceptance work.
When that same worker resumes an active plan after an integrated milestone,
new dirty or unintegrated work returns its assignment to active execution.
That ordinary interval must not be classified as unsafe cleanup or block
independent campaign actions. New work still requires authenticated delivery
before another integration, and closed unintegrated work remains protected.

Plan ownership is identified by its stable plan ID. When a worker's accepted
closure moves its plan to the configured successful-completion directory,
delivery must resolve that same ID and campaign in the authenticated worker
checkout and validate evidence beneath its current canonical plan directory.
The coordinator's pre-merge lifecycle path must not reject the delivery. The
closure commit still follows authenticated delivery, rebase when necessary,
and serialized fast-forward integration before assignment release.

An authenticated delivery remains authoritative if its worker checkout later
disappears, provided the delivered commit remains available to the campaign
repository at the exact assignment branch tip and a fresh complete host
observation identifies the managed session at its assigned path as waiting or
completed. Status must continue to diagnose the missing checkout, but must
distinguish this recoverable state from a missing checkout without delivery
proof. The recoverable diagnostic must not block reconciliation,
fast-forward-only integration, unrelated dispatch, or the later explicit
cleanup sequence. Any missing checkout without that durable proof remains
blocking.

When a delivered worker requires a rebase and its checkout is missing, Ponytail
must restore the worker-owned checkout before that worker rebases.
Scheduler classification still requires a fresh complete observation of the
waiting or completed managed session, its authenticated binding, the exact
delivered commit at the named branch, and ancestry from the dispatch revision.
It preserves the delivery
record and worker identity but does not make the divergent commit merge-ready.
The recovered worker must follow the ordinary rebase and authenticated delivery
workflow. A missing or contradictory proof remains blocking, while a proven
recovery must not block unrelated ready dispatch.

After a source-proven `RECOVER_WORKTREE` action is pending, the same managed
session may become `working` before its original checkout has been restored.
That in-flight interval must retain the nonblocking recovery diagnostic when
the fresh complete host observation, action payload, binding, assignment, and
current branch tip still agree on the exact session, path, branch, and revision.
It must not be interpreted as a new missing worker or block unrelated work.
Without the pending action or with changed proof, a working session and missing
checkout remain blocking.

All campaign advancement in one top-level worktree must also use one worktree-
scoped critical section so two campaign-scoped ledgers cannot race while
observing or changing their shared integration branch.

The 2026-10-01 [retained-worker requirement](worker-worktree-retention.md)
supersedes automatic cleanup after plan closure and coordinator-initiated
recovery at a replacement path. After verified integration and successful plan
closure, release the logical assignment but retain its session/worktree pair
indefinitely. Reuse is fenced by outstanding obligations, clean Git state,
complete fresh host observations, and per-top-level-project ownership.

Only for separate explicit human-requested retirement, an existing
worktree-cleanup action must name both the exact session and worktree. After
the worker completes project-owned resource cleanup, the coordinator archives
the original worker chat and records fresh host evidence that it is archived.
`ponytail campaign retire-worktree <campaign> <action-id>` must execute that
existing action through the invoking project's committed worktree lifecycle
adapter, reclaiming only its authenticated worktree claim. The adapter must
prove abandonment and repeat its generation-fenced preflight. Missing lifecycle
configuration or unproven ownership leaves the same action pending. Retirement
must preserve the ordinary checkout and session identity; thread handoff is not
a retirement operation. Both the directory and Git registration must be absent
before success. Retries must retain the action identity after partial effects.
Codex-managed-worktree classification must not be treated as proof that the
worktree is an archive artifact attached to the worker chat.

Scheduling, integration, and cleanup actions must be programmatically
selectable, idempotent, auditable, and safe to resume after partial failure. A
coordinator must be able to execute the next valid action without reconstructing
campaign state from chat history. Ponytail must not infer throughput or an
estimated completion time.

`ponytail campaign ready-actions [<campaign>] --json` must return a read-only,
versioned projection of the durable host actions that are executable now. It
must preserve each action envelope and identity, fail closed on campaign
diagnostics, include historical pending rebase actions, exclude superseded automatic
cleanup actions, and include create or
reuse actions only while their plan remains dependency-ready and their host
effect has not started. It must not materialize assignments or actions, retry a
started dispatch, or invent advisory work absent from the durable ledger.

The scheduler retains all worker pairs, including surplus inactive workers and
their project-resource claims. Each campaign's fifteen-slot capacity bound
includes its own creation reservations, not sessions from another campaign.
The coordinator can request a read-only, per-slot reservation audit. It must
distinguish confirmed campaign sessions from pending and superseded creation
requests, show fresh observed activity when available, compare every known
worker and delivered revision with the current integration commit, and state
all objections to releasing each slot. A started creation with no confirmed
session identity has an unknown outcome; elapsed time or absence from a partial
host listing cannot establish that no chat exists. Only a never-started,
unprovisioned reservation for a plan that is no longer runnable may be marked
releasable through the existing `NOT_STARTED` action result. Confirmed worker
pairs remain retained for reuse, even when their assignment is closed; the
audit never archives or removes a session, worktree, or resource claim.
Grandfathered reservations above fifteen remain valid: the bound prevents new
creation, but `schedule-ready` must still assign every safe, idle pair to a
dependency-ready plan in deterministic order. At capacity without a safe
inactive pair, status reports a nonblocking capacity-wait diagnostic; no new
creation or automatic cleanup is permitted. Historical
automatic cleanup is superseded with an auditable retained disposition rather
than reported as successful physical deletion.

Repository-wide validation must run at campaign coordination and resumption,
before dispatch, and after a campaign relationship or lifecycle change. When
several campaigns are active, status and advancement without campaign input must fail with every
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
