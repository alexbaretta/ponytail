<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# 2026-09-30-FEAT-repository_text_index_and_grep: Index repository text and expose grep

## Status

closed

## Type, source, and authorization

- **Type:** FEAT
- **Canonical issue ID:** `2026-09-30-FEAT-repository_text_index_and_grep`
- **Source:** Stakeholder design and implementation direction on 2026-09-30,
  including the reported `spawnSync git ENOBUFS` failure.
- **Authorization:** The stakeholder approved the clarified trigram-only
  architecture and explicitly requested a plan, implementation, and tests.

Traceability: introduces REQ-REPOSITORY-TEXT-INDEX from issue 2026-09-30-FEAT-repository_text_index_and_grep
Traceability: plans-implementation REQ-REPOSITORY-TEXT-INDEX from issue 2026-09-30-FEAT-repository_text_index_and_grep
Traceability: plans-verification REQ-REPOSITORY-TEXT-INDEX from issue 2026-09-30-FEAT-repository_text_index_and_grep

## Objective and acceptance

Implement [`REQ-REPOSITORY-TEXT-INDEX`](../../requirements/repository-text-index.md)
through the associated
[`2026-09-30-repository-text-index-and-grep`](../../plans/closed/2026-09-30-repository-text-index-and-grep/plan.md)
plan. Completion requires incremental current and historical indexing,
the complete `ponytail grep` selector/path surface, indexed reference QA, and
the focused, real-PostgreSQL, full-unit, traceability, structure, and
distribution gates recorded by that plan.

## Confirmed defect mechanism

Reference QA runs one buffered `git grep` for every foreign identity. Generic
identities can produce more than the configured child-process buffer, causing
`spawnSync git ENOBUFS` before QA can apply its boundary and exception policy.
Replacing the buffered scans with the canonical indexed query removes that
unbounded process-output boundary.

## Verification

Completed by the linked plan. Focused CLI/index tests, complete reference-QA
integration coverage, the real PostgreSQL Suite, full `npm test`, traceability,
TSTS structure, rule-copy, version, generated-artifact, and diff checks pass.
Repository-scale reference QA completes without `ENOBUFS`.
