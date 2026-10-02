# Late repository ref snapshot

- **Plan ID:** `2026-10-01-late-repository-ref-snapshot`
- **Status:** `closed`
- **Approval:** The stakeholder authorized source-confirmed Ponytail bug fixes
  within the ongoing maximum-parallelism goal. The root coordinator delegated
  this confirmed repository-index repair on 2026-10-01 with the behavior and
  operational constraints recorded below.
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
closed parent, which the root delegation excludes.

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
   DONE.

## Questions and approvals

- [RESOLVED] The approved requirement demands complete latest referenced
  history and stable atomic publication, not frozen refs throughout immutable
  history ingestion. The root coordinator supplied that source-confirmed bug
  boundary.
- [RESOLVED] Exactly one late recapture and delta phase is the smallest
  source-proven design inside the delegated behavior; a moving repository
  after that point fails closed without retry.
- [RESOLVED] This standalone follow-up is the canonical plan model under the
  delegation's no-predecessor-edit constraint because managed child membership
  would require a reciprocal historical-parent edit.

## Starting checkpoint

At clean revision `d46879c`, configured `npm test` and the isolated
`./scripts/test-project-index-postgres.sh` contract suite passed. The database
suite used only fixture-owned rows and did not interact with the active GWEN
writer or Git checkout.

## Final validation record

Implementation commit `700b9dd` passes four focused progress tests and the
real Git/PostgreSQL contract Suite, including initial branch advance, complete
late publication, final-window rejection, late-delta interruption and resume,
durable progress, exact worker count, and cleanup. Build impact reported no
affected or indeterminate targets, so no build was required. Configured
`npm test` passed the full core suite, installer harness, 23 Pi extension, four
MCP, and 80 TSTS tests; TSTS checked 607 files without violations. Registry,
generated registry/command/manifest metadata, eight rule copies, seven version
files, 264 traceability relationships, campaign validation, tasklet exhaustion,
and diff hygiene passed. No GWEN Git state was changed, and no GWEN process was
signaled, restarted, or modified.
