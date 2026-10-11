<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Atomic delivery decomposition

[Plan and atomicity criterion](plan.md#work-metric) | [Execution contract](design.md)

## Assessment boundary

The canonical obligation document owns the 48 known rolling delivery conditions
and their discharge criteria as OBL-22 through OBL-69. This page references them
and records the inspected evidence boundaries; it does not duplicate conditions
or award discharge. Requirement and acceptance pages reference the same IDs.
Broad historical gates remain final acceptance rollups. The successor baseline
registers known scope while all completeness inventories remain unresolved.

Execution bindings currently authorize inspection only. Before assignment, record
exact prerequisite edges, paths and operations through explicit successors of
those bindings; do not interpret an empty dependency list as a completed review
of dependencies or permission for unrestricted implementation. Remaining language
outcomes must also be registered before their work is assigned.

The [binding-revision prerequisite](design.md#stable-identities-and-revised-execution-bindings)
records the observed V1 immutability constraint and the shared amendment contract.
Implement that contract before promoting an inspected outcome to an edit lease;
do not create duplicate obligation IDs merely to change assignment permissions.

The evidence column identifies a real executable boundary, not a claim that all
required evidence is adequate or fresh. `Available` means the cited proof was
inspected and passed in the typed test family on 2026-10-10 at revision
`4b67352`. That run passed 75 tests with no failures or skips. `Required` means
the named product workflow still needs implementation or adequate proof.
Protocol proof does not establish a live worker's lifecycle. Database proof
does not establish filesystem cessation. CERT-7 now assesses OBL-22–40 against
their complete component criteria, through the current 14-test typed unit,
real PostgreSQL and Git worktree selection. See the
[per-obligation observations and output](evidence/rolling-core-assessment.md).
The `Available` entries below retain the earlier inspection boundary; current
satisfaction comes from the canonical ledger freshness projection. CERT-9
assesses OBL-41–43 through five typed protocol tests and a current live native
start/resume workflow. See the
[native transport observations and output](evidence/native-transport-assessment.md).
OBL-44–69 remain uncertified and require their declared application proof.

## Rolling outcomes

Each obligation's canonical record names its outcome and discharge criterion.
The following table identifies the associated proof boundary.
Failure cases belong to the outcome they constrain; they are not extra units
merely because separate tests can exercise them.

| Canonical obligation | Evidence boundary | Assessment |
| --- | --- | --- |
| <a id="obl-22"></a>[OBL-22](obligations.json) | `tests/rolling-campaign.test.ts`; configuration Git Arc | Available |
| <a id="obl-23"></a>[OBL-23](obligations.json) | `tests/rolling-campaign.test.ts` | Available |
| <a id="obl-24"></a>[OBL-24](obligations.json) | `tests/rolling-campaign.test.ts`; configuration Git Arc | Available |
| <a id="obl-25"></a>[OBL-25](obligations.json) | `tests/rolling-campaign.integration.test.ts` | Available |
| <a id="obl-26"></a>[OBL-26](obligations.json) | `tests/rolling-campaign.integration.test.ts` | Available |
| <a id="obl-27"></a>[OBL-27](obligations.json) | `tests/rolling-campaign.test.ts` | Available |
| <a id="obl-28"></a>[OBL-28](obligations.json) | `tests/rolling-campaign.test.ts` | Available |
| <a id="obl-29"></a>[OBL-29](obligations.json) | `tests/rolling-campaign.test.ts`; PostgreSQL Arc | Available |
| <a id="obl-30"></a>[OBL-30](obligations.json) | `tests/rolling-campaign.test.ts` | Available |
| <a id="obl-31"></a>[OBL-31](obligations.json) | `tests/rolling-campaign-store.integration.test.ts` | Available |
| <a id="obl-32"></a>[OBL-32](obligations.json) | PostgreSQL Arc | Available |
| <a id="obl-33"></a>[OBL-33](obligations.json) | PostgreSQL Arc | Available |
| <a id="obl-34"></a>[OBL-34](obligations.json) | PostgreSQL Arc | Available |
| <a id="obl-35"></a>[OBL-35](obligations.json) | PostgreSQL Arc | Available |
| <a id="obl-36"></a>[OBL-36](obligations.json) | `tests/rolling-worktrees.integration.test.ts`; physical-path unit proof | Available |
| <a id="obl-37"></a>[OBL-37](obligations.json) | Git worktree Arc | Available |
| <a id="obl-38"></a>[OBL-38](obligations.json) | Git worktree Arc | Available |
| <a id="obl-39"></a>[OBL-39](obligations.json) | Git worktree Arc | Available |
| <a id="obl-40"></a>[OBL-40](obligations.json) | Git worktree Arc | Available |
| <a id="obl-41"></a>[OBL-41](obligations.json) | `tests/rolling-codex.test.ts`; `tests/rolling-codex.integration.ts` | Assessed by CERT-9; consult current freshness |
| <a id="obl-42"></a>[OBL-42](obligations.json) | `tests/rolling-codex.test.ts` | Assessed by CERT-9; consult current freshness |
| <a id="obl-43"></a>[OBL-43](obligations.json) | `tests/rolling-codex.test.ts` | Assessed by CERT-9; consult current freshness |
| <a id="obl-44"></a>[OBL-44](obligations.json) | Application provisioning Arc | Required |
| <a id="obl-45"></a>[OBL-45](obligations.json) | Application worker-start Arc | Required |
| <a id="obl-46"></a>[OBL-46](obligations.json) | Application suspension Arc with activity evidence | Required |
| <a id="obl-47"></a>[OBL-47](obligations.json) | Application resumption Arc | Required |
| <a id="obl-48"></a>[OBL-48](obligations.json) | Restart/recovery Arc | Required |
| <a id="obl-49"></a>[OBL-49](obligations.json) | Worker submission Git Arc | Required |
| <a id="obl-50"></a>[OBL-50](obligations.json) | Review operation Arc | Required |
| <a id="obl-51"></a>[OBL-51](obligations.json) | Review/rework Arc | Required |
| <a id="obl-52"></a>[OBL-52](obligations.json) | Review recovery Arc | Required |
| <a id="obl-53"></a>[OBL-53](obligations.json) | Increment integration Git Arc | Required |
| <a id="obl-54"></a>[OBL-54](obligations.json) | Increment push Git Arc | Required |
| <a id="obl-55"></a>[OBL-55](obligations.json) | Increment push recovery Arc | Required |
| <a id="obl-56"></a>[OBL-56](obligations.json) | Integrated certificate operation Arc | Required |
| <a id="obl-57"></a>[OBL-57](obligations.json) | Retirement activity/filesystem Arc | Required |
| <a id="obl-58"></a>[OBL-58](obligations.json) | Publication threshold Arc | Required |
| <a id="obl-59"></a>[OBL-59](obligations.json) | Partial publication Arc | Required |
| <a id="obl-60"></a>[OBL-60](obligations.json) | Publication reconciliation Git Arc | Required |
| <a id="obl-61"></a>[OBL-61](obligations.json) | Publication QA gate Arc | Required |
| <a id="obl-62"></a>[OBL-62](obligations.json) | Publication recovery Git Arc | Required |
| <a id="obl-63"></a>[OBL-63](obligations.json) | Coordinator recovery/replenishment Arc | Required |
| <a id="obl-64"></a>[OBL-64](obligations.json) | Application status/next-actions Arc | Required |
| <a id="obl-65"></a>[OBL-65](obligations.json) | CLI operation Arc | Required |
| <a id="obl-66"></a>[OBL-66](obligations.json) | CLI help contract proof | Required |
| <a id="obl-67"></a>[OBL-67](obligations.json) | CLI replacement/migration Arc | Required |
| <a id="obl-68"></a>[OBL-68](obligations.json) | CLI/MCP operation parity Arc | Required |
| <a id="obl-69"></a>[OBL-69](obligations.json) | Campaign closure Arc | Required |

Configuration Git Arc: `tests/rolling-campaign.integration.test.ts`.
PostgreSQL Arc: `tests/rolling-campaign-store.integration.test.ts`.
Git worktree Arc: `tests/rolling-worktrees.integration.test.ts`.
Physical-path unit proof: `tests/rolling-worktrees.test.ts`.
These boundaries can demonstrate several conditions through identified assertions;
the number of test functions does not determine obligation atomicity.

## Known language foundation obligations

These canonical engineering conditions are independently assessable. They do
not certify any remaining handwritten operation or complete the language inventory.

| Canonical obligation | Evidence boundary | Assessment |
| --- | --- | --- |
| <a id="obl-70"></a>[OBL-70](obligations.json) | Configured strict root build and compiler configuration review | CERT-10: complete coverage and bypass inspection; consult current freshness |
| <a id="obl-71"></a>[OBL-71](obligations.json) | Configured unchanged TSTS and directory coverage review | CERT-10: complete two-program coverage and unchanged checker; consult current freshness |
| <a id="obl-72"></a>[OBL-72](obligations.json) | Root build, runtime materialization check and emitted-runtime proofs | Runtime evidence available; assess complete inputs |

The [foundation assessment](evidence/static-foundation-assessment.md) covers all
80 currently owned TypeScript source/test paths (63 Ponytail and 17 existing
TSTS). It does not establish completion of the remaining handwritten executable
language migration. OBL-72 remains unresolved because the current materializer
does not establish checked ownership of every retained runtime entrypoint.

## Registered language operation migrations

| Canonical obligation | Evidence boundary | Assessment |
| --- | --- | --- |
| <a id="obl-73"></a>[OBL-73](obligations.json) | Typed inventory formatter and existing census CLI proof | Certificate CERT-4 renews prior proof; see canonical ledger freshness projection |
| <a id="obl-74"></a>[OBL-74](obligations.json) | Typed campaign listing and existing census CLI proof | Certificate CERT-4; see canonical ledger freshness projection |
| <a id="obl-75"></a>[OBL-75](obligations.json) | Typed activation move/link/rollback proof and census CLI | Certificate CERT-4; see canonical ledger freshness projection |
| <a id="obl-76"></a>[OBL-76](obligations.json) | Typed invocation parser and census CLI/format proof | Certificate CERT-4; see canonical ledger freshness projection |

## Remaining decomposition before baseline activation

The 48 registered rolling delivery obligations and three language foundation
obligations are not the campaign-wide denominator. The full
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

The [current source inventory](language-inventory.md) explicitly partitions
the tracked executable paths into canonical owners, generated adjacent runtimes,
OpenClaw resources and the existing TSTS subtree. It also identifies extensionless
launchers, embedded Python/shell/Node programs, host launch fragments and
benchmark handler/subject distinctions. This replaces the stale 188-candidate
inspection count. It is not an obligation denominator: operation boundaries,
class methods and template consumers still require canonical reconciliation.
Its [inspected core operation boundaries](language-inventory.md#inspected-core-operation-boundaries)
distinguish physical readers, selection, discovery, dependency validation and
queue lifecycle outcomes from their supporting declarations and wrappers.
These candidates need canonical registration and evidence assessment; they are
not an additional completion count.
Include completed migrations as well as remaining operations. S07 records
existing bounded migration evidence; its feature/tasklet counts cannot
substitute for the outcome decomposition.

Before activating implementation assignments or a completion denominator:

1. Finish the operation inventory across the entire approved language scope.
2. Review every registered rolling obligation for further meaningful subdivision, missing
   scope, overlap and explicit prerequisite edges.
3. Reconcile every obligation to requirements and acceptance conditions, including
   specific Arc Steps where the whole Arc is not the demonstration unit.
4. Assess available proof against each criterion and relevant input manifest;
   obtain native or application proof where lower-level proof is insufficient.
5. Append newly discovered obligations, successor baselines and accepted evidence
   through the existing history contract. Preserve previous broad gates and
   report delivery counts separately from final acceptance.

Until that inventory is complete and activated, the work percentage remains
unassessed. A partial inventory must not silently become the denominator.

## Registered portable language outcomes

BASELINE-8 registers the inspected portable outcomes without awarding discharge.
All bindings permit inspection only; empty prerequisite lists are unresolved
execution planning, not proof of independence. Canonical conditions and criteria
remain in the ledger. The complete delivery denominator remains open.

CERT-5 renews OBL-73–76 after the registration changed their conservative
requirement inputs. Earlier certificates remain historical; use the ledger's
freshness projection for current satisfaction. The new outcomes below have
existing typed implementations, but require complete static fixture migration
and evidence assessment before discharge. They represent work in progress,
not 30 completed deliveries.

| Obligation | Inspected implementation boundary | Assessment |
| --- | --- | --- |
| <a id="obl-77"></a>[OBL-77](obligations.json) | skills/plan-execution/scripts/obligations.ts | Unassessed; inspection only |
| <a id="obl-78"></a>[OBL-78](obligations.json) | skills/plan-execution/scripts/obligations.ts | Unassessed; inspection only |
| <a id="obl-79"></a>[OBL-79](obligations.json) | skills/plan-execution/scripts/obligations.ts | Unassessed; inspection only |
| <a id="obl-80"></a>[OBL-80](obligations.json) | skills/plan-execution/scripts/obligations.ts | Unassessed; inspection only |
| <a id="obl-81"></a>[OBL-81](obligations.json) | skills/plan-execution/scripts/obligations.ts | Unassessed; inspection only |
| <a id="obl-82"></a>[OBL-82](obligations.json) | skills/plan-execution/scripts/obligations.ts | Unassessed; inspection only |
| <a id="obl-83"></a>[OBL-83](obligations.json) | skills/plan-execution/scripts/sprint-metadata.ts | Unassessed; inspection only |
| <a id="obl-84"></a>[OBL-84](obligations.json) | skills/plan-execution/scripts/sprint-metadata.ts | Unassessed; inspection only |
| <a id="obl-85"></a>[OBL-85](obligations.json) | skills/plan-execution/scripts/sprint-metadata.ts | Unassessed; inspection only |
| <a id="obl-86"></a>[OBL-86](obligations.json) | skills/plan-execution/scripts/sprint-metadata.ts | Unassessed; inspection only |
| <a id="obl-87"></a>[OBL-87](obligations.json) | skills/plan-execution/scripts/sprint-graph.ts | Unassessed; inspection only |
| <a id="obl-88"></a>[OBL-88](obligations.json) | skills/plan-execution/scripts/sprint-graph.ts | Unassessed; inspection only |
| <a id="obl-89"></a>[OBL-89](obligations.json) | skills/plan-execution/scripts/sprint-graph.ts | Unassessed; inspection only |
| <a id="obl-90"></a>[OBL-90](obligations.json) | skills/plan-execution/scripts/ready-sprints.ts | Unassessed; inspection only |
| <a id="obl-91"></a>[OBL-91](obligations.json) | skills/plan-execution/scripts/ready-sprints.ts | Unassessed; inspection only |
| <a id="obl-92"></a>[OBL-92](obligations.json) | skills/plan-execution/scripts/ready-sprints.ts | Unassessed; inspection only |
| <a id="obl-93"></a>[OBL-93](obligations.json) | skills/plan-execution/scripts/ready-sprints.ts | Unassessed; inspection only |
| <a id="obl-94"></a>[OBL-94](obligations.json) | skills/plan-execution/scripts/ready-sprints.ts | Unassessed; inspection only |
| <a id="obl-95"></a>[OBL-95](obligations.json) | skills/plan-execution/scripts/ready-sprints.ts | Unassessed; inspection only |
| <a id="obl-96"></a>[OBL-96](obligations.json) | skills/plan-execution/scripts/tasklet-metadata.ts | Unassessed; inspection only |
| <a id="obl-97"></a>[OBL-97](obligations.json) | skills/plan-execution/scripts/tasklet-metadata.ts | Unassessed; inspection only |
| <a id="obl-98"></a>[OBL-98](obligations.json) | skills/plan-execution/scripts/tasklet-metadata.ts | Unassessed; inspection only |
| <a id="obl-99"></a>[OBL-99](obligations.json) | skills/plan-execution/scripts/tasklet-metadata.ts | Unassessed; inspection only |
| <a id="obl-100"></a>[OBL-100](obligations.json) | skills/plan-execution/scripts/tasklet-metadata.ts | Unassessed; inspection only |
| <a id="obl-101"></a>[OBL-101](obligations.json) | skills/plan-execution/scripts/tasklet-statuses.ts | CERT-6: existing typed parser and direct fixtures assessed with focused parser/CLI proof; use ledger freshness projection |
| <a id="obl-102"></a>[OBL-102](obligations.json) | skills/plan-execution/scripts/tasklet-graph.ts | Unassessed; inspection only |
| <a id="obl-103"></a>[OBL-103](obligations.json) | skills/plan-execution/scripts/tasklet-graph.ts | Unassessed; inspection only |
| <a id="obl-104"></a>[OBL-104](obligations.json) | skills/plan-execution/scripts/tasklet-graph.ts | Unassessed; inspection only |
| <a id="obl-105"></a>[OBL-105](obligations.json) | skills/plan-execution/scripts/ready-tasklets.ts | Unassessed; inspection only |
| <a id="obl-106"></a>[OBL-106](obligations.json) | skills/plan-execution/scripts/ready-tasklets.ts | Unassessed; inspection only |

## Binding amendment component

<a id="obl-107"></a>[OBL-107](obligations.json) owns the bounded binding-history component outcome. Its exact paths and operations are frozen in BASELINE-9 before source edits. Application selector, lease and acceptance integration remain required under the existing rolling outcomes; this component does not certify them.

CERT-11 assesses the typed reader/amendment/projection component with six typed
cases and seventeen historical V1 compatibility regressions. See the
[component proof](evidence/binding-history-component.md). The independent
physical binding-history V1 contract retains original obligation-document V1
meanings; no current assignment permission is silently expanded.

CERT-12 [renews the same 29 prior deliveries](evidence/binding-amendment-renewal.md)
after the required source/configuration and baseline changes. Current compiler
coverage is 82 canonical TypeScript paths (65 Ponytail, 17 existing TSTS).
Earlier inspection tables and certificates are historical; use the canonical
ledger's freshness projection for current satisfaction. Shared selector,
frozen lease and acceptance integration must precede typed fixture edit leases.

## Shared binding-aware query prerequisite

<a id="obl-108"></a>[OBL-108](obligations.json) owns shared current-binding query projection. BASELINE-10 freezes its paths before edits. Move the generic history owner into the portable skill resources so copied skills are self-contained; retain its identity and physical meaning. This query-only outcome does not authorize amended live leases or candidate acceptance.

## Frozen lease contract prerequisite

<a id="obl-109"></a>[OBL-109](obligations.json) owns portable lease issuance and operation enforcement as one independently verifiable contract boundary. BASELINE-11 freezes its paths before edits. This component is needed to finish the started fixture migrations; it does not substitute for live database allocation, worker delivery or candidate acceptance integration.

## Stored lease integration prerequisite

<a id="obl-110"></a>[OBL-110](obligations.json) owns PostgreSQL allocation and retained-owner adoption of frozen leases. BASELINE-12 freezes its paths before edits. Store only campaign execution configuration and frozen assignment state; coordinator files remain the authoritative graph. Preserve V1 physical readers and introduce V2 only for explicitly adopted binding-aware campaigns. Application worker delivery and candidate acceptance remain necessary integration work.

OBL-110 scope amendment BIND-1 includes `scripts/project-index.sql` after the real PostgreSQL check proved the existing version constraints reject V2. The coordinator history is explicitly `binding-history.json`; its validated current projection owns this amended boundary while the historical obligation record is unchanged. The coordinator performs this bounded in-scope repair; no worker assignment through the unfinished application workflow is issued.

## Frozen worker submission prerequisite

<a id="obl-111"></a>[OBL-111](obligations.json) owns candidate submission against a stored frozen lease. BASELINE-13 freezes the source, SQL and focused proof boundary before edits. This is necessary to finish the already-started typed proof migrations through the amended execution workflow. The submission stores the exact candidate, stopped session, frozen lease and evidence; review, publication and certificate acceptance remain separate required outcomes.

Final OBL-111 audit invalidated CERT-17 in CHECKPOINT-33 after finding the new artifacts absent from explicit traceability configuration. BIND-2 adds `.agents/config/project/traceability.json` to the same obligation scope before its bounded coordinator repair. Original obligation and certificate records remain immutable; completion requires corrected classification, generated mapping/view and fresh reassessment.

OBL-111 BIND-3 additionally freezes the two existing generated OpenClaw obligation source/runtime copies. The canonical generator synchronizes them after the evidence-reader source rename; this remains part of the same withdrawn-assessment repair, before fresh reassessment.
