---
name: plan-execution
description: "Durable project management workflow"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Plan Execution

Traceability: supports REQ-ISSUE-REQUIREMENT-ACTIVATION

Manage durable project work without depending on chat history, one Git branch,
or one repository. The host project's agent configuration supplies paths,
commands, repository ownership, commit conventions, and additional gates.

## Host Configuration Contract

Use the project-local agent instructions already in context. They should
identify, directly or by reference:

- the project workspace and management repository;
- the project-management root and its plan, issue, and requirements directories;
- the shared issue/plan lifecycle configuration owned by `issue-tracking`;
- the machine-readable management-root, plan-root, lifecycle-role, and legacy
  layout configuration used by campaign validation;
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
1,000 new lines requires the executing agent to split it or record why it remains
one atomic unit. This is a split-or-justify scrutiny trigger, not a hard line
limit.

Before implementation starts, each tasklet record names:

- exact files and declarations;
- data structures, types, inputs, and outputs;
- the chosen algorithm and control flow;
- invariants, boundary behavior, and actionable errors;
- calls to existing declarations and contract effects;
- focused tests and expected observations;
- generated or configuration synchronization; and
- explicit exclusions.

The executing agent authors and reviews this record before implementation. It
does not silently choose missing structural or algorithmic behavior. If
preparing this record would predictably cost more than direct implementation,
the sprint records that reason and keeps the work with the executing agent.

Update the owning plan artifacts whenever a planning gap is discovered. Keep
the tasklet set atomic under this eligibility rule: add or split tasklets and
adjust their dependencies and exact paths instead of hiding newly discovered
work inside a non-atomic tasklet.

## Plan Placement And Shape

Create a stable, branch-independent plan ID prefixed with its creation date as
`YYYY-MM-DD-<plan-name>`. Keep that date unchanged for the life of the plan so
alphabetical directory order is chronological creation order. Under the
configured plan root (default `pm/plans`), use:

```text
<status>/YYYY-MM-DD-<plan-name>/
  plan.md
  evidence/
    integration/
      plan/
      S01/
  sprints/
    S01.md
    S01.tasklets.json
    S02.md
    S02.tasklets.json
```

Use the exact shared statuses, meanings, and allowed transitions defined by
`issue-tracking` or overridden by the host's Ponytail project configuration.
Do not define a second plan-specific status set. The containing status
directory is the whole-plan lifecycle source of truth; keep the manifest's
status synchronized. Create status directories only when needed.

Create a new plan in the configured initial state (default `open`). Move its
whole directory into the active-work state only when implementation is
approved and ready, and into the successful-completion state only after final
acceptance. Deferral and rejection require a recorded reason, never a claim of
successful completion. Custom configurations must identify the initial state
as well as the active and completion roles. Keep the stable plan ID unchanged
across moves and repair inbound and outbound relative links, including epic
and requirements links, in the same change.

An associated issue makes that issue an epic under `issue-tracking`; link the
issue and plan manifest in both directions. Whenever an issue enters active
work alongside its plan, complete the issue's `requirements` reconciliation
as implementation of that plan begins. Merely associating the issue with a
future plan does not create requirements or UAT. Whole-plan placement does not replace the
sprint readiness and tasklet selectors below. Pass the current plan directory
or sprint file explicitly to those selectors after a move.

Existing plans retain their recorded locations until an explicit migration;
do not move historical records or rewrite serialized sprint metadata merely
to adopt the new directory layout. Before using a host PM audit, statistics,
or rendering command, verify it supports the configured layout and paths.
A legacy flat-layout command is not validation of status-directory plans.

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

The host configuration defines the exact integration-evidence representation.
Retain a structured record for every sprint-wide and plan-wide integration
run, including the exact commit, dirty-tree state, command and selection,
start and completion timestamps, outcome and counts, skips, and failure
details. Retain complete output for failures. A host may also require complete
successful output. Commit the evidence with the lifecycle transition it
supports.

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
6. Establish a green starting checkpoint by running every applicable test that
   does not require a human participant against the exact recorded Git state.
   This checkpoint proves existing behavior and plan structure, not completion
   of work the plan has yet to implement. A check that cannot pass until the
   approved new behavior exists is a final gate, not an applicable starting
   test. Run configured structural traceability once; record exact forward gaps
   and owning tasklets without claiming it passed. Those gaps remain required
   final-acceptance work. Compare other results with the recorded pre-plan
   state and resolve new, unplanned failures before starting. Never describe
   the whole repository as green while that check is red.

A plan may not start while a known question is open. Approval is explicit; do
not infer it from discussion, urgency, or approval of a different plan. A
failing or unavailable required starting-checkpoint test also prevents the
plan from starting. Record tests that inherently require a human participant as manual
acceptance; do not put them on the automatic development critical path or
represent them as automated evidence.

Before starting any later sprint, apply the same readiness gate to that sprint.
New questions discovered during execution must be recorded. Stop only when the
answer is required to proceed safely or would select among materially different
outcomes; otherwise finish other dependency-ready approved work first.

Before requesting any execution-time approval, identify the reasonable safe
outcome if the user declines. Do not request approval when declining would only
leave damage caused by the agent, preserve a known-bad state, or abandon work
that is already approved. Repair the agent-caused condition under Ponytail's
standing authorization and continue. A tool or sandbox rejection is not a
substitute for a user decision.

Apply Ponytail's meaningful-decision rule before creating a plan question or
returning control. Comments, whitespace, formatting, routine implementation
choices, mechanical work, generated metadata, reversible in-scope repairs, and
tool failures do not create approval gates. Record reasonable implementation
decisions in the plan and continue. Ask for an ordinary decision only when at
least two materially different, safe, policy-compliant outcomes remain. Keep
required authorization for destructive, external, security-sensitive, or
user-owned actions, and required user-supplied credentials or external actions,
as explicit exceptions.

Once an approved sprint starts, execute it continuously through its tasklets,
stories, and owned validation. Progress updates do not return control. Return
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

Use `[OPEN]` and `[RESOLVED]` for questions. Whole plans use the shared
issue/plan lifecycle vocabulary and directory placement described above.
Sprint planning and execution retain their versioned states defined under
`Serial Plan Orchestration`; do not replace them with directory status names.
Stories use the host's configured execution vocabulary, or `PENDING`,
`IN_PROGRESS`, `DONE`, and `ERROR` when none is configured.

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
  canonical agent ID, null parent-agent ID, model, action type, and a short
  description as required by the CLI.
- Start a new action at every meaningful boundary. The journal closes the
  preceding action at the same database timestamp. Deliberate reasoning may be
  reported as `reasoning`; the automatic post-command state is
  `waiting_for_agent_action`.
- Run shell commands through `project_journal.sh run_command` whenever
  possible. Pass the complete Bash command as one quoted argument. Supply
  sensitive values through environment variables referenced by the quoted
  command so their values are not persisted.
- Before returning control, invoke `project_journal.sh over` for the current
  plan and agent. Use its returned database timestamp in the reply. The
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

### Fast plan input

Traceability: supports REQ-PLAN-INPUT-QUEUE

When the host provides `ponytail plan-input`, treat each campaign-scoped queue
as the fast input queue in front of that campaign's sprint and tasklet
selection. Every campaign has exactly one campaign coordinator. Only that
coordinator may list, claim, complete, or otherwise consume its queue; other
sessions, including sessions in the same checkout, do not inspect or block on
it. One coordinator session may coordinate several campaigns in the same
top-level worktree, but a second coordinator session may not share that
worktree. Input addressed to any member plan resolves to the campaign root.

After rehydrating or resuming a campaign, run `ponytail plan-input coordinate <campaign-root>`
through the host tool boundary before running a sprint or tasklet selector.
The trusted hook binds the current session to the resolved
campaign root. Repeating the same binding is idempotent; a conflicting session
must not coordinate the campaign until the current coordinator runs
`ponytail plan-input release <campaign-root>` for an intentional handoff or final
completion.

At a safe tasklet or turn boundary, the campaign coordinator drains its queue
before starting or resuming selected plan work:

1. Run `ponytail plan-input claim <campaign-root> --json`. An existing `in_progress` entry is
   returned until it is completed; otherwise the oldest open entry is claimed.
2. Preserve the entry's exact instruction while applying `requirements`,
   `user-acceptance-testing`, `issue-tracking`, `architecture`, and
   `requirements-traceability` as applicable. Add approved work and exact
   paths to the active plan before implementation.
3. Do not claim or act on a newer entry while one is in progress. Do not
   acknowledge receipt as completed semantic ingestion.
4. After all applicable PM records exist, run `ponytail plan-input complete
   <campaign-root> <id> --record <pm-path>...`. If processing fails, leave the entry in
   progress so it remains recoverable.
5. Continue until `ponytail plan-input claim <campaign-root> --json` returns
   `null` with exit status zero. Then
   rerun the canonical sprint and tasklet selectors from the reconciled files;
   never resume from conversational memory of the interrupted selection.

Users may enqueue without interacting with the active turn by running
`ponytail plan-input <plan> -- <instruction>`. Codex users may also submit
`/ponytail-enqueue <instruction>` when the installed, trusted hook has passed
the host project's live viability Arc. The hook derives the campaign from the
current session binding and blocks an unbound or multiply bound command without
guessing. Use plan-specific enqueue when the session coordinates several
campaigns.

Direct user requests that add behavior to an active plan must be recorded in
the applicable sprint before implementation and explicitly approved when they
change approved scope.

Every planned deliverable must trace to an approved requirement. Do not turn
an architectural aspiration, illustrative example, possible future migration,
or implementation opportunity into current scope. When a necessary outcome is
absent from the requirements, record it as a proposal and obtain stakeholder
approval before planning or implementing it.

When the host configures `requirements-traceability`, tasklet planning names
the approved requirement identifiers it affects and records the canonical
prospective annotation beside the stable plan or tasklet record: use
`plans-implementation` for intended implementation and `plans-verification`
for intended tests or UAT. These planning relationships do not claim completed
coverage. Before completing the tasklet, apply that skill to reconcile the
resulting implementation and verification annotations, artifact
classification, generated-source mappings, and generated reverse view. Keep
one annotated forward map and derive reverse views; do not hand-maintain a
second relationship map.

Work discovered while implementing an approved objective may be added and
performed without another approval when it remains inside the architectural
areas and contract boundaries already approved. Extra files, tasklets, tests,
control-flow cases, or effort do not alone broaden scope.

A narrow, source-proven, local project-configuration repair authorized by the
host's synchronization policy is plan maintenance, not scope growth and not an
approval gate. Record it and continue. If one tasklet or path is genuinely
blocked, continue with other dependency-ready approved work. Stop the whole
goal only when the unresolved condition blocks its next critical path.

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

Prefer decomposing a plan before it exceeds 300 atomic tasklets. A plan may
contain 301 through 1,000 tasklets only after a recorded high-confidence review
establishes that the tasklets are genuinely atomic, collectively cover only
the approved requirements, and leave the architecture and dependency graph
comprehensible, followed by explicit human approval of that exception. A plan
must never exceed 1,000 tasklets. If planning or implementation reaches that
limit, stop, preserve valid evidence, and narrow or decompose the work before
implementation continues.

Tasklet count is a diagnostic threshold, not a substitute for judgment. The
user and agent each may stop an unmanageable effort. The agent must stop when
scope or coupling leaves no realistic sequence of independently verifiable
increments, even below the numeric limit. Redesign or narrow the plan before
dependent work proceeds.

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

- Confirm that the plan began from its recorded green checkpoint.
- Run each affected repository's applicable configured full unit-test command
  once after its final relevant edit.
- Run every applicable integration Suite once against the final tree, plus
  configured final-acceptance, SDK, demo, browser, packaging, and documentation
  gates not already contained in those Suites.
- Run a build portion only when the build-impact query reports an affected
  target or the approved deliverable is a build, package, or release artifact.
- Reconcile all sprint results across the affected repositories.
- Record a green ending checkpoint at the exact accepted Git state. Every
  applicable test that does not require a human participant must pass; manual
  acceptance remains separately identified.

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

For each V1/V2 tasklet or V3 tasklet batch:

1. Rehydrate the manifest, active sprint, current story, and current tasklet.
2. Confirm approval, dependencies, and applicable host configuration.
3. Inspect the complete selection's declarations, callers, fixtures, tests,
   generated consumers, and planned paths before editing. Record all
   foreseeable in-scope corrections together, then make only the ordered
   atomic edits in the selection and their focused tests. Preserve separate
   evidence and lifecycle state for every tasklet in a batch.
4. Synchronize affected project configuration in the same project change-set.
5. Use focused feedback while editing, then run the batch's consolidated
   focused checks, contract guards, build-impact query, and selected builds
   once after its final relevant input edit. Reuse unchanged evidence.
6. Inspect the complete selected change-set in each owning repository.
7. With multiple repositories, commit each non-management component owner
   selectively before changing tasklet status.
8. Record each tasklet's validation result, mark every accepted tasklet
   `[DONE]`, and commit the management record last. When implementation,
   configuration, and management artifacts share a repository, include them
   in one commit for the selected V1/V2 tasklet or V3 batch. Treat working-tree
   `[DONE]` markers as provisional until that commit succeeds; restore `[ ]`
   and record the pending reason for any tasklet whose commit fails.
9. Continue immediately to the next selected tasklet or batch unless a stop
   condition applies.

After context compaction or session resumption, do not reread every completed
sprint or the whole repository instruction file by default. Rehydrate from the
instruction chain already in context, the plan manifest, the active sprint,
and the current story and tasklet. Read historical artifacts or referenced
configuration only when the active work depends on them or evidence suggests
drift.

## Serial Plan Orchestration

Every long-lived plan uses one execution path: one ready sprint, one selected
tasklet batch, one executing agent, one checkout, and one Git index. Finish the
batch's implementation, review, validation, lifecycle reconciliation, and
commit before selecting more work. Do not delegate plan drafting,
implementation, review, validation, Git ownership, or lifecycle updates.

### Campaign Orchestration

A campaign may relate multiple plans through an explicit dependency graph.
Backward compatibility often enables concurrent plans, but it is not the only
valid parallel structure. Separate sessions, agents, branches, and worktrees
are optional. Use coordinated multi-agent execution only when the developer
requests it. In that mode, assign each concurrent plan to one worker, maximize
safe parallelism, and serialize integration where dependency branches join.
Each worker optimistically rebases its delivered branch onto the campaign's
current integration revision. Ponytail verifies the delivered evidence, and
the coordinator fast-forward merges that branch. Failure of a sequential prerequisite blocks its dependent
campaign path. Examples used to explain possible campaign decomposition do not
authorize those plans.

When finite worker capacity or a serialized integration join requires a
scheduling choice among independent ready plans, prioritize a source-proven
product repair or bug fix over expansion of test coverage. This priority does
not create a dependency, pause work already dispatched, or prevent an
independent coverage plan from proceeding concurrently.

### Campaign Census Contract

Every newly drafted or updated managed plan contains exactly one
`ponytail-plan-campaign` JSON metadata block. The V1 write format has been
superseded by V2. Writers emit exactly `schemaVersion`, `id`,
`parent_plan_id`, and `depends_on`. A campaign root writes a null parent; every
descendant writes its one direct parent plan ID. `depends_on` contains only
authored direct plan dependencies and does not duplicate parentage. Derive
children and reverse dependencies by inventorying these forward records. Do
not author child lists, reverse dependencies, duplicate lifecycle state, or
issue IDs in campaign metadata. Lifecycle comes only from the host's configured
status directory. Readers continue to accept immutable V1 records, whose
normalized direct dependencies are empty.

For each direct membership edge, member plan P names campaign parent C in
`parent_plan_id`, and C contains a human-readable Markdown reference to P. P is
stranded exactly when C lacks that reciprocal reference. Missing records,
malformed metadata, duplicate identities, dependencies, and cycles are invalid
campaign data, not stranded plans.

Campaign validation concerns only the campaign containing the supplied plan.
It may inspect other plan records solely to resolve ancestors and discover
direct backlinks to known members; malformed or contradictory unrelated
campaigns do not affect the result. The census covers plans, sprints, and
tasklets. It does not schedule parallel work, assign workers or worktrees,
determine integration readiness, or estimate throughput or completion time.

Use the canonical command:

```text
ponytail campaign validate <plan-name-or-path>
ponytail campaign validate --all [--json]
ponytail campaign report [<plan-name-or-path>]
ponytail campaign list [--active|--pending|--closed|--deferred|--rejected]
ponytail campaign activate <plan-name-or-path>
```

The input may be the exact stable plan name, its directory, or its `plan.md`.
A bare name must resolve to exactly one plan across configured lifecycle
locations. When report input is omitted, inventory every configured lifecycle
and permitted flat-layout plan. Report every active campaign and active plan
instead of choosing among conflicts; multiple active campaign roots remain a
valid inventory. Commands that require one campaign infer it only when exactly
one campaign is active; otherwise require an explicit campaign and report all
candidates. Classify malformed managed plans as invalid. Classify a
plan with no campaign block as unmanaged legacy data without inferred
membership regardless of its location. When a managed plan names an unmarked
plan as its direct parent or dependency, classify the referenced plan as
invalid missing-metadata data and the managed reference as unresolved until
the referenced plan gains supported metadata. `validate --all` applies the
same repository-wide contract and emits the typed inventory with `--json`. An
explicit plan input remains isolated from unrelated campaign defects. Do not
maintain a second current-plan or current-campaign record; lifecycle placement
and campaign backlinks remain the canonical facts.

The human report enables only its summary tasklet table by default. Its
`--[no-]summary-table`, `--[no-]plan-table`, and `--[no-]sprint-table` options
control each human table independently. JSON output remains the complete
normalized census and does not accept human table options.

Run it before requesting plan approval, after planning reconciliation and
before the first implementation edit, after any campaign relationship or plan
lifecycle change, and before closing a campaign root. Stop work in the
selected campaign on its first validation failure while continuing unrelated
approved work when possible. Do not duplicate the validator's canonical
sprint or tasklet selector logic manually.

Run repository-wide validation when campaign coordination begins or resumes,
before dispatch, and after any campaign relationship or lifecycle change.
Only commands in the `ponytail campaign` subtree enforce campaign validity or
uniqueness; commands outside that subtree remain independent of campaign
state. Repair every
reported managed-plan defect before a coordinator mutation; never select one
active campaign from an ambiguous inventory. `campaign list` defaults to
active campaigns and its explicit status flags project the configured initial,
successful-completion, deferred, and rejected lifecycles as pending, closed,
deferred, and rejected. `campaign activate` recursively resolves a selected
member to its root, activates only pending campaigns, and is idempotent for an
already active campaign.

### Campaign Scheduler Protocol

Traceability: implements REQ-PONYTAIL-CLI-AGENT-HARNESS

When the host provides the campaign orchestration commands and coordinated
multi-session execution is approved, the campaign coordinator must use their
durable state instead of remembering worker assignments in conversation:

1. Bind the coordinator with `ponytail plan-input coordinate <campaign-root>`,
   run `ponytail campaign validate --all`, and inspect `ponytail campaign
   status [<campaign-root>] --json` whenever coordination begins or resumes.
2. For every retained assignment session, use supported host tools to observe
   that exact session rather than relying on a partial thread listing. Record
   `working`, `waiting`, `completed`, `archived`, `missing`, or `unknown`, its
   reported worktree, and managed-worktree provenance with `ponytail campaign
   observe <campaign-root> --snapshot <json>`. The snapshot's complete session
   IDs must name exactly the sessions actually checked; absence from a partial
   listing is `unknown`, not `missing`. Refresh observations after any host
   result and at every safe coordination boundary while assignments remain
   unfinished, including when a wait returns or a worker becomes idle. An
   observation older than five minutes is stale and blocks mutation.
3. Inspect the returned status before any other campaign action. Resolve
   every blocking diagnostic first. For an idle session, inspect its exact
   thread to distinguish a worker waiting for coordinator input from one that
   has finished; respond to required input or record the completed observation
   instead of treating either state as automatically reusable. If
   `status.continuations` marks an existing assignment `ready: true`, wake
   exactly its named original session to finish that assignment. It may need
   runnable tasklets, tasklet review, worker-owned integration, or remaining
   plan acceptance; `phase` identifies which, without granting product-edit
   authority. Send ready continuations for distinct plans concurrently, then
   re-observe the exact sessions before sending another prompt. Do not send
   a duplicate prompt while the first host delivery or worker turn is
   unresolved. A `ready: false` continuation carries the exact objections:
   repair those first, and never replace a missing worker from this signal.
   Closed-plan cleanup is not a continuation. If
   `readyToMerge` is nonempty, give the verified join priority: run `advance`
   and refresh status until its merge is recorded before reserving more
   dispatches. A `REBASE_REQUIRED` delivery is worker-owned; do not synthesize
   a coordinator rebase action for it.
4. Inspect `ponytail campaign runnable-plans [<campaign-root>] --json` for
   the exact plans whose campaign dependencies are complete and whose approved,
   reviewed execution sprint has a nonempty set of immediately runnable
   tasklets. Each record includes the sprint and tasklet IDs on the current
   integration tree; active assignments are included, so this is not a list of
   unassigned plans. Planning-only work and final acceptance without tasklets
   are not tasklet-ready dispatch. Do not substitute `readyPlans`, lifecycle,
   conversation, or dependency count for this query.
   Its V2 `execution` records identify the original assignment, session,
   checkout, pending action, dispatch state, and observed/reported anomalies.
   Compare `parallelism.theoreticalWorkers` with `observedRunnableWorkers`
   and `shortfall` at every safe coordination boundary. A null observed count
   means incomplete or stale evidence, not zero workers. Native `working`
   activity is not proof that a tasklet is executing: inspect the exact worker
   when it may instead be recovering, preparing, or closing earlier work.
   Work with each anomalously blocked original worker to resolve its exact
   prerequisite. Continue independent runnable work meanwhile. Request narrow
   user help when authorization, credentials, or a manual host operation is
   genuinely required; never bypass host review, duplicate a pending request,
   replace a started worker, or waive acceptance gates to increase the count.
   Exception: when the human explicitly authorizes retry of an exact unresolved
   STARTED creation, use `ponytail campaign retry-dispatch <campaign>
   <original-action-id> --authorization <non-secret-human-authorization-reference>
   --json`. Preserve the inventory evidence and its completeness limitation;
   never call absence from a partial listing proof of NOT_STARTED. This operation
   accepts only unprovisioned, unattached creations, preserves the unknown
   original receipt and its capacity reservation, revokes its capability, and
   returns one idempotent successor. Refresh `ready-actions` and execute that
   successor through ordinary authenticated dispatch. Do not retry an original
   native creation, send its old token, manually edit state, replace a missing-
   checkout worker, or release capacity. A capacity refusal requires safe reuse
   or actual capacity, not repeated retry. Superseded late originals must not
   attach; inspect them separately without granting assignment ownership.
   Record a sanitized host refusal with `ponytail campaign report-blocker
   <campaign-root> --result <json>` from the bound coordinator. The V1 object
   contains `schemaVersion: 1`, the exact `assignmentId`, nullable `actionId`,
   `phase` (`DISPATCH`, `RECOVERY`, `ATTACH`, or `EXECUTION`), `state: "BLOCKED"`,
   `code` (`HOST_REVIEW_REJECTED`, `AUTHORIZATION_REQUIRED`,
   `MANUAL_ACTION_REQUIRED`, or `ENVIRONMENT_BLOCKED`), nonempty `summary`,
   and `requiredAction`. Do not include attachment capabilities, credentials,
   or raw logs. Reports survive coordinator restarts but confer no authority
   and do not transition assignments. After the prerequisite is demonstrably
   repaired, report `state: "RESOLVED"` with the evidence in `summary`, refresh
   complete host observation, and resume the same action only when its normal
   gates permit it. Do not classify a failed recovery as successful dispatch.
   Run `ponytail campaign schedule-ready [<campaign-root>] --json` to reserve
   all eligible unassigned or queued plans deterministically, reusing safe idle
   pairs first and respecting this campaign's new-creation limit. Existing
   safe idle pairs remain reusable even when grandfathered reservations exceed
   that limit. Execute its returned
   host actions through the same authenticated protocol below. The command
   does not start Codex sessions: the current supported CLI protocol lacks
   managed-worktree creation, so native host effects remain adapter-owned.
   Then run `ponytail campaign schedule-planning-ready [<campaign-root>]
   --json`. It reserves a dependency-ready initial `STUB` sprint selected by
   the canonical planning selector only on a safe idle pair originally created
   for this campaign. A zero-tasklet count alone is not eligibility: aggregate
   plans and `PLANNING` or `READY_FOR_REVIEW` sprints are not initial `STUB`
   selections. The typed `PLAN_WORKER` action grants the exact original worker
   planning authority for `payload.sprintId`, not product-edit authority or a
   new worker slot. Preserve a started action even if planning readiness
   changes; postpone only an action proven never started.
   Then run `ponytail campaign schedule-review-ready [<campaign-root>] --json`
   when a safe original campaign pair remains idle. This separate operation
   reserves approved, dependency-ready V3 sprints whose validated tasklets
   still require executing-agent review. It never creates or imports a
   session, consumes a new slot, or makes those tasklets implementation-ready.
   Repeating it preserves the action and assignment identities. Give
   implementation-ready work priority when the same idle pair is needed.
   Do not choose or activate plans agentically. Repeating this command resumes
   existing identities and cannot allocate a duplicate assignment. It does not
   perform joins; use the serialized join workflow independently.
   Run `ponytail campaign advance [<campaign-root>] --json` exactly once to
   request the next deterministic transition. One advance may add at most one
   durable host action or perform one core-owned transition.
5. Immediately run `ponytail campaign ready-actions [<campaign-root>] --json`.
   Execute only the `actions` returned by `ready-actions` for coordinator-initiated
   scheduler effects. This does not suspend plan-owned work in an existing
   authenticated assignment or the worker-owned recovery described below.
   `status.pendingActions` remains the
   complete durable recovery inventory and may also contain dependency-blocked
   or already-started dispatches that must not be invoked again. If no ready
   action is returned, inspect status and advance again only when another
   compatible transition is currently warranted. `ready-actions` is read-only:
   it never creates assignments, materializes actions, or performs effects.
   Status is a derived view: reconciling one persisted assignment can leave its
   returned status unchanged. When no action appears, compare the persisted
   ledger's assignment states and pending actions before and after `advance`;
   an unchanged status response alone does not prove a no-op. Continue one
   advance at a time while a durable transition occurred, refreshing host
   observation before it becomes stale. Stop at a genuinely unchanged ledger.
   When worker capacity looks inflated or cleanup is proposed, run `ponytail
   campaign reservation-audit [<campaign-root>] --json` before any release.
   It reconciles each counted slot with fresh host activity and Git integration
   evidence. A started creation with only a client identity is an unresolved
   outcome, not a stale reservation; do not release it because it is old or
   absent from a partial thread listing. A never-started, unprovisioned action
   for a no-longer-runnable plan may be released through its original
   `NOT_STARTED` action result. Keep confirmed worker pairs for reuse even when
   their work is integrated; missing checkouts need recovery, not deletion.
6. Resume each returned action by its exact action ID; never allocate a
   replacement session or worktree, and never assign a plan conversationally.
   After initiating an asynchronous host effect, record that start, advance
   again, and rerun `ready-actions` before waiting when independent
   tasklet-ready work may exist. Use `schedule-ready` to fill all available
   independent dispatch capacity before waiting. This may expose distinct create-or-reuse
   actions while a historical rebase action remains outstanding, but it must
   neither execute an action twice nor request a second rebase. New deliveries
   use worker-owned optimistic rebasing and create no `REQUEST_REBASE` action.
   On resumption, inspect the named
   worker before repeating an unresolved host request. For `CREATE_WORKER`,
   `REUSE_WORKER`, `REVIEW_WORKER`, and `PLAN_WORKER`, `ready-actions` already proves that
   `payload.dispatch.ready` is true, its state is `NOT_STARTED`, and the same
   applicable implementation or review predicate still holds. For an
   existing assignment, use the separate `status.continuations` readiness
   and the same original session; do not wake it for product tasklets unless
   its plan appears in `runnable-plans`. `TASKLET_REVIEW` and
   `PLAN_CONTINUATION` permit only their respective plan-owned work until
   the ordinary execution selector passes. A `REVIEW_WORKER` action authorizes only the exact
   `payload.sprintId` tasklet review and plan metadata reconciliation.
   A `PLAN_WORKER` action authorizes only initial planning of the exact
   `payload.sprintId`; product edits still require approved planning, tasklet
   review, and a nonempty ordinary execution selection.
   Delivered rebase/integration work remains independently executable, and
   workers retain autonomous recovery authority. As soon as
   the supported host operation begins,
   record `{"ok":true,"disposition":"STARTED","hostIdentity":"<id>"}` with
   `campaign action-result`; use the returned session ID or pending client ID
   as the stable host identity. If the plan becomes unready and the host proves
   the operation never started, record
   `{"ok":false,"disposition":"NOT_STARTED"}` so the scheduler can postpone
   that assignment and select unrelated ready work. Never report
   `NOT_STARTED` after a host operation begins.
7. For `CREATE_WORKER`, create one supported managed-worktree worker and put
   the bootstrap sequence and `ponytail campaign attach <attachToken>` in its
   first instruction. Before campaign attachment, the worker verifies its exact assigned checkout
   and dispatch revision. If detached, it uses the host project's canonical worktree tooling
   to adopt the checkout and establish its assignment branch at the completed
   bootstrap checkpoint (initially the exact dispatch revision); it does not
   create another checkout or alter an existing branch. Only then does it run
   the authenticated campaign attach command.
   Bootstrap establishes local worktree prerequisites only: no plan edits or
   execution precede authenticated attachment. For `REUSE_WORKER`,
   `REVIEW_WORKER`, or `PLAN_WORKER`, message
   only the exact session named by the action, previously created for this
   campaign. An unrelated idle chat is never a substitute, even if it shares
   the project or checkout. Require the same verified prerequisites and
   attach command. Retry the same attachment token in the same session
   after a prerequisite failure; do not allocate a replacement worker. Record
   the exact host session, canonical worktree, branch, and revision only after
   the attach hook authenticates them. For `REVIEW_WORKER`, the original worker
   activates its assigned plan in its checkout, reviews the entire named V3
   sprint and its atomic tasklet graph, and commits the reviewed plan metadata
   without product-path edits. It delivers that clean review milestone through
   the ordinary worker-owned rebase and coordinator fast-forward join. Only
   after the reviewed metadata is integrated and the ordinary execution
   selector returns nonempty runnable tasklets may that same assignment edit
   product paths. Attachment or a coordinator message never substitutes for
   the worker's actual review or marks tasklets reviewed automatically.
   For `PLAN_WORKER`, the same worker runs the canonical planning selector,
   authors and reviews the exact selected `STUB` sprint and its atomic graph,
   then delivers the clean planning milestone through the ordinary worker-owned
   join. Planning alone grants no product-path lease. Keep this assignment for
   later review, implementation, and acceptance rather than dispatching a
   second worker when planning completes.
   Successful attachment records an ACTIVE assignment, not plan activation or
   product tasklet execution. The coordinator's plan may remain OPEN while the
   original authenticated worker awaits its exact lifecycle/backlink leases.
   Preserve that proven bootstrap interval; do not repeat dispatch, manually
   rewrite assignments, or activate in the coordinator to conceal it. After
   acquiring those leases, the worker activates its assigned plan in its own
   checkout before delivering any milestone. A clean activation delivery uses
   the normal serialized rebase/fast-forward join even while the coordinator
   still has the OPEN locator. Refresh lifecycle and host observation after
   integration; activation alone never establishes tasklet execution.
   For `RECOVER_WORKTREE`, message only the action's existing session if it
   needs a reminder; recovery does not require coordinator initiation. The
   worker follows the worker-owned recovery protocol below. Do not request a
   new host-created path, session, assignment, branch, or commit. The canonical
   recovery command preserves the original path and acknowledges a matching
   existing recovery action itself from clean Git proof. The coordinator
   refreshes observations after recovery; it does not fabricate host evidence
   or record the command's result again. Recovery does not replace the required
   authenticated `campaign deliver` step.
8. Only for an already pending historical `REQUEST_REBASE`, message the named
   worker to rebase onto the exact `ontoRevision`, wait for completion, and
   record only the resulting clean revision. Do not create a new rebase request.
9. When assigned work and its focused validation are complete, the worker
   commits the plan-owned evidence and runs `ponytail campaign deliver
   <campaign-root> --result <json>` from its authenticated worktree. The result
   names the exact clean `revision` and a nonempty `evidencePaths` array. Keep
   the plan in active work; conversational completion and premature whole-plan
   closure are not delivery evidence.
10. The authenticated worker owns the optimistic join loop after delivery;
   do not wait for a coordinator `REQUEST_REBASE` instruction. Read `campaign
   status <campaign-root> --json` from that worker to obtain the current
   `integrationRevision` and its exact assignment. If its delivered branch
   does not contain that revision, use `semantic-rebase` to replay each owned
   commit onto that exact revision, run the focused proof, and deliver the new
   clean commit with its plan-owned evidence paths. Check status again. If
   another worker was merged meanwhile, repeat against the new revision.
   Once `READY_TO_MERGE`, tell the coordinator the exact assignment and
   delivered revision, then continue checking status in bounded intervals;
   do not edit or rewrite the delivered branch while it is merge-ready. The
   coordinator gives this join immediate priority and runs `advance`, which
   alone proves current-head ancestry and fast-forwards under the existing
   short worktree critical section. Do not run an independent merge command.
   If the coordinator branch advances first, the worker repeats the semantic
   rebase/delivery loop. No round-robin ordering is needed: for a finite set
   of competing deliveries, every contention requires another successful
   join; progress still requires the coordinator and remaining workers to
   keep acting. Do not claim a wall-clock deadline.
11. After `MERGED`, the same worker resumes its plan-owned acceptance against
   the integrated tree, without a new dispatch or coordinator prompt. Rebase
   its checkout to a newer integration revision first when acceptance depends
   on that newer tree. If acceptance creates another commit, deliver it and
   repeat step 10. Close the plan only after all applicable gates pass, then
   deliver and join the closure commit as another milestone. A failed gate
   keeps the plan active. If an external authorization or resource genuinely
   blocks the worker, report the exact gate; do not treat the coordinator as
   the routine trigger for the next step. Successful closure releases the
   logical assignment for safe reuse, not its session/worktree pair.
12. Then follow the next action returned by `ready-actions`. A `REUSE_WORKER`
   action retains the finished session and managed worktree for its named next
   plan. Retain every inactive session/worktree pair indefinitely, including
   when no plan is ready. `ARCHIVED` assignment state with false physical
   archive flags means a released assignment, not an archived worker chat.
   Do not archive worker chats, delete checkouts, or release their resource
   claims to obtain capacity. Historical `ARCHIVE_WORKTREE` and `ARCHIVE_SESSION`
   actions are excluded from `ready-actions` and superseded by `advance` as
   `ok:false, disposition:RETAINED`; never execute them or fabricate deletion
   success. Reuse only the first safe inactive pair with successful creation
   recorded in this campaign's ledger. Do not import idle workers from another
   campaign, even in the same top-level project. Fifteen retained worker
   sessions, including this campaign's creation reservations, is the limit per
   campaign. At `CAMPAIGN_WORKER_CAPACITY_REACHED`, finish already
   reserved executable actions or wait for safe reuse; do not spin advances,
   create a sixteenth worker, or retire one automatically. Other campaigns
   and top-level projects keep independent capacity and reuse pools.
13. For completed supported host effects, refresh the host observation
   first when the action changes a managed checkout path, then run `ponytail campaign action-result
   <campaign-root> <action-id> --result <json>` from the coordinator worktree.
   Recording one result changes only that named action. Then refresh
   observations and return to status before advancing. Repeating the same
   action or identical result is the required interruption-recovery path.

Explicit human-requested retirement is separate from this scheduler loop.
For an existing `ARCHIVE_WORKTREE` action that the human explicitly requests
to retire, clean only that worker's project-owned resources, archive the
original chat, and observe it as archived before `ponytail campaign
retire-worktree <campaign-root> <action-id> --json`. Its committed lifecycle
adapter must prove ownership and removal. Do not use thread handoff for retirement.
A Codex-managed worktree is not necessarily an archive artifact attached to a
chat. Retention is the default; plan closure is not retirement authority.

### Worker-Owned Checkout Recovery

Traceability: supports REQ-WORKER-WORKTREE-RETENTION

An original native worker may need recovery before its first adoption and
authenticated attachment. First correlate its ready session and exact native
cwd with the original started creation, and include that supported identity
and managed-worktree provenance in a fresh complete host observation. Record
`ponytail campaign action-result <campaign> <original-action-id> --result
'{"ok":true,"disposition":"PROVISIONED","sessionId":"<original-ready-session>","worktree":"<original-cwd>"}'`.
This enrolls bootstrap recovery authority only: it does not authenticate an
attachment, complete creation, or replace its client receipt, action,
assignment, or token. Never infer identity from a partial inventory or start
another creation. The same worker can then recover its original detached
dispatch checkpoint from a neutral cwd, immediately adopt it before setup,
establish its canonical assignment branch, and use the original attach token.
Record ordinary creation success only after authenticated attachment. Once
enrolled, capability-owned recovery does not require a fresh observation or a
coordinator reminder.

If adoption itself needs a tooling repair already integrated in the owning
top-level project, the original provisioned worker may run `ponytail worktree
upgrade <attachment-token> --revision <exact-integration-commit>` from an
existing neutral cwd. This canonical operation advances only its clean detached
checkout to that descendant, preserving original dispatch provenance and
creation identity. Do not manually switch revisions before attachment: an
unrecorded switch breaks recovery ownership. Upgrade checkpoints intent before
moving Git; retry the same target or run `worktree recover` to finish a pending
transition. Then immediately adopt, establish the branch at the completed
checkpoint, and attach with the original token. Full environment setup follows
adoption; bootstrap never authorizes plan edits or product tasklets. This path
does not rebase an authenticated worker or permit arbitrary revisions.

Every authenticated worker receives its owning top-level project, original
checkout path, preserved branch, main-worktree path, and attachment recovery
capability. Prompt hooks re-emit that durable context after interruption or
compaction, even with an absent checkout. This is the worker's responsibility:
recover without waiting for a coordinator action or permission to dispatch a
replacement. Do not run `create_worktree` from the missing cwd.

1. If the checkout is missing, invoke `ponytail worktree recover
   <attachment-token>` with the tool's working directory set to an existing
   neutral directory, such as the system temporary directory. This command
   authenticates the retained ownership and reconstructs only the original
   path from the recorded main worktree. Its JSON result identifies the same
   session, branch, path, and committed revision. The main worktree is a Git
   object source, never a source of project configuration or instructions.
2. Run the project's canonical adoption/setup from the restored checkout.
   Preserve its branch and session identity. Retry the same recovery command
   after a recoverable interruption; it never resets existing local edits.
3. Resume the existing assignment and report recovery to the coordinator.
   The command acknowledges a matching pending recovery action by its original
   identity; no fresh coordinator observation authorizes physical recovery.
   The coordinator still verifies live host continuity rather than inferring
   it from Git reconstruction, and refreshes its ordinary observation.

Git reconstruction restores committed state only. Preserve native snapshots
for uncommitted/untracked files and do not claim their restoration without
evidence. Wrong ownership, changed source, locked registration, occupied branch,
or missing objects are actionable recovery failures, not permission to create
a replacement pair. Disable the host's automatic worktree deletion for the
retained pool; Ponytail retention does not control that independent host setting.

For a historical recovery that moved the binding to a replacement checkout
while the native chat retained its original cwd, first refresh the coordinator's
complete host observation. The same worker then invokes the same recovery
command from a neutral cwd. It requires the authenticated initial dispatch and
completed recovery history to prove both paths, clean registered checkouts, and
the original detached checkpoint. It returns the branch and binding to that
original checkout, retains the replacement as a detached checkout, and preserves
assignment and delivery state. Interrupted transfers are retryable. Do not
invent a matching host observation or manually edit the ledger.

The host adapter executes only the typed action selected by the core. It does
not choose a ready plan, infer an idle worker, accept conversational completion
as evidence, decide integration order, or silently repair contradictory state.
Read-only `campaign status` invoked in an authenticated worker re-roots to its
owning top-level worktree and reports both paths. Mutating campaign commands in
a worker fail closed.

Blocking campaign diagnostics outrank new dispatch, integration, cleanup, and
ordinary plan work. The coordinator repairs or reconciles their named evidence
before continuing the campaign. It never suppresses a diagnostic by deleting
an assignment, guessing that a session ended, or treating an unverified
worktree as managed.

`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY` is an informational recovery
diagnostic, not a blocking one. It means the scheduler has independently
verified the authenticated delivery revision, fresh complete host observation
of the waiting or completed managed session, and the exact surviving branch
tip after the worker checkout disappeared. Continue only
through `advance` and `ready-actions`: the scheduler may still fast-forward
that exact revision and dispatch unrelated ready work. An
ordinary `CAMPAIGN_WORKTREE_MISSING` lacks that proof and remains blocking.
With the checkout present, the same exact delivery and idle `waiting` session
are a completed worker milestone, not evidence that the worker is still
editing; merge readiness still requires a clean checkout.

`CAMPAIGN_WORKTREE_RECOVERY_REQUIRED` is also nonblocking because its action
payload is already source-proven from the authenticated binding, fresh complete
host observation, managed-worktree identity, and surviving assignment branch.
It can also name a delivered worker in `REBASE_REQUIRED` when the exact
delivered revision remains at that branch tip and the session is waiting or
completed. Recover its checkout in the
same session before rebasing; keep the delivery record, and require
the ordinary rebase and new authenticated delivery before merge readiness.
While that exact action is pending, the worker may be `working` before its
checkout reappears; with fresh matching host and branch evidence this remains
a nonblocking in-flight recovery, not a new missing-worker fault. An absent
action or changed proof still blocks unrelated campaign mutation.
The worker follows the worker-owned recovery protocol without waiting for
`advance` or `ready-actions` to initiate it. Refresh complete host observations
after recovery. If
Ponytail reports ordinary `CAMPAIGN_WORKTREE_MISSING`, one of
those scheduler proofs is absent; it remains blocking for coordinator mutations
but does not prevent authenticated worker-owned recovery. Do not reconstruct
ownership conversationally or change assignment identities.

A non-root plan may close when its own acceptance is complete. A campaign root
with descendants may close only after every member is complete and final
campaign validation succeeds against the closing tree. Whenever a plan's
parent changes or a lifecycle move changes its locator, update its canonical
parent metadata and the parent's reciprocal human-readable member reference in
the same project change-set.

Before any sprint planning or implementation edit, the executing agent runs
the applicable readiness selector. Selector output, rather than subjective
classification, determines what may execute. Each selector returns at most
one selection. Numeric sprint order is the deterministic tie-breaker among
dependency-ready sprints, not an implicit dependency.

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
review. Planning and execution dependencies express every historical,
architectural, and shared-path ordering relation. Scope roots use `/`
separators, are relative to the owning repository,
and contain no `.` or `..` segments or glob syntax. V1 sprint execution retains
its historical `planned_paths`; V2 and V3 sprint execution contain exactly
`status`, `depends_on`, and `tasklets_reviewed` and own no write paths.

The physical V1 and V2 sprint and tasklet readers remain immutable. Historical
V1 plans retain dependency-based sprint readiness and scalar tasklet selection;
historical V2 plans retain numeric checkpoint metadata and list-shaped
tasklet selection. Selectors read solely by physical `schemaVersion`, reject
unsupported versions, and reject a plan containing mixed physical sprint
versions. V3 is the latest write format; do not migrate an older record in
place merely to execute or inspect it.

The executing agent first settles plan-wide architecture, approved scope,
shared contracts, and coarse ownership, then creates intent-level sprint stubs. A
stub states intent, acceptance criteria, scope and exclusions, candidate
repository roots, global contracts to preserve, planning dependencies,
questions, and required planning deliverables; it does not prescribe local
declarations, algorithms, or tasklets. The planning selector returns the first
dependency-ready `STUB`. Complete and approve that sprint's planning before
selecting another.

Before implementation of a sprint starts, the executing agent reviews the
entire sprint and rejects any
tasklet that is not atomic under `Atomic Tasklet Eligibility`, lacks frozen
exact paths, overlaps another tasklet's path without transitive ordering,
has incomplete or cyclic dependencies, or leaves a material question open.
It records completion with V3 `execution.tasklets_reviewed: true`; the
execution selector does not select an unreviewed V3 sprint.

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
across features; ordered overlap remains valid and makes the serial write
sequence explicit.

A V3 tasklet is ready only when its direct tasklet dependencies and every
dependency feature's validation tasklet are `[DONE]`. The selector ranks ready
tasklets by high risk, greatest affinity overlap with the last completed
tasklet, greatest number of unfinished descendants, longest remaining
dependency path, then lowest tasklet ID. It selects the highest-ranked root,
then extends that single batch with up to sixteen ordered descendants whose
dependencies are already `DONE` or earlier in the same batch. Feature
validation waits until every implementation tasklet is complete. Tasklets
remain the atomic acceptance and evidence units; the batch amortizes context,
review, validation, and commit overhead. Do not subdivide a valid selected
batch merely to produce smaller changes or commits. V3 returns
`{"next":[{"tasklets":[...],"planned_paths":[...]}],"criteria":{...}}`;
a fully complete graph returns exactly `{"next":null}`. V2 retains its
list-shaped result but returns at most the highest-ranked ready tasklet.

The executing agent runs the sprint readiness selector before planning, after
planning reconciliation, before implementation, and after sprint
reconciliation. For V3 execution, it returns the first sprint whose planning
is `APPROVED`, execution is `PENDING`, tasklets are reviewed, and execution
dependencies are `DONE`. A sprint advanced beyond `PENDING` while an execution
dependency is unfinished is invalid plan state. Before returning V3 execution
work, the selector reads every sibling tasklet graph and rejects an exact path
shared by execution-incomparable sprints. Shared schema, migration, lockfile,
generated aggregate, composition-root, and equivalent paths therefore require
an explicit dependency chain.

Before editing a selected batch, inspect its complete declaration, caller,
fixture, test, generated-consumer, and configuration surface. Add every
foreseeable in-scope correction to the sprint and tasklet graph together,
rerun both selectors, and freeze the batch before implementation. Do not turn
predictable synchronization work into a sequence of newly discovered
follow-up tasklets.

The executing agent edits only the selected batch's exact paths, owns the Git
index, records focused evidence for every tasklet, reviews the complete batch
once its implementation is stable, corrects discovered defects, runs final
input validation once, reconciles lifecycle state, and commits the batch.
Only then does it rerun the selectors. A feature advances through its single
approval gate only after every implementation tasklet is reconciled and its
validation tasklet passes against the combined feature tree. A sprint advances
to `READY_FOR_REVIEW` and then `DONE` only after every feature converges and
the sprint's distinct focused integration proof passes against the reconciled
tree.

If implementation begins without the required sprint-wide atomicity review,
selector run, or exact-path selection, stop new implementation edits. Preserve
valid completed work, reconstruct and validate the metadata and graphs, freeze
ownership and dependencies, reconcile the partial batch, and resume only after
ownership and the active dependency frontier are unambiguous.

## Standalone Issue Execution

A user request to implement a project-managed bug authorizes the complete bug
workflow, including selective commit after validation, unless the user
explicitly says not to commit.

Use `issue-tracking` for all issue types, canonical filenames, lifecycle
placement, record fields, transitions, and epic associations. It owns the
`requirements` gate for every entry into active work. Do not maintain a second
bug-specific storage convention here.

Diagnosis may proceed while the bug is open. Apply `debugging` to establish the
root cause. Before implementation, record the confirmed diagnosis and proposed
resolution. Direct authorization to implement the standalone issue activates
the requirements gate; apply `issue-tracking` to reconcile requirements and
enter the configured active-work state before the first implementation edit.
When implementation was not directly requested, obtain explicit
user approval before changing behavior. Resolve it through the same atomic
edit, testing, configuration-sync, and selective-commit rules as tasklets.
Use the configured successful-completion transition only after its acceptance
evidence is complete.

For other issue types, use the same execution, approval, and validation rules;
root-cause diagnosis applies when the issue reports a defect. Issue creation or
classification alone does not authorize implementation.

Standalone bugs and direct bounded changes run only explicit selections under
the applicable configured focused unit-test commands. Run a full unit-test
command only when the user explicitly requests it or a named host merge, CI,
release, or equivalent acceptance gate requires it.

One to four bugs may be managed independently. A requested batch of five or
more bugs requires a long-lived plan: reference the canonical bug files from
the plan, normally represent each bug as one story, and keep each bug's
lifecycle evidence synchronized with the plan.

## Non-Local Mutation Authorship

Never author an instruction in a plan or issue file to deploy, redeploy, promote,
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
applicable skill authorizes its safe local repair or other dependency-ready
approved work remains available. Never stop or mark a whole goal blocked solely because
repair of the agent's own current-task changes remains pending. Mark a whole
goal blocked only after safe in-scope alternatives are exhausted, the condition
blocks the next critical path, no other approved work remains, and
progress requires a materially consequential user decision, explicit authority,
an unavailable user-controlled capability, or preservation of uncertain
user-owned work.
