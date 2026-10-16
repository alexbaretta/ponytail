<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaign operating procedure

For new host-managed swarm execution, follow the swarm skill's
[queue protocol](../../swarm/references/autonomous-queues.md) instead of the legacy
coordinator allocation/resumption steps below. Initialize directly from canonical
local obligation/binding documents; no remote publication is implied. Worker
claims, parked handoffs and dynamically discovered obligations use the CLI's
project fence. Both actors update applicable requirements, UAT, issue, plan and
traceability records through discovery. Preserve the canonical acceptance,
certificate binding and publication gates; queues do not discharge obligations.


Traceability: implements REQ-ROLLING-CLIENT-PROTOCOL
Traceability: implements REQ-ROLLING-PARALLEL-DISPATCH

Use this procedure when the invoking project configures rolling campaign
operations and the stakeholder authorizes coordinated execution. Read the
project's configuration; do not inherit another project's paths or identity.
Execution approval activates configured parallelism automatically; no additional
human instruction to parallelize is needed. N is a capacity limit, not a promise
that dependencies, permissions and physical checkout capacity permit N workers.
The coordinator operates top-level worker sessions through host tools and uses
the `swarm` skill for session associations and Ponytail-managed checkouts. MCP is
an optional transport for the same bookkeeping operations.

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
configured common main-checkout anchor. Resolve configuration only from the
invoking owner; do not read or validate sibling checkout configurations.
Numbered allocation still requires the owner configuration to match its recorded
pool. Historical checkouts need no configuration edits.

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


## Coordinator loop

Apply the `swarm` skill for host session creation, messaging, activity inspection,
naming, quiescence and session/worktree associations. Ponytail CLI and MCP do not
operate sessions through Codex APIs. Use `ponytail campaign --help` and each
command's scoped help; preserve returned campaign, assignment, generation,
action, review and batch IDs.

1. Query `status --campaign <id>` and `next-actions --campaign <id>` on startup,
   resumption, worker events and periodic replenishment. Execute supported
   `command` recommendations through Ponytail; perform `hostAction` recommendations
   through coordinator host tools. Preserve the associated prerequisite records;
   do not recreate scheduling policy or treat membership as runtime activity.
2. Update canonical files for approved dependency, binding and scope discoveries,
   then run `reconcile --campaign <id>`. Fix cycles and missing references before
   dispatch. The coordinator's graph is authoritative; worker copies are not.
   Historical frozen leases remain immutable; a scope change needs renewed
   authorization before the original worker proceeds. Once the coordinator has
   established quiescence and recorded the worker inactive, run
   `renew-lease --campaign <id> --assignment <id> --generation <current-generation>`.
   This freezes the approved reconciled scope with a new generation, preserving
   the session and checkout. It does not resume the session. Replenishment then
   selects the retained worker; use host tools and swarm binding for resumption.
3. Allocate compatible obligation/worktree pairs through `replenish`. For fresh
   native sessions, follow the canonical
   [swarm creation and native allocation procedure](../../swarm/SKILL.md#start-compatible-workers-concurrently):
   create a fresh project-targeted `create_thread` in its own native worktree,
   verify actual identities, enroll and bind it, then establish host quiescence
   and replenish with the exact worker/session and membership selectors. This
   allocates one frozen assignment on that original checkout; it never creates
   a second checkout or copies coordinator conversation history. Retain the
   returned assignment generation independently of worker/checkout generations.
   Numbered-pool workflows retain `replenish --campaign <id>` up to N and
   `--existing-only true` for safe retained numbered roots. Neither path proves
   execution. First native admission records the existing host identity and
   exposes the normal assignment through `next-actions`; send its exact scope
   and establish/verify the worker goal through the swarm procedure. Original
   inactive workers take precedence; target the original identity for resumption.
   Observe independent top-level workers concurrently through host tools.
   Unknown dispatch outcomes retain their identities for observation.
4. A blocked worker reports its discovered prerequisites. Reconcile first,
   quiesce it through host tools, then use `swarm worker-inactive` with the exact
   worker generation, campaign lease generation and declared blocker IDs. Retain
   its source and checkout. Inactive workers free active capacity and take
   precedence when unblocked. Resume the original session through host tools and
   repeat `swarm worker-bind` with the new `--lease-generation` from replenishment;
   the command records assignment membership rather than actual execution. Permission
   and host-capability failures are concrete blockers, not invented dependencies.
5. Collect the original worker's exact final commit/base, focused evidence and
   accepted local-review verdict. The worker normally creates a read-only
   reviewer subagent in its own session, binds the review to the exact candidate
   SHA and base, corrects findings, and retains the same reviewer through
   correction. It reports the host-issued reviewer identity and verdict; it must
   not invent either. Record the collected V1 proposal with `submit --campaign
   <id> --assignment <uuid> --generation <uuid> --submission @submission.json`.
   Bind the exact candidate and independent reviewer with `request-review`, then
   record the already completed verdict with `record-review --campaign <id>
   --review <uuid> --outcome @outcome.json`. The `reviewerSessionId` field
   carries the exact host-issued session identity of either a local reviewer
   subagent or a top-level reviewer. Assign a top-level reviewer through coordinator
   host tools only when the worker cannot create or identify a local reviewer.
   The coordinator verifies and records the attestation; it does not repeat the
   adversarial review. These commands only validate and store supplied evidence;
   the coordinator establishes worker quiescence through host tools.
6. After adversarial-review acceptance, `integrate` performs the coordinator fast rebase and campaign
   increment publication. Resolve textual conflicts and their semantic effects,
   then refresh affected focused proof. After confirmed increment publication,
   `accept` performs certificate acceptance/discharge. Quiesce and detach workers and release
   checkouts using the swarm procedure; preserve campaign acceptance evidence.
7. `freeze-publication` freezes up to M accepted increments. Use
   `prepare-publication`, `run-publication-qa` and `publish-mainline` on that exact
   candidate. Full configured QA gates mainline publication; focused QA gates
   campaign increments. Observe uncertain preparation, QA and pushes with
   `observe-preparation`, `observe-publication-qa`, `observe-mainline` or
   `observe-refresh` for the original operation before retrying. Inspect retained
   merge conflicts with `inspect-publication-conflict`. Upstream changes use
   `refresh-mainline`, renewed QA and `synchronize-campaign`.
8. Close only after obligations, final gates, publication and ownership release
   are proved. Daily results follow frequent integration rather than a deadline.

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

For code changes, freshly fetch the campaign branch and follow the
[semantic-rebase procedure](../../semantic-rebase/SKILL.md): review the aggregate
final-state changes once, select potential semantic conflicts, and stop only at
contributing commits or unexpected textual conflicts. Correct the selected
interactions, refresh affected evidence, and submit the exact final SHA/base with the required
strict proof record. Git evidence contains the tested revision and relevant
tracked paths/scopes, not per-file hash manifests or a repository-wide file list.
Retain command output; ignored logs are outputs rather than source inputs.
A no-edit obligation needs adequate inspection evidence, not an invented rebase.

Before terminal submission, spawn a local read-only reviewer subagent when the
host supports one with a stable identity. Give it the exact base, candidate SHA,
approved obligation, requirements, acceptance, tests and retained proof. It must
inspect only and return an accepted or rejected verdict with actionable findings.
Correct findings autonomously and return the corrected exact candidate to the
same reviewer. Stop activity only after local review accepts the candidate, then
submit the candidate, proof, reviewer identity and verdict for coordinator
recording and publication. Workers never publish to mainline or accept their own
discharge. If no identifiable local reviewer is available, stop at the review
boundary so the coordinator can assign a top-level reviewer; do not self-review
or fabricate an identity.
Use the [swarm worker continuity protocol](../../swarm/references/worker-continuity.md)
for sustained goals, standing resource authority and responsive help handling.
Report unknown prerequisites, blockers or required scope changes to the
coordinator; retain the checkout and do not silently alter its authoritative graph.
These are legitimate coordination boundaries, unlike routine coding decisions.

## Clear swarm associations

For a fresh coordinator allocation state, follow the `swarm` skill's quiescence
and `ponytail swarm clear` procedure. It preserves sessions, checkouts, source and
campaign evidence. It is not a project-wide database reset or session archival
operation. Prior execution records do not establish discharged obligations.
