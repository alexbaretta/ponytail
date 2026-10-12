<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaign operating procedure
Use this procedure when the invoking project configures rolling campaign
operations and the stakeholder authorizes coordinated execution. Read the
project's configuration; do not inherit another project's paths or identity.
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
configured common main-checkout anchor; every checkout resolves the same pool.

Initialize with `ponytail campaign init --request @request.json`. Physical V1
request fields are `schemaVersion: 1`, absolute `coordinatorRoot`, repository-relative
`documentPath` and `bindingsPath`, `bindingHistory`, and `configuration`.
`configuration` contains `mainline` (remote/branch or null to resolve defaults),
`incrementRef` (campaign branch), `maxActiveWorkers` and `publicationSize`
(positive integers or null for defaults). Adopted binding history specifies
`path`, authorized `assessor` and `authority`; null is only for nonadopted scope.
Initialization publishes the initial campaign base: require stakeholder authority
for that publication. The result identifies the campaign and accepted graph.

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
   up to N. It prefers reactivating unblocked inactive workers and chooses the
   first available numbered checkout. Use returned actions with `provision-worker`
   or `resume-worker`, then `dispatch-worker`. Recover unknown outcomes with
   `recover-worker` or `observe-resumption`; never create a duplicate actor.
4. For a blocked worker, record dependency discoveries and reconcile first.
   Invoke `suspend-worker` with its assignment/generation and prerequisite IDs.
   Ponytail observes stopped activity, retains ownership and frees active capacity.
   Replenish other eligible work; resume the retained actor when prerequisites clear.
5. Collect the exact terminal submission using `collect-submission`. Use
   `request-review`, `dispatch-review` and `inspect-review` for adversarial review.
   Rejected work returns to the original worker and original reviewer after
   correction and refreshed QA/rebase. Acceptance cannot transfer to another SHA.
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
