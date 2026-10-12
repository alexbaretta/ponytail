<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaign execution contract

[Plan](plan.md) | [Requirements](../../../requirements/rolling-campaigns.md)

## Authority and ownership

The coordinator's designated canonical files own the accepted obligations,
dependency graph, discharge criteria and certificates. Worker file copies and
proposed amendments cannot control scheduling. A graph snapshot identifies
coordinator checkout, campaign, accepted revision, input digests, baseline and
parser version. PostgreSQL owns execution state and the authoritative snapshot
identity; optional derived graph projections are disposable, never editable.

Existing obligation IDs, input manifests and evidence adequacy remain canonical.
An acceptance names an observable condition. Its demonstration can identify
Suite/Arc/Step, including required predecessors. A certificate assesses an
obligation's declared discharge criterion; there is no second criteria registry.
Assignment completion, campaign integration and mainline publication remain
distinct from discharge and evidence freshness.

## Configuration

Each campaign persists two refs: its increment branch and mainline publication
target, including remote identities. Mainline selection at planning is explicit
user request, then project default, then effective `init.defaultBranch`. Check
ref validity and existence; never infer branch-creation authority. Persist the
selection so subsequent default changes cannot redirect execution.

Active capacity N resolves campaign then project then global default 10.
Publication size M resolves campaign then project then global default 1.
Both are positive safe integers. Count accepted obligation increments, not
resubmissions, no-op bookkeeping or certificate updates. Polling, setup, QA,
instruction loading and host execution are configured project operations.

The project configures one managed directory by absolute path or a relative
path with an explicit main-root resolution anchor. Validate the physical
directory across every registered checkout using realpath and filesystem
identity. No checkout may silently choose a different pool. Managed worktrees
use numbers 101 upward; choose the lowest available healthy number, or reserve
the lowest unused number before creation. Never adopt user worktrees implicitly.
Setup verifies `/session_id.txt` is ignored, repairs canonical `.gitignore`
when missing and verifies effective ignore rules. Marker content is native
session identity, not a secret or lease token.

## Graph reconciliation and eligibility

Rebuild from coordinator files after accepted dependency amendments, relevant
upstream/increment changes, blocker discoveries, recovery and explicit refresh.
Validate identities, references, acyclicity, scope, traceability and executable
selectors. A worker discovery immediately suspends unsafe work and records an
operational blocker; dependency amendments become authoritative only after
coordinator reconciliation. Preserve changed conditions with successor IDs and
record certificate invalidation as honest disturbance.

Allocation rejects an outdated snapshot. Prerequisites must be satisfied for
the required branch/target and evidence inputs. Determine compatibility from
authorized write scopes, contract/resource constraints and test isolation.
Unknown compatibility is unresolved, never assumed independent. Shared generated
outputs have one integration regeneration owner; accepted certificate records
and Git indexes have one serialized owner.

Select a deterministic maximal compatible set up to active capacity. Prefer
reactivating eligible inactive assignments before creating new assignments.
Within each group use category priority and stable obligation number. A later
category may run despite unrelated earlier gaps; actual prerequisites remain
mandatory. Preserve existing six-coordinate reporting, honest disturbances and
final acceptance. Do not misdescribe a greedy maximal set as a maximum set.

## Operational state and allocation

Assignments progress through reservation, provisioning/attachment, working,
review/rework, integration and retirement, with an acknowledged inactive state
for blockers. Inactive assignments retain their original session, branch,
worktree and obligation ownership, but consume no active slot. Unreachable or
silent workers cannot be inferred inactive. Suspended checkouts are unavailable
to other assignments; retained pool size can exceed N and is reported separately.

Before suspension, checkpoint work and stop owned activity. Before resumption,
reserve capacity, re-evaluate dependencies/compatibility and refresh base/scope.
Before release, terminally notify the worker, establish cessation of writes and
owned processes, preserve integrated work, clean exact assignment resources,
remove only its matching marker and verify reuse safety. Retain valid caches.
Revoke the lease generation so late events cannot affect a successor assignment.

One transaction serializes project-pool allocation: verify graph generation and
retirement preconditions, optionally release a completed assignment, count active
capacity, prefer resumptions, then reserve a ready obligation and lowest-number
checkout. Release succeeds even when no obligation is ready. Return explicit
`no_ready_obligation`, `capacity_reached`, resume or start action with reasons.

PostgreSQL holds campaigns, pools, worktrees, sessions, assignments, blockers,
submissions, reviews, QA evidence references, publication batches and action
history. Typed columns own scheduling state. Partial unique indexes prohibit
overlapping live ownership; partial ordered indexes find available numbers and
pending actions. Index blocker relations, review queues, campaign state and event
sequence. Reuse existing text/entity indexes; add GIN only for actual containment
queries. No mutable obligation/dependency database is required.

Git, filesystem setup, Codex creation and SQL are not one distributed transaction.
Persist intent before each external action, then its result with an idempotency
key. Recover unknown outcomes before retrying; no duplicate worker creation.
Setup failure retains exact cleanup ownership. Quarantine uncertain checkouts.

## Workers and direct Codex control

When the configured pool is inside the main checkout, project setup must make
it Git ignored before allocation so integration retains a clean checkout.

Create ordinary Git worktrees with project setup, then start a fresh Codex thread
with explicit `cwd` through the documented App Server. The installed CLI's
`--cd` supports manual operation; do not use `--worktree`. A dedicated transport
adapter owns initialization, request/response IDs, returned thread/session IDs,
turns, interruption, resumption, event observation and error recovery. The
canonical transport is an owned stdio App Server process. On host/process loss,
keep assignments reserved until activity and preserved state are reconciled;
resume persisted native sessions rather than create replacements. Closing an
owned server requires observed terminal turns. No Ponytail
plugin is necessary for execution. Desktop visibility must be tested separately
and reported truthfully, not inferred from successful thread creation.

Each worker receives obligation ID, requirement/acceptance references, exact
implementation IDs/files for existing-code changes, unit/integration Arc and
Step selectors/files, lease generation, graph identity, base commit, write
boundaries, discharge criterion and QA profile. Prospective artifacts remain
explicitly prospective. No-code obligations need no invented implementation.
The worker writes `session_id.txt` only after authenticated attachment.

The worker implements, runs focused QA and affected builds/static/structural
checks, fetches the campaign branch, performs full semantic rebase commit by
commit, refreshes affected evidence and submits the exact candidate SHA/base.
Candidate certificates do not mutate accepted coordinator records.

The frozen submission boundary retains the exact candidate and proof in
PostgreSQL, separately from certificates. Submission requires the attached
session's stopped acknowledgment, its registered checkout and ignored marker,
the current coordinator increment as base, a clean linear branch, and evidence
whose revision and inputs match that candidate and frozen target/selection.
Check every commit's changed paths, including rename sources and deletions;
an out-of-scope change followed by a revert must not disappear from enforcement.
An exact retry returns the original immutable receipt; a changed payload for
that receipt is rejected. Entering REVIEW retains checkout/obligation ownership
and establishes neither adversarial approval nor discharge. This check does
not prove the worker's full semantic rebase or replace subsequent review,
integration, publication and certificate assessment.

## Review and increment integration

Assign an adversarial reviewer to the exact candidate and reuse that reviewer
through corrections. Corrections return to the worker for implementation,
fresh full semantic rebase and refreshed proof. Lost reviewer identity requires
a recorded replacement and fresh review, never a fictitious continuation.

After acceptance, fetch the campaign branch and perform interactive fast rebase:
cleanly replayed commits receive no additional semantic-conflict inspection;
textual conflicts trigger semantic review of the conflicting changes. Substantive
repairs return to worker/reviewer. This is the stakeholder's deliberate exception
for throughput, restricted to post-review integration. Tests are not waived.
Record reviewed base, integration base, candidate/final SHA and applicable proof.

Fast-forward and normally push the campaign increment. Reconcile rejected and
unknown pushes without force. Verify remote containment before recording delivery.
Assess certificates on current inputs and preserve downstream dependency scope.
Immediately retire/release the completed worker and replenish ready capacity.

## Mainline publication and QA

At M accepted increments, explicit flush, completion with a partial batch, or
quiescence with pending increments, freeze a publication batch. Workers may
continue implementation while the serialized integration lane prepares the
candidate. Incorporate freshly fetched mainline before full QA, preserving
published campaign history with an ordinary merge where histories diverge.
Inspect integration semantics; the worker fast-rebase exception does not waive
publication validation or excuse known conflicts.

Run each applicable full unit command, all integration workflows required by
the publication profile, configured project-wide checks and affected builds
on the exact candidate. A failed/skipped required check prevents mainline
publication. Normal push only; reconcile upstream races and refresh proof on
changed candidate inputs. Advance the campaign consistently with the published
candidate before accepting subsequent increments. Record exact refs, SHA, input
manifest, outcomes and external-action acknowledgments. Final plan acceptance
reuses adequate evidence only while its relevant inputs remain unchanged.

Per-obligation focused QA and per-publication full QA explicitly supersede the
earlier all-project-QA-per-worker sketch. Daily delivery has no timer/gate.
Mainline publication, deployment and human acceptance are separate contracts.

## Interfaces and replacement

### Stable identities and revised execution bindings

Inspection of the portable V1 document and the rolling graph reader identifies
an implementation prerequisite: `acceptCheckpoint` preserves whole obligation
records, including `dependsOn` and `execution`, while rolling selection currently
reads paths from that immutable execution field. The inspection-only records in
BASELINE-8 therefore cannot become edit assignments by changing their existing
objects. Changing an assignment must not create another counted obligation or
rewrite historical checkpoint meaning.

Introduce an explicit versioned binding history before assigning those outcomes.
The obligation's canonical identity, condition and discharge criterion remain
stable. A binding revision names its obligation ID, predecessor revision,
authorizing coordinator, reason, prerequisite IDs, exact permitted paths and
operations, proof selection and target. Conditions and criteria are referenced,
not copied into binding records. The current binding is derived from accepted
revision history. Every assignment freezes that revision and graph digest;
changing the current binding does not expand an already issued lease.

The coordinator's files own current prerequisite/binding declarations and their
accepted history; PostgreSQL stores assignment state and frozen revision
references. Do not introduce a second mutable graph in PostgreSQL. Refresh must
validate identity, references, acyclicity, declared path boundaries and authority
before making a revision schedulable. A dependency discovered by a worker is a
proposal until reconciled in those coordinator files. A newly blocked lease
follows the existing suspend/reactivate policy and capacity accounting.

Historical physical V1 readers retain their existing meanings. Use a new
physical contract for binding revisions rather than adding fields to V1 readers
or mutating old obligation records during projection. The adopted portable
selector, rolling allocator and acceptance path must consume the same effective
binding projection. Until implemented, V1 inspection-only bindings remain
inspection-only; a Markdown assignment cannot silently override the machine
contract. The amendment operation is a bounded local repair within the already
approved planning/assignment scope, not a new requirement for users to reapprove
every routine code change.

Required proof cases: unchanged obligation IDs/counts across a binding amendment;
exact immutable historical replay; rejected stale predecessor, unauthorized
revision, missing prerequisite or cycle; no widening of a live frozen lease;
deterministic suspension/resumption after dependency change; shared effective
binding across portable and rolling selectors; rejection of edits outside the
frozen revision; and acceptance against the actual revision's evidence inputs.
Only then bind the sprint-test migration to its relevant registered outcomes,
with the typed test path, deleted handwritten test, configuration and generated
traceability paths explicitly frozen before source edits.

### Shared CLI and MCP application layer

One application operation layer serves CLI and MCP, as required by
REQ-ROLLING-INTERFACES. MCP parity is approved scope, not an optional replacement
for the CLI. Root help lists
chapters, chapter help lists commands and command help owns arguments, behavior,
preconditions, mutations, results and examples. One registry provides CLI help
and MCP schemas/descriptions. Proposed chapters: project, plan, campaign,
worktree, traceability, qa and search. Replace campaign dispatch wholesale;
historical records remain inspectable and migrate only with explicit scope.

Campaign operations cover init, reconcile, status, next-actions, allocate,
suspend/resume, submit/review, integrate/publish and close. `next-actions` returns
exact executable obligations, identities, prerequisites and reasons. Coordinator
calls do not independently rediscover dependencies or guess host availability.
Events plus configured periodic reconciliation replenish capacity and recover
missed notifications. Pending integration/review is visible and ordered to avoid
starvation. Durable state survives coordinator restart and chat compaction.

## Implementation boundaries and proof

Core graph/configuration/scheduling can be accepted independently of Codex.
PostgreSQL transactions have real contention/isolation tests. Worktree setup
and Git publication use disposable repository integration fixtures. Codex
transport gets protocol tests plus a real designated-directory smoke proof;
protocol fakes do not establish native runtime acceptance. CLI/MCP share the
same operation results and fencing. Keep exact failure and recovery cases
where the requested lifecycle relies on them.

## S02 concrete boundary design

Project configuration lives at `.agents/config/project/rolling-campaigns.json`.
Its new immutable V1 representation contains `schemaVersion`, `mainline`
(nullable remote/branch pair), `managedWorktrees` (directory plus main-root
anchor), `maxActiveWorkers`, `publicationSize` and named QA/setup command
profiles. Campaign configuration is a separate immutable V1 document adjacent
to the plan, recording resolved refs and overrides; it is not silently appended
to any historical campaign metadata version. Campaign discovery gains an
explicit new physical version when it can consume the rolling pointer.

`src/rolling-campaign.js` owns pure configuration/graph/scheduling behavior;
`src/rolling-campaign-store.js` owns real PostgreSQL transactions; the native
Codex transport and worktree/Git operations are separate external boundaries.
Typed operation requests/results carry schema versions and are registered in
`versioned-data-contracts.json`; safe numeric conversion follows the existing
lossless JSON standard. Shared CLI/MCP dispatch never shell-interpolates worker
prompts, branch names, paths or command arguments.

Graph input is the existing validated obligation representation, with an
explicit rolling execution envelope supplying requirement/acceptance/Arc/Step
references and exact authorized paths/resource claims. Reuse the existing
canonical obligation parser and freshness assessment. Existing V1 obligation
readers do not change meaning; additional durable fields require a successor
physical version. Scheduling diagnostics retain unresolved proof and exact
blocking edges. Graph hashing includes authoritative document bytes and
configuration, not worker-local copies or merely timestamps.

## Explicit retirement cleanup contract

Rolling project configuration V2 adds nullable `retirementCommands`, an array
of executable argv arrays. Historical V1 readers retain their original meanings;
normalization into V2 uses `null` for the absent cleanup contract. `null` never
means no resources. An explicit empty array declares no additional project
cleanup. Commands must idempotently release and verify the exact assignment's
owned resources, preserving the retained Git checkout, user-owned work and
reusable build caches. Setup exposes `PONYTAIL_WORKTREE_GENERATION` alongside
its existing worktree number and physical roots so project tooling can bind
resource ownership to the allocation. Retirement supplies the same allocation
identity and the authenticated worker identity. `PONYTAIL_WORKTREE_GENERATION`
retains the original setup allocation generation, while
`PONYTAIL_ASSIGNMENT_GENERATION` identifies the current assignment generation;
resuming a worker does not transfer its resources to a new setup identity.
Failure retains the reservation for reconciliation; successful cleanup precedes
marker removal and checkout release.

The worker retirement V1 journal retains that exact original native actor,
resource allocation and published integration revision. After observing the
original turn terminal and worker idle, preparation revokes assignment authority
and retains checkout ownership in `RETIRING`. A journaled notification tells the
worker that coordination has ended. Its known completed turn and idle activity
precede archival; an archival acknowledgement precedes project cleanup. Only
`CLEANED` attached ownership can be released by the atomic release-and-allocate
operation. A lost notification creation acknowledgement remains `NOTIFYING`
without a turn identity and requires reconciliation of that original turn;
never dispatch a replacement blindly. Cleanup retries retain the same ownership
context and do not send another worker notification. Native archival is not idempotent. Archive recovery first queries the native
archived inventory filtered to the exact physical checkout, including every
supported native source kind, then matches the original thread identity.
Native creation through App Server does not imply an `appServer` source tag;
the installed desktop runtime records these workers as `vscode`. An observed archived actor
satisfies a lost acknowledgement; otherwise archive that same revoked actor.
Failures or unknown outcomes preserve the reservation. Cleanup retains checkout contents and reusable build caches.

## Completion batches approved 2026-10-11

Finish the already-started OBL-57 retirement boundary before starting the
twelve remaining delivery obligations. Execute those obligations in exactly
three groups of four, in this order:

| Batch | Atomic obligations | Combined behavior |
| --- | --- | --- |
| 1 | OBL-58, OBL-59, OBL-60, OBL-61 | Publication counting, partial flush, mainline incorporation and exact-candidate full QA. |
| 2 | OBL-62, OBL-63, OBL-64, OBL-65 | Publication reconciliation, capacity replenishment, coordinator decisions and typed campaign initialization. |
| 3 | OBL-66, OBL-67, OBL-68, OBL-69 | Command registry/help, replacement of legacy dispatch, shared CLI/MCP operations and final closure gates. |

The groups organize implementation and combined validation; they do not merge
obligation identities or change canonical conditions, prerequisites, authority
or discharge criteria. Keep each obligation's frozen assignment boundary and
individual certificate assessment. Reuse shared passing evidence only while
its relevant inputs remain unchanged. Complete implementation, integration,
applicable QA and discharge assessment of a started group before starting the
next group. Respect dependencies within each group; grouping does not authorize
bypassing a prerequisite or publishing an unverified candidate. Run final
repository acceptance after the last relevant edit.

## Publication batch transaction and QA boundary

The first publication group reserves distinct accepted campaign delivery receipts
under the existing project lock. Git ancestry determines their order; transaction
timestamps do not define a history prefix. The immutable V1 claim freezes at most
M receipts, their last campaign revision, the resolved target and input digests.
Membership keys prevent retries or bookkeeping from counting a receipt twice.
Completion flush requires every bound delivery obligation satisfied; quiescence
requires neither active nor immediately schedulable work. Empty selections do not
create publication claims. A partial unique index gives one active publication
ownership of a coordinator checkout and new increment claims respect that owner.

Preparation is journaled before external Git work. The fetched mainline revision
and retained campaign head are recorded before creating the publication branch.
That branch begins at the frozen prefix and merges fresh mainline; published
campaign refs stay intact. A conflict or unknown result preserves the branch,
reservation and preparation for reconciliation. Candidate acknowledgement verifies
its physical checkout, exact revision and containment of all frozen receipts and
mainline.

Each full QA attempt has its own immutable V1 job identity and complete command
profile derived from the reconciled candidate's current project configuration.
The batch stores the current QA identity explicitly; timestamps never select the
current attempt. Failed commands retain their output and prevent push. A completed
old receipt cannot overwrite a newer running attempt. Passing proof must cover
every configured command on the exact candidate with unchanged configuration;
empty profiles, partial execution, stale proof and changed checkout inputs refuse
push intent. Mainline push observation, race recovery and campaign synchronization
remain the next publication obligation's responsibility.

## Mainline observation and campaign synchronization

Mainline publication V1 observations retain immutable identities and use the
existing canonical Git publication-result decoder. Push intent still requires
complete current QA. Remote containment is freshly checked before publication
accounting; a lost acknowledgement is observed without issuing another push.
A published receipt is distinct from a synchronized campaign base. The active
coordinator-root reservation remains held while synchronization is outstanding.

Synchronization preserves the retained campaign branch and any unselected
accepted history by merging the observed published mainline into that branch,
then publishing the campaign ref through the ordinary non-force Git path. The
coordinator graph is reprojected after acknowledged remote containment. Completed
synchronization retains both its local and observed remote revisions. A later
request returns that immutable receipt without checking out, merging, pushing or
changing newer campaign work. Failure or unknown outcome retains the reservation.

The initial OBL-62 increment establishes normal push, lost-acknowledgement
observation, restart synchronization and late-receipt safety. Divergent mainline
races and changed-input QA refresh remain required before OBL-62 discharge.
