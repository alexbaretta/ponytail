<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Project validation isolation

[Back to architecture index](index.md) · Governing requirement:
[`REQ-PRECOMMIT-PROJECT-ISOLATION`](../requirements/precommit-project-isolation.md).

Ponytail separates the local commit gate from live global registry health.

The V2 user registry stores each project root, blessed-worktree locator, and a
validated identity snapshot containing the canonical name, synonyms,
components, repository URLs, and package coordinates used by reference QA.
V1 registrations normalize into the current representation with an explicit
missing snapshot; writers emit only V2.

`ponytail qa` validates the invoking project's live configuration and content,
then compares that content only with foreign identity snapshots. It never
opens foreign worktrees. The pre-commit hook therefore has no live dependency
on another repository.

`ponytail validate --all` owns the live cross-project boundary. It resolves
each blessed worktree, validates its tracked and committed configuration, and
compares the current identity with its snapshot. Missing, invalid, dirty, or
stale registrations fail this explicit global operation without changing any
snapshot or repository.

Registration, blessing, and Ponytail-owned identity mutations validate the
new identity before atomically replacing the user registry snapshot. A failed
refresh leaves the previous snapshot intact.
