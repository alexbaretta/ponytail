<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Swarms

[Requirements index](index.md) · [Acceptance Suite](../uat/swarms.md) ·
[Implementation plan](../plans/closed/2026-10-13-swarm-management/plan.md)

**Approval:** Stakeholder definition and command requirements, 2026-10-13.
Approved behavior; implementation and corrected-scope acceptance passed on 2026-10-14.

## Session-operation boundary

The CLI only manages session associations in the database and worktree resources.
It does not use Codex APIs to create, stop, rename, archive, delete, inspect or
otherwise operate sessions. The coordinator performs host session operations,
including establishing quiescence before detachment and applying the reported
worker names. References below to session cessation, native names or reattachment
are coordinator responsibilities, not CLI capabilities. Runtime activity is not
inferred from membership. This stakeholder clarification supersedes earlier
native-control interpretations and proof criteria.

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
| OBL-1 | Swarm ownership resolves to one user worktree. Invocation from that user worktree selects its swarm; invocation from an assigned managed worktree selects its recorded owner's swarm. Different user worktrees of one Git repository have distinct ownership. | The same swarm is selected from an owner and its managed checkout, while another user checkout selects its own swarm. Physical path identity is checked; missing, ambiguous or inconsistent managed ownership produces an actionable diagnostic rather than guessed membership. |
| OBL-2 | At most one coordinator session is bound to a user worktree's swarm. Worker membership survives coordinator loss, including loss caused by host errors. Binding or unbinding a coordinator does not silently discard workers or transfer their ownership. | Concurrent conflicting coordinator binds cannot both succeed; an orphaned swarm still reports its workers and worktrees and can undergo explicit recovery. |

Workers normally enter a swarm through its coordinator. A missing coordinator
is an observable recovery state, not proof that its surviving workers have
stopped. A successor coordinator must bind explicitly before dispatching work.

## REQ-SWARM-INFO: Inspect the invoking swarm

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| OBL-3 | `ponytail swarm info` reports the selected owner, coordinator binding or its absence, every currently bound worker and managed worktree, their associations and assignment identities, and other recorded swarm resources relevant to coordination. An empty swarm is a successful empty inventory. Inspection is read-only and scoped to that owner. | Real CLI output matches the authoritative inventory from both owner and managed checkout, including empty and orphaned cases, without changing state or exposing another swarm's resources. |
| OBL-4 | Inspection distinguishes recorded membership and assignment state from session execution activity. Runtime activity remains unobserved by the CLI; missing or inconsistent checkout resources are reported explicitly. The coordinator observes activity through host tools. | CLI output reports recorded bindings and missing checkouts without contacting Codex or inferring an active or idle session from its assignment or marker. |

Human-readable output must make session IDs, names, worktree paths and assignment
associations usable for parallelization diagnosis. Machine-readable output must
provide the same facts through an explicit versioned contract. Sessions removed
from membership are not listed as currently assigned; retained provenance remains
available to enforce their original-owner restriction.

## REQ-SWARM-SESSIONS: Membership, quiescence and names

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| OBL-5 | Worker binding records the native session ID, swarm worker number, original user-worktree owner, designated checkout and assignment. Before dispatch or binding, the host associates the worker thread with the exact non-null Codex project of the original coordinator session that the user created through the UI; a projectless thread is not an admissible worker. Worker project membership is inherited from that coordinator identity, not derived from a checkout path, repository identity, or project name. A session must never be bound to a different user worktree, even after removal from its original swarm. | The worker reports the same non-null Codex project association as the coordinator while executing in the designated checkout, then binding a permitted original session succeeds; missing or different project association, conflicting membership and cross-owner rebinding fail without changing either swarm. |
| OBL-6 | The coordinator cancels assigned work and establishes quiescence through host tools before removal. The CLI then fences the matching assignment and relinquishes membership without deleting or archiving the session. Conflicting checkout ownership or active Git operations refuse removal. | With the coordinator's quiescence precondition satisfied, CLI removal releases only the matching binding and lease; retries preserve session provenance, source and evidence. No session API is called. |
| OBL-7 | An explicitly removed session may be recorded again in its original user-worktree swarm and original checkout. Host resumption, where supported, is the coordinator's responsibility. Rebinding must retain the original session identity and cannot create a replacement or move it to another owner. | A remove/rebind Arc preserves the same session and checkout identity; cross-owner or cross-checkout rebinding fails. Bookkeeping neither resumes nor creates a session. |
| OBL-8 | Each bound worker is named `W<nn> S<mm> <three word summary>` for a sprint assignment or `W<nn> P<mm> <three word summary>` for a plan assignment. W is its current swarm worker number; S/P is a shortened assignment identifier with an unambiguous mapping to the full plan/sprint ID. | Native names conform, distinguish workers in the current swarm, and resolve to the reported assignment; rebinding or assignment changes do not lose full identity. |
| OBL-9 | On a worker session's final completion, the coordinator prepends `DONE ` to its name. Naming completion does not itself discharge an obligation, release a lease, archive a session or delete a worktree. | The completed original session is named `DONE W<nn> S<mm> <three word summary>` or `DONE W<nn> P<mm> <three word summary>`, while durable acceptance and ownership remain truthful. |

A bound campaign worker may be recorded inactive only after the coordinator
establishes host quiescence. It retains its session/checkout, frees scheduling
capacity and is preferred when unblocked. The supplied current lease generation
fences inactivity and retained resumption bookkeeping; renewing membership does
not itself resume or prove execution of the session.
An approved graph amendment may renew the inactive assignment's frozen lease
through `campaign renew-lease`. Renewal fences the prior generation, preserves
the original session and checkout, and leaves the worker inactive. The coordinator
uses host tools to resume it after replenishment selects the retained assignment.

Worker detachment fences the matching campaign assignment and outstanding
allocation actions in the same database transaction as removal. Submitted
evidence remains intact; releasing a lease does not discharge its obligation.
The coordinator establishes quiescence through host tools before invocation.

## REQ-SWARM-WORKTREES: Transferable managed resources

The transferable resources in the stakeholder's lifecycle description are
managed worktrees. User worktrees own swarms; managed worktrees may enter, leave
and move between swarms. Session origin is permanent, while managed-worktree
membership is exclusive but transferable. A worktree cannot transfer while a
worker still owns or can write it. Reusing a checkout cannot change an old
session's original owner or redirect that session into another swarm.

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| OBL-10 | Worktree assignment selects an available safe managed checkout, creating and setting up one in the configured physical pool if none is available. An explicit existing-only restriction continues to prohibit creation. No checkout belongs to two swarms concurrently. | Assignment returns one usable, exclusively owned checkout; competing claims cannot both succeed; creation uses project setup and existing-only failure creates nothing. |
| OBL-11 | Worktree release removes swarm membership without deleting the checkout. Released checkouts may be reassigned to the same or another swarm of the same repository once prior session ownership and leases are relinquished. User worktrees are never allocated as worker checkouts. | Release preserves files and Git identity; subsequent same-owner and cross-owner assignment work, while a still-owned or actively written checkout cannot transfer. |
| OBL-12 | Explicit deletion of a selected unassigned managed worktree reclaims its checkout and configured project resources while preserving unrelated source and user worktrees. Assigned, active or ambiguously owned resources are refused. | The selected released checkout is deleted through the project lifecycle tooling; protected and unrelated resources remain intact and retries report actual completion. |
| OBL-13 | Explicit deletion of all unassigned managed worktrees operates on the invoking project's managed inventory, identifies affected resources and reports individual outcomes, retaining incomplete cleanup for recovery. | Multiple eligible checkouts are reclaimed; assigned checkouts and user worktrees survive; partial failure is actionable and a retry completes only outstanding cleanup. |

## REQ-SWARM-CLEAR: Release the whole swarm

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| OBL-14 | After the coordinator establishes worker quiescence through host tools, clearing unbinds all workers, releases their assignments and leases, releases all managed-worktree associations, and unbinds the coordinator. It preserves sessions and checkouts and leaves the owner ready for a new coordinator and campaign without stale reservations. | With quiescence established, clear leaves empty owner membership and no coordinator while preserving session origins, checkouts and campaign evidence. Failed ownership or resource checks retain unresolved associations for retry. No session API is called. |

Clearing a swarm is distinct from the earlier destructive project campaign-reset
operation. It must not erase requirements, obligation definitions, accepted
deliveries, publication evidence, Git history or another user worktree's state.
Releasing resources also does not permit an old actor to publish or mutate them
under its former lease. Coordinator loss must not prevent explicit safe clearing.

## REQ-SWARM-CLI: Resource operations in the swarm chapter

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| OBL-15 | The `ponytail swarm` chapter exposes info, worktree assignment/release, selected/all-unassigned worktree deletion, coordinator binding/unbinding, worker binding/unbinding, supported original-session reattachment, and clearing. The chapter and each command provide scoped help describing arguments, behavior and effects. | Real CLI help and valid/invalid invocations expose every required operation; resource mutations use the same canonical ownership and lifecycle logic as campaign execution. |

Campaign commands continue to own obligation graphs, scheduling and acceptance.
The swarm tooling replaces earlier Ponytail session-management subcommands.
The CLI and optional MCP adapter expose session association bookkeeping through
the swarm chapter; neither operates sessions through Codex APIs. The coordinator
creates, dispatches, observes, resumes, cancels and names sessions through its
host tools. Do not retain old command aliases or parallel session-management
paths. Campaign scheduling consumes the same canonical swarm bookkeeping; its
graph, assignment and acceptance queries remain planning operations rather than
a second session inventory. `campaign next-actions` distinguishes coordinator
host actions from executable Ponytail commands and retains their exact assignment,
action and review identities. It must not recommend retired CLI commands.
Do not create a second independently maintained ownership registry or merely
rename campaign IDs to swarm IDs. Preserve historical records and explicitly
reconcile existing resources before exposing them as migrated membership.

These requirements supersede campaign-lifetime membership and mandatory
session archival assumptions only for the explicitly adopted swarm workflow.
Historical reader meanings remain unchanged. Native transport availability,
permission approvals and actual activity must remain observable rather than
being inferred from ownership records.

## REQ-SWARM-SKILL: Export the parallel execution procedure

**Approval:** Additional explicit stakeholder goal, 2026-10-13.

| Obligation | Required condition | Discharge criterion |
| --- | --- | --- |
| OBL-16 | A reusable skill teaches agents to use swarms and the implemented swarm tooling for parallel plan/campaign execution: owner resolution, one coordinator, dependency-ready completion-first scheduling up to configured N, original top-level worker sessions, truthful activity inspection, names, safe removal/reattachment, checkout release/transfer and clearing. Campaign obligations and publication gates retain their separate authority. | Canonical and generated/installed skill resources agree with actual chapter help and operations; an agent follows the procedure to inspect and run compatible workers concurrently, then quiesce and release resources without replacing sessions or deleting preserved work. |

The skill must explain that approval to execute a configured parallel plan
includes parallelization; another human instruction is unnecessary. Inspect
actual activity and blockers instead of equating reservations or membership
with execution. Teach the real native transport representation and uncertain-send
recovery; do not claim absent capabilities or invent unavailable commands.
