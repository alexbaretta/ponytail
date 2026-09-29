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

Add a rebuildable incremental traceability index, fast full-text queries,
bidirectional relationship-gap validation, prospective plan/issue annotations,
and exact plan/campaign scopes to the installed Ponytail CLI.

## Scope

- Version the expanded traceability configuration, annotation graph, SQLite
  projection, and JSON command results while preserving exact V1 reads.
- Incrementally index every configured tracked source from exact content and
  parser/configuration identities.
- Add safe FTS5 search and deterministic exact filters.
- Add configurable entity inventories and directional coverage rules.
- Add prospective relationships for plans, tasklets, and issues without
  counting them as completed implementation or test evidence.
- Add repository, plan, and campaign validation scopes.
- Synchronize reusable skills, generated copies, CLI help/distribution,
  structure ownership, versioned contracts, traceability, and UAT evidence.

## Exclusions

- No PostgreSQL service, pickle file, network index, cloud resource, or shared
  database across worktrees.
- No indexing of arbitrary repository prose or secrets.
- No implicit rebuild during a read-only search or validation query.
- No framework-specific endpoint discovery or path-based entity inference.
- No replacement of canonical source annotations or the checked-in generated
  reverse view.

## Architecture decision

Use one ignored worktree-local SQLite/FTS5 projection. It is smaller and more
portable than provisioning PostgreSQL and is queryable, transactional, and
safe to rebuild unlike pickle. Store exact content identity in addition to the
observed repository commit so dirty files invalidate correctly. Preserve one
canonical parser and normalize prospective relationships separately from
completed evidence. A versioned validation matrix supplies pair, direction,
role, and cardinality rules; plan and campaign scopes derive from canonical PM
and census records.

## Sprints

1. [S01](sprints/S01.md): implement incremental indexing and full-text search —
   READY_FOR_REVIEW.
2. [S02](sprints/S02.md): extend the graph to plans/issues and implement scoped
   relationship-gap validation — READY_FOR_REVIEW; depends on S01.

## Questions and approval gates

- [RESOLVED] Use SQLite FTS5 rather than PostgreSQL or pickle; the database is
  a disposable per-worktree projection under the configured ignored temporary
  root.
- [RESOLVED] Store exact content identity as the incremental skip key and retain
  observed `HEAD` as provenance; a per-file last commit alone cannot detect
  dirty edits.
- [RESOLVED] Search only normalized safe fields, not arbitrary file bodies.
- [RESOLVED] Represent endpoint and other project-specific inventories through
  explicit entity declarations or configured semantic locators, never filename
  inference.
- [RESOLVED] Prospective plan and issue roles remain distinct from actual
  implementation and verification coverage.
- [RESOLVED] The complete staged readiness tree based on revision
  `904e0b1b935305f2139b38e466a763703aefa51e` passed the configured full test
  suite. Build impact selected no target.

The requirement and plan creation are approved. Implementation begins only
after the complete plan and both sprint graphs receive explicit approval.

## Starting checkpoint

On 2026-09-29, the staged readiness tree based on
`904e0b1b935305f2139b38e466a763703aefa51e` passed `npm test`: 376 core tests,
the Codex installer checks, 23 Pi tests, 4 MCP tests, 76 TSTS tests, and the
488-file TSTS structure check. Traceability resolved 14 relationships; the
new plan validated with two sprints and 12 tasklets; both tasklet selectors,
all seven version pins, rule-copy/generator/package checks, and `git diff
--check` passed. Build impact returned no affected or indeterminate target for
every readiness path, so no build was required.

## Final validation record

Not started.
