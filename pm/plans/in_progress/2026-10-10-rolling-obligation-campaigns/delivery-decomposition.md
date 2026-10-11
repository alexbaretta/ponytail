<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Atomic delivery decomposition

[Plan and atomicity criterion](plan.md#work-metric) | [Execution contract](design.md)

## Assessment boundary

This document decomposes the rolling workflow into candidate delivery outcomes.
It does not award discharge or change the existing obligation ledger. Row labels
are decomposition references, not assigned obligation IDs. The next baseline
must give each accepted outcome its canonical ID, requirement/acceptance links,
prerequisites, exact authorized paths, execution binding and discharge criterion.
Preserve old obligation identities and certificates; broad requirement gates
remain final acceptance rollups rather than counted atomic delivery units.

The evidence column identifies a real executable boundary, not a claim that all
required evidence is adequate or fresh. `Available` means the cited proof was
inspected and passed in the typed test family on 2026-10-10 at revision
`4b67352`. That run passed 75 tests with no failures or skips. `Required` means
the named product workflow still needs implementation or adequate proof.
Protocol proof does not establish a live worker's lifecycle. Database proof
does not establish filesystem cessation. None of these rows is certified yet.

## Rolling outcomes

Each row's discharge criterion is its stated observable outcome demonstrated
through the cited boundary, plus applicable static, structural and focused QA.
Failure cases belong to the outcome they constrain; they are not extra units
merely because separate tests can exercise them.

| Ref | Smallest delivery outcome | Evidence boundary | Assessment |
| --- | --- | --- | --- |
| D01 | Resolve and retain the campaign publication target using explicit, project, then Git defaults. | `tests/rolling-campaign.test.ts`; configuration Git Arc | Available |
| D02 | Resolve positive safe N/M limits using campaign, project and global defaults. | `tests/rolling-campaign.test.ts` | Available |
| D03 | Accept only checked project configuration with literal executable argv and required publication QA. | `tests/rolling-campaign.test.ts`; configuration Git Arc | Available |
| D04 | Derive graph identity solely from coordinator inputs and reject obsolete identities before selection. | `tests/rolling-campaign.integration.test.ts` | Available |
| D05 | Reject cyclic or unavailable prerequisite inputs before allocating work. | `tests/rolling-campaign.integration.test.ts` | Available |
| D06 | Preserve acceptance Step references and exact implementation/test bindings in checked assignment input. | `tests/rolling-campaign.test.ts` | Available |
| D07 | Select a deterministic maximal compatible ready set within available active capacity. | `tests/rolling-campaign.test.ts` | Available |
| D08 | Prefer eligible stopped inactive assignments over new work while retaining their ownership. | `tests/rolling-campaign.test.ts`; PostgreSQL Arc | Available |
| D09 | Prevent changed assignment scope or another campaign's conflicting ownership from entering a selected batch. | `tests/rolling-campaign.test.ts` | Available |
| D10 | Reserve each obligation/worktree pair once under concurrent allocation requests. | `tests/rolling-campaign-store.integration.test.ts` | Available |
| D11 | Reject stale lease events after assignment generation changes. | PostgreSQL Arc | Available |
| D12 | Persist external action intent and require matching acknowledged results before state advances. | PostgreSQL Arc | Available |
| D13 | Release a retired database assignment successfully even when no obligation is ready. | PostgreSQL Arc | Available |
| D14 | Reconcile an accepted graph change before subsequent database allocation. | PostgreSQL Arc | Available |
| D15 | Resolve every checkout's managed directory to one physical main-root-anchored pool. | `tests/rolling-worktrees.integration.test.ts`; physical-path unit proof | Available |
| D16 | Provision ordinary Git worktrees numbered 101 upward with configured project setup. | Git worktree Arc | Available |
| D17 | Repair and verify effective ignore rules for the session marker without discarding existing rules. | Git worktree Arc | Available |
| D18 | Reuse a checkout only after its marker, uncommitted work and unintegrated commits permit reuse. | Git worktree Arc | Available |
| D19 | Recover an identical provisioning intent without creating a second checkout; retain failed setup ownership. | Git worktree Arc | Available |
| D20 | Start and resume a native Codex thread in an explicitly designated existing checkout. | `tests/rolling-codex.test.ts`; separate native smoke required | Protocol proof available; reassess live evidence |
| D21 | Observe native terminal turns and require them before closing the owned server. | `tests/rolling-codex.test.ts` | Available |
| D22 | Preserve unknown native outcomes on timeout or transport loss without automatically recreating a worker. | `tests/rolling-codex.test.ts` | Available |
| D23 | Bind a reserved database assignment to its actual native session and matching ignored marker. | Application provisioning Arc | Required |
| D24 | Deliver exact obligation, traceability, lease and QA instructions to an attached worker. | Application worker-start Arc | Required |
| D25 | Suspend an actually stopped blocked worker and free capacity while retaining its checkout. | Application suspension Arc with activity evidence | Required |
| D26 | Resume the original unblocked native session after capacity reservation and scope/base refresh. | Application resumption Arc | Required |
| D27 | Reconcile uncertain worker creation after coordinator restart without duplicate creation. | Restart/recovery Arc | Required |
| D28 | Submit the exact candidate only after focused QA and a fresh worker semantic rebase. | Worker submission Git Arc | Required |
| D29 | Review the exact candidate adversarially and persist the assigned reviewer identity. | Review operation Arc | Required |
| D30 | Return rejected work to its worker and reuse the same reviewer for corrected submissions. | Review/rework Arc | Required |
| D31 | Record reviewer replacement and obtain fresh review when the original reviewer is lost. | Review recovery Arc | Required |
| D32 | Apply the intentional fast-rebase policy after accepted review, with semantic inspection triggered by textual conflict. | Increment integration Git Arc | Required |
| D33 | Fast-forward and normally push a reviewed increment, recording delivery only after remote containment is verified. | Increment push Git Arc | Required |
| D34 | Reconcile rejected or uncertain increment pushes without force or duplicate delivery. | Increment push recovery Arc | Required |
| D35 | Assess submitted certificates on integrated inputs without allowing worker candidates to mutate accepted records. | Integrated certificate operation Arc | Required |
| D36 | Establish terminal worker cessation, revoke its generation and clean only its owned resources before checkout release. | Retirement activity/filesystem Arc | Required |
| D37 | Freeze publication at M accepted increments; resubmissions and bookkeeping do not increment the count. | Publication threshold Arc | Required |
| D38 | Flush a nonempty partial publication batch at explicit flush, completion or quiescence. | Partial publication Arc | Required |
| D39 | Incorporate fresh mainline into the publication candidate while preserving published campaign history. | Publication reconciliation Git Arc | Required |
| D40 | Prevent mainline publication unless all required full QA passes on the exact candidate. | Publication QA gate Arc | Required |
| D41 | Reconcile mainline push races and unknown outcomes, refresh changed-input proof and synchronize the campaign base. | Publication recovery Git Arc | Required |
| D42 | Replenish capacity from events and periodic reconciliation without duplicating allocations. | Coordinator recovery/replenishment Arc | Required |
| D43 | Project exact next actions, prerequisite reasons and active/inactive/review/publication state for coordinator decisions. | Application status/next-actions Arc | Required |
| D44 | Initialize and reconcile a campaign through the shared typed application operation layer. | CLI operation Arc | Required |
| D45 | Expose chapter/command usage with argument, precondition, mutation and result descriptions from one registry. | CLI help contract proof | Required |
| D46 | Replace legacy plugin-based campaign dispatch while preserving explicit historical inspection boundaries. | CLI replacement/migration Arc | Required |
| D47 | Resolve the MCP exposure decision and, if adopted, expose the same fenced operations and schemas. | MCP decision plus operation parity proof if adopted | Required |
| D48 | Refuse campaign closure until all owned delivery obligations and final acceptance gates have fresh adequate evidence. | Campaign closure Arc | Required |

Configuration Git Arc: `tests/rolling-campaign.integration.test.ts`.
PostgreSQL Arc: `tests/rolling-campaign-store.integration.test.ts`.
Git worktree Arc: `tests/rolling-worktrees.integration.test.ts`.
Physical-path unit proof: `tests/rolling-worktrees.test.ts`.
These boundaries can demonstrate several conditions through identified assertions;
the number of test functions does not determine obligation atomicity.

## Remaining decomposition before baseline activation

The 48 rolling candidates are not the campaign-wide denominator. The full
language requirement also applies to existing core commands, portable tools,
host integrations, installation/generation/validation tools, tests and standalone
benchmark tooling. Benchmark execution remains outside core QA and packaging.

Decompose each existing behavioral operation into the condition that it executes
through a checked static contract while preserving its approved behavior. A
component migration can contain several such outcomes; a declaration conversion
or generated runtime copy is not independently counted. Required typed test
fixtures and generator/ownership synchronization accompany their operation.
An independently consumed QA tool or host boundary can have its own outcome.
An obsolete operation can instead be removed when its removal is within the
approved replacement scope and its callers/commands are reconciled.

The source inventory currently identifies 188 canonical executable candidates
after excluding generated mirrors and the already typed TSTS subtree. This is
an inspection inventory, not 188 obligations or a completeness claim: embedded
executable templates, source ownership, generated mappings and operation
boundaries still require inspection. Include completed migrations as well as
remaining operations. S07 records existing bounded migration evidence; its
feature/tasklet counts cannot substitute for the outcome decomposition.

Before activating the successor baseline:

1. Finish the operation inventory across the entire approved language scope.
2. Review every rolling candidate for further meaningful subdivision, missing
   scope, overlap and explicit prerequisite edges.
3. Map each candidate to requirements and acceptance conditions, including
   specific Arc Steps where the whole Arc is not the demonstration unit.
4. Assess available proof against each criterion and relevant input manifest;
   obtain native or application proof where lower-level proof is insufficient.
5. Append canonical obligations, the successor baseline and accepted evidence
   through the existing history contract. Preserve previous broad gates and
   report delivery counts separately from final acceptance.

Until that inventory is complete and activated, the work percentage remains
unassessed. A partial inventory must not silently become the denominator.
