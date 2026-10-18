<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Open feature requests implementation

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-09-open-feature-requests","parent_plan_id":null,"depends_on":[]}
-->

- **Plan ID:** `2026-10-09-open-feature-requests`
- **Status:** in_progress; kickoff reconciliation complete.
- **Authority:** Human request on 2026-10-09 to implement this plan, followed
  by explicit resolution of transport scope and direction to proceed.
- **Management and component repository:** `/Users/alex/git/github/ponytail`.

## Objective and scope

Implement all four FEAT records in `pm/bugs/open/` at the initial planning census, retaining their
original acceptance matrices. Already-active FEATs remain with their existing
plans; closed, deferred, and rejected requests are not reopened. Scope does not
automatically grow when another issue is filed.

| Feature issue | Owning sprint | Completion commitment |
| --- | --- | --- |
| [Batched resumable traceability indexing](../../../bugs/in_progress/2026-10-08-FEAT-traceability_index_batch_resume.md) | S01 | Durable compatible batches survive abrupt crashes; only complete generations become query-visible; evolving inputs invalidate incompatible checkpoints. |
| [Traceability index progress](../../../bugs/in_progress/2026-10-08-FEAT-traceability_index_progress.md) | S02 | Honest TTY progress and printable redirected progress, with machine-readable results preserved. |
| [TSTS shared message contracts](../../../bugs/in_progress/2026-10-09-FEAT-tsts_shared_message_contracts.md) | S03 | Canonical channel/payload coupling at both endpoints, bypass diagnostics, adapter containment, and unregistered-channel discovery. |
| [TypeScript-only authored source](../../../bugs/in_progress/2026-10-01-FEAT-typescript_only_source.md) | S04 | All repository-owned handwritten JavaScript migrates to strict TypeScript and TSTS; generated runtime JavaScript remains usable. |

Excluded: the withdrawn duplicate-type request, the separately filed non-commit
tag indexing BUG, client modifications, new worktrees, parallel workers,
external tracker writes, deployments, and new cloud/database services.

## Proposed architecture and ordering

S01 extends the existing PostgreSQL projection in `src/project-index.js` and
`scripts/project-index.sql`. Preserve the
[traceability architecture](../../../architecture/traceability-index.md) and
[existing requirement](../../../requirements/traceability-index.md). Private
durable checkpoints remain separate from published complete generations.
Exact content/configuration/parser/schema identities govern reuse; final
publication revalidates current inputs, additions/removals/renames and dirty
edits. Failure retains the previous published generation. Preserve existing
project/repository/worktree/corpus isolation and same-key writer serialization
across commits. No global cross-worktree lock or new aggregate limit is
authorized. Detail the durable contract and lock lifetime in S01 planning;
apply versioned-data-contracts before modifying schema/readers.

S02 follows S01 so progress reflects durable processing, reuse, interruption,
and final publication rather than fabricated completion. Reuse the existing
`repositoryIndexProgress` behavior and dependencies without maintaining a
second implementation. Keep progress separate from machine-readable results.

S03 extends TSTS's configuration/workspace/type-checker ownership, not its
duplicate-exported-name checker. Track canonical declaration identity,
channel argument tuples, producer calls, consumer registrations, and bypass
overloads. Discover supported calls independently of channel registration.
Contain raw dependency transports behind typed adapters; external runtime
validation remains required. Resolve supported APIs and ownership policy first.

S04 migrates the feature-complete tree, avoiding repeated ports of S01/S02
edits. Establish strict build/runtime ownership, migrate core tooling/tests,
then adapters, skills, package subprojects and isolated benchmarks, then enforce
no authored JavaScript. Preserve public commands, entrypoints, generated-source
ownership, installation behavior and benchmark isolation. Inventory the final
tree; the issue's historical 96-file count is not the acceptance denominator.
Decompose detailed work into atomic declarations and validation tasklets.

S01-S03 designs are implemented and their owning architecture pages updated.
S04 remains selected but not implemented.

## Sprint manifest

| Sprint | Intent | Status | Dependencies |
| --- | --- | --- | --- |
| [S01](sprints/S01.md) | Durable checkpoints and restart | DONE | none |
| [S02](sprints/S02.md) | Honest progress | DONE | S01 |
| [S03](sprints/S03.md) | Shared message contract enforcement | DONE | S02 execution (shared PM paths) |
| [S04](sprints/S04.md) | TypeScript migration and final acceptance | STUB | S01, S02, S03 |

S01-S03 tasklets and acceptance are complete. S04 detailed planning is next;
freeze its exact source inventory, runtime ownership and atomic graphs before
migration. S04 execution follows completed S01-S03. The plan remains active;
full migration and plan-wide final acceptance are not complete.

## Readiness questions and decisions

- [RESOLVED] Census: four open FEATs, including the older TypeScript migration;
  active work is not reassigned.
- [RESOLVED] Ten files is an example batch size, not fixed policy. Select and
  record the interface/default during detailed planning.
- [RESOLVED] Retain current resource topology and writer/reader isolation;
  no new cross-session availability policy is authorized.
- [RESOLVED] S03: configurable producer/consumer APIs across transports.
- [RESOLVED] S03: finite declared channels; unrestricted dynamic strings are
  rejected. Raw transports are allowed only in designated typed adapters.

All known product questions are resolved. Compiler/path/schema/batch mechanics
are agent-owned detailed planning, not requests for user metadata editing.

## Implementation activation gate

At explicit kickoff, reconcile every included issue, including later sprints,
into canonical requirements and specific UAT procedures before product edits.
Preserve exact existing requirements; add only approved new behavior. Record
issue, plan/tasklet, UAT, implementation, unit-test and integration-test links
and generated reverse discovery. Assign missing artifacts to atomic tasklets;
planned work is not completed coverage. Record reconciliation receipts here
and in the issue records. Creating this plan adds no requirements, UAT, or
prospective requirement annotations.

Record starting revision/dirty state and applicable baseline proof before
execution. New-feature traceability gaps remain pending final work, not falsely
green baseline results. Use canonical selectors and campaign validation.

## Acceptance and evidence

Each linked issue's complete acceptance matrix remains mandatory. S01 requires
real PostgreSQL publication, abrupt crash/restart, compatible checkpoint reuse,
changed-input recovery and concurrent-reader isolation. S02 requires TTY and
redirected-file observations, cancellation/failure output, and valid JSON.
S03 requires rejecting unrestricted signatures, independent contracts,
permissive overloads and unregistered channels; shared declarations and
contained adapters pass, and JSON-text channels reject object arguments.
S04 requires complete authored-source inventory, strict compiler/TSTS coverage,
working compiled entrypoints, and a durable no-handwritten-JS guard.

Use focused proof per tasklet, affected combined/integration proof at owning
gates, and reuse unchanged evidence. Query build impact before building. Final
acceptance runs configured `npm test`, rule-copy, version, traceability,
installer/generated-adapter and affected real-database checks against the final
tree. Benchmark proof is separately invoked; core commands must not execute or
provision benchmark behavior. Preserve generated-source mappings.

Record exact revision, dirty state, commands/selections, timestamps, outcomes,
skips and full failing output. Close each issue only after its acceptance passes;
close the plan after all four converge and final validation passes.

## Kickoff reconciliation receipt

All four issues were activated on 2026-10-09. Their approved outcomes are
recorded in `pm/requirements/open-features.md`, with specific procedures in
`pm/uat/open-features.md`. S01 owns batch-resume coverage, S02 progress, S03
shared contracts and S04 migration. Missing implementation/unit/integration
coverage remains required future work, not passing evidence. Baseline HEAD:
`60dda7c4e8beb44f630ed2e7b19378143f58ed95`; only PM intake was dirty initially.
Baseline `npm test` passed its test suites but failed the terminal tracked-file
policy on untracked intake records. Retain output in the local baseline log;
repeat that structural check after staging intake. No product failure observed.

Traceability: plans-implementation REQ-TRACEABILITY-BATCH-RESUME from plan 2026-10-09-open-feature-requests
Traceability: plans-verification REQ-TRACEABILITY-BATCH-RESUME from plan 2026-10-09-open-feature-requests
Traceability: plans-implementation REQ-TRACEABILITY-PROGRESS from plan 2026-10-09-open-feature-requests
Traceability: plans-verification REQ-TRACEABILITY-PROGRESS from plan 2026-10-09-open-feature-requests
Traceability: plans-implementation REQ-TSTS-SHARED-MESSAGE-CONTRACTS from plan 2026-10-09-open-feature-requests
Traceability: plans-verification REQ-TSTS-SHARED-MESSAGE-CONTRACTS from plan 2026-10-09-open-feature-requests
Historical coverage: plans-implementation REQ-TYPESCRIPT-ONLY-SOURCE from plan 2026-10-09-open-feature-requests
Historical coverage: plans-verification REQ-TYPESCRIPT-ONLY-SOURCE from plan 2026-10-09-open-feature-requests
