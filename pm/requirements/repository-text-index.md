<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Repository text index and search

[Back to requirements index](index.md)

**Identifier:** `REQ-REPOSITORY-TEXT-INDEX`

**Approval:** Approved and authorized for implementation by explicit
stakeholder direction on 2026-09-30.

**Clarification:** Explicit stakeholder implementation request on 2026-10-01
requires the `search` command family, progress/ETA, and resumable ingestion.

**Clarification:** Explicit stakeholder implementation request on 2026-10-01
requires real worker-process history ingestion, configurable worker count and
commit transaction size, and interruption-safe worker cleanup.

**Source:**
[`2026-09-30-FEAT-repository_text_index_and_grep`](../bugs/closed/2026-09-30-FEAT-repository_text_index_and_grep.md).

## Indexed repository states

Ponytail must maintain one PostgreSQL trigram-indexed text-document store for
repository text. It must retain every textual Git blob reached through an
observed branch or tag, the commit parent graph, commit-to-tree relationship,
tree path-to-blob mappings, and append-only ref observations. Historical data
is retained indefinitely; V1 performs no historical garbage collection.

The same document store must represent an ephemeral current-worktree overlay.
The overlay replaces committed paths with current tracked modifications, masks
tracked deletions, and adds untracked files that Git does not ignore. Ignored
files, Gitlinks, and binary files are not searchable. Symlinks are never
followed. Superseded overlay mappings and documents not retained by Git history
or another current overlay are removed.

Every command that consumes this index must refresh it before querying. A
refresh compares the current refs and worktree with the last complete
checkpoint, ingests only unseen Git objects, and reindexes only dirty or
untracked content whose digest changed. Publication is transactional. A
failed or unstable refresh leaves the prior published checkpoint intact and
must not fall back to `grep` or return a knowingly incomplete result.
Completed commits are durable incremental checkpoints: interruption rolls back
only an incomplete commit, and the next refresh skips completed commits exactly
as it does when new commits have been added. Ref and worktree publication remain
atomic after all required history has been ingested.

## `ponytail search`

Ponytail must provide this literal-text query surface:

```text
ponytail search query <text> [--path <path>]
ponytail search query <text> --ref <ref> [--path <path>]
ponytail search query <text> --commit <commit-id> [--path <path>]
ponytail search query <text> --history <ref-or-commit> [--path <path>]
ponytail search update-index [-j <n_workers>] [-n <commits_per_db_transaction>]
```

The selectors are mutually exclusive. With no selector, the command searches
the refreshed current worktree. `--ref` and `--commit` search one exact tree.
`--history` searches every commit reachable from the designated ref or commit.
`--path` restricts results to one repository-relative file or subtree; without
it, the whole selected tree or history is searched. Invalid, ambiguous, or
escaping inputs fail without broadening scope.

Current, ref, and commit results identify path, line, and matching text.
Historical results additionally identify the commit. Results are complete,
stable, and duplicate-free for the selected state. Search values are bound SQL
parameters. The command fails actionably when PostgreSQL or a complete index
refresh is unavailable.

`update-index` creates or incrementally updates the same index, without running
reference-policy QA. It reports the number of unseen commits to process. For a
TTY, an open-source progress bar shows percent completion and an explicit ETA.
For a non-TTY, each completed commit emits `.`, every tenth also emits `+`, and
every fiftieth also emits `|` followed by percent completion, ETA, and newline.
Completion and interruption end the current progress line. ETA is an estimate
for remaining commit ingestion based on observed throughput, initially unknown;
overlay/ref publication is a separately identified final phase.

`-j` selects the positive number of actual worker processes that pull commit
batches from one shared queue. Its default is
`max(1, floor(number_of_cpus / 2))`. `-n` selects the positive maximum number
of complete commits in one database transaction and defaults to `1` for
compatibility. A batch becomes visible only when all of its commits, parent
edges, blobs, and tree entries are complete. Parallel workers may finish
batches out of historical order, but the resulting index is complete and
equivalent to serial ingestion.

Progress counts only commits in durable transactions and may therefore advance
by a completed batch. On SIGINT or SIGTERM, the coordinator stops assigning
work, every actual worker exits after committing a complete batch or rolling
back its unfinished transaction, and the command leaves no worker processes
behind. The command exits `130` quietly for SIGINT, preserves the prior
ref/worktree publication, and resumes by skipping every durable commit.

Repository reference QA must consume the same refreshed current-worktree index
rather than spawning repository-wide `git grep` processes or maintaining a
second text-search path.

Acceptance coverage:
[Repository text index and search Suite](../uat/repository-text-index.md).
