# Incremental indexing rereads persisted blob bodies

- ID: `2026-10-02-BUG-index_rereads_committed_blobs`
- Type: BUG
- Status: closed
- Authority: stakeholder's active live-campaign goal authorizes diagnosis and
  repair of confirmed Ponytail blockers; existing incremental-index requirement.

Observed: GWEN admin commit hook's `project-qa.js` remained live for over five
minutes, with a repeated Git child and increasing CPU time while its PostgreSQL
connection was idle. No deadlock, crash or terminal failure is claimed.

Confirmed mechanism: `prepareGitCommitBatch` expands each unseen commit's full
tree and reads every blob before the database's conflict handling deduplicates
already persisted immutable blobs. A single new commit rereads unchanged files.
Default QA transaction size one repeats this across commits.

Repair scope: query persisted blob identities in this repository before body
reads, retain full tree mappings and commit checkpoints, and read only missing
blobs. No schema, historical GC, lock, capacity, or consumer-state change.
Concurrent readers/writers retain existing idempotent inserts; blobs are never
garbage collected under the approved historical-retention contract.

Requirements reconciliation: [repository text index](../../requirements/repository-text-index.md)
already requires ingestion of only unseen Git objects. No new requirement.
UAT reconciliation: existing incremental refresh acceptance remains applicable;
add focused real-Git regression proof for unchanged-body reads.

Traceability: plans-implementation REQ-REPOSITORY-TEXT-INDEX from issue 2026-10-02-BUG-index_rereads_committed_blobs
Traceability: plans-verification REQ-REPOSITORY-TEXT-INDEX from issue 2026-10-02-BUG-index_rereads_committed_blobs

Acceptance: a new commit retains all tree entries while previously indexed
blob bodies are not reread; changed content is still prepared. Existing tests,
traceability, build-impact and final core acceptance must pass.

Resolution: repository-scoped persisted immutable blob identities now exclude
body reads before preparation; all tree mappings and transaction paths remain.
The regression failed first on the old body read and passes after the repair.
All 29 focused index tests pass. The configured full command passes 531 core,
23 Pi, 4 MCP and 80 TSTS tests. Its first sandbox attempt could not access
local PostgreSQL; the database-enabled run stopped only because these new PM
records were not staged for the final tracked-file structural gate, rerun
after staging. Rules, versions, traceability and no-build impact pass. Log:
`tmp/index-blob-reuse-final.log` (ignored).

Pattern observation: [deduplication ordering](../../debugging-pattern-observations/2026-10-02-index_blob_reads_before_deduplication.json).
Live latency reduction is not yet measured; already-running processes retain
the old module. No running hook was terminated or consumer state edited.
