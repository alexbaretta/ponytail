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

Resolve mainline at planning from user request, project default, then effective
Git `init.defaultBranch`; validate refs and persist remote/branch selection.
Resolve active N with default 10 and publication M with campaign/project/global
precedence and global default 1. Validate positive safe integers. Validate one
physical managed-worktree directory across checkouts, accepting absolute or
explicitly anchored relative configuration. Numbers start at 101.

## REQ-ROLLING-GRAPH: Coordinator-authoritative dependencies

The coordinator's accepted files exclusively own obligations and dependency
edges. Assignments identify that snapshot. Reconcile discoveries and relevant
incoming changes, detect cycles, reject stale allocation inputs and invalidate
affected evidence truthfully. Worker copies cannot change scheduling authority.
Keep any database graph projection derived and disposable. Assignment references
include requirements, acceptances, implementation files and unit/integration
Arc/Step identities and selectors where applicable.

## REQ-ROLLING-SCHEDULING: Resume-first maximal compatible allocation

Algorithmically select a deterministic maximal compatible ready set up to N.
Prefer unblocked inactive sessions before new workers. Acknowledged suspension
releases active capacity while retaining exclusive checkout/obligation ownership.
Release plus subsequent allocation is atomic; absence of ready work does not
undo release. Unknown readiness/compatibility cannot be treated as success.

## REQ-ROLLING-STATE: Durable operational coordination

PostgreSQL exclusively owns rolling execution state, reservations, leases,
blockers, reviews, QA references, publication and external-action recovery.
Enforce ownership, stale-generation fencing and project scoping. Recover unknown
external outcomes idempotently. Query interfaces return executable next actions,
their exact identities, dependencies and reasons so the coordinator can dispatch
without reconstructing scheduling state. Files remain obligation authority.

## REQ-ROLLING-WORKERS: Ponytail-owned checkouts and direct sessions

Create/setup ordinary Git worktrees in the configured pool; reuse the lowest
healthy available number with a fresh Codex session in that exact checkout.
Use direct Codex control without requiring a Ponytail plugin. Setup repairs and
verifies the session marker's ignore rule. Validate native attachment identity.
Retire a worker and its owned activity before release/reuse; inactive workers
retain their original session/checkout. Preserve valid caches and user work.

## REQ-ROLLING-REVIEW: Reviewed incremental integration

Workers perform full semantic rebases and focused QA; adversarial review binds
the exact candidate and preserves reviewer identity through corrections. The
coordinator uses the explicitly authorized interactive fast rebase, inspecting
semantic conflicts when textual conflicts arise. Refresh required proof on
changed inputs, push normally, and verify remote outcomes. Delivery does not
by itself discharge obligations or establish mainline acceptance.

## REQ-ROLLING-PUBLICATION: Fully validated publication batches

Integrate each reviewed increment to the campaign branch after focused QA.
Publish to the configured mainline at M increments, explicit flush, final partial
completion or quiescence. Full applicable unit/integration/project QA precedes
publication on the exact mainline-reconciled candidate. Failures and stale proof
prevent publication. Preserve history and resolve upstream races without force
pushes. Daily delivery is an expected consequence, never an imposed constraint.

## REQ-ROLLING-INTERFACES: One operation model for CLI and MCP

Replace the obsolete campaign dispatcher. Organize CLI into chapters with root,
chapter and command usage describing arguments and behavior. Expose the same
coordination operations through MCP without duplicate policy or scheduling.
Keep historical inspection available and make live migration explicit.
