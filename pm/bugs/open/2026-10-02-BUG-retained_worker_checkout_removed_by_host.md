# Retained worker checkout removed by the Codex host

- ID: `2026-10-02-BUG-retained_worker_checkout_removed_by_host`
- Type: `BUG`
- Status: `open`
- Reported: 2026-10-02 from repeated GWEN worker-continuity failures.

## Observation and expected behavior

Ponytail retains authenticated worker sessions and their managed checkout
bindings after delivery and logical assignment release. Nevertheless, live
GWEN worker checkouts have disappeared while their sessions, branches, and
delivered commits remained. One provider worker's restored checkout
disappeared again; the standalone Arc worker also has a missing checkout after
verified delivery. Codex can refuse to submit a new prompt to a chat whose
managed checkout is gone. In that state, asking the worker to recover itself
may be impossible until a human uses the host's Restore worktree control.

The approved [retention requirement](../../requirements/worker-worktree-retention.md)
says that inactive pairs remain available for safe reuse, automatic host
cleanup must be disabled for retained pools, and recovery retains the original
session and path. A coordinator message alone is not proof that the original
session can execute recovery after its host checkout disappears.

## Diagnosis boundary

Confirmed: Ponytail no longer emits automatic archive actions for ordinary
completed assignments, yet a host-managed checkout has still disappeared.
The latest `runnable-plans` query preserves the standalone worker's exact
assignment and reports `CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY`; it does not
claim tasklet execution. The host's automatic-deletion setting has not been
verified on this installation, and the deletion trigger is unknown. It is not
yet proven whether the host removed the path through automatic cleanup,
manual action, or another mechanism. Do not label this as a Ponytail deletion
or silently allocate a replacement session.

## Acceptance and evidence to collect

1. Verify the actual Codex host worktree-retention setting for the owning
   project. Establish the approved retained-pool policy through a supported
   host setting, if available and authorized; do not infer it from Ponytail's
   logical retention alone.
2. Exercise a live idle retained pair through delivery, join, logical release,
   and capacity pressure. The same managed checkout must remain registered and
   the same session must accept a new prompt without manual restoration.
3. If a checkout is removed despite that policy, preserve the original
   branch, commit, assignment, and native snapshot; record the exact host
   removal trigger and whether the original chat can receive and execute the
   canonical recovery command. A blocked prompt is a host-continuity failure,
   not evidence that worker-owned recovery succeeded.
4. Keep an unrelated runnable assignment progressing when the missing
   checkout has verified delivery and the scheduler's documented nonblocking
   proof applies. Do not suppress an ordinary unverified missing-checkout
   diagnostic.

The [live retention UAT Arc](../../uat/worker-worktree-retention.md#arc-live-codex-retained-pair-survives-idle-and-capacity-pressure)
is pending. Existing real-Git recovery tests prove reconstruction, not this
native host setting or prompt continuity. No host settings or GWEN checkout
were changed by filing this issue. No new requirement identifier or
prospective traceability relationship is created at intake.
