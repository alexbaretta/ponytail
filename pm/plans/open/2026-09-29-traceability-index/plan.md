# Indexed requirements traceability

- **Plan ID:** `2026-09-29-traceability-index`
- **Status:** `open`
- **Approval:** The stakeholder approved
  [`REQ-TRACEABILITY-INDEX`](../../../requirements/traceability-index.md) on
  2026-09-29. Implementation and the proposed architecture remain pending
  explicit plan approval.
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{"schemaVersion":1,"id":"2026-09-29-traceability-index","parent_plan_id":null}
-->

## Objective

Add rebuildable incremental traceability and plan indexes, fast full-text and
plan-graph queries, bidirectional relationship-gap validation, prospective
plan/issue annotations, and exact plan/campaign scopes to the installed
Ponytail CLI.

## Scope

- Version the expanded traceability configuration, annotation graph,
  PostgreSQL projection, and JSON command results while preserving exact V1
  reads.
- Incrementally index every configured tracked source from exact content and
  parser/configuration identities.
- Add safe PostgreSQL full-text search and deterministic exact filters.
- Add a distinct plan-text corpus and normalized plan graph with explicit
  search, ancestry, campaign-root, and stranded-plan queries.
- Add configurable entity inventories and directional coverage rules.
- Add prospective relationships for plans, tasklets, and issues without
  counting them as completed implementation or test evidence.
- Add repository, plan, and campaign validation scopes.
- Synchronize reusable skills, generated copies, CLI help/distribution,
  structure ownership, versioned contracts, traceability, and UAT evidence.

## Exclusions

- No SQLite or pickle file, second database service, cloud resource, or
  authoritative state in the index.
- No indexing of arbitrary repository prose or secrets.
- No implicit rebuild during a read-only search or validation query.
- No framework-specific endpoint discovery or path-based entity inference.
- No replacement of canonical source annotations or the checked-in generated
  reverse view.

## Architecture decision

Use the PostgreSQL service and project identity already required by the
project journal, with a separately owned, rebuildable `ponytail_index` schema.
Separate logical traceability and plan corpora retain independent worktree
generations while immutable content and parse results are reused across
worktrees. PostgreSQL `tsvector`/GIN supplies full-text search. Per-worktree,
per-corpus advisory locks and transactional publication prevent one
worktree's dirty or failed refresh from changing another's answer. Preserve
the canonical traceability parser, campaign census, and plan-execution
readers. A versioned validation matrix supplies pair, direction, role, and
cardinality rules; plan and campaign scopes derive from canonical PM and
census records.

## Sprints

1. [S01](sprints/S01.md): implement incremental traceability and plan indexing,
   full-text search, and plan-graph queries — READY_FOR_REVIEW.
2. [S02](sprints/S02.md): extend the graph to plans/issues and implement scoped
   relationship-gap validation — READY_FOR_REVIEW; depends on S01.

## Questions and approval gates

- [RESOLVED] Supersede the earlier SQLite choice. Reuse the PostgreSQL service,
  database connection, and stable project identity already mandated for the
  project journal, while keeping index state in its own rebuildable schema.
- [RESOLVED] Store exact content identity as the incremental skip key and retain
  observed `HEAD` as provenance; a per-file last commit alone cannot detect
  dirty edits.
- [RESOLVED] Search only normalized safe fields, not arbitrary file bodies.
- [RESOLVED] Represent endpoint and other project-specific inventories through
  explicit entity declarations or configured semantic locators, never filename
  inference.
- [RESOLVED] Prospective plan and issue roles remain distinct from actual
  implementation and verification coverage.
- [RESOLVED] Plan text and structure share the physical database and refresh
  operation but retain independent corpus generations, graph semantics, and
  FTS policy. Canonical campaign and plan-execution readers own source facts.
- [RESOLVED] The complete staged readiness tree based on revision
  `5146c3bce4688c07544728b2cb1f680754e2ca51` passed the configured full test
  suite after replacing the per-worktree SQLite architecture with the shared
  PostgreSQL projection. Build impact selected no target.

The requirement and plan creation are approved. Implementation begins only
after the complete plan and both sprint graphs receive explicit approval.

## Starting checkpoint

On 2026-09-29, the staged readiness tree based on
`5146c3bce4688c07544728b2cb1f680754e2ca51` passed `npm test`: 376 core tests,
the Codex installer checks, 23 Pi tests, 4 MCP tests, 76 TSTS tests, and the
488-file TSTS structure check. Traceability resolved 14 relationships; the
PostgreSQL-based plan validated with two sprints and 16 tasklets. Campaign
validation and both tasklet graph selectors passed. Build impact returned no
affected or indeterminate target for every readiness path, so no build was
required.

## Final validation record

Not started.
