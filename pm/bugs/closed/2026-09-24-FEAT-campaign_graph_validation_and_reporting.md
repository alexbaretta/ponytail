<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-09-24-FEAT-campaign_graph_validation_and_reporting: Validate and report complete plan campaigns

## Status

closed

## Type, source, and authorization

- **Type:** FEAT
- **Canonical issue ID:**
  `2026-09-24-FEAT-campaign_graph_validation_and_reporting`
- **Source:** Stakeholder direction in the 2026-09-24 requirements/UAT
  campaign-census discussion, clarified by explicit stakeholder decisions on
  2026-09-24.
- **Approval state:** The census behavior, single-source graph model,
  fail-fast validation, closure rules, CLI output contract, and implementation
  plan are approved.
- **Authorization:** The user explicitly authorized implementation on
  2026-09-24. Historical-record migration and publication outside Git remain
  outside scope.
- **Intended owner:** The Ponytail repository, because the capability defines
  portable plan-management behavior and must evolve with the reusable
  `plan-execution` skill.

## Objective

Add a read-only Ponytail CLI capability that accepts any managed plan, follows
its parent backlinks to the campaign root, derives the root's descendants, and
validates and reports an accurate census of every plan, sprint, and tasklet in
that campaign.

The CLI and `plan-execution` must share one strict, versioned, machine-readable
plan relationship contract. Human-readable Markdown remains required, but
prose, headings, and link labels are not graph identity.

This feature is a census and integrity tool. It does not schedule parallel
work, assign workers, determine liveness, manage worktrees, integrate branches,
or estimate delivery time.

## Current state and gap

At Ponytail revision `283ffb3cac1bf1ca7afbe96a44a9c7291623a43e`:

- `plan-execution` owns plan drafting, sprint and tasklet metadata, readiness
  selection, campaign orchestration, and execution.
- `ready-sprints.js` and `ready-tasklets.js` validate and select work within one
  plan. They do not express or traverse relationships between plans.
- Campaign membership is written inconsistently in ordinary Markdown prose.
- `cli/plan_stats.sh` assumes the historical flat `pm/plans/<plan-name>` layout
  and counts matching text lines. It neither understands lifecycle directories
  nor validates tasklet metadata.
- `cli/audit_pm.sh` validates historical PM layout conventions but is not a
  campaign graph reader.

Consequently, an agent cannot start from one plan and deterministically answer
which plans belong to its campaign or produce a trustworthy census of their
  sprints, tasklets, and statuses.

## Approved scope

V1 must:

1. Maintain one canonical authored parent backlink for each campaign member and
   derive children by scanning configured plan locations.
2. Discover the same campaign from any member plan.
3. Validate plan metadata and every included sprint and tasklet graph through
   the canonical readers and selectors.
4. Fail on the first deterministic validation error.
5. Report exact campaign membership and plan, sprint, and tasklet census totals
   from the selected worktree.
6. Enforce the approved campaign closure rules.
7. Provide deterministic human and versioned JSON output with explicit exit
   semantics.

## Terminology

- A **campaign** is one rooted tree of plans.
- A **campaign root** is the only plan in that tree with no parent.
- A **campaign member** is the root or any plan reached by deriving children
  from direct parent backlinks.
- A **descendant** is any transitive child of the campaign root.
- A **managed plan** is a plan whose manifest carries the supported campaign
  metadata block. An unmarked historical plan is legacy data, not an implicit
  campaign member.

A campaign root with at least one descendant is the coordinating plan the
stakeholder described as an epic for this census. The CLI uses **campaign
root**, not **epic**, because `issue-tracking` already uses epic to mean an
issue associated with a long-lived plan. This feature does not read or write
issue-to-plan associations and does not change `issue-tracking`'s definition.

## Ownership

### `plan-execution`

`plan-execution` remains the primary owner of:

- creating and drafting long-lived plans;
- campaign membership semantics;
- sprint, feature, and tasklet structure;
- campaign validation gates before plan approval and execution; and
- final campaign reconciliation and root closure.

It must instruct an agent to update a child's parent backlink and corresponding
human-readable link in the same change whenever campaign membership changes.

### `issue-tracking`

`issue-tracking` remains the owner of issue identity, lifecycle, and its
existing issue/plan epic classification. The campaign CLI has no issue metadata
contract and performs no issue traversal.

### Project configuration

The CLI must not parse free-form `AGENTS.md` prose to discover project-management
roots or lifecycle roles. Ponytail must define one versioned, project-owned,
machine-readable configuration for:

- management root;
- plan root;
- configured lifecycle directories;
- initial, active-work, successful-completion, deferred, and rejected roles;
  and
- any explicitly supported legacy layout.

The configuration must not duplicate fields already owned by another
machine-readable Ponytail contract. If a new durable contract is necessary,
register it in `versioned-data-contracts.json`, document its canonical path,
and add an exhaustive version reader.

## Single-source graph model

Each managed plan manifest contains exactly one strict, versioned JSON metadata
block. Stable plan IDs are graph identities. Relative paths and lifecycle
directories are locators and are never relationship keys.

The V1 plan contract has the semantic equivalent of:

```json
{
  "schemaVersion": 1,
  "id": "2026-09-21-persistent-uat-campaign-convergence",
  "parent_plan_id": "2026-09-16-requirements-and-uat-coverage"
}
```

The following semantics are required:

- A campaign member has zero or one direct parent.
- `parent_plan_id: null` identifies a campaign root.
- Each non-root plan authors only its direct parent backlink.
- Children and all descendants are derived by inventorying parent backlinks;
  no plan authors `child_plan_ids`.
- Lifecycle is derived from the containing configured status directory and is
  not repeated in plan metadata.
- Human-readable Markdown links remain required and must resolve to the plans
  named by authored relationship identifiers.
- The CLI has no issue metadata block and no plan-side issue identifier list.

Plan-to-plan execution dependencies and sprint-specific cross-plan gates are
outside this census contract. They require a separately approved contract and
must not be inferred from prose.

### Validation scope

Validation is restricted to the one campaign containing the supplied plan.
The CLI may scan configured plan locations only to resolve that plan's ancestor
chain and derive descendants of the resulting root. It must not validate,
report, or let errors in any unrelated campaign affect the command result.

## CLI surface

Expose the capability through the installed `ponytail` command:

```text
ponytail campaign validate <plan-or-plan.md>
ponytail campaign report <plan-or-plan.md> [--json]
```

`<plan-or-plan.md>` accepts either a managed plan directory or its `plan.md`.
It does not accept an ambiguous basename, plan ID search term, sprint path, or
issue path.

Validation and reporting are separate operations:

- `validate` reads the complete campaign and succeeds only when every required
  contract and graph invariant is valid.
- `report` first performs the same validation, then emits the census. It emits
  no partial census when validation fails.

### Exit statuses

Both operations use the same statuses:

- `0`: invocation completed and the campaign is valid;
- `1`: campaign or project-management data is invalid, including a canonical
  selector validation failure; and
- `2`: usage, input resolution, repository discovery, configuration, I/O, or
  unexpected tool failure prevented a validity determination.

The first failure in deterministic traversal order determines the diagnostic
and exit status. Later discrepancies are not evaluated or reported.

### Human output

- Successful `validate` writes one concise confirmation to stdout and nothing
  to stderr.
- Successful `report` writes the census to stdout and nothing to stderr.
- A failure writes one actionable diagnostic to stderr and nothing to stdout.
- Diagnostics contain a stable code, the affected record ID when known, and a
  repository-relative path when known.
- Human output may use the absolute selected-worktree path for operator
  orientation, but durable record identity never depends on it.
- Human output contains no ANSI color unless a future separately approved
  option requests it.

### JSON output

`--json` applies only to `report` in V1.

- On exit `0`, stdout contains exactly one versioned JSON document followed by
  one newline; stderr is empty.
- On exit `1` or `2`, stdout is empty and stderr contains the same single
  fail-fast diagnostic used by human mode.
- The JSON document contains no locale-dependent formatting,
  nondeterministic timestamp, ANSI escape, or absolute path in durable identity
  fields.
- Unknown keys are rejected by the exact output schema.
- The JSON writer emits only the latest physical output version, and its output
  must round-trip through the production reader.

## Placement and implementation language

- The user-facing entrypoint remains parse-safe Bash.
- Non-Bash implementation lives under a documented non-script source owner,
  not under `cli/` or another Bash-only entrypoint directory.
- Prefer the repository's existing Node runtime and standard library. Do not
  add a dependency merely to parse JSON, traverse a graph, or format
  deterministic text.
- Do not extend `cli/ponytail` with another large embedded language program.
  Dispatch from the Bash entrypoint to a separately testable implementation.
- Update `PROJECT_STRUCTURE.md`, the directory-structure manifest, package
  distribution inputs, CLI documentation, and installer or dispatch behavior
  in the same project change-set.

## Read-only invariant

Both operations are strictly read-only. They must not:

- edit, normalize, fix, move, or generate project-management records;
- change issue, plan, sprint, feature, or tasklet status;
- create commits, branches, tags, stashes, or worktrees;
- contact an external system;
- start, assign, inspect, or message workers; or
- infer missing relationships and write them back.

Invalid or incomplete data produces one diagnostic and a nonzero result, not
an automatic repair or partial report.

## Deterministic discovery and validation

Given one plan path or plan directory, the CLI must:

1. Resolve the containing Git worktree and configured project-management roots.
2. Read and validate the selected plan's metadata.
3. Follow `parent_plan_id` repeatedly, resolving each named parent across the
   configured lifecycle directories until the unique campaign root is found.
   Reject the first missing or ambiguous parent or ancestor cycle.
4. Scan configured plan locations in deterministic order for a parseable parent
   backlink naming the root or a discovered descendant. Add each such plan and
   repeat until no additional descendant is found.
5. Fully validate only the resulting root and descendants. Reject duplicate IDs
   or physical records when they make a selected member, ancestor, or descendant
   ambiguous. Ignore records outside this campaign.
6. Validate that every campaign member is reachable exactly once from the root.
7. Inventory every sprint in each campaign member and read `SNN.md` and its
   sibling `SNN.tasklets.json` whenever that physical sprint version requires
   tasklet metadata.
8. Invoke the canonical Ponytail sprint and tasklet readers and selectors. Do
   not copy or reimplement their validation or selection behavior.
9. Stop at the first campaign-local error or emit the deterministic report.

Traversal order is stable: configured lifecycle order, then plan ID, numeric
sprint order, feature ID, and tasklet ID. Dependency arrays and report groups
use lexicographic ID order unless a contract defines a numeric ordinal.
Filesystem enumeration order never affects validation or output.

### Plan and campaign validation

Validate at least:

- exactly one supported metadata block per managed plan;
- exact schema keys, supported physical version, and valid values;
- stable ID agreement among metadata, canonical directory name, and manifest
  prose;
- unique IDs within the selected campaign and unambiguous resolution of every
  selected member and ancestor;
- configured lifecycle-directory validity;
- resolvable human-readable links corresponding to authored relationships;
- at most one parent backlink per plan;
- one root per discovered campaign tree;
- no parent cycle, missing parent, duplicate physical record, or unreachable
  discovered member;
- configured root/layout compatibility; and
- the campaign closure rules below.

Do not reconstruct missing metadata from prose. An unmarked legacy plan is
ignored when it is unrelated to the selected managed graph. It is invalid when
it is the selected input or is named as the selected campaign's parent.
Historical plans are not rewritten merely because the reader supports a newer
contract. Malformed metadata and graph errors in unrelated campaigns are out of
scope and do not affect the result.

### Sprint and tasklet validation

For every included sprint, invoke the canonical readers and selectors to
validate:

- exactly one sprint metadata block and a supported physical version;
- the current policy on mixed physical sprint versions within a plan;
- sprint identity, planning and execution states, dependencies,
  `tasklets_reviewed`, and scope roots;
- exact one-to-one correspondence between tasklet JSON entries and Markdown
  headings;
- feature and tasklet identity, membership, validation ownership, hard
  dependencies, affinity, risk metadata, and exact planned paths;
- graph acyclicity and ordered path overlap; and
- selector validity against the same files included in the census.

The CLI uses selector execution only as validation. It does not report a next
selection, turn selector output into a schedule, or claim that external
product, legal, credential, environment, integration, or authorization
conditions are satisfied.

## Required census

Starting from any campaign member, the successful report exposes:

- selected repository, worktree, exact Git commit, branch or detached state,
  and cleanliness;
- campaign root and every member plan;
- totals grouped by configured plan lifecycle;
- total and incomplete sprint counts grouped by planning and execution state;
- tasklet totals grouped by `PENDING`, `DONE`, and `ERROR`;
- tasklet completion percentage with numerator and denominator;
- one deterministic record per plan with lifecycle and aggregate counts;
- one deterministic record per sprint with formal status and tasklet counts;
- one deterministic record per tasklet with its canonical ID, feature
  membership, status, dependencies, and declared planned paths; and
- a concise final summary containing plans, sprints, and `DONE / TOTAL`
  tasklets with the exact completion percentage.

An empty category is reported as zero. A campaign containing no tasklets has
`doneTasklets: 0`, `totalTasklets: 0`, and `taskletCompletionPercentage: null`;
human output renders the percentage as `unavailable (no tasklets)`.

The CLI does not report worker assignment, runnable lanes, integration queues,
throughput, elapsed execution time, ETA, expected completion timestamps, or a
campaign-wide critical path.

## Closure rules

- A non-root member plan may enter the configured successful-completion state
  when its own plan acceptance is complete, regardless of unrelated campaign
  members.
- Issue lifecycle continues to follow `issue-tracking` and any issue's directly
  associated plan; the campaign CLI does not validate issue closure.
- A campaign root with descendants may enter the configured
  successful-completion state only when every campaign member is in that state
  and final campaign validation succeeds against the exact closing tree.

## Required skill workflow

Update `plan-execution` so an agent must:

1. Create and maintain the strict metadata whenever drafting a managed plan or
   campaign child.
2. Update a child backlink and corresponding human-readable link in the same
   project change-set.
3. Preserve stable IDs and repair human links after lifecycle moves.
4. Run `ponytail campaign validate <plan-or-plan.md>` before requesting plan
   approval.
5. Run it again after planning reconciliation and before the first
   implementation edit.
6. Run it after campaign restructuring, lifecycle movement, or relationship
   changes.
7. Run it before final campaign-root closure.
8. Stop campaign implementation on the first invalid campaign result while
   continuing unrelated approved work when possible.

The validator must call the canonical selectors. The skill must not instruct
agents to reproduce selector logic manually.

## Deterministic JSON report

The versioned JSON report contains:

- output schema version and invocation identity;
- selected repository and worktree observations;
- campaign root and member IDs;
- normalized plan, sprint, and tasklet census records;
- formal counts and percentages;
- `valid: true`.

The report schema is a distinct durable representation family registered in
`versioned-data-contracts.json`. Historical physical versions remain immutable;
readers normalize every supported version into one current representation, and
the ordinary writer emits only the latest physical version.

## Backward compatibility and migration

- Existing sprint and tasklet schema readers remain immutable under current
  `plan-execution` policy.
- New or updated managed plan relationships use the latest write format.
- The reader may support explicitly registered legacy plan metadata, but it
  never guesses relationships from prose headings.
- Existing historical plans are not mass-rewritten as an incidental part of
  adding the tool.
- Every member of a campaign intended for certification receives an explicit,
  reviewed metadata migration before validation can succeed. Unrelated
  unmarked historical plans do not require migration.
- `plan_stats.sh` and `audit_pm.sh` remain unchanged unless the approved plan
  explicitly replaces or delegates their overlapping behavior. Do not create
  two canonical campaign validators.

## Expected implementation areas

The implementation plan must account for at least:

- `skills/plan-execution/SKILL.md`;
- generated host copies and their owning generators;
- the installed `ponytail` command dispatch;
- a separately testable non-script implementation module;
- project-management configuration and version readers;
- the campaign JSON report reader and writer;
- `versioned-data-contracts.json` and its schema checks;
- `PROJECT_STRUCTURE.md` and the directory-structure manifest;
- focused graph, schema, CLI, selector-integration, package,
  generated-copy, policy, and version tests; and
- user-facing command documentation.

Planning must inspect current generated-copy and packaging rules before
freezing exact tasklet paths. This list identifies ownership surfaces; it does
not authorize edits while the issue remains open.

## Acceptance criteria

- Starting with the root or any descendant in a valid fixture discovers the
  same root, members, and deterministic order.
- Campaign children are derived only from parent backlinks; no authored reverse
  relationship exists.
- Lifecycle is derived only from the configured containing directory.
- Missing parents, parent cycles, duplicate member IDs, duplicate member
  physical records, broken relationship links, invalid lifecycle placement,
  and unsupported versions fail at the first deterministic error.
- Malformed or contradictory records in another campaign do not affect
  validation or reporting of the selected campaign.
- Unrelated unmarked legacy plans do not prevent a managed campaign from
  validating, while a selected or referenced unmarked plan does.
- Every included sprint's Markdown and tasklet JSON are validated through the
  canonical readers and selectors.
- Human and JSON reports contain equivalent successful census facts.
- Empty groups and the zero-tasklet percentage case use the specified values.
- Exit statuses, stdout, stderr, newline, and JSON behavior match this record
  for success, invalid data, and indeterminate failures.
- No command output claims worker assignment, liveness, parallel safety,
  integration readiness, throughput, ETA, or semantic tasklet atomicity.
- Root and member closure obey the specified rules.
- The CLI performs no repository or external mutation on success or failure.
- The Bash entrypoint is parse-safe and passes `bash -n`.
- Focused graph, schema, CLI, selector-integration, package, generated-copy,
  and policy tests pass, followed by applicable Ponytail final acceptance.

## Explicit exclusions

- No automatic plan repair, normalization, or migration.
- No plan generation, sprint drafting, or tasklet atomization.
- No issue metadata or issue traversal.
- No worker, session, or liveness discovery.
- No parallel-lane scheduling or cross-plan work dispatch.
- No worktree enumeration or divergent-worktree comparison.
- No branch integration, rebase, merge, or semantic-rebase claim.
- No throughput, elapsed-time, ETA, or completion-date calculation.
- No external issue-tracker, publication, deployment, credential, or
  persistent-environment action.
- No incidental migration of historical Ponytail or adopting-project plans.

## Requirements and UAT reconciliation

Approved requirements are recorded in
[`../../requirements/index.md`](../../requirements/index.md#campaign-census-cli).
Plain-English acceptance coverage is recorded in
[`../../uat/index.md`](../../uat/index.md#campaign-census-suite).

Implementation was explicitly approved on 2026-09-24; requirements and UAT
documentation remain descriptive records rather than independent authority.

## Activation decisions

- [RESOLVED] Use `.agents/config/project/management.json` for the exact
  machine-readable project-management configuration.
- [RESOLVED] Use marker `ponytail-plan-campaign` with exact V1 keys
  `schemaVersion`, `id`, and `parent_plan_id`.
- [RESOLVED] Use `src/campaign-census.js` as the non-script implementation
  owner.
- [RESOLVED] Retain `plan_stats.sh` as a clearly legacy-only tool.

## Implementation and plan links

Implementation is owned by
  [`2026-09-24-campaign-census`](../../plans/closed/2026-09-24-campaign-census/plan.md).
The user explicitly approved implementation on 2026-09-24.

## Validation evidence

The configured full automated checkpoint passed at revision
`283ffb3cac1bf1ca7afbe96a44a9c7291623a43e` before implementation edits: 331
core tests, Codex installer checks, 23 Pi tests, 4 MCP tests, 58 TSTS tests, and
the TSTS directory-structure check; zero failures or skips.

## Resolution or disposition

Implemented and accepted on 2026-09-24 in commit `5329514`. Focused campaign,
policy, packaging, generated-copy, and versioned-contract tests passed, as did
the build-impact-selected TSTS build and the configured full Ponytail test
command. The issue and its plan closed together after final campaign
validation.
