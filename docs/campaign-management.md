<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign management

Date: 2026-10-17.

Status: discussion and decision record for reconciliation. This document captures
the stakeholder's revised model and the proposals discussed with it. It does not
activate a new skill, change existing commands or schemas, migrate historical
records, or authorize implementation. Existing Ponytail rules, skills, and
tooling must be reconciled before adoption. Proposed details below remain subject
to that reconciliation; they are distinguished from stakeholder decisions.

## Motivation and scope

A client-agent assessment reported approximately 126,000 added lines of
ledger/evidence against 4,600 added lines of implementation/tooling and tests over
ten hours. Those client figures were supplied as an assessment, not independently
verified here. Local inspection also found repeated evidence input sets and large
numbers of preparation checkpoints. Reducing serialization alone would not
correct the underlying mismatch with the intended traceability model.

The stakeholder originally requested individually identified requirements in
`pm/requirements`, individually identified acceptances in `pm/uat` referencing
requirements, identified unit or integration tests referencing acceptances, and
product code referencing requirements. The discussion added obligations as atomic
requirements, producing the graph below. Validation results belong to commit
metadata, not tracked evidence files or evidence-only source commits.

## Traceability graph

```text
Obligation → Requirement
Acceptance → Obligation
Test       → Acceptance
Code block → Obligation
```

Requirements remain the approved product behavior recorded under
`pm/requirements`, each with an individual stable ID. Obligations decompose that
behavior into individually identified atomic requirements. Acceptances under
`pm/uat` have individual IDs, state observable conditions, and reference the
obligations they demonstrate. Tests have individual IDs and reference the
acceptances they implement. They may belong to the unit suite, integration suite,
or both; this model does not require both test layers for every acceptance.

Code annotations identify stable blocks that declare implementation of an
obligation, such as functions, methods, or classes. It must be possible to discover
those blocks from the obligation and, transitively, the requirement. Annotating
every line is neither required nor realistic.

An acceptance's requirement relationship is discoverable through its obligation
references. The obligation layer refines the original graph rather than requiring
a second manually maintained acceptance-to-requirement map.

References must resolve to their canonical identified records. Several acceptances
may jointly demonstrate an obligation, and several tests may jointly implement an
acceptance. A test may demonstrate several acceptances when its assertions
adequately establish each one. Shared implementation may implement several
obligations. These relationships do not impose one-to-one cardinality.

Presence of a link is necessary but insufficient: the acceptance must cover the
condition, the test must actually implement the acceptance, and the code must
actually implement the obligation. Requirement-level test annotations alone cannot
establish acceptance coverage. In particular, tests referencing a requirement must
not conceal an unimplemented acceptance of that requirement.

## Lexicon

The following meanings capture the discussion. Their exact integration with the
existing shared glossary remains reconciliation work.

| Term | Meaning |
| --- | --- |
| Requirement | An identified statement of approved product behavior. |
| Obligation | An identified atomic requirement: the smallest meaningful, independently verifiable functional condition that can be integrated as a coherent change. |
| Acceptance | An identified observable condition demonstrating one or more obligations, with a sufficient demonstration procedure. |
| Test | An identified executable implementation of one or more acceptances, with assertions establishing their expected results. |
| Code block | A stable implementation unit declaring the obligations it implements. |
| Campaign completeness vector | The ordered nonnegative integer tuple `(F,O,A,T,I)` measuring unresolved structural findings, decomposition, acceptance, test, and implementation coverage in the current campaign scope. |
| Validation run | Execution of identified test or QA commands against an identified commit and applicable environment. |
| Evidence | Observations produced by a validation run, including commands, outcomes, applicable counts, and diagnostic output. |
| Validation certificate | A durable attestation of a commit's validation scope, commands, and observed results, stored in an annotated Git tag. |
| Review attestation | The adversarial reviewer's decision about the semantic correctness and adequacy of an identified candidate. |
| Campaign acceptance | The coordinator's decision that campaign completeness is zero, required review is satisfied, and all required final QA passes. |
| Productive step | A coherent accepted change that strictly decreases the campaign completeness vector lexicographically. |
| Disturbance | A discovery or invalidation that corrects the assessed state and can increase the vector. |

Implementation, tests, configuration, and traceability needed for one coherent
outcome belong together. An obligation may require multiple implementation steps;
it is not synonymous with a tasklet, file, declaration, or test run. Obligations do
not authorize scope beyond approved stakeholder requirements.

An acceptance condition and its demonstration procedure remain distinct concepts.
Existing Suite/Arc/Step vocabulary may describe procedures; how much of that
hierarchy is necessary belongs to reconciliation.

## Campaign completeness vector

The executable report is `ponytail traceability completeness`. It combines the
canonical V5 graph with the coordinator's compact assessment in an annotated tag
on the current commit, and returns the vector plus unresolved IDs. The
`requirements-traceability` skill defines its arguments and assessment format.
After each accepted merge the coordinator updates the assessment, carries forward
only still-valid proof, runs the command and displays its result. This replaces
hand-counted vectors; semantic review and independent final QA remain necessary.

The CLI prints the vector and T/I coverage statistics by default, with progress on stderr starting
before repository inspection. `--verbose` adds unresolved IDs and individual
findings; `--json` returns the complete report without progress. Blocking
annotation findings retain a concise stderr summary in default output.

For each of T and I, report the total and three disjoint counts: no linked
artifact, linked but not accepted complete, and accepted complete. The first two
sum to the coordinate's unresolved count. These are acceptance/obligation counts,
not numbers of test functions or code blocks. A missing link does not prove code
is physically absent; linked unresolved work can need repair, execution, review,
assessment or dependent coverage. Do not infer a specific validation blocker from
absent assessment credit. The statistics do not change completion criteria.

The official term is **campaign completeness vector**. Its fixed order is
**`(F,O,A,T,I)`**:

| Coordinate | Unresolved objects counted |
| --- | --- |
| F | Unresolved structural annotation findings; coverage coordinates remain provisional until F is zero. |
| O | Requirements whose obligation decomposition is missing or incomplete. |
| A | Obligations whose acceptance coverage is missing or inadequate. |
| T | Acceptances whose executable test coverage is missing or inadequate. |
| I | Obligations whose implementation coverage is missing or inadequate. |

F counts diagnostics. The remaining letters name the missing coverage: obligation decomposition, acceptance, tests,
and implementation. Coordinates count entities lacking that coverage, not the
unknown number of missing artifacts.

For O/A/T/I, count unresolved objects, not lines, annotations, diagnostic messages,
or raw test counts. Several partial links do not resolve an object unless they collectively
establish its complete condition. Decomposition completeness requires semantic
assessment; a nonempty list of obligation IDs does not prove a requirement has
been fully captured. Unknown coverage cannot be treated as zero.

A productive step strictly decreases the vector in lexicographical order: earlier
coordinates stay equal, the first changed coordinate decreases, and later
coordinates may increase or decrease. For example:

```text
(2,3,0,0,0) → (0,3,0,0,0) → (0,2,4,0,2) → (0,0,7,0,5) → (0,0,6,3,5)
```

Each transition is productive. Breaking down a requirement can expose additional
acceptance and implementation gaps. Adding an acceptance can expose missing
tests. Implementing tests can expose missing implementation. These are expected
downstream effects, not failures of progress.

The coordinator generally chooses actions that move the vector toward zero while
maintaining passing applicable QA. A step is an accepted coherent change, not
every edit, command, inspection, or intermediate failing test. The rule does not
require separate global phases or forbid reducing several coordinates together.

### Passing tests and adversarial review

The stakeholder strengthened the decrement rule: **T and I may decrease only
when both the relevant tests and implementation exist and the implementation
passes those tests.** Creating links, empty tests, skipped tests, or untested code
cannot manufacture progress. Tests and implementation may need to land together
to preserve a passing accepted state.

A worker proposes the change and supplies focused validation. The coordinator
accepts the decrement after the applicable review and reconciliation. A deliberately
weak test and matching implementation could still pass without implementing the
obligation. Adversarial review addresses this semantic risk by assessing the
requirement–obligation–acceptance–test chain and the implementation itself.

Passing evidence may be reused while its relevant inputs and applicable target
conditions remain unchanged. It does not automatically validate an integrated or
rebased candidate whose relevant inputs changed. Passing applicable QA at each
accepted step does not require rerunning every full suite after every edit; the
exact cadence must be reconciled with existing project QA rules.

### Discoveries, scope additions, and instability

Either coordinator or workers may discover missing obligations, missing
acceptances, incomplete implementation, or invalid prior proof. The stakeholder
may also add requirements or obligations. Such changes can legitimately increase
the vector. They must remain visible rather than be hidden to preserve apparent
monotonicity. Frequent upward corrections indicate a problem to investigate.

The coordinator must monitor progression and detect instability. The stakeholder
suggested an upward trend over 30 minutes as an example criterion. The following
operational definitions were proposed, not finalized:

- **Net regression:** after 30 minutes of active campaign execution, the current
  vector is lexicographically greater than the vector 30 minutes earlier.
- **Stagnation:** no new lexicographic minimum during 30 minutes of active
  execution. This also detects oscillation ending at the same vector.
- **Churn:** previously resolved gaps repeatedly reopen without reaching a new
  minimum; the recurrence threshold remains unspecified.

An alert should cause diagnosis of the reopened scope and its causes, followed by
correction of decomposition, assignments, or integration strategy as appropriate.
Automatic campaign cancellation was not proposed. Acknowledged external waits
should be distinguished from active execution. Authorized scope growth should be
identified separately from execution instability, with comparisons within amended
scope starting at adoption and earlier observations retained.

Sampling cadence, window boundaries, active-time accounting, scope comparability,
and escalation behavior remain to be specified. Small timestamped vector
observations belong in operational storage, potentially the existing database,
rather than committed checkpoint files. The storage choice is not yet finalized.

Strict lexicographic descent over nonnegative integer tuples is well-founded for
an uninterrupted descent segment. It does not guarantee campaign completion when
scope can grow, proof can be invalidated, or necessary repairs are unavailable.

## Validation and campaign completion

```text
Campaign complete =
    (F,O,A,T,I) = (0,0,0,0,0)
    AND all individual campaign workers are DONE
    AND required adversarial review is satisfied
    AND the coordinator independently runs and verifies all required automated QA
        passes for the final integrated candidate
```

Required final QA includes the full unit and integration suites and additional
project-defined checks, such as tooling tests, TSTS, and other static analysis.
Zero graph gaps do not substitute for passing execution. Conversely, passing
suites do not substitute for complete, semantically adequate graph coverage.

After accepting the last merge request from the last active worker, the
coordinator may have a zero campaign completeness vector based on worker-reported
progress. That zero is provisional: it does not establish independent coordinator
verification or authorize a campaign DONE transition.

The final acceptance loop is:

1. After the last delivery is accepted, verify that every individual campaign
   worker is DONE. Retained blocked or unfinished assignments prevent completion,
   even if other workers have reported a zero vector.
2. The coordinator independently runs the complete automated QA selection against
   the integrated candidate and inspects actual results. Worker-focused tags and
   worker-reported progress do not substitute for this run.
3. If QA reveals bugs, reopen the campaign's repair phase, register the affected
   unresolved obligations/acceptances/implementation honestly, and assign repairs
   to workers. The vector may increase as an explicit disturbance. Never issue
   a passing final certificate for the failed candidate.
4. Accept reviewed, tested, tagged repairs through the usual merge workflow,
   displaying the campaign completeness vector after every accepted merge.
5. Once the vector is zero and all workers are DONE again, repeat independent
   full automated QA on the resulting integrated candidate. Declare the campaign
   DONE and issue its acceptance certificate only when every required check passes.

This stakeholder clarification supersedes the earlier proposal to delegate the
independent final QA run to a validation worker. The coordinator owns execution
and verification of that final run, as well as campaign acceptance.

The previous discussion suggested separate unit/integration execution-gap counts
as an optional reporting aid. They are not additional coordinates of campaign
completeness. The final passing-QA gate remains mandatory regardless of how those
results are displayed.

## Annotated Git tags for validation certificates

The stakeholder selected annotated Git tags instead of tracked passing-evidence
or certificate files. A tag targets the tested commit; its annotation records
which commands ran and their observed results. Source history must not accumulate
validation JSON documents, raw output, or evidence-only commits.

Git commit IDs, full or abbreviated, are prohibited as content in tracked files,
Git commit messages, and tag annotations, including IDs embedded in commands,
paths, URLs, or reference names. A certificate identifies its commit exclusively
through the tag's Git target. Use descriptive tag names without commit IDs so
references to certificates do not reintroduce them into annotation text.

A worker runs the focused tests needed for its implemented obligations and records
the passing commands and results in a worker validation tag. The coordinator runs
the full required suites and additional QA against the final reconciled candidate
and records their passing results in a campaign acceptance tag. Worker validation
does not establish full campaign acceptance.

The following metadata and lifecycle details were proposed for formalization:

- A compact, versioned, machine-readable annotation, without copying the canonical
  requirements, obligations, acceptances, tests, or graph definitions.
- Worker/campaign identity, covered obligation/acceptance/test IDs, exact commands
  and working directories, run timestamps, observed outcomes, applicable
  failure/skip counts, and relevant environment/profile identity.
- A final campaign certificate identifying the assessed scope, zero vector,
  required review references, and every required full-QA command and result.
- Unique tag names and no moving or overwriting certificate tags. Corrections
  create a new certificate identifying the superseded one.
- Passing certificates for accepted worker deliveries and campaign acceptance,
  rather than every exploratory passing run.

Tag naming, payload schema, review-attestation storage, transfer between worker
and coordinator repositories, publication, identity/authentication policy, and
certificate lookup/freshness rules remain reconciliation work. Annotated tags
record attestations; they do not independently establish that the recorded run
occurred or that the tests adequately prove the obligation.

Failed-run certificates may be supported, but failed runs must not automatically
create tags. Failure diagnostics can be retained outside tracked source.
Detailed successful logs likewise need not be embedded in tag messages.

Git references:
[annotated tags](https://git-scm.com/docs/git-tag) and
[tag publication](https://git-scm.com/docs/git-push).

## Swarm management

The stakeholder proposed replacing the `ponytail swarm` CLI chapter with a simpler
methodology using native Codex session controls. The goals are to remove
bureaucracy, minimize coordinator responsibilities, keep workers progressing
autonomously, and prevent coordinator availability from gating routine work.
This is a redesign target, not an instruction to remove the current chapter now.

### Coordinator role and parallelism

The coordinator's primary responsibility is to maintain the configured number
of active worker sessions. For a configured parallelism of ten, initially start
ten workers with distinct assignments, provided sufficient compatible authorized
work exists. Session identity, lifecycle, and activity should come from Codex
rather than a duplicate Ponytail session registry.

If a worker becomes blocked, the coordinator attempts to unblock it. If the
coordinator cannot do so, retain that worker and its unfinished assignment and
start a replacement with a different assignment. Do not duplicate or take over
the blocked worker's work merely to maintain capacity.

When the human later unblocks retained workers, active parallelism may exceed
the configured target. This is explicitly acceptable. Do not stop resumed
workers simply to enforce a ceiling. As workers finish, start replacements only
when the number of active campaign workers falls below the target:

```text
new workers needed = max(0, configured parallelism - active campaign workers)
```

The stakeholder described checking active sessions in the current project. The
discussion proposed counting campaign workers rather than unrelated project
chats, blocked workers, completed workers, or worker-local reviewer subagents.
Focused validation and local review are parts of executing an assignment.
Precise host-state classification remains to be reconciled with Codex tools.

Maintaining capacity is conditional on enough dependency-ready, compatible work.
Report an exhausted frontier honestly; do not invent work, duplicate assignments,
or bypass prerequisites to fill slots. Session parallelism also does not override
actual project resource constraints.

### Worker session names

The stakeholder requires each worker session name to identify the campaign,
the session's sequence number within that campaign, and a three-word summary
of its assignment. Use this display convention:

```text
<campaign-id> W<sequence> <three word summary>
DONE <campaign-id> W<sequence> <three word summary>
```

Choose informative, discriminating words: specific domains, components or
outcomes that distinguish workers at a glance. Avoid repeated generic phrases
such as `Complete … coverage`; all three words should convey assignment detail.

For example, `campaign-redesign W001 Vitest timeout recognition` identifies the
campaign's first worker and its assignment in three words. Allocate sequence
numbers in creation order within the campaign,
including replacement workers; do not reuse another session's number. Retained
blocked sessions keep their number when resumed, even during excess parallelism.

Apply the name through the host's native session-renaming tool. On final
completion, prepend `DONE` once, preserving the rest of the name. A blocked,
idle, or merely ready-for-integration session is not finally complete. The name
is a display aid, not a substitute for actual session activity or acceptance.

### Complete assignments and autonomous workers

Give each worker a goal identifying its assignment, normally through canonical
requirement, obligation, or acceptance IDs. A worker owns that assignment through
implementation, focused QA, adversarial review, necessary correction, rebase,
validation tagging, and delivery. Routine steps require no coordinator
acknowledgment. A goal helps continuity but cannot guarantee execution through
human approval gates, host interruptions, unavailable dependencies, or usage
limits.

The proposed assignment contract includes its canonical completion condition,
scope and dependencies, starting branch and integration target, standing
authority for the necessary in-scope workflow, required QA/review/tagging, and
coordinator identity. Campaign execution should explicitly authorize necessary
worker-to-coordinator and coordinator-to-worker messages within that scope.

Workers use requirements, acceptances, project instructions, and available tools
to resolve ordinary implementation questions. Continue independent authorized
parts of the assignment when one operation is blocked. Ask for help only when a
specific problem requires intervention; do not convert routine choices or
progress receipts into requests for instructions.

A proposed compact help message identifies the assignment, decisive evidence,
attempted remedies, intervention needed, and whether independent work remains.
Human authorization remains a genuine gate. If only the human can resolve it,
tell the coordinator that it cannot unblock the assignment itself.

An ordinary completed chat turn does not mean the assignment is complete. The
coordinator must distinguish an idle unfinished worker from a genuinely blocked
worker and from a finished delivery. Repeated generic continuation messages must
not substitute for resolving the actual cause of inactivity or respecting a
human gate.

### Worker-local adversarial review

The stakeholder proposed adversarial review by subagents of each worker. The
coordinator does not perform code review. A worker obtains review, fixes findings,
and obtains renewed review as necessary before submitting its finished, rebased,
tagged branch for fast-forward integration.

The discussion proposed that the reviewer independently inspect canonical
requirements and acceptances as well as the actual candidate diff, rather than
relying solely on the worker's explanation. The review decision identifies the
candidate it covers. Changes affecting that decision require renewed review;
changes affecting validation inputs require refreshed applicable validation.

Review remains responsible for detecting a passing test and matching
implementation that fail to establish the intended obligation. Coordinator
integration checks do not repeat that semantic review.

### Coordinator service loop and wakeups

The coordinator must remain available to service workers. The proposed short
loop is:

1. Inspect all campaign workers through native host tools.
2. Resolve actionable blockers and resume unfinished workers.
3. Integrate ready deliveries through short, serialized operations.
4. Start workers for available assignments when active capacity is below target.
5. Assess integrated campaign completeness and instability.
6. Wait briefly for changes and repeat.

If a worker is executing, leave it to continue. If it has stopped with unfinished
work but no genuine blocker, send a concrete continuation instruction. If it is
blocked, resolve the cause when authorized; otherwise retain it as blocked and
replenish with independent work. Reinspect retained blockers when relevant state
changes rather than repeatedly asking workers to bypass unchanged gates.

The stakeholder suggested frequent timer messages to keep the coordinator on
task. The discussion proposed native event/wait tools during active coordination
and a periodic same-chat wakeup as recovery when the coordinator becomes idle.
The timer must not create a second coordinator, duplicate assignments, or interrupt
an active Git operation. Exact cadence, delivery behavior during an active turn,
recovery after interruption, and host capability limits require verification.
No scheduling or response-time guarantee has been established.

During worker execution, the coordinator should not occupy itself with
implementation, repeated reviews, or long synchronous QA commands while workers
wait. After the last accepted delivery and worker completion, it independently
runs final full automated QA under the acceptance loop above. If that run exposes
bugs, it returns to servicing repair workers before attempting final QA again.

### Integration and accepted progress

Workers develop in isolated native worktrees. The coordinator serializes
integration into the campaign branch. Parallel workers may submit against the
same base, so one integration can make another delivery stale.

Approved heavy-operation limits are enforced by an automatic semaphore at the
project's existing heavy-command entry points, shared across worktrees. Workers
invoke commands autonomously and receive visible capacity-wait status. OS-managed
permits cover the command's child processes, nested calls and cancellation without
stale occupied markers. Lightweight work and Git operations require no heavy
permit. The coordinator does not allocate these permits or impose rebase windows;
resource capacity never substitutes for required user authorization. User decision:
2026-10-22. For Gwen, the user explicitly permits temporary cap overshoot after
abnormal Docker client exit: release the permit without requiring confirmation
that daemon-side work has stopped, and report that work may remain. Normal
admission retains the two-operation cap. This exception avoids indefinite permit
retention and coordinator recovery approval for an ambiguous Docker client exit;
it does not weaken other process-lifetime handling.

The proposed integration contract is to fast-forward only the submitted,
reviewed, tagged candidate. The coordinator checks candidate/base identity,
review reference, validation tag, and scope mechanically. If the branch can no
longer fast-forward, return it to the original worker for rebase and refreshed
affected validation/review. The coordinator does not repair the branch itself.

Worker-local progress is proposed progress. Accepted vector changes are assessed
against the current integrated graph; they cannot be obtained by summing stale
branch-local claims. Assignments favor the earliest actionable unresolved
coordinate while allowing compatible downstream work. Accepted productive
integrations must satisfy lexicographic descent and the passing-test conditions
for T and I; genuine disturbances remain explicit.

After every accepted merge request, the coordinator must display the campaign
completeness vector to the user. Assess it against the resulting integrated
campaign revision, not the worker's pre-merge branch. Use the official term and
explicit coordinate order, for example:

```text
Campaign completeness vector (F,O,A,T,I): (0,0,2,5,3)
```

This reporting requirement applies to each accepted merge, including acceptance
through the native fast-forward delivery workflow; it does not depend on creating
a hosted pull request. It requires no tracked evidence-only update.

The discussion proposed distinguishing **ready for integration** from **DONE**,
with DONE meaning integrated and accepted delivery. A worker waiting for
integration must not conceal an execution-capacity vacancy. The precise state
names and whether native chat states suffice remain open.

Some responsibility tracking remains necessary: which unfinished assignment is
owned by which worker, what blocks it, and which candidate integrates next.
Prefer native identities and compact assignment references over enrollment,
binding, lease-generation, and accumulated queue protocols. The minimum durable
record, its owner, duplicate-assignment prevention, shared-file conflicts, and
coordinator restart recovery remain design questions. Removing the CLI chapter
does not itself answer those questions or justify recreating its bureaucracy.

## Differences from current Ponytail contracts

The reviewed system does not yet implement this revised model:

- The traceability checker predominantly connects implementation, UAT, unit tests,
  and integration tests directly to requirements. It can report requirement
  coverage without establishing executable coverage for every acceptance.
- Mandatory requirement-level unit **and** integration coverage differs from
  acceptance coverage implemented by unit **or** integration tests.
- Explicit acceptance/test identities are not consistently required by ordinary
  relationship annotations. The revised graph requires those identities.
- Existing obligations mix atomic functional outcomes with inventory reviews,
  traceability assessments, and execution responsibilities. These meanings must
  be disentangled before adopting obligations as atomic requirements.
- The old vector `(T1,T2,T3,T4,C1,C2)` counts acceptance adequacy, integration Arc
  adequacy, implementation mapping adequacy, unit-proof adequacy, and fresh unit
  and integration execution gaps. It is replaced conceptually by `(F,O,A,T,I)`
  plus the separate final QA gate, not renamed coordinate by coordinate.
- Plan-execution explicitly instructs agents to commit integration evidence.
  Rolling obligation documents contain certificates and checkpoints beside
  plans. Both conflict with the selected commit-associated validation storage.
- Detailed preparation/checkpoint histories and repeated evidence manifests are
  not required to enforce the revised graph or its progress principle.
- Swarm operations currently require CLI ownership/enrollment/binding and queue
  protocols alongside native host sessions. The proposed methodology transfers
  session tracking to Codex and makes configured parallelism a replenishment
  target that permits temporary excess after blocked workers resume.
- Existing worker-local review and continuity guidance may be reusable, but must
  be separated from the admission and bookkeeping machinery that has impeded
  worker activity. Repeating autonomy instructions alone is not the redesign.

## Reconciliation surface

Future work must reconcile the decisions with their existing owners rather than
introduce another parallel policy layer:

- [Ponytail rules](../skills/ponytail/SKILL.md) and [project instructions](../AGENTS.md).
- [Shared glossary](../skills/plan-execution/references/glossary.md).
- [Requirements](../skills/requirements/SKILL.md),
  [UAT](../skills/user-acceptance-testing/SKILL.md), and
  [requirements traceability](../skills/requirements-traceability/SKILL.md).
- [Plan execution](../skills/plan-execution/SKILL.md),
  [campaign management](../skills/campaign-management/SKILL.md). The historical
  rolling-campaign and swarm procedures were retired during reconciliation.
- Structural/semantic traceability checking, graph indexing, generated reverse
  views, project configuration, obligation/binding schemas, campaign scheduling,
  review, acceptance, and publication tooling.
- Existing QA cadence and evidence-reuse rules, generated host copies, and
  compatibility/migration of historical records and certificates.
- Native session creation, observation, messaging, goals, worktree lifecycle,
  wakeups, and recovery; assignment ownership and replenishment; worker-local
  review and serialized fast-forward delivery without the swarm CLI chapter.

This record does not resolve that migration, select a tag schema or instability
algorithm, settle all swarm operational details, or claim the existing tooling
conforms. Those are subsequent design and implementation tasks.
