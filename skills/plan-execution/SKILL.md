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

## Plan Placement And Shape

Create a stable, branch-independent plan ID. Under the configured plan root,
use:

```text
<plan-id>/
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

## Approval And Scope Growth

Direct user requests that add behavior to an active plan must be recorded in
the applicable sprint before implementation and explicitly approved when they
change approved scope.

Work discovered while implementing an approved objective may be added and
performed without another approval when it remains inside the architectural
areas and contract boundaries already approved. Extra files, tasklets, tests,
control-flow cases, or effort do not alone broaden scope.

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

Use the host-configured commands. Assign proof to the smallest level that can
meaningfully own it:

### Tasklet

- Add or adjust the smallest focused regression proof not already supplied by
  an existing test, static check, or higher-level test. Cover a failure or edge
  path only when the tasklet introduces, changes, or relies on it.
- Run directly affected tests, applicable cached typecheck or compiler checks,
  and focused lint or format checks.
- Run specialized contract guards only when the tasklet changes the protected
  contract.
- Run the configured build-impact query with the intended tasklet paths. When
  it reports affected targets, build them once after their final input edits.
  When it reports no affected or indeterminate targets, skip the build.

### Feature/Story

- Run an affected package's complete unit suite only when the story crosses
  multiple tasklets or package boundaries and the suite adds evidence not
  already obtained against the current tree.
- Run affected integration Arcs only when they prove a distinct complete
  executable vertical slice.
- Run browser tests for changed user-visible behavior and affected contract
  guards.
- Prove the story's success and failure paths.

### Sprint

- Run only configured milestone checks and selected cross-story integration
  Arcs that add proof not already obtained against the committed sprint tree.
- Requery build impact only for target inputs changed after their last
  successful build.
- Reconcile every tasklet and story status and deferred check.

### Plan

- Run the applicable portions of configured final acceptance once against the
  final tree, plus required integration Suites and Arcs, SDK, demo, browser,
  packaging, and documentation gates not already included.
- Run a build portion only when the build-impact query reports an affected
  target or the approved deliverable is a build, package, or release artifact.
- Reconcile all sprint results across the affected repositories.

A broader check may be deferred only to a named owning gate. An unnamed
deferral is a skip. Record required checks that cannot run and do not claim the
owning level complete. Record validation against the tested tree. Reuse a
passing result while the relevant code and configuration remain unchanged; do
not rerun an identical command solely because a higher management level
completed. The host's configured merge or CI gate remains the authoritative
full-suite proof. An ordinary final command that cannot skip an inapplicable
build must be split into selectable validation commands or made
build-impact-aware.

## Commit And Execution Workflow

For each tasklet:

1. Rehydrate the manifest, active sprint, current story, and current tasklet.
2. Confirm approval, dependencies, and applicable host configuration.
3. Make only the atomic edit and its focused tests.
4. Synchronize affected project configuration in the same project change-set.
5. Run the tasklet's focused checks.
6. Inspect the complete tasklet change-set in each owning repository.
7. With multiple repositories, commit each non-management component owner
   selectively before changing tasklet status.
8. Record the validation result, mark the tasklet `[DONE]`, and commit the
   management record last. When implementation, configuration, and management
   artifacts share a repository, include them in this one tasklet commit.
   Treat the working-tree `[DONE]` marker as provisional until that commit
   succeeds; restore `[ ]` and record the pending reason if it fails.
9. Continue immediately to the next tasklet unless a stop condition applies.

After context compaction or session resumption, do not reread every completed
sprint or the whole repository instruction file by default. Rehydrate from the
instruction chain already in context, the plan manifest, the active sprint,
and the current story and tasklet. Read historical artifacts or referenced
configuration only when the active work depends on them or evidence suggests
drift.

## Standalone Bug Workflow

Store individual bug files under the configured lifecycle directories:

```text
bugs/open/
bugs/in_progress/
bugs/closed/
```

The directory is the lifecycle source of truth. Move the same bug file between
directories; do not duplicate it.

A bug file records:

- stable bug ID and title;
- report and observable impact;
- evidence, hypotheses, and confirmed root cause;
- proposed resolution and explicit exclusions;
- questions and `[RESOLVED]` answers;
- user approval;
- atomic edits and affected repositories;
- focused and integration validation; and
- closure summary.

Diagnosis may proceed while the bug is open. Before implementation, record the
confirmed diagnosis and proposed resolution, obtain explicit user approval,
and move the file to `in_progress`. Resolve it through the same atomic edit,
testing, configuration-sync, and selective-commit rules as tasklets. Move it to
`closed` only after its acceptance evidence is complete.

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
- project configuration conflicts and the host policy does not authorize an
  immediate repair; or
- a concrete blocker cannot be resolved within approved scope.

Do not stop merely because implementation is difficult, a sprint contains many
tasklets, a progress update was sent, or broader validation belongs to a later
named gate.
