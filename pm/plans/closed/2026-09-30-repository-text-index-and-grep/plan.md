# Repository text index and grep

- **Plan ID:** `2026-09-30-repository-text-index-and-grep`
- **Status:** `closed`
- **Approval:** The stakeholder approved
  [`REQ-REPOSITORY-TEXT-INDEX`](../../../requirements/repository-text-index.md),
  the trigram-only architecture, indefinite observed Git-history retention,
  ephemeral current-worktree indexing, and complete plan implementation on
  2026-09-30.
- **Issue:**
  [`2026-09-30-FEAT-repository_text_index_and_grep`](../../../bugs/closed/2026-09-30-FEAT-repository_text_index_and_grep.md).
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{"schemaVersion":2,"id":"2026-09-30-repository-text-index-and-grep","parent_plan_id":null,"depends_on":[]}
-->

Traceability: plans-implementation REQ-REPOSITORY-TEXT-INDEX from plan 2026-09-30-repository-text-index-and-grep
Traceability: plans-verification REQ-REPOSITORY-TEXT-INDEX from plan 2026-09-30-repository-text-index-and-grep

## Objective

Replace repository-wide buffered text scans with one incrementally maintained
PostgreSQL trigram index, add `ponytail grep` for current, ref, commit, and
reachable-history scopes with optional path restriction, and move reference QA
onto the same canonical query boundary.

## Scope

- Version and provision Git object, ref observation, text-document, worktree
  overlay, and checkpoint storage in the existing `ponytail_index` schema.
- Retain observed history indefinitely and incrementally ingest only unseen
  Git objects.
- Publish an atomic ephemeral overlay containing tracked modifications,
  deletions, and untracked non-ignored text.
- Use one `pg_trgm` GIN text index; remove the existing `tsvector` index.
- Implement the exact `ponytail grep` selector and path contract.
- Make repository reference QA consume the indexed current state without a
  `git grep` fallback.
- Synchronize requirements, architecture, UAT, traceability, CLI help,
  project structure, durable-contract declarations, and distribution.

## Exclusions

- No historical garbage collection in V1.
- No remote fetch, hidden remote-ref discovery, cloud resource, alternate
  database service, regex language, semantic ranking, or filesystem-search
  fallback.
- No indexing of ignored files, Gitlink contents, or binary bodies.

## Architecture decisions

- Git blobs, not patches, are the canonical searchable historical contents;
  commit-parent rows preserve merges and tree entries identify exact paths.
- Historical and ephemeral contents share one content-addressed trigram text
  store. Mapping tables distinguish retained Git data from replaceable
  worktree generations.
- Every consuming operation refreshes the exact needed state before querying.
  PostgreSQL failure or an unstable scan fails closed.
- `--ref`, `--commit`, and `--history` are mutually exclusive; `--path`
  restricts any selected scope without path inference or fallback.

## Sprint

1. [S01](sprints/S01.md): implement, integrate, and accept the repository text
   index and `ponytail grep` — DONE.

## Questions and approvals

- [RESOLVED] Use trigram indexing alone for every textual corpus; no
  stakeholder requirement justifies retaining `tsvector`.
- [RESOLVED] Retain all observed refs and reached Git history indefinitely;
  historical garbage collection is deferred until PostgreSQL size warrants it.
- [RESOLVED] The current-state overlay includes uncommitted tracked content and
  untracked non-ignored files, masks deletions, excludes ignored and binary
  files, and never follows symlinks.
- [RESOLVED] Search is literal. Case-sensitive matching is the CLI default;
  reference QA uses the same query boundary with its existing case-insensitive
  policy.
- [RESOLVED] User approval in this plan's source instruction authorizes full
  implementation and testing without another execution gate.

## Starting checkpoint

At clean revision `40cc6d72f5f59d127fd0cbb368134f28d13803e2`, `npm test`
passed on 2026-09-30: 435 core tests, Codex installer checks, 23 Pi tests, four
MCP tests, 80 TSTS tests, and the 516-file TSTS structure check. The prior
developer-private instruction feature was committed independently before this
checkpoint. No build target was changed by plan preparation.

## Final validation record

Completed 2026-09-30. The implementation uses one shared content-addressed
`pg_trgm` GIN store for historical Git blobs, current-worktree overlays, and
normalized structured search; the legacy `tsvector` projection is removed.
The public literal-search command covers current, exact ref, exact commit, and
reachable-history scopes with file/subtree restriction, while reference QA
uses the same refreshed index without a Git-grep fallback.

Final evidence: `npm test` passed after all product and test inputs were
staged; the real PostgreSQL Suite passed; repository-scale reference QA
completed with 348 expected policy findings and no `ENOBUFS`; TSTS checked 523
files; build impact reported no affected or indeterminate targets;
traceability checked 117 relationships; rule-copy, version, generated
registry, command-adapter, manifest, and diff checks passed.
