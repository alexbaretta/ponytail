# Blessed worktree configuration

Plan ID: 2026-09-08-blessed-worktree-configuration
Status: DONE

## Objective and authority

Replace the incorrect global component map with Git-tracked project
configuration selected through one explicitly blessed worktree per registered
repository. The user approved implementation on 2026-09-08 and explicitly
rejected blob pinning.

## Contract

- `~/.ponytail/config.json` V1 contains the Ponytail source root and sorted
  project entries with `root` and nullable `blessedWorktree` paths. It contains
  no project identity or component data and has no compatibility reader.
- Project configuration lives at `.agents/config/ponytail.json` in each
  worktree and is required to be tracked in Git for validation and blessing.
- `ponytail bless` and `ponytail bless-worktree` select the invoking worktree
  for its registered repository. `ponytail blessed` and `ponytail
  blessed-worktree` print only the selected absolute root.
- Blessing stores only the worktree path. QA reads each other repository's
  project configuration from its currently blessed worktree.
- The invoking worktree's configuration supplies its local dependencies and
  exceptions. Other worktrees neither grant permission nor contribute names.
- Components map canonical component names to sorted unique aliases. Package
  detection records the full package name and derives its unscoped shorthand.

## Sprint

1. [S01](sprints/S01.md): configuration move, blessing lifecycle, QA,
   documentation, migration, and acceptance — DONE.

## Acceptance

Focused tests cover exact global and project V1 shapes, initial registration,
both optional-suffix spellings, worktree switching, invalid blessings,
blessed foreign configuration selection, component aliases, and missing
blessed worktrees. Final acceptance runs build impact, the full unit-test
command, rule-copy validation, and version validation.

## Evidence

Starting revision: `b2be8c4`. Implementation commit: `059cb33`. TSTS fixture
correction commit: `7a1ebe2`.

Build impact reported no affected or indeterminate targets. `npm test` passed,
including 298 core tests, 23 Pi extension tests, 4 MCP tests, and 58 TSTS
tests. Rule-copy validation matched 8 copies, and all 7 version files remain
pinned at 4.8.4. The live Ponytail registry uses the strict V1 project-entry
shape and blesses `/Users/alex/git/ctosclub/ponytail`.
