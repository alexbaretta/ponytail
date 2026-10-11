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
turns, interruption, resumption, event observation and error recovery. No Ponytail
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

One application operation layer serves CLI and optional MCP. Root help lists
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
