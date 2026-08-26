---
name: plan-execution
description: >-
  Use when creating, updating, reviewing, approving, resuming, or executing
  long-lived plans, sprints, features or stories, atomic tasklets, and
  project-managed bug reports. Covers stable plan placement, question and
  approval gates, autonomous sprint execution, scope growth, multi-repository
  project change-sets, durable status, testing cadence, standalone
  bug resolution, and final acceptance.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Plan Execution

Manage durable project work without depending on chat history, one Git branch,
or one repository. The host project's agent configuration supplies paths,
commands, repository ownership, commit conventions, and additional gates.

## Host Configuration Contract

Use the project-local agent instructions already in context. They should
identify, directly or by reference:

- the project workspace and management repository;
- the project-management root and its plan and bug directories;
- component repositories and their ownership boundaries;
- named unit-test families and their focused and full commands;
- focused, package, integration, browser, milestone, and final validation
  commands;
- the command that runs all registered integration Arcs;
- Suite selectors and explicit Arc-selection commands;
- the command that lists registered Arcs and focused workflows;
- additional quality gates and when they apply;
- commit conventions; and
- any project-specific approval or safety gates.

Do not hardcode a package manager, build system, branch naming scheme, or
single-repository assumption in a project-management artifact. If required
configuration is absent or disagrees with implementation, apply the host's
project-configuration synchronization policy before proceeding.

Use these terms consistently:

- **management repository**: owns project-management artifacts;
- **component repository**: owns implementation or validation work; and
- **project change-set**: all coordinated commits that deliver one approved
  tasklet, story, bug resolution, sprint, or plan.

Integration-test hierarchy and execution semantics use the canonical Suite,
Arc, and Step definitions from `production-test-boundaries`.

One repository may serve both roles.

## Work Classification

A single bounded edit may be implemented directly when the host permits it. A
long-lived plan is required for work spanning multiple implementation steps or
tasklets, and for a requested batch of five or more bugs.

Use four levels of planned work:

1. **Plan**: the durable objective, scope, architecture, global acceptance
   criteria, repository map, and sprint manifest.
2. **Sprint**: a batch intended to execute in one autonomous run, ideally
   without returning control to the user.
3. **Feature/story**: a complete piece of functionality that could be released
   independently.
4. **Tasklet**: one atomic edit, such as a single method, type definition,
   class envelope, controller endpoint, focused fixture, or validation gate.

Do not disguise a multi-edit story as one tasklet. Use explicit validation
tasklets when proof spans several atomic implementation tasklets.

## Atomic Tasklet Eligibility

A tasklet owns exactly one implementation unit: one type definition, class
envelope, method or function, controller endpoint relaying to one service
operation, focused fixture, or validation gate. Reject a tasklet that combines
independently implementable declarations. A tasklet may be large when its
indivisible implementation is inherently large, but a prediction of more than
1,000 new lines requires the orchestrator to split it or record why it remains
one atomic unit. This is a split-or-justify scrutiny trigger, not a hard line
limit.

Before an implementation agent starts, its tasklet record names:

- exact files and declarations;
- data structures, types, inputs, and outputs;
- the chosen algorithm and control flow;
- invariants, boundary behavior, and actionable errors;
- calls to existing declarations and contract effects;
- focused tests and expected observations;
- generated or configuration synchronization; and
- explicit exclusions.

The orchestrator may author this record or obtain it from a planning subagent,
but reviews it before implementation handoff. An implementation agent does not
silently choose missing structural or algorithmic behavior. If preparing this
record would predictably cost more than direct implementation, the sprint
records that reason and retains the work with a sufficiently capable agent.

## Plan Placement And Shape

Create a stable, branch-independent plan ID prefixed with its creation date as
`YYYY-MM-DD-<plan-name>`. Keep that date unchanged for the life of the plan so
alphabetical directory order is chronological creation order. Under the
configured plan root, use:

```text
YYYY-MM-DD-<plan-name>/
  plan.md
  sprints/
    S01.md
    S02.md
```

`plan.md` is a compact manifest. It records:

- plan ID, title, objective, and lifecycle status;
- scope and explicit exclusions;
- management and affected component repositories;
- architectural areas and contract boundaries;
- plan-wide acceptance criteria;
- sprint order, status, and links;
- unresolved plan-level questions, if any;
- user approval evidence; and
- the final validation record.

Each sprint file records:

- sprint ID, objective, status, and dependencies;
- all known questions and their resolution status;
- ordered features or stories and their acceptance criteria;
- atomic tasklets and applicable tests; and
- sprint validation evidence.

Keep the manifest short enough to rehydrate cheaply. Keep executable detail in
the active sprint file. A completed plan is an immutable historical execution
record except for an explicit correction; create a new stable plan for later
multi-step work rather than appending to a large completed plan.

## Questions, Readiness, And Approval

Before requesting approval to start a plan:

1. Identify all known product, contract, security, persistence, infrastructure,
   ownership, destructive-action, and acceptance questions.
2. Ask the user those questions.
3. Record each answer in the owning plan or sprint file.
4. Mark every question `[RESOLVED]`.
5. Make scope, stories, tasklets, and acceptance criteria executable without
   relying on chat history.

A plan may not start while a known question is open. Approval is explicit; do
not infer it from discussion, urgency, or approval of a different plan.

Before starting any later sprint, apply the same readiness gate to that sprint.
New questions discovered during execution must be recorded. Stop only when the
answer is required to proceed safely or would select among materially different
outcomes; otherwise finish independent approved work first.

Before requesting any execution-time approval, identify the reasonable safe
outcome if the user declines. Do not request approval when declining would only
leave damage caused by the agent, preserve a known-bad state, or abandon work
that is already approved. Repair the agent-caused condition under Ponytail's
standing authorization and continue. A tool or sandbox rejection is not a
substitute for a user decision.

Once an approved sprint starts, execute it continuously through its tasklets,
stories, and owned validation. Progress updates are not handoff points. Return
control only for a stop condition, required user action, or sprint completion.

## Status And Evidence

Every tasklet heading uses exactly one marker:

```md
### [ ] Tasklet S01-F01-T01: Short Imperative Title
### [DONE] Tasklet S01-F01-T01: Short Imperative Title
### [ERROR] Tasklet S01-F01-T01: Short Imperative Title
```

- `[ ]` means unfinished.
- `[DONE]` means the edit, applicable focused tests, configuration sync, and
  required selective commit or commits are complete.
- `[ERROR]` means irrecoverably blocked inside approved scope; record decisive
  evidence and the remaining impact.

Use `[OPEN]` and `[RESOLVED]` for questions. Give plans, sprints, and stories an
explicit lifecycle status using the host's configured vocabulary, or use
`PENDING`, `IN_PROGRESS`, `DONE`, and `ERROR` when none is configured.

For each tasklet, record:

- implementation notes sufficient to explain the durable result;
- focused validation commands and outcomes; and
- any intentionally deferred proof and the exact story, sprint, or plan gate
  that owns it.

Do not mark a parent complete while a child remains unfinished or while its
owned validation has not passed.

## Action Journaling

When the host configures `project_journal.sh`, journal all wall-clock activity
performed for an approved long-lived plan. Journal telemetry is operational
data outside Git; plan and sprint files remain the durable execution record.

- After processing a developer prompt, start the first intentional action
  before performing it. Supply the current plan, sprint, feature, tasklet,
  canonical agent ID, nullable parent-agent ID, model, action type, and a short
  description as required by the CLI.
- Start a new action at every meaningful boundary. The journal closes the
  preceding action at the same database timestamp. Deliberate reasoning may be
  reported as `reasoning`; the automatic post-command state is
  `waiting_for_agent_action`.
- Run shell commands through `project_journal.sh run_command` whenever
  possible. Pass the complete Bash command as one quoted argument. Supply
  sensitive values through environment variables referenced by the quoted
  command so their values are not persisted.
- Subagents use their runtime-provided canonical ID and immediate parent ID.
  They share the top-level agent's prompt automatically through plan-local
  state and close their own active action before returning.
- Before every handoff, invoke `project_journal.sh over` for the current plan
  and agent. Use its returned database timestamp in the reply. The top-level
  invocation ends the prompt and removes its temporary state.
- Journaling is non-blocking. If any journal invocation fails, continue the
  approved work, report the failed operation and diagnostic in chat, and use
  the host's ordinary timestamp command if `over` cannot return one.

When sandbox access blocks `project_journal.sh`, especially its local
PostgreSQL Unix socket, request the user's literal explicit authorization
before adding a persistent allow `prefix_rule` for that exact
`project_journal.sh` executable to `~/.codex/rules/default.rules`. This is an
outside-project mutation and must not be inferred from plan approval. Warn the
user that authorizing `project_journal.sh run_command` is effectively
authorizing arbitrary wrapped shell commands outside the sandbox. Do not claim
that this can override restrictive rules managed by an administrator.

## Approval And Scope Growth

Direct user requests that add behavior to an active plan must be recorded in
the applicable sprint before implementation and explicitly approved when they
change approved scope.

Work discovered while implementing an approved objective may be added and
performed without another approval when it remains inside the architectural
areas and contract boundaries already approved. Extra files, tasklets, tests,
control-flow cases, or effort do not alone broaden scope.

A narrow, source-proven, local project-configuration repair authorized by the
host's synchronization policy is plan maintenance, not scope growth and not an
approval gate. Record it and continue. If one tasklet or path is genuinely
blocked, continue independent approved work unless the plan requires strict
serial execution. Stop the whole goal only when the unresolved condition
blocks its next critical path.

Material scope expansion includes substantive changes to an unapproved:

- user interface or client application;
- backend controller, service, or workflow;
- public API, SDK, generated client, or integration contract;
- database schema, persistence model, or serialized representation;
- authentication, authorization, or security boundary; or
- infrastructure, packaging, release, or runtime responsibility.

When required work crosses such a boundary, update the plan with the reason,
proposed work, and acceptance criteria, then stop before changing that area and
obtain explicit approval. Also stop for an unspecified product or safety
decision, an unapproved destructive action, or competing sources of truth.

## Testing Ownership

Use the host-configured commands. Automated product QA applies only to work
that edits a **QA-relevant input**: a file consumed by a configured product
execution, compilation, packaging, deployment, schema or migration,
generation, or automated-test path. Classify the file by its consumers, not
its extension or directory. Pure prose, project-management records, and inert
reference data are exempt from product tests only when none of those paths
consume them; still run applicable syntax, schema, link, generator, and
comparable structural checks.

A tasklet is subject to the product-QA ladder when it edits a QA-relevant
input. A feature, sprint, or plan is subject when any of its descendant work
edits one. Assign proof to the smallest level that can meaningfully own it:

### Tasklet

- Add or adjust the smallest focused regression proof not already supplied by
  an existing test, static check, or higher-level test. Cover a failure or edge
  path only when the tasklet introduces, changes, or relies on it.
- Run only the smallest applicable focused unit, static, or contract proof:
  explicit test files or named cases under configured focused commands, plus
  applicable cached typecheck or compiler checks and focused lint or format
  checks. Do not run an integration Step, Arc, or Suite at this gate.
- Run specialized contract guards only when the tasklet changes the protected
  contract.
- Run the configured build-impact query with the intended tasklet paths. When
  it reports affected targets, build them once after their final input edits.
  When it reports no affected or indeterminate targets, skip the build.

### Feature/Story

- Reuse passing tasklet proof while its relevant inputs remain unchanged. Run
  additional explicit unit-test files or named cases only when they add
  combined-behavior proof not already obtained against the current tree. Do
  not run a whole package, workspace, language family, or other broad
  unit-test subset.
- Run the smallest sufficient independently executable integration workflow
  that proves the feature's vertical slice. Use one integration Step only
  when the harness can execute it independently and that Step is sufficient;
  otherwise run the minimum ordered workflow that is independently
  executable and sufficient.
- Run browser tests for changed user-visible behavior and affected contract
  guards.
- Prove the story's success and failure paths.

### Sprint

- Run every affected integration Arc once against the reconciled sprint tree.
  Reuse unchanged tasklet and feature proof; do not run a full unit-test
  command or rerun focused proof solely because the sprint completed.
- Run configured milestone checks and browser tests only when applicable and
  not already proved against the same relevant inputs.
- Requery build impact only for target inputs changed after their last
  successful build.
- Reconcile every tasklet and story status and deferred check.

### Plan

- Run each affected repository's applicable configured full unit-test command
  once after its final relevant edit.
- Run every applicable integration Suite once against the final tree, plus
  configured final-acceptance, SDK, demo, browser, packaging, and documentation
  gates not already contained in those Suites.
- Run a build portion only when the build-impact query reports an affected
  target or the approved deliverable is a build, package, or release artifact.
- Reconcile all sprint results across the affected repositories.

If an applicable focused command is missing, repair the host configuration;
never fall back to a full command. A broader non-unit check may be deferred
only to a named owning gate. An unnamed deferral is a skip. Record required
checks that cannot run and do not claim the owning level complete. Record
validation against the tested tree. Reuse a passing result while the relevant
code and configuration remain unchanged; do not rerun an identical command
solely because a higher management level completed. An ordinary final command
that cannot skip an inapplicable build must be split into selectable
validation commands or made build-impact-aware.

## Commit And Execution Workflow

For each V1/V2 tasklet or V3 tasklet packet:

1. Rehydrate the manifest, active sprint, current story, and current tasklet.
2. Confirm approval, dependencies, and applicable host configuration.
3. Make only the ordered atomic edits in the selection and their focused
   tests. Preserve separate evidence and lifecycle state for every tasklet in
   a packet.
4. Synchronize affected project configuration in the same project change-set.
5. Run the tasklet's focused checks.
6. Inspect the complete selected change-set in each owning repository.
7. With multiple repositories, commit each non-management component owner
   selectively before changing tasklet status.
8. Record each tasklet's validation result, mark every accepted tasklet
   `[DONE]`, and commit the management record last. When implementation,
   configuration, and management artifacts share a repository, include them
   in one commit for the selected V1/V2 tasklet or V3 packet. Treat working-tree
   `[DONE]` markers as provisional until that commit succeeds; restore `[ ]`
   and record the pending reason for any tasklet whose commit fails.
9. Continue immediately to the next selected tasklet or packet unless a stop
   condition applies.

After context compaction or session resumption, do not reread every completed
sprint or the whole repository instruction file by default. Rehydrate from the
instruction chain already in context, the plan manifest, the active sprint,
and the current story and tasklet. Read historical artifacts or referenced
configuration only when the active work depends on them or evidence suggests
drift.

## Dependency-Parallel Sprint Orchestration

Every long-lived plan uses this orchestration lifecycle. Before any sprint
planning or implementation edit, the orchestrator runs the applicable
readiness selector; selector output, rather than an agent's subjective
classification, determines what may be dispatched. V3 maximizes safe
parallelism across dependency-ready sprints and within each sprint. Numeric
sprint order is presentation order, not an execution dependency. An explicit
dependency or exact-path ownership relation is the only valid reason to
serialize otherwise independent work.

Every sprint contains exactly one marked Markdown comment with strict JSON.
V3 is the only version written for new or updated records after adoption:

```md
<!-- ponytail-plan-sprint
{
  "schemaVersion": 3,
  "id": "S01",
  "planning": {
    "status": "APPROVED",
    "depends_on": [],
    "scope_roots": ["path/to/area"]
  },
  "execution": {
    "status": "PENDING",
    "depends_on": [],
    "tasklets_reviewed": true
  }
}
-->
```

Planning states are `STUB`, `PLANNING`, `READY_FOR_REVIEW`, `APPROVED`, and
`ERROR`. Execution states are `PENDING`, `IN_PROGRESS`, `READY_FOR_REVIEW`,
`DONE`, and `ERROR`. `execution` is `null` until detailed planning is ready for
orchestrator review. Planning dependencies decide which sprint architectures
may be drafted in parallel. Execution dependencies express every historical,
architectural, and shared-path ordering relation. Scope roots use `/`
separators, are relative to the owning repository,
and contain no `.` or `..` segments or glob syntax. V1 sprint execution retains
its historical `planned_paths`; V2 and V3 sprint execution contain exactly
`status`, `depends_on`, and `tasklets_reviewed` and own no write paths.

The physical V1 and V2 sprint and tasklet readers remain immutable. Historical
V1 plans retain dependency-based sprint readiness and scalar tasklet selection;
historical V2 plans retain numeric checkpoint execution and path-disjoint
tasklet waves. Selectors dispatch solely by physical `schemaVersion`, reject
unsupported versions, and reject a plan containing mixed physical sprint
versions. V3 is the latest write format; do not migrate an older record in
place merely to execute or inspect it.

The orchestrator first settles plan-wide architecture, approved scope, shared
contracts, and coarse ownership, then creates intent-level sprint stubs. A
stub states intent, acceptance criteria, scope and exclusions, candidate
repository roots, global contracts to preserve, planning dependencies,
questions, and required planning deliverables; it does not prescribe local
declarations, algorithms, or tasklets. The planning selector may return every
dependency-ready `STUB`, and the orchestrator may dispatch those drafts in
parallel to separate capable planning agents. A planning agent may inspect the
repository read-only and edit only its assigned sprint Markdown and sibling
tasklet metadata. It returns unspecified shared or public contract decisions
to the orchestrator.

The orchestrator reconciles each completed planning wave before approval. Only
the orchestrator changes planning state to `APPROVED`. Before implementation
of a sprint starts, the orchestrator reviews the entire sprint and rejects any
tasklet that is not atomic under `Atomic Tasklet Eligibility`, lacks frozen
exact paths, overlaps another tasklet's path without transitive ordering,
has incomplete or cyclic dependencies, or leaves a material question open.
It records completion with V3 `execution.tasklets_reviewed: true`; the
execution selector does not dispatch an unreviewed V3 sprint.

Each approved V3 `SNN.md` has one sibling `SNN.tasklets.json`. Markdown owns
tasklet descriptions and lifecycle markers. JSON owns feature dependencies and
validation ownership, plus each tasklet's hard `depends_on`, soft `affinity`,
`risk`, optional `risk_reason`, feature identity, and exact `planned_paths`.
V3 tasklet metadata is the sole exact write-path owner. Its paths use `/`
separators, are relative to the owning repository, and contain no `.` or `..`
segments or glob syntax. Every implementation, test, generated, and
configuration path edited by an implementer must be declared there.
Every non-validation tasklet owns at least one path. A feature's sole
`validation_tasklet` directly depends on every other tasklet in that feature;
it may own focused-test paths, while a pure validation gate may have no paths.
Feature and tasklet graphs must be acyclic and contain exact canonical IDs.
A tasklet dependency crossing a feature boundary requires the corresponding
feature dependency so it cannot bypass feature convergence.
The graph validator rejects any pair of tasklets with an overlapping planned
path unless one transitively depends on the other through the effective hard
tasklet and feature-validation dependency graph. This rule applies within and
across features; ordered overlap remains valid.

A V3 tasklet is ready only when its direct tasklet dependencies and every
dependency feature's validation tasklet are `[DONE]`. The selector ranks ready
tasklets by high risk, greatest affinity overlap with the last completed
tasklet, greatest number of unfinished descendants, longest remaining
dependency path, then lowest tasklet ID. It greedily selects a deterministic
maximal set of path-disjoint roots, then extends each root with up to sixteen
ordered descendants whose dependencies are already `DONE` or earlier in that
same packet. Packet path unions remain pairwise disjoint; cross-packet
convergence and feature validation tasklets wait for reconciliation. Tasklets remain the atomic acceptance
and evidence units; packets only amortize agent startup, context, validation,
and commit overhead. V3 returns
`{"next":[{"tasklets":[...],"planned_paths":[...]}],"criteria":{...}}`;
a fully complete graph returns exactly `{"next":null}`. V2 retains its
historical `{"next":[...],"criteria":{...}}` wave output.

The orchestrator runs the sprint readiness selector before planning dispatch,
after planning reconciliation, before implementation dispatch, and after
sprint reconciliation. For V3 execution, it returns every sprint whose
planning is `APPROVED`, execution is `PENDING`, tasklets are reviewed, and
execution dependencies are `DONE`. A sprint advanced beyond `PENDING` while
an execution dependency is unfinished is invalid plan state. Before returning
V3 execution work, the selector reads every sibling tasklet graph and rejects
an exact path shared by execution-incomparable sprints. Shared schema,
migration, lockfile, generated aggregate, composition-root, and equivalent
paths therefore require an explicit dependency chain.

Before each implementation wave, the orchestrator runs `ready-tasklets.js` for
every returned sprint, then assigns each returned packet to one capable writer
up to safe runtime capacity. A same-checkout subagent edits only its packet's
frozen paths, returns structured evidence, never edits management records or
shared Git state, and does not stage or commit. If safe capacity is smaller
than the selected set, the orchestrator dispatches a deterministic prefix and
reruns selectors after reconciliation.

For multiple user-owned Codex sessions or additional Codex instances, never
allow independent writers to share one checkout, worktree, Git index, database,
port, mutable cache, or external resource. Give each writer a separate branch
and worktree at a recorded base commit, a frozen V3 packet lease, and isolated
runtime resources. A remote writer may commit only source, tests, generated
artifacts, and configuration declared by its packet; it must not edit plan,
sprint, tasklet, or journal records. The canonical orchestrator owns those
records, integrates packet commits in dependency order, resolves drift, reruns
the selectors, and records evidence. Additional agents in one isolated
worktree should be read-only or test-only unless their write paths are also
provably disjoint and one writer owns that worktree's Git index.

Centralize work that cannot be isolated safely: Prisma schema and migration
epochs, package lockfiles, generated aggregate indexes, composition roots,
shared external-provider effects, and acceptance campaigns. Give databases,
ports, caches, queues, buckets, credentials, and rate-limited external scopes
explicit per-worker ownership wherever parallel tests could otherwise create
cross-session effects.

The canonical orchestrator alone updates shared plan, sprint, and tasklet
records; owns the canonical Git index; inspects and reconciles each returned
packet; records focused proof; and commits or integrates accepted packets. A
feature advances through its single
approval gate only after every implementation tasklet is reconciled and its
validation tasklet passes against the combined feature tree. A sprint advances
to `READY_FOR_REVIEW` and then `DONE` only after every feature converges and
the sprint's distinct focused integration proof passes against the reconciled
tree. Completed sprints unlock their dependency descendants immediately; they
do not wait for unrelated numeric predecessors.

If implementation begins without the required sprint-wide atomicity review,
selector run, or exact-path dispatch decision, stop new implementation edits.
Preserve valid completed work, reconstruct and validate the metadata and
graphs, freeze ownership and dependencies, reconcile all partial packets, and
resume only after ownership and the active dependency frontier are unambiguous.

## Standalone Bug Workflow

A user request to implement a project-managed bug authorizes the complete bug
workflow, including selective commit after validation, unless the user
explicitly says not to commit.

Store individual bug files under the configured lifecycle directories:

```text
bugs/open/YYYY-MM-DD-<bug-name>.md
bugs/in_progress/YYYY-MM-DD-<bug-name>.md
bugs/closed/YYYY-MM-DD-<bug-name>.md
```

Prefix each filename with the bug report's creation date. Keep that date and
filename unchanged when its lifecycle changes so alphabetical filename order
is chronological creation order. The directory is the lifecycle source of
truth. The filename stem `YYYY-MM-DD-<bug-name>` is the canonical bug name;
record that exact name in the bug file. Move the same bug file between
directories; do not duplicate it.

A bug file records:

- canonical bug name and title;
- report and observable impact;
- evidence, hypotheses, and confirmed root cause;
- proposed resolution and explicit exclusions;
- questions and `[RESOLVED]` answers;
- user approval;
- atomic edits and affected repositories;
- focused and integration validation; and
- closure summary.

Diagnosis may proceed while the bug is open. Before implementation, record the
confirmed diagnosis and proposed resolution, then move the file to
`in_progress`. When implementation was not directly requested, obtain explicit
user approval before changing behavior. Resolve it through the same atomic
edit, testing, configuration-sync, and selective-commit rules as tasklets. Move
it to `closed` only after its acceptance evidence is complete.

Standalone bugs and direct bounded changes run only explicit selections under
the applicable configured focused unit-test commands. Run a full unit-test
command only when the user explicitly requests it or a named host merge, CI,
release, or equivalent acceptance gate requires it.

One to four bugs may be managed independently. A requested batch of five or
more bugs requires a long-lived plan: reference the canonical bug files from
the plan, normally represent each bug as one story, and keep each bug's
lifecycle evidence synchronized with the plan.

## Non-Local Mutation Authorship

Never author an instruction in a plan or bug file to deploy, redeploy, promote,
roll back, or otherwise mutate a non-local environment. This includes
tasklets, stories, sprints, milestones, acceptance criteria, closure gates, and
equivalent language.

Only the user may manually add such an instruction to the project-management
artifact. Approval of assistant-authored work does not cure an
assistant-authored mutation step. The agent may execute a non-local mutation
only when the user authored the instruction, and only within that authority.
If an assistant-authored mutation step is discovered, stop before mutation and
require the user to replace it with user-authored text.

## Stop Conditions

Stop when:

- required scope or acceptance criteria remain ambiguous;
- a known question required for execution is not `[RESOLVED]`;
- the requested work requires a plan or bug approval that has not been given;
- active plan ownership or current sprint selection is ambiguous;
- required work materially broadens scope;
- a new contract, destructive action, or external mutation lacks approval;
- a project-configuration conflict remains ambiguous or requires a material
  unapproved decision after applying the host's synchronization policy; or
- a concrete blocker cannot be resolved within approved scope.

Do not stop merely because implementation is difficult, a sprint contains many
tasklets, a progress update was sent, or broader validation belongs to a later
named gate. A condition does not count as a whole-goal blocker while an
applicable skill authorizes its safe local repair or independent approved work
remains available. Never stop or mark a whole goal blocked solely because
repair of the agent's own current-task changes remains pending.
