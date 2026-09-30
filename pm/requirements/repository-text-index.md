<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Repository text index and grep

[Back to requirements index](index.md)

**Identifier:** `REQ-REPOSITORY-TEXT-INDEX`

**Approval:** Approved and authorized for implementation by explicit
stakeholder direction on 2026-09-30.

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
failed or unstable refresh leaves the prior complete checkpoint intact and
must not fall back to `grep` or return a knowingly incomplete result.

## `ponytail grep`

Ponytail must provide this literal-text query surface:

```text
ponytail grep <text> [--path <path>]
ponytail grep <text> --ref <ref> [--path <path>]
ponytail grep <text> --commit <commit-id> [--path <path>]
ponytail grep <text> --history <ref-or-commit> [--path <path>]
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

Repository reference QA must consume the same refreshed current-worktree index
rather than spawning repository-wide `git grep` processes or maintaining a
second text-search path.

Acceptance coverage:
[Repository text index and grep Suite](../uat/repository-text-index.md).
