# Parallel Sprint Orchestration

- Plan ID: `2026-08-19-parallel-sprint-orchestration`
- Status: `DONE`
- Approval: The user explicitly approved execution on 2026-08-19 with
  "Implement this plan."

## Objective

Make long-lived plans intentionally executable by parallel subagents. Require
truly atomic, implementation-ready tasklets; partition work into
non-interfering sprint clusters; select ready clusters from an explicit
dependency graph; delegate detailed sprint architecture in parallel to the
strongest available planning models; prefer capable lower-cost implementation
agents after planning is frozen; and keep the top-level orchestrator
responsible for global design, reconciliation, dispatch, integration, and final
acceptance.

## Scope

- Strengthen the canonical `plan-execution` skill's atomic-tasklet contract.
- Require each sprint to declare machine-readable identity, lifecycle status,
  dependencies, and exact planned paths.
- Require the orchestrator to partition the objective into localized sprint
  intents whose eventual execution clusters do not interfere.
- Permit the orchestrator to create intent-level sprint stubs and delegate
  their detailed architecture and tasklet design concurrently to the strongest
  available planning models.
- Give planning and implementation separate dependency graphs and lifecycle
  states so planning can proceed in parallel even when implementation cannot.
- Require implementation-ready tasklet specifications to settle data
  structures, algorithms, contracts, control flow, errors, tests, and affected
  declarations before implementation handoff.
- Require each sprint to declare a machine-readable tasklet dependency graph,
  soft affinity, and justified implementation risk without duplicating
  tasklet descriptions or lifecycle status.
- Prefer parallel sprint delegation and the least expensive model judged
  capable, while permitting a documented orchestrator-owned execution when
  delegation would predictably reduce velocity or quality.
- Add a dependency-graph tool beside the canonical skill that validates sprint
  metadata and returns the currently ready sprint set.
- Add a deterministic sprint-local selector that chooses the next tasklet from
  hard dependencies, risk, discovered affinity, downstream reach, and stable
  identity.
- Define subagent path ownership, durable reporting, review, commit, and
  reconciliation responsibilities.
- Add focused regression coverage for the policy and graph tool.

## Exclusions

- A scheduler, daemon, queue, remote worker service, or model-provider API.
- Hardcoded model names, prices, concurrency limits, or host-specific subagent
  APIs.
- Automatic source-code generation from tasklet specifications.
- Production or test edits by a sprint-planning subagent.
- Automatic merging, rebasing, worktree creation, or conflict resolution.
- Estimation telemetry or a numerical cost model for deciding whether to
  delegate.
- Changing Ponytail's existing approval, safety, scope-growth, testing, or
  final-acceptance boundaries except where orchestration must assign their
  ownership explicitly.

## Repositories And Boundaries

- Management repository: this repository.
- Component repository: this repository.
- Canonical policy owner: `skills/plan-execution/SKILL.md`.
- Graph-tool owner: `skills/plan-execution/scripts/`.
- Tasklet scheduling metadata: `sprints/SNN.tasklets.json` beside its owning
  sprint record.
- Focused test owner: `tests/`.
- Durable execution records: this plan manifest and its sprint files.
- The host runtime supplies available agents, model choices, concurrency, and
  canonical agent identities; Ponytail supplies portable selection and
  coordination rules without naming one host API.

## Architecture

### Atomic tasklets

A tasklet owns exactly one implementation unit: one type definition, class
envelope, method or function, controller endpoint relaying to one service
operation, focused fixture, or validation gate. A tasklet may be large when
the indivisible implementation is inherently large, but a prediction of more
than 1,000 new lines requires the orchestrator to split it or record why it is
still one atomic unit. Line count is a scrutiny trigger, not an acceptance
limit.

### Sprint clusters and path ownership

The orchestrator partitions the objective by localized repository and contract
ownership. Detailed sprint planning turns each stub into an execution cluster
and declares every exact repository-relative file it plans to edit, including
production, test, generated, configuration, and sprint-record files. Two
sprints may name the same path only when the dependency graph orders them;
unordered sprints must have disjoint planned paths. A newly discovered edit
outside the declared set pauses only that sprint until the orchestrator
assigns the path and revalidates graph safety.

The plan manifest remains orchestrator-owned. A sprint agent may edit only its
assigned paths and sprint record. Subagents do not stage or commit shared-tree
changes. After reviewing a returned sprint, the orchestrator selectively
commits its owned paths, updates durable status, and releases newly enabled
sprints. This keeps the Git index and cross-sprint state under one owner while
implementation remains parallel.

### Parallel sprint planning

The orchestrator first fixes plan-wide architecture, approved scope, shared
contracts, and coarse repository ownership, then creates sprint stubs. Each
stub records its intent, acceptance criteria, scope and exclusions, candidate
repository roots, planning dependencies, global contracts to preserve,
questions to answer, and required planning deliverables. It does not prescribe
local declarations, algorithms, or tasklets that belong to the sprint planner.

The orchestrator runs the planning-readiness selector and assigns every ready
stub, up to safe runtime capacity, to a separate instance of the strongest
available planning model. Planning agents may inspect the whole repository
read-only but may edit only their assigned sprint Markdown and sibling tasklet
metadata. Each planner traces the affected flow and supplies local
architecture, exact paths, atomic tasklets, tasklet scheduling metadata,
focused validation, implementation capability guidance, and discovered
cross-sprint relationships. It does not edit implementation, the plan
manifest, or another sprint, and it returns an unspecified shared or public
contract decision to the orchestrator instead of choosing it unilaterally.

Planning uses `STUB`, `PLANNING`, `READY_FOR_REVIEW`, `APPROVED`, and `ERROR`.
The orchestrator reconciles each completed planning wave for conflicting
paths, declarations, sources of truth, contracts, dependencies, integration
ownership, and open questions. Only the orchestrator changes planning state to
`APPROVED`. It may approve an isolated sprint while other planning continues
only when no active planner can plausibly claim the same path or contract.
Implementation cannot start until that sprint's planning is `APPROVED`.

### Machine-readable sprint metadata

Every sprint starts with exactly one Markdown comment containing strict JSON:

```md
<!-- ponytail-plan-sprint
{
  "schemaVersion": 1,
  "id": "S01",
  "planning": {
    "status": "APPROVED",
    "depends_on": [],
    "scope_roots": ["path/to/area"]
  },
  "execution": {
    "status": "PENDING",
    "depends_on": [],
    "planned_paths": ["path/to/file"]
  }
}
-->
```

The metadata is the sole source of truth for sprint identity and both
lifecycles. Planning dependencies express which sprint architectures must be
approved first; execution dependencies express which implementations must be
done first. `execution` is `null` until detailed planning is ready for
orchestrator review. After approval it contains the execution status,
dependencies, and exact planned paths. Execution statuses are `PENDING`,
`IN_PROGRESS`, `READY_FOR_REVIEW`, `DONE`, and `ERROR`. Scope roots and exact
paths use `/` separators, are relative to the owning repository, contain no
`.` or `..` segments, and contain no glob syntax.

### Implementation-ready handoff

Before an implementation agent starts, each assigned tasklet records:

- exact files and declarations;
- data structures, types, inputs, and outputs;
- the chosen algorithm and control flow;
- invariants, boundary behavior, and actionable errors;
- calls to existing declarations and contract effects;
- focused tests and expected observations;
- generated or configuration synchronization; and
- explicit exclusions.

The orchestrator may author this detail or obtain it from a maximal-capability
planning subagent, but it reconciles and approves the result before
implementation handoff. An implementation agent does not invent missing
architectural or algorithmic decisions. If documenting a tasklet to this
standard is predicted to cost more than direct implementation, the
orchestrator records that reason and retains implementation with a sufficiently
capable agent.

### Sprint-local tasklet scheduling

Each `SNN.md` has one sibling `SNN.tasklets.json`. Markdown remains canonical
for tasklet descriptions and `[ ]`, `[DONE]`, or `[ERROR]` lifecycle markers;
JSON owns only scheduling relationships:

```json
{
  "schemaVersion": 1,
  "sprint": "S01",
  "tasklets": {
    "S01-F01-T01": {
      "depends_on": [],
      "affinity": ["metadata-contract"],
      "risk": "high",
      "risk_reason": "Establishes the format consumed by later tasklets."
    }
  }
}
```

`depends_on` expresses mandatory correctness order. `affinity` expresses soft
relatedness through a shared declaration, contract, file area, algorithm, or
mental context. `risk` is `normal` or `high`; `high` requires a concise
`risk_reason` explaining which important assumption the tasklet can falsify.
Reverse edges, descendant counts, critical-path depth, descriptions, and
status are derived and never duplicated in JSON.

The tasklet selector reads the Markdown statuses and sibling JSON, validates
an exact one-to-one tasklet ID set and an acyclic dependency graph, then forms
the ready set from unfinished tasklets whose dependencies are all `[DONE]`.
It selects exactly one ready tasklet by this lexicographic order:

1. `high` risk before `normal` risk;
2. greatest affinity overlap with the last completed tasklet;
3. greatest number of unfinished descendants;
4. longest remaining dependency path; and
5. lowest tasklet ID.

For the first tasklet, the affinity criterion is neutral. This ordering
optimizes early falsification of risky assumptions, low context-switch cost,
downstream optionality, early exposure of deep blockers, and reproducibility.
It does not use subjective numeric priorities or speculative duration
estimates.

When work reveals previously unknown relatedness, the sprint agent updates an
unfinished tasklet's hard dependency or affinity and records the evidence in
the sprint before selecting again. The amendment may not create a cycle,
retroactively make completed work depend on unfinished work, change approved
scope silently, or add an undeclared sprint path. The selector is rerun before
every tasklet start and after every completion or graph amendment.

### Deterministic work selection

The skill-local Node.js tool accepts `planning` or `execution` plus one plan
directory, reads its `sprints/` files, and:

1. parses and validates the canonical metadata block;
2. rejects duplicate or mismatched IDs, unknown dependencies, self-dependency,
   cycles, invalid lifecycle states, and invalid roots or paths;
3. in planning mode, selects `STUB` sprints whose planning dependencies are all
   `APPROVED`;
4. in execution mode, rejects planned-path overlap between sprints not ordered
   by transitive execution dependency and selects `PENDING` sprints whose
   planning is `APPROVED` and execution dependencies are all `DONE`; and
5. writes a stable JSON array of ready sprint IDs to standard output.

Diagnostics go to standard error and failures return nonzero. The tool uses
only the Node.js standard library and performs no writes.

The sibling tasklet selector accepts one sprint file and the last completed
tasklet ID when one exists. It rejects missing or extra graph nodes, malformed
metadata, unknown dependencies, cycles, unjustified high risk, invalid
Markdown status, and an unfinished graph with no ready node. It writes one
stable JSON object containing `next` and the decisive criteria, or exactly
`{"next":null}` when every tasklet is `[DONE]`. It performs no writes.

### Dispatch and reconciliation

The orchestrator runs the graph tool before planning dispatch, after each
planning reconciliation, before implementation dispatch, and after each
implementation reconciliation. It uses the strongest available planning model
for sprint architecture and normally the least expensive model reasonably
expected to satisfy frozen implementation tasklets. It may retain work when
delegation would predictably cost more, require unavailable judgment, create
resource contention, or reduce code or validation quality; the sprint records
the reason.

A sprint agent executes its tasklets sequentially, records focused validation
and discoveries in its own sprint file, moves the sprint to
`READY_FOR_REVIEW`, closes its journal action when configured, and returns a
concise result. The orchestrator inspects all owned paths, resolves discoveries
and scope questions, runs any distinct integration proof, selectively commits
the cluster, and alone changes the sprint to `DONE`. Plan-wide reconciliation,
full validation, and final acceptance remain orchestrator-owned.

## Acceptance Criteria

- The reusable policy defines atomic tasklets as single implementation units
  and treats predicted additions above 1,000 lines as a mandatory split-or-
  justify review.
- Long-lived plans use a machine-readable sprint DAG and exact planned-path
  ownership instead of assuming a linear sprint sequence.
- An orchestrator can create intent-level sprint stubs, select planning-ready
  stubs independently from execution-ready sprints, and delegate concurrent
  detailed planning to the strongest available model.
- Planning subagents are limited to their sprint artifacts, settle local
  architecture and tasklets, and return cross-sprint decisions for
  orchestrator reconciliation without editing implementation.
- Implementation cannot start before the orchestrator approves that sprint's
  detailed planning and freezes its exact paths and execution dependencies.
- Unordered sprints cannot pass readiness validation when their planned paths
  overlap.
- Tasklet design records contain every structural and algorithmic decision
  needed for implementation by a less capable agent.
- Every sprint has a machine-readable tasklet DAG whose nodes exactly match
  its Markdown tasklets and whose soft affinities can record relatedness
  discovered after initial planning.
- The tasklet selector deterministically chooses one ready tasklet by risk,
  affinity, unfinished descendants, remaining dependency depth, and tasklet
  ID, terminates completed graphs with `{"next":null}`, and rejects invalid or
  blocked graphs without mutation.
- The policy prefers parallel sprint agents and capable lower-cost models but
  permits a concise, reasoned decision not to delegate.
- The graph tool returns all and only immediately executable sprints in stable
  JSON and rejects malformed metadata, missing dependencies, cycles, and
  unsafe path ownership.
- Subagents cannot finalize plan state or use the shared Git index; the
  orchestrator reviews, commits, reconciles, and owns final acceptance.
- Existing approval, scope, testing, journaling, and project-change-set rules
  remain coherent with parallel execution.
- Sandbox-blocked project journaling requests literal user authorization before
  adding a persistent exact-executable rule, including the wrapped-command
  authority and administrator-policy limits.
- Focused checks pass during implementation, followed once by the configured
  full test, rule-copy, and version checks at final acceptance.

## Sprint Manifest

- [S01](sprints/S01.md): Canonical orchestration policy — planning `APPROVED`,
  execution `DONE`
- [S02](sprints/S02.md): Sprint and tasklet scheduling tools — planning
  `APPROVED`, execution `DONE`
- [S03](sprints/S03.md): Integration and final acceptance — planning
  `APPROVED`, execution `DONE`

S01 and S02 have disjoint planned paths and are immediately eligible for
parallel execution after plan approval. S03 depends on both.

## Plan-Level Questions

- [RESOLVED] The 1,000-line threshold triggers scrutiny and recorded
  justification; it is not a hard tasklet size limit.
- [RESOLVED] Sprint dependencies and path ownership use strict JSON embedded in
  a uniquely marked Markdown comment so the tool needs no YAML dependency.
- [RESOLVED] Planning readiness and execution readiness use separate dependency
  graphs because an implementation dependency does not necessarily prevent
  concurrent architecture planning.
- [RESOLVED] Planning uses `STUB`, `PLANNING`, `READY_FOR_REVIEW`, `APPROVED`,
  and `ERROR`; execution metadata remains absent until detailed planning is
  ready for orchestrator review.
- [RESOLVED] Sprint architecture is assigned to the strongest available
  planning model; lower-cost model selection applies after planning is frozen.
- [RESOLVED] Planned paths are exact repository-relative files in the first
  version; glob interpretation is excluded.
- [RESOLVED] A sibling `SNN.tasklets.json` file owns scheduling relationships;
  the sprint Markdown remains the sole tasklet description and lifecycle
  owner.
- [RESOLVED] Hard dependencies constrain correctness and soft affinities
  document implementation locality without inventing an ordering edge.
- [RESOLVED] Tasklet selection uses a fixed lexicographic order rather than
  numeric weights or duration estimates: risk, affinity, unfinished
  descendants, remaining dependency depth, then tasklet ID.
- [RESOLVED] Concurrent subagents do not stage or commit. The orchestrator owns
  the Git index, plan manifest, selective commits, and durable reconciliation.
- [RESOLVED] Model choice is capability- and cost-relative because available
  model names and prices belong to the host runtime.
- [RESOLVED] The user's 2026-08-19 requirements authorized this plan's design;
  the later instruction "Implement this plan" explicitly approved execution.

## Final Validation

- Implementation commits:
  - `dfdcdd4` — canonical orchestration and journal-authorization policy.
  - `43365f7` — completed-tasklet terminal-result reconciliation.
  - `ee735ca` — schema-versioned sprint and tasklet scheduling tools.
  - `1d7d03b` — generated OpenClaw skill and packaged scripts.
- Focused policy and scheduler run: 20 tests passed.
- Copied-plan integration: execution readiness returned exactly `["S03"]`
  without changing the checked file; planning readiness returned `["S02"]`
  and then `["S03"]` as the dependency became approved; completed S01 and S02
  tasklet graphs returned `{"next":null}` and S03 selected `S03-F01-T01`.
- Generated OpenClaw focused run: 88 tests passed.
- The first full run exposed only the stale generated OpenClaw copy. The
  canonical generator repaired it, and the final `npm test` passed: 237 core
  tests, installer checks, 23 Pi-extension tests, and 4 MCP tests. That run
  also validated 28 registry entries and confirmed all 8 rule copies.
- `node scripts/check-versions.js` passed with all 7 version files at `4.8.4`.
- Final management record: this closing commit.
