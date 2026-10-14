<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaign operating procedure
Use this procedure when the invoking project configures rolling campaign
operations and the stakeholder authorizes coordinated execution. Read the
project's configuration; do not inherit another project's paths or identity.
Execution approval activates configured parallelism automatically; no additional
human instruction to parallelize is needed. N is a capacity limit, not a promise
that dependencies, permissions and physical checkout capacity permit N workers.
Ponytail-managed checkouts and direct Codex App Server sessions require no
Ponytail plugin. MCP is an optional transport for the same typed operations.

## Plan and initialize

Express the approved scope through identified atomic obligations using the
[glossary](glossary.md). Each owns one condition and complete discharge criterion.
Author the coordinator's canonical obligation document, dependency edges and
binding files beside the plan. Bind each obligation to requirement and acceptance
IDs, Arc/Step references, implementation/source IDs and focused unit/integration
selections. The coordinator's files are authoritative; worker copies are not.
Use the project's supported physical schemas and validators; do not invent
record fields or commands. The project must name these files and its operations.

### Create and amend the graph files

The physical V1 obligation document has `schemaVersion`, `scopeId`, `baselines`,
`obligations`, `certificates` and `checkpoints`. Start certificate/checkpoint arrays
empty; never infer discharge from authored records. The baseline identifies its
`id`, `predecessorId`, approved `authority` (`references` and `assessors`),
`requirements` (`id`, `path`, `digest`), `obligationIds` and `inventoryIds`.
Requirement digests belong to this existing baseline contract; certificate inputs
use Git revisions and relevant paths. Apply the skill's inventory/acceptance gates.

Each obligation declares `id`, `category`, `requirementIds`, `responsibilityId`,
`condition`, `criterion`, `dependsOn`, `acceptanceGroups`, `supersedes` and
`execution`. `dependsOn` lists direct prerequisite obligation IDs; do not infer
edges from numbering or prose. `execution` contains `sprintId`, `taskletIds`,
`plannedPaths`, `operations`, `selection` and `target` (`identity`, `profile`, or
null). Keep exact permitted edit paths and the adequate proof selection together.

The execution bindings file is `{schemaVersion: 1, bindings: [...]}`. Each binding
contains `obligationId`, `implementationIds`, `sourcePaths`, `acceptances`,
`unitTests`, `integrationTests` and `exclusiveResources`. An acceptance reference
has `id`, `arcId`, and `stepId` (null only for whole-Arc demonstration). A test
reference has `id`, repository-relative `path` and argv `selection`.

Validate and inspect using the installed skill's portable operation:
`node <skill-directory>/scripts/obligations.js <validate|status|select>
<document-path> <repository-root>`. After initialization, `campaign status` also
reports the coordinator graph and blocked reasons; `next-actions` decides work.
For an adopted scope, retain the accepted obligation definitions and append a
binding-history revision for changed prerequisites, paths or proof selection.
A revision names `id`, `obligationId`, `predecessorId`, `baselineId`, authorized
`assessor`/`authority`, `reason`, `dependsOn` and complete `execution`. The history
has `schemaVersion: 1`, `scopeId` and `revisions`. New approved scope requires a
successor baseline. Reconcile these coordinator files before scheduling; never
rewrite historical leases to make an old submission appear current.

The project configures `.agents/config/project/rolling-campaigns.json` with its
mainline default, one physically shared managed-worktree directory, setup and
retirement commands, and focused/publication QA argv selections. Resolve target
selection from stakeholder request, project default, then Git init.defaultBranch.
N defaults to 10 active workers; publication M defaults to 1, with campaign and
project overrides. Worktree numbers begin at 101. Relative pool paths use the
configured common main-checkout anchor. The coordinator, every managed pool
member and every other rolling-configured checkout resolve the same pool.
Historical checkouts without rolling configuration are not participants and
need no edits; they cannot receive a rolling assignment without current policy.

Initialize with `ponytail campaign init --request @request.json`. Physical V1
request fields are `schemaVersion: 1`, absolute `coordinatorRoot`, repository-relative
`documentPath` and `bindingsPath`, `bindingHistory`, and `configuration`.
`configuration` contains `mainline` (remote/branch or null to resolve defaults),
`incrementRef` (campaign branch), `maxActiveWorkers` and `publicationSize`
(positive integers or null for defaults). Adopted binding history specifies
`path`, authorized `assessor` and `authority`; null is only for nonadopted scope.
Initialization publishes the initial campaign base: require stakeholder authority
for that publication. The result identifies the campaign and accepted graph.

Amend an existing campaign with `amend-configuration --campaign <id> --request
@request.json`. Its V1 request contains `schemaVersion: 1`, a fresh UUID `id`,
`expected` (the current resolved `mainline`, `incrementRef`, `maxActiveWorkers`,
`publicationSize`), proposed `configuration` with those same four fields, actual
`reason` and nonempty human `authority` references. Reconcile committed project
configuration first. Preserve the campaign increment branch and remote; do not
reinitialize. Identical UUID/request retries return the immutable original receipt.

If an unpublished frozen batch owns the old target, wait for its exact QA to
finish, preserve coordinator amendments and settle Git operations, then use
`withdraw-publication --campaign <id> --batch <uuid> --reason <actual-reason>
--authority '<JSON-reference-array>'`. This preserves its claim, memberships,
candidate branch and all attempts while releasing only operational reservations.
Running QA, incomplete preparation and any started push refuse withdrawal;
unknown pushes must be observed rather than bypassed. Inspect withdrawn history
with the existing inspection commands. Apply the configuration amendment, switch
the clean coordinator back to its retained campaign branch, and let normal
freezing prepare a fresh candidate against the new target. Old QA is historical
evidence, never publication authorization for that new candidate.


## Session-operation scope correction

The coordinator, not Ponytail CLI or MCP, creates, starts, stops and renames
sessions through its host tools. Use `ponytail swarm` for session associations
and managed-worktree lifecycle. Runtime activity is a host observation; database
membership is not activity proof. The earlier native session-control procedure
below is superseded: its session API command spellings are retired and must not
be invoked. Planning, graph reconciliation, acceptance and publication remain
campaign responsibilities. The swarm skill will own the revised operational
session procedure; do not build a private App Server controller as a substitute.

## Coordinator loop

Use `ponytail campaign --help` and each command's `--help` for required named
flags. Operations return `{command, result}` JSON; preserve returned campaign,
assignment, generation, action, review and batch IDs. Do not infer or replace them.

1. Query `status --campaign <id>` and `next-actions --campaign <id>` on startup,
   resumption, worker events and periodic replenishment. Execute their indicated
   operation with the returned identities; do not recreate scheduling policy.
2. Update the canonical files for approved newly discovered obligations and
   dependency/binding changes, then run `reconcile --campaign <id>`. It rebuilds
   the coordinator graph, checks validity and invalidates stale scheduling inputs.
   Fix cycles or missing references before dispatch. Do not edit graph projections
   directly in PostgreSQL or accept a worker's graph as scheduling authority.
   If `next-actions` reports `rebind-worker` for a stopped inactive assignment,
   execute it with that assignment's current generation. Retain the returned
   renewed generation and lease; the original session and checkout remain owned.
   Then replenish/resume using the refreshed identities. Reconciliation alone
   does not renew a worker's frozen lease.
3. Run `replenish --campaign <id>` to reserve compatible obligation/worktree pairs
   up to N. With a fixed authorized physical pool, pass `--existing-only true`.
   This imports safe retained registered checkouts after reset and stops with
   `stopReason: no_available_worktree` when none are free; it never reserves a
   nonexistent root and does not reduce configured N. It prefers reactivating unblocked inactive workers and chooses the
   first available numbered checkout. Use returned actions with `provision-worker`
   or `resume-worker`, then `dispatch-worker`. Recover unknown outcomes with
   `recover-worker` or `observe-resumption`; never create a duplicate actor.
   `dispatch-worker` is long-running: start the selected independent dispatches
   concurrently, retain their command/transport handles, and observe them without
   awaiting each worker's completion before starting the next. Implementation
   workers are top-level native sessions; subagents do not replace them. Retain
   approval handling on each owning transport. Query and replenish while others
   run; serialize only the coordinator mutation/publication lane.
   In the Codex desktop, use `prepare-worker-dispatch` instead of starting a
   private `dispatch-worker` process when the worker must execute visibly in the
   desktop. Preparation returns immutable instructions and the original thread
   ID without acquiring a native writer or starting implementation. Preparation
   checks original identity, terminal turn and absence of observed active work;
   notLoaded is an unavailable activity observation, not proof of idle. The
   desktop owns actual dispatch and activity verification. Send those exact instructions once to
   that existing thread with the desktop thread tool, observe its actual turn
   ID, then run `acknowledge-worker-dispatch --dispatch <id> --turn <id>` with
   the assignment/generation selectors. Acknowledgment verifies the native
   instruction delivery against the frozen instructions without acquiring the
   writer. Native dispatch has a user-message input; the Desktop send tool has
   a delegation output with canonically escaped input. Preserve that actual
   transport record; do not invent a user-message item or resend for a missing
   acknowledgment.
   If sending or acknowledgment has an unknown outcome, inspect the original
   thread and prepared dispatch; never resend merely because acknowledgment
   was lost. Observe activity and approvals through the owning desktop. After
   completion, use `collect-submission` with a fresh genuine owning-transport
   idle observation when a private reader sees notLoaded. Private App Server
   activity does not establish desktop-visible execution.
   Distinguish native running/waiting sessions from logical occupied assignments.
   `availableCapacity` is the capacity left after the reported hypothetical
   selection, not the count of sessions already created. Report dependency,
   ownership, approval and actual checkout restrictions when N cannot be filled;
   never reinterpret N as authorization to create otherwise forbidden checkouts.
4. For a blocked worker, record dependency discoveries and reconcile first.
   Invoke `suspend-worker` with its assignment/generation and prerequisite IDs.
   Ponytail observes stopped activity, retains ownership and frees active capacity.
   Replenish other eligible work; resume the retained actor when prerequisites clear.
   A failed native instruction turn, such as temporary model capacity failure,
   needs no invented obligation dependency. Use `suspend-worker --blockers '[]'`
   with its original assignment/generation; Ponytail must observe that exact
   failed turn and idle actor. Replenish/resume preserves the original session,
   checkout and unfinished work. If it retains an owned rebase, inspect and
   continue it before a fresh semantic replay; never reset its amendments away.
   A completed turn containing blocker prose is not a failed native turn or a
   submission. Use `retry-worker --campaign <id> --assignment <uuid>
   --generation <uuid> --reason <actual-reason>` for the latest terminal idle
   actor, supplying the fresh owning `--observation` packet used by collection
   when the observer reports notLoaded. This checkpoints work, records correction
   and frees active capacity without fabricated prerequisites. Replenish prefers
   its original actor; resume with the returned generation and dispatch renewed
   instructions. Active, newer or unknown native activity is not eligible.
   Correction is an authorized actor-control operation: without an owning packet,
   an unloaded observer may explicitly resume only the recorded original actor,
   then freshly verify the same latest terminal turn and idle state. A conflicting
   writer or inability to prove idle preserves ownership and refuses correction.
   Collection never performs that writer acquisition. Do not synthesize fresh
   timestamps on historical observations.
5. Collect the exact terminal submission using `collect-submission`. Use
   `start-review` to create an independent native reviewer and start its actual
   review on the same connection before closing it. The command preserves the
   recorded reviewer thread through corrections and collects the original turn
   on retry. Use `request-review`, `dispatch-review` and `inspect-review` for
   explicitly attached reviewers; never close a newly created empty thread and
   assume it can later resume.
   Rejected work returns to the original worker and original reviewer after
   correction and refreshed QA/rebase. Acceptance cannot transfer to another SHA.
   If the reviewer is genuinely lost, retain its original review ID and observed
   loss reference. Use `start-review --loss '{"reviewId":"<original-review>",
   "lossReference":"<observed-loss-reference>"}'` to create the replacement reviewer, or `request-review --loss` with an
   explicitly created replacement identity and immediate `dispatch-review`. Ponytail retains/fences the original request and requires fresh review;
   a timeout alone is not proof of loss.
6. `integrate` performs the coordinator's fast rebase: inspect semantic conflicts
   when textual conflicts occur, preserving the deliberately shorter review window.
   Substantive conflicts return to the worker for full semantic repair and review.
   Use `accept` with the candidate and binding packets only for the confirmed
   reviewed delivery and adequate current Git-based evidence. Retire ownership
   through `retire-worker` before another actor receives the checkout. Replenish
   can atomically release a completed assignment with its `{id,generation}`.
7. `freeze-publication` freezes up to M accepted increments. Use
   `prepare-publication`, `run-publication-qa` and `publish-mainline` on that exact
   candidate. Full configured QA gates mainline publication; focused QA gates
   campaign increments. Observe uncertain preparations, QA and pushes using
   `observe-preparation`, `observe-publication-qa`, `observe-mainline` or
   `observe-refresh` for the retained original operation before retrying. Inspect
   a retained merge using `inspect-publication-conflict`. Upstream changes use
   `refresh-mainline`, renewed QA and `synchronize-campaign`; never reset history.
8. Close only after all approved obligations, final gates, publication and actor
   retirement are proved. Daily results are an expected consequence of frequent
   integration, not an imposed deadline or a substitute acceptance criterion.

## Worker execution

Required focused QA requests are matched to the exact declared argv, original
actor, checkout, turn and generation. Invoke those commands separately, without
appending shell operations, redirects or unconfigured diagnostic commands; retain
the native output as evidence through ordinary in-scope file operations. Accepted
host restrictions still apply. A refusal is not a passing QA result or permission
to broaden execution policy.

Read project rules, skills and the exact frozen assignment before work. The
lease owns current permitted paths, operations, prerequisites and proof selection.
Implement autonomously within that authority, synchronize requirements/UAT and
traceability, query build impact, and run required focused QA/Arcs. Do not request
routine implementation approvals or await coordinator instructions between edits.

For code changes, freshly fetch the campaign branch and perform a full semantic
rebase commit by commit. Correct textual and cleanly applied semantic conflicts,
refresh affected evidence, and submit the exact final SHA/base with the required
strict proof record. Git evidence contains the tested revision and relevant
tracked paths/scopes, not per-file hash manifests or a repository-wide file list.
Retain command output; ignored logs are outputs rather than source inputs.
A no-edit obligation needs adequate inspection evidence, not an invented rebase.

Stop activity when submitting for adversarial review and coordinator publication.
Correct the original reviewer's findings autonomously, refresh QA/rebase and
resubmit. Workers never publish to mainline or accept their own discharge.
Report unknown prerequisites, blockers or required scope changes to the
coordinator; retain the checkout and do not silently alter its authoritative graph.
These are legitimate coordination boundaries, unlike routine coding decisions.

## Explicit campaign reset
Only an explicit human instruction to abandon previous parallel campaign state
permits `ponytail campaign reset`. Execution approval for ordinary development
or a blocked assignment does not imply reset authority. This project-scoped
operation clears all prior rolling campaigns and leases for the invoking project,
not the shared database or project search/traceability indexes.

Create a V1 request `{schemaVersion:1,id:<UUID>,reason:<actual-reason>,authority:
[<human-reference>]}`. Run `ponytail campaign reset --request @request.json`
to preview exact registered Git paths, native actors and dispositions. Review
this inventory, then run the same command with `--execute true` to act. Reuse
the original request after interruption; do not create a new request while the
original reset is pending. Scheduling stays fenced until cleanup completes.

Reset archives the original actors after observing cessation, runs declared
resource cleanup, prepares retained numbered pool checkouts at the coordinator's
committed HEAD, and removes obsolete agent-owned external checkouts, including
this repository's Codex worktrees. Main/coordinator and ordinary user checkouts
are protected. Unknown activity, conflicting native writer, active external
QA/push or failed cleanup retains pending ownership rather than guessing.

Git refs `refs/ponytail/reset/<request-id>/<inventory-index>/head` preserve
unpublished commits. When tracked or untracked source changes exist, `changes`
retains the stash object (untracked files are in its third parent). Build caches
are retained in reusable pool members; ignored disposable files in removed
checkouts are deleted. The command does not publish or alter mainline refs.
After reset completion, initialize a fresh campaign from its approved files and
configured target. Existing Git history and source requirements remain usable;
cleared execution records are not proof of discharged obligations.
