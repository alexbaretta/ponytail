# Fast semantic rebase acceptance

[Back to UAT index](index.md)

## Suite: Aggregate-review semantic rebase

Traceability: verifies REQ-FAST-SEMANTIC-REBASE

### Arc: A worker rebases a representative divergent history

- **Obligations:** `FSR-01`, `FSR-02`, `FSR-03`, `FSR-04`, `FSR-05`.
- **Actor:** A Ponytail worker session operating an isolated real Git fixture.
- **Prerequisites:** Two divergent branches contain patch-equivalent commits,
  similar commits with shared and differing hunks, completely distinct
  commits, a multi-commit source hunk, a rename, a deletion, and a textual
  conflict. The worker receives the installed semantic-rebase skill and CLI.
- **Profile:** Automated local integration fixture; no external service or
  production state.
- **External effects:** Only the disposable fixture repository is mutated.

1. Ask the worker to perform the semantic rebase onto the target branch using
   the installed skill and `ponytail rebase` commands.
   - The worker first invokes `diff`, reviews one combined source/target stream,
     and writes a selection bound to the frozen analysis.
2. Inspect the analysis and worker selection.
   - Stable IDs cover both final trees; equivalent, similar, and distinct
     commit cases are visible without CLI semantic classification.
3. Run the selected replay.
   - Every contributor to selected final source changes stops; unrelated clean
     commits replay without an agent stop; an unexpected textual conflict is
     retained for review.
4. Let the worker resolve each retained stop and continue.
   - A resolution restricted to selected lineage proceeds. A deliberately
     broadened resolution is refused until the residual change is reviewed.
5. Inspect completion and abort behavior in separate fixture runs.
   - Completion has target ancestry, complete original-to-replayed accounting,
     no rebase state, and only understood changes. Abort restores the exact
     original source tip and leaves unrelated refs unchanged. Repeat completion,
     selected-stop continuation and abort from a detached source; it remains
     detached. A change between attached and detached source state after review
     is rejected before replay. Retained V1 state remains readable.
6. Inspect the command transcript.
   - No rebase command ran tests, builds, QA, fetch, push, publication, merge,
     worktree creation, autostash, autosquash, or update-refs behavior.
