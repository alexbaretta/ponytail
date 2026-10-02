# Late repository ref snapshot

- **Plan ID:** `2026-10-01-late-repository-ref-snapshot`
- **Status:** `in_progress`
- **Approval:** Explicit stakeholder implementation authorization on 2026-10-01
  to shorten the Git-ref stability window without weakening complete-history or
  atomic-publication guarantees.
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-10-01-late-repository-ref-snapshot","parent_plan_id":null,"depends_on":[]}
-->

Traceability: plans-implementation REQ-REPOSITORY-TEXT-INDEX from plan 2026-10-01-late-repository-ref-snapshot
Traceability: plans-verification REQ-REPOSITORY-TEXT-INDEX from plan 2026-10-01-late-repository-ref-snapshot

## Objective

Permit independent branch advances during immutable history backfill, ingest a
complete late snapshot delta, and retain a short fail-closed stability window
around final transactional ref and worktree-overlay publication.

## Relationship to prior work

This is a standalone follow-up to the immutable closed
`2026-10-01-parallel-repository-index-ingestion` plan. It is not a campaign
child because managed child membership requires a reciprocal edit to the
closed parent, which the stakeholder explicitly prohibited.

## Scope

- Capture an initial history snapshot and ingest its unseen commits.
- Recapture refs and HEAD once, ingest every unseen commit reachable from that
  late snapshot, then publish only if that late snapshot stays unchanged.
- Aggregate durable progress and ETA across both bounded phases.
- Prove branch advance during initial ingestion and rejection with prior
  publication preservation for mutation during final publication.
- Reconcile the approved requirement, architecture, UAT, and traceability.

## Exclusions

- No retry loop, new option, fallback search, schema change, weaker
  publication transaction, or publication of a ref whose history is absent.
- No Git write, signal, restart, or other interaction with GWEN or its active
  human-owned index process.
- No edit to the closed predecessor plan and no Codex installation.

## Architecture decisions

- Immutable Git objects already indexed remain durable; ref movement before
  the late snapshot changes only the bounded delta that must be ingested.
- The late snapshot is the sole publication candidate. Mutation after it is
  captured remains `REPOSITORY_INDEX_UNSTABLE` and rolls back ref/overlay
  publication.
- One aggregate progress observer reports monotonically durable completed
  commits while its total may increase once when the late delta is discovered.

## Sprint

1. [S01](sprints/S01.md): implement and accept late-snapshot publication —
   PENDING.

## Questions and approvals

- [RESOLVED] The approved requirement demands complete latest referenced
  history and stable atomic publication, not frozen refs throughout immutable
  history ingestion.
- [RESOLVED] Exactly one late recapture and delta phase is authorized; a moving
  repository after that point fails closed without retry.
- [RESOLVED] “Subordinate plan” is represented by this standalone follow-up
  reference because a managed child would require the forbidden historical
  parent edit.

## Starting checkpoint

At clean revision `d46879c`, configured `npm test` and the isolated
`./scripts/test-project-index-postgres.sh` contract suite passed. The database
suite used only fixture-owned rows and did not interact with the active GWEN
writer or Git checkout.

## Final validation record

Pending.
