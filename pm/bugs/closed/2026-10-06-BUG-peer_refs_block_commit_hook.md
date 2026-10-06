<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Independent branch commits invalidate reference QA

- **ID:** `2026-10-06-BUG-peer_refs_block_commit_hook`
- **Type:** `BUG`
- **Status:** `closed`
- **Authorization:** Confirmed parallel-worker defect within the stakeholder's
  authorized Ponytail/GWEN collaboration and maximum-parallelism work.
- **Requirement:** [REQ-REPOSITORY-TEXT-INDEX](../../requirements/repository-text-index.md).

Traceability: introduces REQ-REPOSITORY-TEXT-INDEX from issue 2026-10-06-BUG-peer_refs_block_commit_hook

## Confirmed diagnosis

Reference QA refreshed every shared branch/tag and rejected publication whenever
any ref moved. Linked worker worktrees share refs, so an independent worker's
commit failed another worker's unchanged commit hook. Repeated retries and a
quiet commit window merely reduced the chance of encountering the defect.

The real PostgreSQL regression with two linked Git worktrees fails before the
fix with `REPOSITORY_INDEX_UNSTABLE: repository refs changed while indexing`.
The caller's HEAD stays unchanged; only the peer branch moves.

## Intended correction and acceptance

Use the canonical refresh with an explicit current-worktree scope for reference
QA and current-worktree queries. Ingest the caller's HEAD history and publish
its validated overlay without writing unrelated ref observations. Explicit
repository maintenance retains all-ref ingestion, publication and stability.
Reject caller HEAD or content changes and retain the prior published pointers.
No hook bypass, client-specific policy, or quiet-window requirement is added.

Requirements clarification and the [independent-worker Arc](../../uat/repository-text-index.md#arc-index-one-worktree-while-independent-workers-commit)
are reconciled before implementation. This removes the reported cross-session
availability dependency rather than introducing one.

## Resolution and validation

Reference QA and current-worktree searches now use the canonical worktree-scoped
refresh. Repository maintenance retains its shared-ref stability guard. The
publication transaction also verifies caller content after publishing its
overlay; caller HEAD or content changes roll back the publication.

- `node --test tests/repository-index-concurrency.test.js tests/project-index.test.js`:
  31/31 passed against the existing local PostgreSQL database. The linked-worktree
  regression proves peer commits succeed, caller HEAD/content mutations reject,
  prior publication pointers survive rejection, and repository mode retains its
  shared-ref guard.
- Focused `tests/project-validation.test.js` commit-hook cases: 2/2 passed,
  including `commit -am` temporary-index handling.
- Build impact: no affected or indeterminate build targets.
- Rule copies and pinned versions: valid.
