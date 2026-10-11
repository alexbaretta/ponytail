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

The evidence column identifies a real executable boundary, not a claim that all
required evidence is adequate or fresh. `Available` means the cited proof was
inspected and passed in the typed test family on 2026-10-10 at revision
`4b67352`. That run passed 75 tests with no failures or skips. `Required` means
the named product workflow still needs implementation or adequate proof.
Protocol proof does not establish a live worker's lifecycle. Database proof
does not establish filesystem cessation. None of these rows is certified yet.

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
| <a id="obl-41"></a>[OBL-41](obligations.json) | `tests/rolling-codex.test.ts`; separate native smoke required | Protocol proof available; reassess live evidence |
| <a id="obl-42"></a>[OBL-42](obligations.json) | `tests/rolling-codex.test.ts` | Available |
| <a id="obl-43"></a>[OBL-43](obligations.json) | `tests/rolling-codex.test.ts` | Available |
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
| <a id="obl-70"></a>[OBL-70](obligations.json) | Configured strict root build and compiler configuration review | Build evidence available; assess complete inputs |
| <a id="obl-71"></a>[OBL-71](obligations.json) | Configured unchanged TSTS and directory coverage review | Checker evidence available; assess complete inputs |
| <a id="obl-72"></a>[OBL-72](obligations.json) | Root build, runtime materialization check and emitted-runtime proofs | Runtime evidence available; assess complete inputs |

## Registered language operation migrations

| Canonical obligation | Evidence boundary | Assessment |
| --- | --- | --- |
| <a id="obl-73"></a>[OBL-73](obligations.json) | Typed inventory formatter and existing census CLI proof | Certificate CERT-1; see canonical ledger freshness projection |

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

The source inventory currently identifies 188 canonical executable candidates
after excluding generated mirrors and the already typed TSTS subtree. This is
an inspection inventory, not 188 obligations or a completeness claim: embedded
executable templates, source ownership, generated mappings and operation
boundaries still require inspection. Include completed migrations as well as
remaining operations. S07 records existing bounded migration evidence; its
feature/tasklet counts cannot substitute for the outcome decomposition.

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
