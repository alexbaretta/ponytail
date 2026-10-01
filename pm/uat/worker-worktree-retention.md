# Retained-worker acceptance Suite

**Requirement:** [REQ-WORKER-WORKTREE-RETENTION](../requirements/worker-worktree-retention.md).

Traceability: verifies REQ-WORKER-WORKTREE-RETENTION

## Arc: Retain and reuse workers

Actor: campaign coordinator. Automated profile: disposable real Git repositories
and authenticated host observations at the production scheduler boundary.

1. Integrate a worker delivery and close its plan with no other ready plans.
   The assignment completes logically; no session or worktree archive action
   is emitted and its checkout and project-owned resources remain present.
2. Make another plan ready, including in a successor campaign of that same
   top-level project. The first safe inactive pair is reused with a fresh
   assignment attachment. Busy or dirty pairs are not selected.
3. Retry a historical pending automatic archive action after upgrading.
   It is superseded as retention, never reported as physical deletion success.

## Arc: Bound capacity without cross-project interference

Actor: independent coordinators. Automated profile: production scheduler with
two user-owned top-level projects sharing a real Git main worktree.

1. Fill project A with fifteen workers, counting outstanding creation
   reservations. Another ready task waits; no sixteenth creation is emitted.
2. Schedule project B. Its own unused capacity remains available.
3. Complete an eligible assignment in A. Reuse that pair without deleting it.
4. Repeat scheduling concurrently and after restart. Capacity reservations
   remain unique and deterministic; existing excess workers are retained.

## Arc: Recover without a usable worker cwd

Actor: the original authenticated worker. Automated profile: real Git and CLI
from a neutral existing directory. External effect: reconstruct only the exact
previously assigned checkout; preserve all other repository state.

1. Attach a worker and record its main-worktree identity and recovery authority.
2. Remove its disposable fixture checkout while preserving its branch and
   commit. Provide no archived host artifact.
3. Invoke canonical recovery from a neutral directory without a new coordinator
   action. The same checkout path and branch are reconstructed from the main
   worktree, with the original session and assignment unchanged.
4. Repeat recovery with local edits present. They remain untouched.
5. Exercise incorrect authority, symlink target, occupied branch, missing
   source, and missing commit cases. Each fails without a substitute worker,
   branch reset, foreign-project configuration lookup, or destructive cleanup.
6. Run canonical project adoption/setup and resume the assignment. Existing
   recovery bookkeeping reconciles without replacing action identity.

## Arc: Live Codex session continuity

Manual host profile; not satisfied by a Git fixture or fabricated host result.
Prerequisites: a test-owned authenticated session, a preserved committed
checkpoint, host automatic deletion disabled, and explicit authority for the
fixture's exact-path recovery.

1. Record session identity and checkout, then make that fixture checkout absent.
2. Have that same session recover from a neutral directory using its recorded
   main-worktree path. Do not create another session or depend on an attached
   archive artifact.
3. Verify commands in the original session operate from the restored checkout
   and host association still identifies the same session and path.
4. Verify the coordinator observes recovery and resumes the original action.
   Record separately whether a native snapshot restored unsaved files; Git
   reconstruction alone is evidence only for committed content.

Acceptance is pending until recorded execution evidence satisfies every Arc.
