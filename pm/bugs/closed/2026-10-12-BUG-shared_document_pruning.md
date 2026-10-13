<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Shared document pruning races peer publication

- ID: 2026-10-12-BUG-shared_document_pruning
- Type: BUG
- Status: CLOSED
- Authority: stakeholder authorized Ponytail tooling repairs during the GWEN
  traceability campaign.
Traceability: introduces REQ-REPOSITORY-TEXT-INDEX from issue 2026-10-12-BUG-shared_document_pruning
- Atomic obligation: replacing a worktree overlay preserves concurrently
  published references in the shared text store and prunes only its owned
  superseded documents without blocking an unrelated publisher.
- Root cause: worktree-scoped writers shared globally deduplicated documents,
  but overlay cleanup scanned the entire store. Its statement snapshot could
  miss a peer's pending blob reference and fail PostgreSQL FK validation after
  that peer committed (23503).
- Repair: document upserts retain row ownership until references commit.
  Overlay pruning selects only this worktree's superseded generations, skips
  busy documents and retains their unpublished ownership for a later refresh.
  Unchanged refreshes retry that cleanup. No global lock or schema change.
- Differential evidence: real CLI publication against two isolated project
  identities sharing one document reproduced the same git_blob_v1 FK error
  before repair. Corrected publication finishes while the peer is pending,
  preserves its committed document, then removes stale ownership on refresh.
  A second pending writer aborts; the unchanged refresh removes its orphan.
- Validation: focused real-PG and existing worktree concurrency proof passed
  2/2; legacy cohort 547/547 and typed cohort 275/275 passed. Final test edits
  repeated the focused regression and configured build/TSTS gate; 1550 files
  passed TSTS. Traceability validated 898 relationships; rule-copy and version
  checks passed. Separate adversarial review required consistent row-lock order
  for the projection writer, which was corrected and the legacy cohort repeated.
  Other unchanged full-core component evidence remains owned by the parent task.
- Raw evidence: ignored tmp/document-cleanup-before.log and
  tmp/document-cleanup-after.log.
