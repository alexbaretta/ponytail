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

Before a query, the indexer observes refs and uses the prior checkpoint to
ingest only unseen commits, trees, and blobs. It inventories tracked changes
and untracked non-ignored paths, hashes that bounded set, and reuses unchanged
documents. It verifies inputs again before transactional publication. Ref
observations and reached Git objects are retained indefinitely; superseded
worktree generations are deleted after PostgreSQL snapshots no longer need
them.

`ponytail grep` resolves one mutually exclusive state selector and one optional
path boundary, refreshes the needed index state, obtains trigram candidates
with bound SQL values, and verifies literal line matches before formatting.
Current-tree queries use the overlay; ref and commit queries join tree entries;
history queries traverse commit parents from the selected tip. Reference QA
uses this same current-tree query boundary and applies its project-identity,
dependency, exception, and Unicode-boundary policy to the returned matches.

Database or refresh failure is a command failure. There is no filesystem
search fallback because a second operational path could silently return a
different repository state.
