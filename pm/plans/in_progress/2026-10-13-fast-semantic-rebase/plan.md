# Aggregate-diff fast semantic rebase

- Plan ID: `2026-10-13-fast-semantic-rebase`
- Status: in_progress
- Approval: On 2026-10-13 the stakeholder approved the design and then
  explicitly authorized end-to-end implementation, including the real-Git
  worker-session integration acceptance.

<!-- ponytail-plan-campaign
{"schemaVersion":3,"id":"2026-10-13-fast-semantic-rebase","parent_plan_id":null,"depends_on":[],"obligation_document":"pm/plans/in_progress/2026-10-13-fast-semantic-rebase/obligations.json"}
-->

## Objective

Replace exhaustive commit-by-commit semantic inspection with one agentic
review of the aggregate final-state changes on the source and target branches.
Ponytail will turn the agent's selected source-hunk conflict candidates into
deterministic interactive-rebase stops while retaining ordinary Git conflict
handling and worktree isolation.

## Approved outcome

The activated requirement uses identifier `REQ-FAST-SEMANTIC-REBASE` and
preserves these atomic obligations:

- `FSR-01`: `ponytail rebase diff <target>` freezes the merge base, source
  tip, target tip, and source commit order, then emits one human-reviewable
  stream containing the aggregate `base..target` and `base..source` final-state
  changes with stable source and target change IDs.
- `FSR-02`: an agent records potential semantic-conflict relationships between
  selected source and target change IDs after reviewing that aggregate stream;
  Ponytail performs no language-specific semantic inference.
- `FSR-03`: Ponytail deterministically maps each selected final source change
  through the original source history and stops at every contributing commit,
  with a path-lineage fallback when exact line provenance is ambiguous.
- `FSR-04`: `run`, `status`, `continue`, and `abort` preserve frozen analysis
  identity, stop on unexpected textual conflicts, detect stale or broadened
  resolutions, and mutate only the invoking worktree's current branch.
- `FSR-05`: the semantic-rebase policy uses final-tree agent review as the
  fast-path semantic authority and runs no unit tests, integration tests,
  builds, or product QA during rebase execution.

The requirement, architecture, acceptance Suite, traceability relationships,
and canonical obligation baseline were reconciled at implementation kickoff.

## Scope

- Add a typed Ponytail rebase component and root CLI chapter.
- Define immutable V1 contracts for the worktree-local frozen analysis and
  agent-authored conflict selection.
- Produce a deterministic text review bundle on stdout or at `--output`.
- Represent ordinary textual hunks plus rename, deletion, binary, symlink,
  submodule, mode, and whole-file change units.
- Map selected final source changes back to all contributing source commits by
  walking rename-aware per-commit diffs.
- Drive Git's interactive rebase with a stop immediately after selected
  contributors and `pick` for the remaining source commits.
- Retain unexpected textual conflicts as stops even when the agent did not
  select their hunks.
- Regenerate a residual final-state review when a semantic resolution changes
  content outside the selected source lineage.
- Update the installed semantic-rebase policy, CLI help, command inventory,
  generated runtime, versioned-contract manifest, and traceability owners.

## Explicit exclusions

- No language parsers, symbol indexes, domain inference, dependency inference,
  or claim that Ponytail itself detects semantic conflicts.
- No unit tests, integration tests, builds, or product-QA commands launched by
  `ponytail rebase diff`, `run`, `status`, `continue`, or `abort`.
- No fetch, push, force push, publication, merge, worktree creation, autostash,
  autosquash, or unrelated-ref updates.
- No change to rolling-campaign review authority or its existing coordinator
  fast-rebase contract.
- No guarantee that a transient source change removed before the source tip
  receives semantic review; unexpected Git conflicts still stop replay.

## Architecture and contract boundaries

The new typed component owns all rebase analysis, state, hunk lineage, and
replay control. The Bash launcher only validates the registered invoking
project and dispatches the `rebase` chapter. Git remains the sole replay
engine.

The aggregate review text is the agent interface. A strict worktree-local V1
analysis manifest, stored beneath the invoking worktree's Git administrative
directory rather than the repository or common Git directory, is the machine
source of truth. A strict V1 selection document names source IDs and optional
related target IDs. Historical physical versions become immutable after a
writer emits them; readers normalize supported versions into one current typed
representation and writers emit only the latest version.

Source and target IDs are stable only within the frozen analysis. `run`
rejects changed branch, source tip, target tip, merge base, selection digest,
or analysis version rather than silently reviewing different history.

The contributor map is computed before replay. For a selected textual source
hunk, Ponytail walks its final interval backward through inverse per-commit
patches, following renames and marking every commit that creates, removes,
replaces, or changes the tracked interval. Deleted intervals are tracked
forward from the base. Ambiguous or non-textual lineage marks every source
commit touching the affected path lineage.

## Plan-wide acceptance

1. A fixture with divergent source and target histories produces one stable,
   deterministic review stream containing both final-state diffs and stable
   change IDs.
2. Cross-file source/target conflict relationships can be selected without
   requiring textual overlap or language knowledge from the CLI.
3. A selected final source hunk assembled across several commits causes every
   contributing commit to stop; unrelated clean commits replay without an
   agent stop.
4. Renames, deletions, ambiguous line mapping, and non-textual changes fail
   conservatively to the affected path lineage without broad repository-wide
   inference.
5. Unexpected textual conflicts stop naturally and retain exact original
   commit and frozen analysis identities.
6. A resolution confined to selected lineage continues with the original stop
   plan; a broadened resolution invalidates automatic continuation and emits a
   residual review bundle.
7. Stale analysis, mismatched selection, dirty starting state, foreign rebase
   state, changed target, changed source, or unrelated worktree/ref mutation is
   rejected without destroying user work.
8. `status`, `continue`, and `abort` are idempotent or fail with actionable
   state diagnostics, and abort restores the pre-run source tip in the invoking
   worktree.
9. No rebase command invokes project tests, integration workflows, builds, QA,
   fetch, push, or publication.
10. Final Git verification establishes target ancestry, complete original to
    replayed commit accounting, selected-stop accounting, no retained rebase
    state, and an explained final range-diff.
11. The canonical semantic-rebase skill and CLI documentation describe the
    aggregate-review fast path without retaining the superseded unconditional
    per-commit test or inspection requirement.

## Sprint manifest

1. [S01](sprints/S01.md): activate the approved contract, implement aggregate
   review and hunk-lineage replay, integrate the CLI and policy, and establish
   repository acceptance — `IN_PROGRESS`.

## Questions

- `[RESOLVED]` Semantic judgment belongs exclusively to the agent reviewing
  the aggregate final-state stream; CLI analysis remains language-neutral Git
  mechanics.
- `[RESOLVED]` Rebase commands do not run unit tests, integration tests,
  builds, or product QA. Development and final plan validation remain separate
  from command runtime behavior.
- `[RESOLVED]` Selected source hunks, not target hunks, determine commit stops;
  target IDs retain the agent-selected conflict context.
- `[RESOLVED]` Final-tree review is authoritative for the fast path. Source
  changes absent from the source tip are not independently reviewed unless Git
  reports a textual conflict.

## Starting checkpoint and final validation

Implementation was activated on 2026-10-13. The approved requirement,
architecture, UAT, traceability records, and obligation baseline were
reconciled before product edits. Development tests exercise the component and
CLI outside any live rebase operation. Final acceptance uses the repository's configured
build-impact, focused, full-unit, traceability, rule-copy, version, packaging,
and structure gates against the final implementation tree.

Traceability: plans-implementation REQ-FAST-SEMANTIC-REBASE from plan 2026-10-13-fast-semantic-rebase
Traceability: plans-verification REQ-FAST-SEMANTIC-REBASE from plan 2026-10-13-fast-semantic-rebase
