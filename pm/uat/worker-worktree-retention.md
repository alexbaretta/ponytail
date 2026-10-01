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
7. For an older replacement-path recovery with a native chat still associated
   with its original clean detached checkout, refresh host evidence and invoke
   the same command. The authenticated dispatch/recovery history proves both
   paths. Return the branch and binding to the original path, retain the
   replacement detached, preserve merged state and completed action history,
   and retry successfully after interruption between branch and binding steps.
   Dirty checkouts, missing provenance, and ignored-file collisions cannot lose
   data or authorize a transfer.

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

## Execution evidence

2026-10-01 automated Git/CLI and policy profiles pass on the final staged tree:
all 491 root Node tests, installer harness, 23 Pi tests, 4 MCP tests, 80 TSTS
tests, and the 570-file structure check. Focused scheduler/hook/recovery/policy
selection passed 61 tests; the subsequently reconciled policy-conformance
selection passed 10 tests. Logs are repository-ignored:
`tmp/worker-retention-final.log` and `tmp/worker-retention-final-focused.log`.

These establish retention, scoped bounded capacity, concurrent reservations,
same-path worker-owned reconstruction, and refusal/idempotency boundaries.
They do not establish live Codex session continuity. At that repository gate,
no client-project checkout/session was mutated, no plugin was installed outside
this repository, and the host automatic-cleanup setting was not changed.

### Live recovery evidence, 2026-10-01

Under subsequent human authorization, the GWEN coordinator used an already
missing checkout; no fixture deletion was performed. Worker session
`01a0f67e-68a6-7ed1-a90f-471d554941e4`, completed turn
`01a0f81c-b0f4-7e90-b294-4dfc9906093c`, ran the new canonical recovery from
`/private/tmp`. It restored its original
`/Users/alex/.codex/worktrees/aad5/gwen` checkout, clean on
`uat-requirements-aad5` at `4f855ec3e5ac23ad012a13a4053436457f66c486`.
Commands executed successfully in that same native session from the restored
path, and the app's thread record reports that original cwd. Recovery action
`43a67f20-6539-46b0-b3a3-b2004e37b1a1` was no longer pending.

GWEN adoption succeeded before local environment setup, preserving slot
`gwen-1092` and generation `7f26ce62-133e-46e3-9809-7a1d7634f345`. The first
adoption attempt required dependency installation; a subsequent LocalCloud
permission failure was resolved before adoption succeeded. Setup passed
migration rehearsal and LocalCloud, then Docker refused its Elastic network:
`all predefined address pools have been fully subnetted`.

This proves committed reconstruction, adoption, and native session/path
continuity. The complete live Arc remains open for refreshed coordinator
observation and resumed assignment after the client setup blocker is resolved.
No restored unsaved-file content or campaign delivery was claimed.

### Legacy relocated-checkout recovery regression

The PWP live attempt was rejected by stale `PreToolUse` guidance that named the
replacement binding checkout, although fresh host state and immutable campaign
history proved the native session still belonged to the initial checkout. The
hook now provides the same context as the authenticated worker prompt hook.
Automated Git tests verify it identifies the initial checkout only with fresh,
complete host evidence and matching dispatch/recovery history, and denies a
different session. This is repository proof only; the same PWP session must
still retry recovery and the coordinator must refresh observation before live
acceptance can pass.
