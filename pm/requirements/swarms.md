<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Swarms

[Requirements index](index.md) · [Acceptance Suite](../uat/swarms.md) ·
[Implementation plan](../plans/open/2026-10-13-swarm-management/plan.md)

**Approval:** Stakeholder definition and command requirements, 2026-10-13.
Approved behavior; implementation and acceptance are pending.

## Concepts

A **swarm** is a set of worker sessions, a set of managed worktrees, and zero
or one coordinator session, owned by one **user worktree**. Either set may be
empty. A swarm is an execution-resource ownership boundary; a campaign is a
planning and delivery scope. They are distinct identities. Finishing or changing
a campaign does not itself delete a swarm's sessions or worktrees.

A **user worktree** is a user-owned checkout that owns a swarm, including the
main checkout when used in that role. A **managed worktree** is an agent checkout
assigned to a user worktree's swarm. The stakeholder's example user checkouts
are those under `~/git/gwen.vc/gwen-worktrees/`; their managed worker checkouts
are separate resources. A checkout's Git linkage or location under the same
repository does not make it the owner of another user checkout's swarm.
The configured managed-worktree folder is the blessed physical pool location;
it is distinct from selecting a blessed user checkout for project discovery.

A **swarm worker number** is an ephemeral, one-indexed incremental identifier
for a worker in the current swarm. It is not a managed-worktree number, native
session ID, obligation ID, plan ID, or campaign ID.

This document owns the atomic conditions and discharge criteria below. Plans,
assignments and acceptances reference these IDs without redefining them.
The shared [glossary](../../skills/plan-execution/references/glossary.md) remains
the vocabulary and atomicity contract; its swarm entries must link here when
the exported rules and skills adopt this feature.

## REQ-SWARM-OWNERSHIP: Owner identity and isolation

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| SW-01 | Swarm ownership resolves to one user worktree. Invocation from that user worktree selects its swarm; invocation from an assigned managed worktree selects its recorded owner's swarm. Different user worktrees of one Git repository have distinct ownership. | The same swarm is selected from an owner and its managed checkout, while another user checkout selects its own swarm. Physical path identity is checked; missing, ambiguous or inconsistent managed ownership produces an actionable diagnostic rather than guessed membership. |
| SW-02 | At most one coordinator session is bound to a user worktree's swarm. Worker membership survives coordinator loss, including loss caused by host errors. Binding or unbinding a coordinator does not silently discard workers or transfer their ownership. | Concurrent conflicting coordinator binds cannot both succeed; an orphaned swarm still reports its workers and worktrees and can undergo explicit recovery. |

Workers normally enter a swarm through its coordinator. A missing coordinator
is an observable recovery state, not proof that its surviving workers have
stopped. A successor coordinator must bind explicitly before dispatching work.

## REQ-SWARM-INFO: Inspect the invoking swarm

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| SW-03 | `ponytail swarm info` reports the selected owner, coordinator binding or its absence, every currently bound worker and managed worktree, their associations and assignment identities, and other recorded swarm resources relevant to coordination. An empty swarm is a successful empty inventory. Inspection is read-only and scoped to that owner. | Real CLI output matches the authoritative inventory from both owner and managed checkout, including empty and orphaned cases, without changing state or exposing another swarm's resources. |
| SW-04 | Inspection distinguishes durable membership and assignment state from native execution activity. It reports available host observations and unresolved, missing or inconsistent resources explicitly. A stored working assignment, session marker or private controller alone cannot establish Desktop-visible activity. | An assigned idle worker, an executing worker, an unavailable native observation and a missing physical checkout remain distinguishable; no unknown observation becomes a false active or idle claim. |

Human-readable output must make session IDs, names, worktree paths and assignment
associations usable for parallelization diagnosis. Machine-readable output must
provide the same facts through an explicit versioned contract. Sessions removed
from membership are not listed as currently assigned; retained provenance remains
available to enforce their original-owner restriction.

## REQ-SWARM-SESSIONS: Membership, quiescence and names

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| SW-05 | Worker binding records the native session ID, swarm worker number, original user-worktree owner, designated checkout and assignment. A session must never be bound to a different user worktree, even after removal from its original swarm. | Binding a permitted original session succeeds; conflicting membership and cross-owner rebinding fail without changing either swarm. |
| SW-06 | Removing a worker cancels its assigned work, drives it to confirmed quiescence, fences the old assignment and relinquishes membership without deleting or archiving the session. Failure to establish cessation retains ownership and reports the incomplete transition. | A real executing worker stops before its binding and lease are released; retries after interruption preserve the same transition, and the native session remains available. |
| SW-07 | Where the native host supports reattachment, an explicitly removed session may rejoin its original user-worktree swarm. It must retain its native identity and original checkout association. Unsupported reattachment is reported as unsupported, not replaced by a newly created session or a cross-owner move. | Native capability evidence and an original-session remove/reattach Arc prove support, or a specific unsupported result preserves the removed session. |
| SW-08 | Each bound worker is named `W<nn> S<mm> <three word summary>` for a sprint assignment or `W<nn> P<mm> <three word summary>` for a plan assignment. W is its current swarm worker number; S/P is a shortened assignment identifier with an unambiguous mapping to the full plan/sprint ID. | Native names conform, distinguish workers in the current swarm, and resolve to the reported assignment; rebinding or assignment changes do not lose full identity. |
| SW-09 | On a worker session's final completion, the coordinator prepends `DONE ` to its name. Naming completion does not itself discharge an obligation, release a lease, archive a session or delete a worktree. | The completed original session is named `DONE W<nn> S<mm> <three word summary>` or `DONE W<nn> P<mm> <three word summary>`, while durable acceptance and ownership remain truthful. |

## REQ-SWARM-WORKTREES: Transferable managed resources

The transferable resources in the stakeholder's lifecycle description are
managed worktrees. User worktrees own swarms; managed worktrees may enter, leave
and move between swarms. Session origin is permanent, while managed-worktree
membership is exclusive but transferable. A worktree cannot transfer while a
worker still owns or can write it. Reusing a checkout cannot change an old
session's original owner or redirect that session into another swarm.

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| SW-10 | Worktree assignment selects an available safe managed checkout, creating and setting up one in the configured physical pool if none is available. An explicit existing-only restriction continues to prohibit creation. No checkout belongs to two swarms concurrently. | Assignment returns one usable, exclusively owned checkout; competing claims cannot both succeed; creation uses project setup and existing-only failure creates nothing. |
| SW-11 | Worktree release removes swarm membership without deleting the checkout. Released checkouts may be reassigned to the same or another swarm of the same repository once prior session ownership and leases are relinquished. User worktrees are never allocated as worker checkouts. | Release preserves files and Git identity; subsequent same-owner and cross-owner assignment work, while a still-owned or actively written checkout cannot transfer. |
| SW-12 | Explicit deletion of a selected unassigned managed worktree reclaims its checkout and configured project resources while preserving unrelated source and user worktrees. Assigned, active or ambiguously owned resources are refused. | The selected released checkout is deleted through the project lifecycle tooling; protected and unrelated resources remain intact and retries report actual completion. |
| SW-13 | Explicit deletion of all unassigned managed worktrees operates on the invoking project's managed inventory, identifies affected resources and reports individual outcomes, retaining incomplete cleanup for recovery. | Multiple eligible checkouts are reclaimed; assigned checkouts and user worktrees survive; partial failure is actionable and a retry completes only outstanding cleanup. |

## REQ-SWARM-CLEAR: Release the whole swarm

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| SW-14 | Clearing a swarm stops and unbinds all its workers, releases their assignments and leases, releases all its managed worktrees, and unbinds its coordinator. It preserves sessions and checkouts. It leaves the owner ready for a new coordinator and campaign without stale reservations. | After confirmed cessation, `swarm info` shows empty membership and no coordinator; sessions/checkouts still exist and a fresh campaign can allocate them. Partial failure retains unresolved ownership and can resume without pretending the swarm is clear. |

Clearing a swarm is distinct from the earlier destructive project campaign-reset
operation. It must not erase requirements, obligation definitions, accepted
deliveries, publication evidence, Git history or another user worktree's state.
Releasing resources also does not permit an old actor to publish or mutate them
under its former lease. Coordinator loss must not prevent explicit safe clearing.

## REQ-SWARM-CLI: Resource operations in the swarm chapter

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| SW-15 | The `ponytail swarm` chapter exposes info, worktree assignment/release, selected/all-unassigned worktree deletion, coordinator binding/unbinding, worker binding/unbinding, supported original-session reattachment, and clearing. The chapter and each command provide scoped help describing arguments, behavior and effects. | Real CLI help and valid/invalid invocations expose every required operation; resource mutations use the same canonical ownership and lifecycle logic as campaign execution. |

Campaign commands continue to own obligation graphs, scheduling and acceptance.
Session/worktree ownership operations currently embedded in campaign tooling move
to the swarm chapter, with campaign scheduling consuming those same operations.
Do not create a second independently maintained ownership registry or merely
rename campaign IDs to swarm IDs. Preserve historical records and explicitly
reconcile existing resources before exposing them as migrated membership.

These requirements supersede campaign-lifetime membership and mandatory
session archival assumptions only for the explicitly adopted swarm workflow.
Historical reader meanings remain unchanged. Native transport availability,
permission approvals and actual activity must remain observable rather than
being inferred from ownership records.
