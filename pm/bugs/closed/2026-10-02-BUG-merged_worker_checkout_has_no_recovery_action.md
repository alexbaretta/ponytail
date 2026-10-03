# Merged worker with missing checkout has no scheduler recovery action

- ID: `2026-10-02-BUG-merged_worker_checkout_has_no_recovery_action`
- Type: `BUG`
- Status: `closed`
- Authority: stakeholder direction to repair Ponytail causes of GWEN under-parallelism.

Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-merged_worker_checkout_has_no_recovery_action
Traceability: plans-implementation REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-merged_worker_checkout_has_no_recovery_action
Traceability: plans-verification REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-merged_worker_checkout_has_no_recovery_action

## Confirmed cause

Eight live GWEN assignments have integrated deliveries and remain open for
review or acceptance, but their original managed checkouts are gone. Their
sessions are waiting. Status reports informational
`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY`, and their continuations are not
ready. Yet `advanceLedger` only creates `RECOVER_WORKTREE` for
`CAMPAIGN_WORKTREE_RECOVERY_REQUIRED`, a diagnostic limited to undelivered
`ACTIVE` and delivered `REBASE_REQUIRED` states. The worker may recover itself
if it can receive a prompt, but the coordinator's action-only scheduler exposes
no recovery step for an integrated `MERGED` assignment.

## Requirements and acceptance

The [campaign orchestration requirement](../../requirements/campaign-orchestration.md)
preserves the original worker after delivery; the
[worker retention requirement](../../requirements/worker-worktree-retention.md)
requires same-session exact-path recovery. The existing
[missing-delivery acceptance Arc](../../uat/campaign-orchestration.md) proves
independent dispatch and integration after checkout loss, but not a later
continuation action.

For an open `MERGED` plan, after fresh complete host evidence verifies the
same idle managed session and the authenticated delivery still matches its
preserved branch tip, `advance` should expose one idempotent `RECOVER_WORKTREE`
action in `ready-actions`. It must name the exact original session, path,
branch and revision. It must not create a replacement, block an independent
dispatch, or emit recovery for a closed plan or unverified delivery. Recovery
remains worker-owned; the typed action enables coordinator orchestration and
does not invent a second physical repair command. Host automatic-deletion
policy must be checked before a broad live recovery fanout.

Pattern observation:
[2026-10-02-merged_missing_checkout_has_no_action](../../debugging-pattern-observations/2026-10-02-merged_missing_checkout_has_no_action.json).

## Validation and resolution

The existing real-Git delivery test failed before repair because `advance`
returned an unrelated `CREATE_WORKER` instead of recovery. After repair it
proves one exact `RECOVER_WORKTREE`, independent dispatch in the same ready
action inventory, and no automatic recovery once the plan is closed. All 63
campaign scheduler tests pass. Build impact reports no affected or
indeterminate targets. Full `npm test` passed, including TSTS over 648 files.
Live GWEN recovery remains a separate validation gate; host automatic-deletion
policy is not controlled by this code change.
