# Retained-worker acceptance Suite

**Requirement:** [REQ-WORKER-WORKTREE-RETENTION](../requirements/worker-worktree-retention.md).

Traceability: verifies REQ-WORKER-WORKTREE-RETENTION

## Arc: Retain and reuse workers

Actor: campaign coordinator. Automated profile: disposable real Git repositories
and authenticated host observations at the production scheduler boundary.

1. Integrate a worker delivery and close its plan with no other ready plans.
   The assignment completes logically; no session or worktree archive action
   is emitted and its checkout and project-owned resources remain present.
2. Make another plan ready in the same campaign. The first safe inactive pair
   created for that campaign is reused with a fresh assignment attachment.
   Busy or dirty pairs are not selected. An idle chat unrelated to that
   campaign, including one in the same checkout or another campaign, is not
   eligible even when the project has no spare creation capacity.
3. Attempt the reuse attachment from a different session in the reserved
   checkout. It fails without binding or consuming the action; the exact
   selected session then attaches with the original token.
4. Retry a historical pending automatic archive action after upgrading.
   It is superseded as retention, never reported as physical deletion success.

The exact-session and unrelated-idle-chat steps passed in disposable real-Git
scheduler tests on 2026-10-02. In live GWEN, the coordinator reported that the
original selected worker authenticated, its original reuse action completed,
and its assignment became `ACTIVE`; its tasklet work remains in progress. This
is not yet a campaign-wide or release-acceptance pass.

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

## Arc: Live Codex retained pair survives idle and capacity pressure

Traceability: verifies REQ-WORKER-WORKTREE-RETENTION

Actor: campaign coordinator and one existing authenticated Codex worker.
Manual native-host profile; disposable test-owned assignment and checkout.
Prerequisites: inspect and record the actual host automatic-worktree-cleanup
setting, then disable automatic deletion for the retained pool through the
supported host control. Do not delete a user-owned or active checkout to set
up this Arc.

1. Deliver and integrate the worker's clean committed milestone, complete its
   assignment obligations, and observe logical release. Verify no Ponytail
   physical archive action was emitted and record the native session/path.
2. Leave the chat idle while other supported worktrees are created or reused
   up to the project's approved capacity. Refresh native artifact and Git
   observations. The original checkout remains present and registered, and
   the same session still owns it; a merely waiting chat is not retired.
3. Send a new in-scope task to that same retained session through the supported
   host operation. It accepts the prompt and operates from its original
   checkout without a human Restore worktree click or a replacement session.
4. If the path disappears, stop the successful profile. Preserve the exact
   branch, commit, assignment, and native snapshot; record the host cleanup
   setting and removal trigger. Test separately whether the original chat can
   receive a recovery prompt. If it cannot, record a host-continuity failure
   rather than claiming that worker-owned recovery is autonomous.

This Arc remains unverified on the live Codex host. The real-Git retention and
recovery regressions do not establish host cleanup configuration or native
prompt delivery.

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
continuity. The coordinator subsequently refreshed its observation. The
complete live Arc remains open for resumed assignment after the client setup
blocker is resolved.
No restored unsaved-file content or campaign delivery was claimed.

### Legacy relocated-checkout recovery regression

The PWP live attempt was initially rejected by stale `PreToolUse` guidance
that named the replacement binding checkout, although fresh host state and
immutable campaign history proved the native session still belonged to the
initial checkout. The hook now provides the same context as the authenticated
worker prompt hook. Automated Git tests verify it identifies the initial
checkout only with fresh, complete host evidence and matching dispatch/recovery
history, and denies a different session.

After the local Ponytail plugin was refreshed, the same PWP session
`01a0f569-3b81-7472-b302-4782dd25ca27` invoked recovery from a neutral
directory. Its native cwd and authenticated binding both returned to original
checkout `/Users/alex/.codex/worktrees/38fe/gwen`, clean on branch
`codex/pwp-oauth-redirect-lifecycle-38fe` at
`a0619393f476069ada42385110794db4e1aeda85`. The replacement checkout
`/Users/alex/.codex/worktrees/pwp-recovery/gwen` remained clean and detached
at the same revision. Assignment `46bfb45f-a207-40b7-8287-33c40bf90fdd`
remained `MERGED`; delivery and action identities were preserved. Canonical
GWEN adoption succeeded as `gwen-1086`. The worker's later full local setup
was blocked separately by missing credentials for retained Elastic data.
The coordinator briefly observed no blocking PWP diagnostic, but complete
campaign resumption remains an independent acceptance gate.

The context-refresh regression also invokes an ordinary neutral-cwd diagnostic
before recovery and verifies the authenticated hook supplies current proven
legacy guidance. The same test verifies unproven relocation supplies no such
guidance and campaign mutation still fails closed. Separately, the coordinator
reported a provider worker's restored checkout disappeared again; the same
session recovered and re-adopted it, but the native cleanup cause is unknown.
This demonstrates repeatable reconstruction, not a Ponytail-controlled host
retention guarantee.

### Pre-attachment recovery Arc

1. Start one native managed-worktree creation and retain its original client
   receipt, action, assignment, and attach token. Correlate its ready session
   and exact native cwd through supported host evidence.
2. Remove the fixture checkout before adoption or authenticated attachment.
   Record a fresh complete observation and the original action's `PROVISIONED`
   result. Assignment state remains pending; no attachment is claimed.
3. Expire the observation. The same worker recovers from a neutral cwd using
   its original token. Verify the original path is detached at the dispatch
   checkpoint, with unchanged ledger and client/action identities.
4. Adopt immediately before setup, establish the canonical assignment branch,
   and authenticate the original attachment. Only then record creation success.
5. Reject unknown sessions, coordinator paths, mismatched native paths, stale
   enrollment evidence, and another worker's recovery capability without
   mutating persistent ownership.

Automated real-Git regression: `tests/worker-worktrees.test.js`,
`provisioned original worker recovers before adoption and attachment without
replacing its started creation`. Live GWEN acceptance remains pending for
the original effect-disposition and gate-race workers; automated reconstruction
is not evidence of native chat continuity or product tasklet completion.

The repaired focused scheduler/recovery/hook suite passes 71 tests. Final core
acceptance passes 506 core tests, installer and bundled suites, 80 TSTS tests,
584-file structural validation, and 221 traceability relationships. Build-impact
reports no affected or indeterminate targets.

### Pre-attachment adoption upgrade Arc

Actor: the original provisioned worker, still pending authenticated attachment.
Automated profile: production CLI/hook/ledger boundaries and disposable real
Git repositories; no live slots or resource provisioning.

1. Preserve the original started creation and enroll its exact session/path.
   Integrate an adoption-tooling repair in its owning top-level checkout.
2. Invoke `ponytail worktree upgrade <original-token> --revision <integration-commit>`
   from an existing neutral cwd. Verify clean detached switching, immutable
   dispatch provenance, original action/client/token, and latest bootstrap V2.
3. Resume persisted intent before/after switching, with checkout disappearance
   both with and without retained registration. A later integration commit
   does not change the pinned target. Repeated success is idempotent.
4. Immediately adopt, establish the branch at the completed checkpoint and
   authenticate the original attachment. Ordinary creation completion becomes
   ACTIVE without a replacement or a new assignment.
5. Reject wrong sessions, unintegrated targets, pending attachment, locked or
   attached registration, tracked/untracked edits and ignored-file overwrite.
   Preserve content and intent after a switch failure. Historical V1 records
   normalize without invented upgrade history; enrollment replay preserves V2
   checkpoints. Another top-level project's commits/configuration are not the
   owning project's integration target even with shared Git objects.

Implementation: `bde2674`. The combined focused production-boundary selection
passes 111 tests. The six upgrade-specific real-Git tests include the exact
original creation completion and negative controls. Full final core acceptance
is recorded by the [repair plan](../plans/closed/2026-10-01-bootstrap-adoption-upgrade/plan.md).
Live effect-disposition/gate-race adoption remains pending the GWEN capacity
repair and its own human index publication; fixture proof does not establish
live tasklet execution or host continuity.

### Further live continuity evidence and host boundary, 2026-10-01

The original PWP session `01a0f569-3b81-7472-b302-4782dd25ca27`, completed
native turn `01a0fb31-bdbd-74f1-a969-ba50cf48647d`, reported real browser
acceptance from its restored original checkout. Canonical TLS, prerequisite
builds, and the disposable browser control plane succeeded without resetting
retained Elastic data. The browser showed login in the owning Project and
denied access to a sibling Project. The worker recorded sanitized partial
evidence, then became idle at the required human password-reset handoff;
replacement-password login and tasklet completion remain unverified. This
corroborates recovery followed by actual work in the original native session,
not completion of the full manual host Arc or product acceptance.

The current [official worktree documentation](https://learn.chatgpt.com/docs/environments/git-worktrees)
states that the host defaults to retaining the most recent fifteen managed
worktrees and permits automatic deletion to be disabled in settings. It also
documents protection for pinned/in-progress chats and permanent worktrees,
plus cleanup on chat archival or to meet the configured limit. This host
policy is distinct from Ponytail's per-top-level-project worker capacity.
Ponytail emits no automatic retirement, but that alone does not disable host
cleanup. The installed host's automatic-deletion setting has not been
verified or changed; the live Arc's retention prerequisite remains open.

### Idle host-state reuse regression, 2026-10-02

Use disposable real Git checkouts with an integrated closed assignment and a
dependency-ready successor. Vary only the observed idle state between
`completed` and `waiting`. In both cases, advancing logically releases the
old assignment and then selects `REUSE_WORKER` with the same session/path;
the checkout remains present. The focused differential test initially failed
only for `waiting`, selecting `CREATE_WORKER` instead. Both cases and the full
42-test scheduler file pass after cleanup release uses canonical `idleSessions`.
See the [bug record](../bugs/closed/2026-10-02-BUG-waiting_worker_reuse.md)
for passing full core acceptance and structural evidence.
This fixture proof does not establish live reuse or disable host deletion.

Live consumer verification after installing `c8f4203`: the GWEN coordinator's
complete eighteen-session observation at `2026-10-02T07:38:38.024Z` reported
the original observe-success session `01a0f68d-27a1-7ce0-b9da-24043cacaf19`
as `waiting`. Canonical `advance` released assignment
`33e5eb5b-890c-4733-a0b6-360d3e6da0a5` from `CLEANUP_PENDING` to logical
`ARCHIVED`, without setting either physical archival flag. The next advance
reached an unchanged fixed point; reusable pairs increased from one to two.
An independent scoped read at `2026-10-02T00:39:56-07:00` confirmed both flags
false, the original checkout present, and that exact session in the reusable
pool. No replacement or retirement occurred. This proves live pool release,
not assignment of a new plan to that pair or campaign acceptance. The host's
automatic-deletion setting remains unverified.
