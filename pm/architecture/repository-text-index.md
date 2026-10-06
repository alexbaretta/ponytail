<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Repository text index

[Back to architecture index](index.md) · Governing requirement:
[`REQ-REPOSITORY-TEXT-INDEX`](../requirements/repository-text-index.md)

## Approved architecture

The existing `ponytail_index` PostgreSQL schema gains one content-addressed
text-document store with a `pg_trgm` GIN index. Historical Git blobs,
ephemeral worktree documents, normalized traceability entities, and normalized
plan records reference that store instead of owning competing full-text
implementations. No `tsvector` index remains. Structured corpus tables retain
their exact filters and graph relationships.

Git history is represented by immutable commit, commit-parent, tree-entry,
blob, and ref-observation records. Commit and tree object IDs remain distinct;
file content identity is the Git blob ID. Optional change records are keyed by
commit and parent rather than a single linked-list ancestor because a merge can
have several parents. Search reconstructs no patch chain: Git already owns
delta compression, while exact tree-to-blob mappings identify file state.

Each worktree publishes one overlay generation over its observed `HEAD`.
Overlay entries contain modified and untracked text documents plus deletion
tombstones. The effective current tree is the `HEAD` tree with overlay paths
replaced, removed, or added. Git's own ignore rules determine untracked
participation; symlink targets are represented without following them.

Current-worktree queries and reference QA select worktree refresh scope. That
scope captures and ingests only caller HEAD history, publishes its overlay,
and checks caller HEAD and the final content digest before commit. It neither
publishes nor requires stability of independent branch/tag refs. Both scopes
use the same ingestion and overlay-publication implementation and per-worktree
writer lock; changing caller content rolls back publication.

For explicit repository maintenance and ref/history queries, the indexer observes refs and uses the prior checkpoint to
ingest only unseen commits, trees, and blobs. After that immutable backfill it
captures refs and HEAD once more and sends only the late snapshot's unseen
delta through the same ingestion path. That late snapshot is the sole
publication candidate and must remain unchanged through the final transaction;
movement after the late capture fails without retry. It inventories tracked
changes and untracked non-ignored paths, hashes that bounded set, and reuses
unchanged documents. Ref observations and reached Git objects are retained
indefinitely; superseded worktree generations are deleted after PostgreSQL
snapshots no longer need them.

Each complete commit (metadata, parent edges, blobs, and all tree entries) is
committed as one durable ingestion checkpoint. A visible commit row therefore
means its tree is complete; interrupted commits roll back and are retried.
Only the final transaction publishes refs and the current-worktree overlay.
The existing project/repository/worktree writer key is held as a PostgreSQL
session lock across these transactions, released before returning its pooled
connection; disconnecting a killed process releases it as well.

For explicit `search update-index`, the lock-owning coordinator computes unseen
commits independently for the initial and late snapshots. Each nonempty phase
owns one in-memory assignment queue. Actual child processes pull batches from
that queue and use the same canonical batch-ingestion function as serial
refresh. Each worker prepares complete Git commit data, then inserts commit
rows, parent edges, unique blobs/documents, and tree entries in deterministic
key order inside one transaction. Deterministic shared-row ordering and
idempotent constraints make shared blobs safe without a second ingestion path;
historical commit completion may occur out of topological order because parent
edges reference their owning commit, not a required parent row.

The coordinator retains the advisory writer lock and is the only process that
publishes the worktree overlay and, in repository scope, refs. Cancellation closes queue assignment,
notifies every child, waits for their transaction cleanup and exit, and only
then releases the writer connection. A durable batch may finish during that
drain; progress observes it only after commit. An unfinished batch rolls back,
so restart continues from durable commit rows and publication remains atomic.

`ponytail search query` resolves one mutually exclusive state selector and one optional
path boundary, refreshes the needed index state, obtains trigram candidates
with bound SQL values, and verifies literal line matches before formatting.
Current-tree queries use the overlay; ref and commit queries join tree entries;
history queries traverse commit parents from the selected tip. Reference QA
uses this same current-tree query boundary and applies its project-identity,
dependency, exception, and Unicode-boundary policy to the returned matches.

`ponytail search update-index` invokes the same refresh boundary without QA.
Its progress observer is called only after a commit checkpoint becomes durable.
One aggregate completed count spans both bounded snapshots; its total grows if
the late snapshot adds unseen commits. cli-progress renders TTY bars;
redirected output emits commit markers, reports a discovered late delta, and
retains throughput-based ETA. The public `-j` worker count defaults to half the
available CPU count, floored with a minimum of one; `-n` defaults to one commit
per transaction. The final ref/overlay publication is reported separately.

Database or refresh failure is a command failure. There is no filesystem
search fallback because a second operational path could silently return a
different repository state.
