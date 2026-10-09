# Resumable batched traceability indexing and codebase updates

- ID: `2026-10-08-FEAT-traceability_index_batch_resume`
- Type: `FEAT`
- Status: `in_progress`
- Source: Direct human request, 2026-10-08, while configuring IPG traceability.
- Approval: Approved at filing as a human-filed feature request.
- Implementation authorization: Not granted; this request records the feature only.

## Request and intended behavior

`ponytail traceability index` must support incremental, resumable processing
with a durable commit after each batch of files. Ten files is the stakeholder's
example batch size, not a mandated fixed size. If indexing stops or crashes,
restarting it must reuse completed compatible batches rather than discard all
progress. Subsequent indexing must also reflect evolving code and requirements.

## Scope and requirements reconciliation

The existing [traceability requirement](../../requirements/traceability-index.md)
already requires unchanged-file parse reuse, exact working-tree invalidation,
reconciliation of additions/removals/renames and configuration/parser changes,
and transactional complete-generation publication. This FEAT adds durable
batch checkpoints and crash/restart acceptance; it does not replace those
existing requirements or claim they are defective.

Keep durable partial progress separate from reader-visible publication:
readers must still see the prior complete generation or the next complete
generation, never a partial index. The architecture's current single-transaction
refresh implementation must be reconciled at implementation activation without
weakening that requirement. Preserve project/repository/worktree/corpus isolation
and writer serialization. Do not reuse a checkpoint whose relevant content or
configuration/parser/schema identity has changed.

No new requirement ID, UAT record, or prospective traceability annotation is
created at intake. Related request:
[traceability progress reporting](2026-10-08-FEAT-traceability_index_progress.md).
The [search progress/resumption feature](../closed/2026-10-01-FEAT-search_index_progress_resume.md)
provides an existing crash-and-resume reference.

## Acceptance criteria and proposed UAT

1. Index a real isolated repository with enough configured files to span
   multiple batches. Observe durable completed-batch checkpoints before final
   index publication.
2. Crash the actual indexing process after at least one batch commits and before
   completion, using abrupt process termination rather than only a simulated
   exception or graceful cancellation. Confirm completed checkpoints survive.
   Concurrent readers must not observe partially published data.
3. Restart the command for the same compatible inputs. Confirm completed batches
   are reused, interrupted/uncommitted work is retried, and the eventual complete
   logical index matches an uninterrupted clean rebuild without duplicate or
   missing entities or relationships.
4. Update the codebase and requirements, including a tracked edit without a
   HEAD change, a new configured file/relationship, a rename and a deletion.
   Reindex and verify searches and validation reflect the new state, no stale
   paths or relationships remain, and unchanged compatible files are reused.
5. Change a relevant input after the crash but before restart. Resume must
   invalidate affected checkpoints and produce the updated correct index rather
   than publish a mixture of old and new state. Configuration/parser/schema
   identity changes must invalidate incompatible cached work.
6. Retain the existing complete-generation publication and concurrent writer/
   worktree isolation behavior. Failure or cancellation must leave recoverable
   progress, no false success and no reader-visible partial generation.

## Evidence, questions and disposition

Current requirements and the existing traceability UAT cover incremental
updates and interruption safety, but do not establish durable batched crash
recovery. No new runtime test, implementation, or acceptance result is claimed
by this filing. Batch-size interface/defaults may be settled during planning;
the required outcome is durable resumable batches.
Implementation plan: [Open feature requests](../../plans/in_progress/2026-10-09-open-feature-requests/plan.md),
S01. Planning admission does not authorize implementation. Resolution remains
pending kickoff and proof.

Traceability: introduces REQ-TRACEABILITY-BATCH-RESUME from issue 2026-10-08-FEAT-traceability_index_batch_resume

## Implementation activation

Explicit human kickoff on 2026-10-09 authorizes implementation within
[Open feature requests](../../plans/in_progress/2026-10-09-open-feature-requests/plan.md).
Reconciled [requirements](../../requirements/open-features.md) and
[UAT](../../uat/open-features.md) apply. Earlier intake-only statements
above describe filing history, not current authority.
