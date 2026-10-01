<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Codex execpolicy project isolation Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION`](../requirements/codex-execpolicy-project-isolation.md).

## Arc: Update one project independently of foreign configuration

Traceability: verifies REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION

- **Actor:** Developer updating Codex permissions in one registered project.
- **Prerequisites:** Two registered projects with separately accepted policy
  snapshots; the foreign project's live `.agents/config` is dirty or invalid.
- **Profiles:** Automated production CLI integration test.
- **External effects:** Writes only isolated fixture user state and Codex rules.

1. Update permissions from the local project.
   - Ponytail reads only that invoking worktree's proposal and succeeds without
     opening or reporting the foreign worktree.
   - The accepted foreign snapshot and its effective rules remain unchanged.
2. Repeat the local update and run local `--check`.
   - Both are idempotent and remain independent of the foreign live state.
3. Invoke the update from a registered linked worktree whose proposal differs
   from the blessed worktree.
   - Ponytail evaluates the invoking worktree and keys the accepted snapshot by
     the canonical registered repository root.

## Arc: Upgrade accepted state without foreign reads

Traceability: verifies REQ-CODEX-EXECPOLICY-PROJECT-ISOLATION

- **Actor:** Existing Ponytail user updating from accepted-state V1.
- **Prerequisites:** Exact V1 state containing accepted project provenance.
- **Profiles:** Automated policy-compiler contract test.
- **External effects:** Writes only isolated fixture user state and Codex rules.

1. Update one local project while every foreign project path is unavailable.
   - The V1 reader normalizes retained foreign policy from accepted state and
     does not access a foreign checkout.
2. Accept the displayed effective change.
   - Ponytail writes exact V2 with the local project's exact proposal and the
     retained migration provenance needed for untouched projects.
3. Restore and check the installed projection.
   - Both use accepted state without opening any project other than the one
     explicitly supplied to local check.
