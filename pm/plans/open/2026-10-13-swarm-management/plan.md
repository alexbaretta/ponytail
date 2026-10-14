<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Swarm ownership and resource management

- Plan ID: `2026-10-13-swarm-management`
- Status: open

<!-- ponytail-plan-campaign
{
  "schemaVersion": 2,
  "id": "2026-10-13-swarm-management",
  "parent_plan_id": null,
  "depends_on": []
}
-->

**Authority:** Stakeholder swarm definition and explicit request to document
requirements and create a plan, 2026-10-13.
**Lifecycle:** Open; implementation has not begun. This planning update does
not implement commands, migrate live ownership, clear a swarm or dispatch workers.
**Repository:** Ponytail, in the supplied user checkout.
**Canonical scope:** [Swarm requirements](../../../requirements/swarms.md).
**Acceptance:** [Swarm Suite](../../../uat/swarms.md).

## Outcome

Provide an owner-scoped `ponytail swarm` chapter, beginning with `swarm info`
for diagnosis of actual worker sessions and managed checkout ownership. Separate
resource membership from campaign scheduling and acceptance. Reuse the existing
PostgreSQL and Git/native lifecycle boundaries; keep one ownership source.

Delivery baseline: **16 atomic obligations, 0 discharged, 0 in progress,
16 not started**. SW-16 incorporates the stakeholder's additional explicit
request for an agent skill. Canonical conditions and discharge criteria live exclusively
in the linked requirement tables. Final acceptance below is a rollup, not a
seventeenth delivery obligation.

## Planned implementation order and dependencies

These rows assign scope and prerequisite edges, not duplicate requirement text.
Complete started obligations, including their proof, before opening more work.

| Batch | Obligation | Prerequisites | Proving Arc / Steps |
| --- | --- | --- | --- |
| 1: ownership and inspection | SW-01 | None | SWARM-OWNERS / 1 |
| 1 | SW-02 | SW-01 | SWARM-OWNERS / 2–3 |
| 1 | SW-03 | SW-01, SW-02 | SWARM-INFO / 1–2 |
| 1 | SW-04 | SW-03 | SWARM-INFO / 3 |
| 2: resource bindings | SW-05 | SW-01, SW-02 | SWARM-SESSIONS / 1, 4 |
| 2 | SW-10 | SW-01 | SWARM-CHECKOUTS / 1 |
| 2 | SW-08 | SW-05 | SWARM-NAMES / 1–2 |
| 2 | SW-09 | SW-08 | SWARM-NAMES / 3 |
| 3: retained lifecycle | SW-06 | SW-05 | SWARM-SESSIONS / 2–3 |
| 3 | SW-07 | SW-06 | SWARM-SESSIONS / 3–4 |
| 3 | SW-11 | SW-06, SW-10 | SWARM-CHECKOUTS / 2 |
| 3 | SW-12 | SW-11 | SWARM-CHECKOUTS / 3 |
| 3 | SW-13 | SW-12 | SWARM-CHECKOUTS / 4 |
| 4: complete interface and restart | SW-14 | SW-02, SW-06, SW-11 | SWARM-CLEAR / 1–3 |
| 4 | SW-15 | SW-03–SW-14 | SWARM-CLI / 1–3 |
| 4 | SW-16 | SW-15 | SWARM-SKILL / 1–3 |

Expose command help with each delivered command; SW-15 verifies the complete
chapter and campaign integration. SW-03 is the first useful diagnostic delivery;
it need not wait for deletion or clearing operations.

Initial sprint: [S01 ownership and inspection](sprints/S01.md), planning STUB.
Later batches receive detailed sprint records when their planning begins.

## Activation and architecture work

Before coding, convert this open planning record to configured V3 obligation
operations with one bounded obligation document and the existing IDs. Preserve
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

## Decisions to settle from implementation evidence

- Exact command spellings and flags beneath the approved swarm chapter.
- Short plan/sprint identifier mapping for existing date-based plan IDs.
- Native same-owner reattachment support and its original-checkout requirements.
- How existing campaign-bound resources are explicitly enrolled without guessing
  ownership, duplicating records or altering historical accepted evidence.

These are bounded implementation decisions; any materially different product
outcome must return to the stakeholder. Managed-checkout release/transfer and
session removal never authorize deletion of uncommitted work.
