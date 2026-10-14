<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Swarm ownership and resource management

- Plan ID: `2026-10-13-swarm-management`
- Status: in_progress

<!-- ponytail-plan-campaign
{
  "schemaVersion": 3,
  "id": "2026-10-13-swarm-management",
  "parent_plan_id": null,
  "depends_on": [],
  "obligation_document": "pm/plans/in_progress/2026-10-13-swarm-management/obligations.json"
}
-->

**Authority:** Stakeholder swarm definition and explicit request to document
requirements and create a plan, 2026-10-13.
**Lifecycle:** In progress, activated by the stakeholder's updated implementation
goal. No live ownership migration, clearing or worker dispatch is performed by
plan activation. GWEN execution is separately paused by its user.
**Repository:** Ponytail, in the supplied user checkout.
**Canonical scope:** [Swarm requirements](../../../requirements/swarms.md).
**Acceptance:** [Swarm Suite](../../../uat/swarms.md).

**Stakeholder scope correction, 2026-10-13:** Ponytail records coordinator and
worker session IDs and manages worktree creation, attachment, detachment and
deletion. The coordinator uses its host tools to create or stop sessions, drive
workers to quiescence and rename them. Ponytail is not authorized to add Codex
API session creation or stopping capabilities. Earlier native-runtime control
and native-proof planning in this document and its subordinate records is
superseded by this correction; it is not an implementation requirement. Reconcile
the affected requirements, UAT, commands and implementation to this boundary.

## Outcome

Provide an owner-scoped `ponytail swarm` chapter, beginning with `swarm info`
for diagnosis of actual worker sessions and managed checkout ownership. Separate
resource membership from campaign scheduling and acceptance. Reuse the existing
PostgreSQL and Git/native lifecycle boundaries; keep one ownership source.

Delivery baseline: **16 atomic obligations, 0 discharged, 1 in progress,
15 not started**. OBL-1 owner resolution is in progress. OBL-16 incorporates the stakeholder's additional explicit
request for an agent skill. Canonical conditions and discharge criteria live exclusively
in the linked requirement tables. Final acceptance below is a rollup, not a
seventeenth delivery obligation.

The adopted ledger separately registers six required category inventory
responsibilities, OBL-17–OBL-22. They are unresolved proof/completeness work,
excluded from the 16-item delivery denominator. Initial vector is
`[1,1,17,1,1,1]`; no checkpoint credits completed work.

## Planned implementation order and dependencies

These rows assign scope and prerequisite edges, not duplicate requirement text.
Complete started obligations, including their proof, before opening more work.

| Batch | Obligation | Prerequisites | Proving Arc / Steps |
| --- | --- | --- | --- |
| 1: ownership and inspection | OBL-1 | None | SWARM-OWNERS / 1 |
| 1 | OBL-2 | OBL-1 | SWARM-OWNERS / 2–3 |
| 1 | OBL-3 | OBL-1, OBL-2 | SWARM-INFO / 1–2 |
| 1 | OBL-4 | OBL-3 | SWARM-INFO / 3 |
| 2: resource bindings | OBL-5 | OBL-1, OBL-2 | SWARM-SESSIONS / 1, 4 |
| 2 | OBL-10 | OBL-1 | SWARM-CHECKOUTS / 1 |
| 2 | OBL-8 | OBL-5 | SWARM-NAMES / 1–2 |
| 2 | OBL-9 | OBL-8 | SWARM-NAMES / 3 |
| 3: retained lifecycle | OBL-6 | OBL-5 | SWARM-SESSIONS / 2–3 |
| 3 | OBL-7 | OBL-6 | SWARM-SESSIONS / 3–4 |
| 3 | OBL-11 | OBL-6, OBL-10 | SWARM-CHECKOUTS / 2 |
| 3 | OBL-12 | OBL-11 | SWARM-CHECKOUTS / 3 |
| 3 | OBL-13 | OBL-12 | SWARM-CHECKOUTS / 4 |
| 4: complete interface and restart | OBL-14 | OBL-2, OBL-6, OBL-11 | SWARM-CLEAR / 1–3 |
| 4 | OBL-15 | OBL-3–OBL-14 | SWARM-CLI / 1–3 |
| 4 | OBL-16 | OBL-15 | SWARM-SKILL / 1–3 |

Expose command help with each delivered command; OBL-15 verifies the complete
chapter and campaign integration. OBL-3 is the first useful diagnostic delivery;
it need not wait for deletion or clearing operations.

Initial sprint: [S01 ownership and inspection](sprints/S01.md), first feature
planned and in progress; physical inventory/CLI integration now passes focused
proof. Explicit membership and native observation remain pending.
Later batches receive detailed sprint records when their planning begins.

## Activation and architecture work

Activation writes V3 metadata and one bounded [obligation document](obligations.json)
with the existing IDs and initial checkpoint. Canonical behavioral conditions
and discharge criteria remain in the requirements; ledger entries reference
them rather than repeat their prose. The ledger owns scheduling dependencies.
Before assignments, preserve
canonical requirement conditions through explicit references; do not introduce
an accumulating database of certificates, file hashes or native transcripts
in Git. Freeze actual implementation/test locators and focused selectors before
each assignment rather than inventing source IDs in this planning-only record.

1. Trace the existing project/user-worktree identity, pool, assignment, creation,
   native observation and reset records. Identify which facts are currently
   campaign-owned and which can be reused as swarm-owned facts. Record an explicit
   compatibility/migration strategy; no automatic reinterpretation of old readers.
2. Define strict typed ownership, command and result contracts, including
   physical owner resolution and permanent session-origin provenance. Enforce
   one coordinator per owner and one swarm per managed checkout transactionally.
   Use existing PostgreSQL; add only constraints/indexes justified by these
   queries and transitions. Campaign graph files remain coordinator-authoritative.
3. Deliver inventory without claiming stored assignments prove live activity.
   Inspect the host's actual native capabilities for original-session reattachment,
   cancellation, naming and Desktop observation before promising support.
4. Move resource operations into the swarm chapter and let campaign operations
   consume them. The stakeholder's latest goal explicitly replaces every earlier
   Ponytail session creation/query/management subcommand, including native worker
   and reviewer operations; inventory those commands and retire their prior
   operational CLI spellings rather than retaining aliases. Preserve read-only
   historical record readers. Reconcile prepared dispatches, reservations and generation fences;
   clearing must not delete accepted campaign evidence. Keep destructive project
   reset distinct from release-only swarm clear.
5. Write and register the reusable swarm execution skill, using the skill-creator
   workflow and existing generators rather than hand-editing exported copies.
   Synchronize root/chapter help, project instructions, exported glossary/rules,
   worker/coordinator procedures and generated host adapters with each implementation
   increment. Keep session lifetime restrictions separate from transferable
   checkout membership. Use TypeScript and existing TSTS for all new code/tests.

Potential owners to inspect: `src/rolling-campaign-store.ts`,
`src/rolling-worktrees.ts`, `src/rolling-worker.ts`, `src/rolling-reset.ts`,
`src/rolling-codex.ts`, `src/rolling-operations.ts`, `src/rolling-cli-registry.ts`,
`src/cli-help.ts`, `cli/ponytail`, `scripts/project-index.sql`, and the shared
plan-execution resources. These are investigation targets, not permission to
rewrite all of them. Select the smallest cohesive implementation boundary.

## Verification and traceability

At implementation activation register the exact approved requirement sources,
UAT Arcs and actual typed implementation/unit/integration artifacts in the
project traceability configuration. Planned coverage does not count as delivered
coverage. Maintain canonical annotations and regenerate the reverse view.

Each increment needs focused proof of its atomic condition through the actual
CLI/store/lifecycle boundary. Use disposable Git repositories, isolated rows in
the existing PostgreSQL, and native protocol fixtures for deterministic failures.
Use real native sessions for capability/cessation claims and Desktop-owned
observations for visible activity claims. Include competing owner claims,
cross-owner rejection, orphan recovery, partial cessation/cleanup and retry where
the corresponding obligation introduces those paths. Do not duplicate assertions
across layers merely to inflate test counts.

Final acceptance requires the applicable full unit command, integration Arcs,
TSTS, build-impact-selected builds, generated-runtime/help consistency,
traceability, rule-copy and version checks against the final tree. Existing
upstream failures remain explicit and must not be recast as passing proof.

Live diagnostic acceptance: have the cooperating GWEN coordinator run
`ponytail swarm info` from its user checkout and one owned managed checkout.
Both must identify the same owner and actual current session/worktree bindings.
Client mutations remain with that coordinator. A live clear/restart demonstration
requires cessation and preserved work before releasing anything; do not clear
the current campaign merely to test the new command. Parallel execution acceptance
still requires genuinely overlapping Desktop-visible top-level worker turns.

## Starting checkpoint

At activation, the existing native Desktop handoff foundation is committed in
`a0153b0`. Its focused unit37, PostgreSQL provisioning Arc and exported-resource11
checks pass; TSTS reports no violations. The root full command still stops on
the pre-existing three REQ-TYPESCRIPT-ONLY-SOURCE coverage gaps. This is an
upstream starting-checkpoint failure, not evidence that new swarm behavior exists.
No obligation is discharged by activation. Fix and verify the smallest owner
resolution boundary first; inventory remaining session CLI operations before
moving them into the swarm chapter.

Initial inventory implementation: `src/swarm-info.ts` reads one repeatable-read,
read-only project-scoped lease snapshot and checks selected physical Git identity.
It exposes the installed `swarm info` chapter and V1 JSON. It neither migrates
ownership nor guesses coordinator/native activity. Five focused unit tests and
one real PostgreSQL/Git Arc pass, including same-owner routing, sibling isolation,
empty inventory, unassigned rejection, missing checkout and unchanged row versions.
The canonical GWEN printout includes seven leases; this is diagnostic evidence,
not native activity or swarm-binding adoption. Certificate assessment is pending;
the delivery discharge count remains zero until the configured acceptance gates
are established.

OBL-1 core boundary: strict `src/swarm-owner.ts` and focused typed tests prove
same-owner routing, independent sibling owners and explicit invalid-ownership
rejections. The first three tests pass; installed CLI/physical inventory proof
remains pending. Therefore OBL-1 remains in progress and zero deliveries are
discharged. Requirement coverage gaps are now registered explicitly for the
new active scope, rather than omitted from project checks.

## Decisions to settle from implementation evidence

- Exact command spellings and flags beneath the approved swarm chapter.
- Short plan/sprint identifier mapping for existing date-based plan IDs.
- Native same-owner reattachment support and its original-checkout requirements.
- How existing campaign-bound resources are explicitly enrolled without guessing
  ownership, duplicating records or altering historical accepted evidence.

These are bounded implementation decisions; any materially different product
outcome must return to the stakeholder. Managed-checkout release/transfer and
session removal never authorize deletion of uncommitted work.
