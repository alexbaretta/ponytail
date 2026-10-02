<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Repository text index and search Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-REPOSITORY-TEXT-INDEX`](../requirements/repository-text-index.md),
approved 2026-09-30.

## Arc: Search the current worktree incrementally

Traceability: verifies REQ-REPOSITORY-TEXT-INDEX

- **Actor:** Developer or repository agent.
- **Prerequisites:** A registered repository with committed text, modified and
  deleted tracked files, an untracked non-ignored text file, an ignored file,
  a binary file, and the configured PostgreSQL index.
- **Profiles:** Automated production CLI and real PostgreSQL profile.
- **External effects:** Publishes only rebuildable current-worktree index rows.

1. Run `ponytail search query <text>` without a state or path selector.
   - Results identify every matching line in the effective current worktree,
     including modified and untracked non-ignored text and excluding deleted,
     ignored, and binary content.
2. Repeat without changing the repository.
   - No Git object or worktree document is reindexed.
3. Change one dirty file and repeat.
   - Only that changed document is inserted and the complete new overlay is
     published atomically.
4. Restrict the same search with `--path` to a file and then a subtree.
   - Every result remains inside the exact requested boundary.

## Arc: Search committed and historical states

- **Actor:** Developer investigating current or historical source.
- **Prerequisites:** A repository with branches, a tag, merge history, renamed
  paths, repeated blobs, and text added and later deleted.
- **Profiles:** Automated production CLI and real PostgreSQL profile.
- **External effects:** Appends observed Git objects and ref observations.

1. Search a branch and tag with `--ref`, then an exact commit with `--commit`.
   - Each result comes only from the selected tree and identifies path, line,
     and text.
2. Search with `--history` from a ref and a commit.
   - Every reachable commit is searched once; results additionally identify
     commit IDs and retain text that later commits deleted.
3. Repeat after advancing, rewinding, and deleting a ref.
   - Only newly observed objects are ingested, every observation is retained,
     and prior indexed history remains searchable.
4. Supply conflicting selectors, an invalid object, or an escaping path.
   - The command fails without broadening its search.

## Arc: Use one indexed path for project-reference QA

- **Actor:** Developer running local QA or a pre-commit check.
- **Prerequisites:** Registered projects with permitted dependencies,
  forbidden literal references, exact exceptions, and a repository whose raw
  match volume exceeds a child-process output buffer.
- **Profiles:** Automated production CLI and real PostgreSQL profile.
- **External effects:** Refreshes the current-worktree index only.

1. Run `ponytail qa references`.
   - QA refreshes and queries the same index as `ponytail search query`; it does not
     spawn `git grep` and does not fail with `ENOBUFS`.
2. Exercise permitted dependencies, components, installed skills, and exact
   exceptions.
   - Existing reference policy remains unchanged.
3. Make the database or refresh unavailable.
   - QA fails actionably instead of falling back to another search path or
     declaring the repository valid.

## Arc: Update with progress and resume after interruption

Traceability: verifies REQ-REPOSITORY-TEXT-INDEX

- **Actor:** Developer maintaining the index.
- **Prerequisites:** Registered test repository, configured PostgreSQL, and
  at least 51 unseen commits. Previously published refs/overlay are preserved.
- **Profiles:** Real PostgreSQL and production CLI; TTY and redirected output.
- **External effects:** Appends complete commit checkpoints, then publishes
  refs and the current worktree. No Git state is modified.

1. Run `ponytail search update-index` in a TTY.
   - A progress bar displays commit percent and explicit ETA; no fabricated
     estimate appears before throughput exists.
2. Repeat against unseen history with output redirected to a file.
   - Each completed commit adds `.`, each tenth adds `+`, and each fiftieth
     adds `|`, percent, ETA, and newline. Final publication is distinguished.
3. Interrupt after some commits complete, including during the next commit.
   - Complete commits remain durable; the incomplete commit is rolled back;
     prior published refs/overlay remain intact.
   - Ctrl-C exits with status 130 without a stack trace after cleanup, as
     specified by the [CLI interruption Arc](cli-interruption.md).
4. Add another Git commit and run the same update command again.
   - Only unfinished/new commits are processed, and the complete refs/overlay
     publish atomically. Repeating an unchanged update processes zero commits.

## Arc: Ingest complete batches with real worker processes

Traceability: verifies REQ-REPOSITORY-TEXT-INDEX

- **Actor:** Developer maintaining a repository index.
- **Prerequisites:** An isolated registered Git fixture with merge history,
  shared blobs, enough unseen commits for concurrent work, and test-owned rows
  in the configured PostgreSQL schema.
- **Profiles:** Real PostgreSQL and production Node/CLI process boundaries.
- **External effects:** Appends only fixture-owned complete commit checkpoints;
  final publication remains fixture-owned. No external Git state is changed.

1. Run `ponytail search update-index -j 3 -n 2` and observe its child-process
   lifecycle.
   - Three actual worker processes pull disjoint batches from one queue; shared
     blobs and merge parentage produce one complete index without deadlock,
     duplicate tree state, or a second ingestion implementation.
2. Inspect every indexed fixture commit after completion.
   - Each visible commit has its complete metadata, ordered parent edges, and
     exact tree entries. Final refs and the overlay publish only after history
     completion.
3. Start another update with several unseen commits and interrupt it while a
   batch is active.
   - Queue assignment stops, unfinished transactions roll back, every worker
     process exits, the CLI exits `130` quietly, and the prior publication is
     unchanged. Durable progress counts only whole committed batches.
4. Rerun the interrupted update with the same options.
   - Durable commits are skipped, unfinished commits are retried, final
     publication succeeds, and no worker from either invocation remains.
5. Omit both options, then supply zero, negative, missing, duplicated, and
   non-integer values.
   - The default worker count is half the available CPU count with a minimum of
     one, the default batch size is one, and invalid input fails before indexing.
