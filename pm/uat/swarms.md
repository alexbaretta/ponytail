<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Swarm acceptance Suite

[UAT index](index.md) · [Canonical requirements and obligations](../requirements/swarms.md)

Approved expected behavior; full native lifecycle Arcs remain unexecuted.
Focused automated evidence below is partial and does not establish release
acceptance or native lifecycle capability.
Use disposable checkouts and isolated rows in the existing project database
for automated lifecycle proof. Native session cessation and Desktop activity
also require evidence through their real owning transport.

## Arc SWARM-OWNERS: Select the owner and retain orphaned workers

Traceability: verifies REQ-SWARM-OWNERSHIP

**Acceptances:** ACC-SW-01 (OBL-1), ACC-SW-02 (OBL-2).
**Requirements:** REQ-SWARM-OWNERSHIP.
**Prerequisites:** Two user worktrees in one repository, one managed checkout
owned by the first, and bound worker/coordinator sessions.

1. Invoke swarm inspection from the first owner and its managed checkout.
   Both identify the first owner. From the second user checkout, it identifies
   the second owner's distinct swarm. Ambiguous membership fails explicitly.
2. Attempt simultaneous incompatible coordinator bindings to one swarm.
   At most one succeeds; the other cannot replace it.
3. Simulate coordinator loss. Worker/checkouts remain bound and visible, with
   coordinator unavailability distinguished from an explicitly empty binding.

**Partial evidence (2026-10-13):** Step 1's physical owner/managed selection,
sibling isolation and read-only CLI behavior pass in
`tests/swarm-info.integration.test.ts`. Step 2's storage race and stale-unbind
protection pass in `tests/swarm-store.integration.test.ts`; another owner's
coordinator remains independent. Explicit coordinator unbinding preserves
legacy worker records, but native coordinator loss/observation and membership
adoption in step 3 remain pending. ACC-SW-01 and ACC-SW-02 are not yet accepted.

**Coordinator adapter evidence:** Controlled native protocol observation checks
session and checkout identity before binding without acquiring a writer.
The installed bind CLI with a controlled native executable resolves managed
invocation to its owner and records distinct native thread/session identities.
The installed `coordinator-unbind` command rejects stale session IDs and
preserves workers; V2 inventory reports bound, unbound and unrecorded states
distinctly. Full live native binding and coordinator-loss acceptance remain
pending.

## Arc SWARM-INFO: Diagnose membership and execution

Traceability: verifies REQ-SWARM-INFO

**Acceptances:** ACC-SW-03 (OBL-3), ACC-SW-04 (OBL-4).
**Requirements:** REQ-SWARM-INFO.
**Prerequisites:** An empty swarm and an inhabited swarm containing idle and
executing workers, a missing checkout and an unavailable native observation.

1. Run `ponytail swarm info` in each owner. Empty inventory succeeds; inhabited
   inventory shows exact session IDs/names, paths, assignments and associations.
2. Compare human and machine-readable inventories from the owner and a managed
   checkout. Membership agrees, excludes other owners and performs no mutation.
3. Verify that live activity, idle observations, missing resources and unknown
   host activity differ. A working assignment alone is never shown as proof of
   actual execution or Desktop visibility.

## Arc SWARM-SESSIONS: Remove and conditionally reattach originals

Traceability: verifies REQ-SWARM-SESSIONS

**Acceptances:** ACC-SW-05 (OBL-5), ACC-SW-06 (OBL-6), ACC-SW-07 (OBL-7).
**Requirements:** REQ-SWARM-SESSIONS.
**Prerequisites:** A native worker executing an assigned task in its recorded
checkout, two user owners, and real host reattachment capability inspection.

1. Bind the worker to its designated owner; conflicting/cross-owner binding
   fails without modifying either swarm.
2. Request removal during execution. Confirm cancellation and cessation before
   lease/membership release, including interruption and retry of removal.
   If cessation cannot be proven, unresolved ownership remains visible.
3. Confirm the removed native session still exists and is not archived. Reattach
   that original session to the same owner where supported; verify its checkout
   identity. Otherwise verify the specific unsupported outcome without replacement.
4. Attempt attachment to another owner after removal. It still fails because
   session provenance survives removal and clearing.

## Arc SWARM-NAMES: Identify assignments and final completion

Traceability: verifies REQ-SWARM-SESSIONS

**Acceptances:** ACC-SW-08 (OBL-8), ACC-SW-09 (OBL-9).
**Requirements:** REQ-SWARM-SESSIONS.
**Prerequisites:** Two workers with plan/sprint assignments and full assignment IDs.

1. Inspect native names and info. Names use one-indexed W numbers, the proper
   P/S short identifier and exactly three summary words; full IDs resolve uniquely.
2. Change an assignment and inspect the updated original session name.
3. Complete a worker session and confirm the coordinator prepends `DONE `.
   Naming alone changes no acceptance, resource ownership or physical existence.

## Arc SWARM-CHECKOUTS: Allocate, release, transfer and reclaim

Traceability: verifies REQ-SWARM-WORKTREES

**Acceptances:** ACC-SW-10 (OBL-10), ACC-SW-11 (OBL-11),
ACC-SW-12 (OBL-12), ACC-SW-13 (OBL-13).
**Requirements:** REQ-SWARM-WORKTREES.
**Prerequisites:** Two user owners, released managed checkouts in the configured
physical pool, project setup/cleanup tooling and a protected active checkout.

1. Compete for one available checkout; exactly one claim succeeds. Exhaust the
   pool and verify normal allocation creates/setup a new managed checkout while
   explicit existing-only allocation creates nothing.
2. Release a quiescent checkout. Verify its files survive. Reassign it to the
   original owner, then release and assign to the second owner. Transfer while
   a prior worker owns/can write it fails; a user checkout cannot be allocated.
3. Delete one released checkout. Verify configured resource cleanup, preserved
   user/active checkouts and truthful retry outcomes.
4. Delete all remaining unassigned managed checkouts. Introduce one cleanup
   failure, observe per-resource results and retry outstanding cleanup. Assigned
   resources and user checkouts remain intact.

## Arc SWARM-CLEAR: Release resources and restart

Traceability: verifies REQ-SWARM-CLEAR

**Acceptance:** ACC-SW-14 (OBL-14).
**Requirement:** REQ-SWARM-CLEAR.
**Prerequisites:** A swarm with workers/coordinator, assignments and leases;
another owner's independent swarm; existing campaign delivery evidence.

1. Clear the first swarm, including an interrupted cessation attempt and retry.
   Unresolved resources remain owned until stopped; completed clear leaves no
   workers, coordinator, managed-worktree bindings or stale reservations.
2. Verify sessions/checkouts, source changes and historical delivery/publication
   records survive. The second owner's state is unchanged.
3. Bind a new coordinator and start a fresh campaign using retained safe resources.
   Repeat from an orphaned swarm to establish coordinator-loss recovery.

## Arc SWARM-CLI: Discover the complete chapter

Traceability: verifies REQ-SWARM-CLI

**Acceptance:** ACC-SW-15 (OBL-15).
**Requirement:** REQ-SWARM-CLI.
**Prerequisites:** Installed CLI and chapter/command implementations.

1. Root help lists swarm; chapter help lists every approved operation. Each
   command's help explains its arguments, owner resolution and effects.
2. Invalid commands produce the relevant scoped usage. Help performs no mutation.
3. Exercise resource operations through the real CLI and campaign consumers;
   both expose the same ownership state, not independent registries. Verify
   previous session creation/query/management subcommands are retired rather
   than available as aliases; campaign planning queries do not expose a second
   session-management interface.

## Arc SWARM-SKILL: Use exported guidance to execute in parallel

Traceability: verifies REQ-SWARM-SKILL

**Acceptance:** ACC-SW-16 (OBL-16).
**Requirement:** REQ-SWARM-SKILL.
**Prerequisites:** Implemented swarm chapter, a registered canonical skill and
generated/installed host copies, and a plan with independent ready obligations.

1. Compare exported guidance with real chapter and subcommand help. Every
   prescribed command exists and uses the canonical ownership/lifecycle path.
2. Have the coordinator follow it to inspect the owning swarm and dispatch
   compatible original top-level workers concurrently up to configured N,
   without an extra instruction to parallelize. Verify actual native activity
   and exact instruction receipt; unknown sends do not cause duplicate dispatch.
3. Follow completion-first and publication gates, rename completed sessions,
   then quiesce/remove workers and release or clear resources. Preserved sessions
   remain bound to their original user-worktree provenance; checkouts can transfer
   only after prior ownership is relinquished. Inspect both owner and managed
   checkout to confirm truthful resulting membership.
