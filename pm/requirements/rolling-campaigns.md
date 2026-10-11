<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rolling campaigns

[Requirements index](index.md) | [Implementation plan](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/plan.md)

Approval: stakeholder implementation goal and preceding clarified workflow,
2026-10-10. This explicitly changes campaign scheduling, worker retention,
publication cadence and fast-rebase policy for the new rolling mode. Historical
records/readers retain their physical meanings; no live campaign auto-migration.

## REQ-ROLLING-CONFIGURATION: Persist the campaign's execution configuration

**Atomic obligations:** [OBL-22](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-22), [OBL-23](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-23), [OBL-24](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-24), [OBL-36](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-36), [OBL-37](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-37). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Resolve mainline at planning from user request, project default, then effective
Git `init.defaultBranch`; validate refs and persist remote/branch selection.
Resolve active N with default 10 and publication M with campaign/project/global
precedence and global default 1. Validate positive safe integers. Validate one
physical managed-worktree directory across checkouts, accepting absolute or
explicitly anchored relative configuration. Numbers start at 101.

## REQ-ROLLING-GRAPH: Coordinator-authoritative dependencies

**Atomic obligations:** [OBL-25](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-25), [OBL-26](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-26), [OBL-27](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-27), [OBL-35](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-35), [OBL-56](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

The coordinator's accepted files exclusively own obligations and dependency
edges. Assignments identify that snapshot. Reconcile discoveries and relevant
incoming changes, detect cycles, reject stale allocation inputs and invalidate
affected evidence truthfully. Worker copies cannot change scheduling authority.
Keep any database graph projection derived and disposable. Assignment references
include requirements, acceptances, implementation files and unit/integration
Arc/Step identities and selectors where applicable.

## REQ-ROLLING-SCHEDULING: Resume-first maximal compatible allocation

**Atomic obligations:** [OBL-28](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-28), [OBL-29](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-29), [OBL-30](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-30), [OBL-31](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-31), [OBL-34](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-34), [OBL-46](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46), [OBL-47](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47), [OBL-63](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Algorithmically select a deterministic maximal compatible ready set up to N.
Prefer unblocked inactive sessions before new workers. Acknowledged suspension
releases active capacity while retaining exclusive checkout/obligation ownership.
Release plus subsequent allocation is atomic; absence of ready work does not
undo release. Unknown readiness/compatibility cannot be treated as success.

## REQ-ROLLING-STATE: Durable operational coordination

**Atomic obligations:** [OBL-31](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-31), [OBL-32](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-32), [OBL-33](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-33), [OBL-34](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-34), [OBL-35](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-35), [OBL-44](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-44), [OBL-46](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46), [OBL-47](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47), [OBL-48](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-48), [OBL-56](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56), [OBL-57](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-57), [OBL-58](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-58), [OBL-62](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-62), [OBL-63](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63), [OBL-64](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-64), [OBL-69](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-69). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

PostgreSQL exclusively owns rolling execution state, reservations, leases,
blockers, reviews, QA references, publication and external-action recovery.
Enforce ownership, stale-generation fencing and project scoping. Recover unknown
external outcomes idempotently. Query interfaces return executable next actions,
their exact identities, dependencies and reasons so the coordinator can dispatch
without reconstructing scheduling state. Files remain obligation authority.

## REQ-ROLLING-WORKERS: Ponytail-owned checkouts and direct sessions

**Atomic obligations:** [OBL-36](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-36), [OBL-37](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-37), [OBL-38](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-38), [OBL-39](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-39), [OBL-40](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-40), [OBL-41](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-41), [OBL-42](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-42), [OBL-43](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-43), [OBL-44](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-44), [OBL-45](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-45), [OBL-46](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-46), [OBL-47](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-47), [OBL-48](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-48), [OBL-57](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-57). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Create/setup ordinary Git worktrees in the configured pool; reuse the lowest
healthy available number with a fresh Codex session in that exact checkout.
Use direct Codex control without requiring a Ponytail plugin. Setup repairs and
verifies the session marker's ignore rule. Validate native attachment identity.
Retire a worker and its owned activity before release/reuse; inactive workers
retain their original session/checkout. Preserve valid caches and user work.

## REQ-ROLLING-REVIEW: Reviewed incremental integration

**Atomic obligations:** [OBL-49](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-49), [OBL-50](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-50), [OBL-51](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-51), [OBL-52](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-52), [OBL-53](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-53), [OBL-54](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-54), [OBL-55](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-55), [OBL-56](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-56). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Workers perform full semantic rebases and focused QA; adversarial review binds
the exact candidate and preserves reviewer identity through corrections. The
coordinator uses the explicitly authorized interactive fast rebase, inspecting
semantic conflicts when textual conflicts arise. Refresh required proof on
changed inputs, push normally, and verify remote outcomes. Delivery does not
by itself discharge obligations or establish mainline acceptance.

## REQ-ROLLING-PUBLICATION: Fully validated publication batches

**Atomic obligations:** [OBL-54](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-54), [OBL-55](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-55), [OBL-58](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-58), [OBL-59](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-59), [OBL-60](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-60), [OBL-61](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-61), [OBL-62](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-62). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Integrate each reviewed increment to the campaign branch after focused QA.
Publish to the configured mainline at M increments, explicit flush, final partial
completion or quiescence. Full applicable unit/integration/project QA precedes
publication on the exact mainline-reconciled candidate. Failures and stale proof
prevent publication. Preserve history and resolve upstream races without force
pushes. Daily delivery is an expected consequence, never an imposed constraint.

## REQ-ROLLING-INTERFACES: One operation model for CLI and MCP

**Atomic obligations:** [OBL-63](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-63), [OBL-64](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-64), [OBL-65](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-65), [OBL-66](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-66), [OBL-67](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-67), [OBL-68](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-68), [OBL-69](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-69). Their canonical conditions and discharge
criteria are owned by the referenced campaign obligation document. The prose
below explains their approved scope; it is not a substitute delivery unit.

Replace the obsolete campaign dispatcher. Organize CLI into chapters with root,
chapter and command usage describing arguments and behavior. Expose the same
coordination operations through MCP without duplicate policy or scheduling.
Keep historical inspection available and make live migration explicit.

Execution binding amendment contribution: [OBL-107](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-107), owned by REQ-ROLLING-GRAPH. Canonical conditions and criteria remain in the obligation document.
