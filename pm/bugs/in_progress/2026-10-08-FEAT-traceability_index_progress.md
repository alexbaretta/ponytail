# Traceability index progress reporting

- ID: `2026-10-08-FEAT-traceability_index_progress`
- Type: `FEAT`
- Status: `in_progress`
- Source: Direct human request, 2026-10-08, while configuring IPG traceability.
- Approval: Approved at filing as a human-filed feature request.
- Implementation authorization: Not granted; this request records the feature only.

## Request and intended behavior

`ponytail traceability index` must report progress while indexing. When writing
to a TTY, display a progress bar. When its progress output is redirected to a
regular file, emit periodic progress indicators made of printable characters
and ordinary newline separators, without terminal cursor-control or ANSI escape
sequences. Use the existing `ponytail search update-index` progress reporting as
the reference behavior.

## Scope and requirements reconciliation

This adds user-visible progress reporting to the existing
[traceability index](../../requirements/traceability-index.md). That requirement
does not currently specify this progress presentation, so the request is a
FEAT, not a confirmed BUG. The existing
[search progress/resumption feature](../closed/2026-10-01-FEAT-search_index_progress_resume.md)
and `repositoryIndexProgress` in `src/project-index.js` supply the reference.
No canonical requirement or UAT annotation is added at intake.

Related request: [resumable batched traceability indexing](2026-10-08-FEAT-traceability_index_batch_resume.md).

## Acceptance criteria and proposed UAT

1. Run the real `ponytail traceability index` over enough files to observe
   intermediate progress in a TTY. A progress bar advances during processing
   and distinguishes completed processing from successful final publication.
2. Redirect progress output to a regular file. Progress is emitted periodically
   during processing rather than only at completion; the log contains readable
   printable characters and newline separators, without terminal controls.
3. Report actual progress, not a fabricated percentage or premature success.
   Interruption and failure must not be presented as completed publication.
4. Preserve the existing machine-readable `--json` result contract; progress
   must not corrupt its single result document.

## Evidence, questions and disposition

The installed CLI exposes `traceability index`; the existing search command's
progress reporter is in `src/project-index.js`. No implementation, runtime
acceptance, or passing UAT is claimed by this filing. There are no unresolved
product questions required to record this request.
Implementation plan: [Open feature requests](../../plans/in_progress/2026-10-09-open-feature-requests/plan.md),
S02. Planning admission does not authorize implementation. Resolution remains
pending kickoff and proof.

Traceability: introduces REQ-TRACEABILITY-PROGRESS from issue 2026-10-08-FEAT-traceability_index_progress

## Implementation activation

Explicit human kickoff on 2026-10-09 authorizes implementation within
[Open feature requests](../../plans/in_progress/2026-10-09-open-feature-requests/plan.md).
Reconciled [requirements](../../requirements/open-features.md) and
[UAT](../../uat/open-features.md) apply. Earlier intake-only statements
above describe filing history, not current authority.
