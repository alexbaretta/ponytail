<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration Suite

## Arc: Query runnable plans and fill independent dispatch capacity

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

1. Provide plans with unmet plan dependencies, an unreviewed execution sprint,
   an all-DONE tasklet set, and a reviewed sprint with immediately-ready tasklets.
   Run `ponytail campaign runnable-plans <campaign> --json`.
   - Only plans with satisfied campaign prerequisites and nonempty canonical
     tasklet readiness appear, with exact sprint/tasklet IDs. Active eligible
     plans are included. The query leaves Git and the ledger unchanged.
2. With fresh complete host observations, run `campaign schedule-ready` twice.
   - All eligible unassigned or queued plans receive deterministic, retry-stable
     reservations, using idle retained pairs before creation. At most fifteen
     pairs/creation reservations belong to the same top-level project. Existing
     rebase actions remain serialized and their identities remain unchanged.
   - Returned host actions are not evidence that a Codex worker has started.
3. Exhaust tasklets before an unstarted dispatch is executed.
   - Both dispatch commands and `ready-actions` suppress it; a proven
     `NOT_STARTED` result preserves the queued assignment for later readiness.
     Started host effects retain their existing action and host identity.
4. Execute only the returned native host actions, refresh host observations,
   and continue the independent serialized join workflow.
   - No coordinator chooses plan eligibility conversationally. Delivered
     integration is still executable without remaining product tasklets.

Automated profile: `node --test tests/campaign-orchestration.test.js`.

## Arc: Reconcile a pre-existing active campaign

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

1. Bind the coordinator to a valid active campaign with no prior assignments.
2. Confirm ordinary advance refuses unassigned active-plan diagnostics.
3. Run `ponytail campaign reconcile <campaign> --json` twice.
   - Each active non-root plan has exactly one queued reservation; both runs
     retain identical IDs. No session, worktree, branch, or worker revision is
     invented. Lifecycle and tasklet records remain unchanged.
4. Advance and verify the selected queued leaf's normal typed worker action.
   - Its parent remains queued while children are unfinished, and dispatch
     still requires the canonical authenticated worker attach handshake.
5. Attempt reconciliation without coordinator authentication or with a
   conflicting retained assignment.
   - The command fails without partially reserving plans or deleting evidence.

Automated profile: `node --test tests/campaign-orchestration.test.js`.

[Back to UAT index](index.md) · Requirement:
[`REQ-CAMPAIGN-ORCHESTRATION`](../requirements/campaign-orchestration.md),
approved 2026-09-29.

## Evidence

- 2026-10-01 live dependency-unlock/reuse profile at
  `c725f51078e79fcba9a8b6f10b28a873ed8899bd`: closing monitor-state and
  state-spawn made audit tasklet S01-F03-T040 runnable. After canonical logical
  release, batch scheduling returned REUSE_WORKER
  `92bd02a4-5f03-4fb2-8d7f-11c9b95fb12f` for the retained monitor session
  and checkout, without physical creation or retirement. Native review rejected
  capability delivery before host start; NOT_STARTED was preserved. Query and
  reservation behavior are verified; attachment and tasklet activation remain
  unverified. No human blanket capability ban was identified.

- 2026-10-01 exact-readiness profile: 85 focused campaign, hook, and retained
  worktree tests pass. The full core pipeline passes, including 505 core tests,
  installer and bundled-subproject suites, 80 TSTS unit tests, and 582-file
  structural validation. The existing GWEN coordinator is testing the same
  runnable-plan query and batch reservation against the live campaign; native
  worker activation remains a supported host-tool effect, not a CLI claim.

- 2026-10-01 retirement correction: the earlier live-host profile proves only
  attachment-scoped archive, not retire-by-session or handoff retirement. The
  coordinator's subsequent incident disproved the handoff postcondition. The
  corrected original-session/project-adapter profile has automated evidence;
  live client-project execution remains unverified.

- 2026-09-29 S01 automated profile: repository inventory, dependency
  scheduling, assignment uniqueness, retry-stable dispatch, idle-worker reuse,
  Git ancestry classification, fast-forward-only integration, cleanup gating,
  CLI dispatch, and versioned-contract tests passed on the reconciled S01 tree.
- Live Codex host effects and authenticated worker-worktree ownership remain
  assigned to S02; this automated evidence does not claim those profiles.
- 2026-09-29 S02 live-host profile: a test-owned chat was moved to
  `/Users/alex/.codex/worktrees/24f2/ponytail` at revision `8bc2186`; from that
  checkout it observed both public usage lines and made no edits. Its supported
  self-archive initially failed because the handoff-created worktree was not
  attached to the destination chat. The attempted return handoff then
  partially switched the coordinator checkout before failing; the coordinator
  checkout, ignored build output, and policy changes were restored without
  loss. The worker chat was archived and all failed-setup worktrees were
  reconciled after proving that they contained no unique accepted work. A
  final managed worktree created at revision `a10b3ef` was attached to the
  coordinator task, archived through the supported recoverable operation, and
  removed from Git's worktree inventory. Together with the automated action,
  Git, retry, and cleanup-gating profiles, the live host profile passes.

## Arc: Inventory every campaign and active plan

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Ponytail CLI user or campaign coordinator.
- **Prerequisites:** One top-level worktree containing plans from two candidate
  active campaigns, valid inactive campaigns, unmarked plans in both lifecycle
  and flat-layout locations, one managed plan referencing another unmarked
  plan, and one malformed managed campaign.
- **Profiles:** Automated production-module and real CLI profile.
- **External effects:** None; inventory and validation are read-only.

1. Run the no-input campaign report in human and JSON modes.
   - Both inventories identify both active campaigns and every
     active plan, the malformed campaign diagnostics, and both unreferenced
     unmarked plans as valid unmanaged legacy data without invented membership.
     The referenced unmarked plan and its managed referrer are invalid.
     A managed plan P whose declared campaign parent C does not reference P is
     reported as stranded; no other invalid condition is labeled stranded.
   - The command exits `1` and does not select a current campaign.
2. Run repository-wide campaign validation.
   - It validates every independently classifiable plan and campaign in stable
     order, returns nonzero, and reports deterministic diagnostics only for
     malformed managed data and the campaign-referenced missing metadata.
3. Repair those records while leaving both campaigns active, then repeat
   validation and reporting.
   - Validation succeeds, each active plan resolves to its campaign, and the
     unreferenced legacy plans remain explicitly unmanaged regardless of their
     location.
4. Report one campaign through an explicit member-plan input while the other
   campaign is malformed.
   - The selected valid campaign still reports successfully and contains no
     records or diagnostics from the unrelated campaign.
5. Run `ponytail qa references` while managed campaign data is malformed or
   several campaigns are active.
   - Reference QA neither emits campaign inventory nor invokes campaign
     validation. Its result depends only on its own project-reference contract.

## Arc: Enforce top-level coordinator ownership

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Two campaign coordinators.
- **Prerequisites:** One top-level worktree with a coordinator bound to two
  active campaigns, a second coordinator session in that same worktree, a distinct
  user-selected top-level worktree, and a Codex-managed worker worktree with
  authenticated ownership metadata.
- **Profiles:** Automated multi-session adapter contract profile and live Codex
  host profile.
- **External effects:** A coordinator may mutate only its top-level worktree's
  campaign state.

1. Bind the first coordinator to both active campaigns, then attempt to bind
   the second coordinator to either campaign in that top-level worktree.
   - Both first-session bindings succeed. Ponytail rejects the second-session
     operation with both conflicting session identities and performs no
     external effect.
2. Bind and advance a campaign in the distinct top-level worktree.
   - It succeeds independently and does not alter the first worktree's
     coordinator, campaign, assignments, or integration order.
3. Run read-only status from the managed worker worktree.
   - Ponytail authenticates its ownership, evaluates status against the owning
     top-level worktree, and reports both invocation and effective worktrees.
4. Run a mutating coordinator command from that worker.
   - Ponytail either proxies it through authenticated owning-coordinator
     authority with the same idempotency identity or rejects it without an
     effect.
5. Remove or contradict the worker ownership mapping and repeat the commands.
   - Both fail closed; Ponytail does not infer ownership from directory names,
     branches, Git common-directory membership, or chat history.

## Arc: List and activate campaign lifecycles

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Ponytail CLI user.
- **Prerequisites:** Campaign roots in the configured initial, active-work,
  successful-completion, deferred, and rejected lifecycles, with a descendant
  plan selected from the initial campaign.
- **Profiles:** Automated production-module and real CLI profile.
- **External effects:** Activation moves one campaign directory and rewrites
  affected plan metadata and relative Markdown links.

1. Run `ponytail campaign list` and each supported explicit status filter.
   - The default lists active campaigns. `--active`, `--pending`, `--closed`,
     `--deferred`, and `--rejected` each list only campaigns in that normalized
     status in stable campaign-ID order.
2. Activate the pending campaign by its descendant plan name.
   - Ponytail recursively follows parent links to the campaign root, moves that
     root into active work, updates its canonical status metadata and affected
     relative links, and validates the activated campaign.
3. Activate the same campaign again.
   - The command succeeds idempotently without another mutation.
4. Attempt activation from every non-pending, non-active status or with an
   unknown plan.
   - Ponytail rejects the command without changing campaign files.

## Arc: Select among concurrent active campaigns

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator bound to two campaigns.
- **Prerequisites:** Two valid active campaigns in one top-level worktree and
  one coordinator session bound to both.
- **Profiles:** Automated CLI, orchestration, and hook-adapter profile.
- **External effects:** Advance may dispatch, integrate, or clean up work for
  only the explicitly selected campaign.

1. Run status, advance, and an unscoped composer enqueue without a campaign.
   - Each rejects the ambiguous selection and lists every candidate campaign;
     no campaign state changes.
2. Run status and advance with each campaign's root or descendant plan name.
   - Each command resolves only the selected campaign and its ledger.
3. Record an action result with an explicit campaign and action ID, then try
   the same action ID against the other campaign.
   - The matching campaign records the result idempotently; the mismatched
     campaign rejects it without altering either ledger.
4. Attempt simultaneous advances for both campaigns in the same worktree.
   - One worktree-scoped critical section serializes the operations even though
     their campaign ledgers are distinct.

## Arc: Rehydrate one authoritative scheduling view

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** A valid campaign with completed, blocked, ready, active,
  merge-pending, and cleanup-pending plans represented across test-owned Codex
  session snapshots and Git worktrees.
- **Profiles:** Automated contract and Git integration profile; live Codex host
  profile for host-state equivalence.
- **External effects:** Status inspection is read-only.

1. Request campaign status, discard coordinator conversational context, and
   request it again from the same durable state.
   - Both responses identify the same plan/session/worktree assignments,
     dependency-ready plans, rebase and merge readiness, idle workers, and
     blocking diagnostics in deterministic order.
2. Remove or contradict one live session or Git observation.
   - Status fails closed for the affected action and identifies the exact stale
     or contradictory evidence; it does not report the worker as idle.
3. Supply a scope-complete host observation containing working, waiting,
   finished, archived, and missing sessions, including one surviving worktree
   whose session is missing.
   - JSON status reports each deterministic session and worktree subset with
     its assignment and campaign item, plus separate structured diagnostics
     for every invalid association.
4. Supply duplicate active assignments, an unassigned non-root active-work
   plan, and an assignment/lifecycle contradiction.
   - Read-only status returns all conflicts in deterministic order; advance
     fails closed without changing campaign, Git, session, or worktree state.

## Arc: Dispatch each ready plan exactly once

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** At least two dependency-ready unassigned plans, one idle
  reusable worker, and capacity to create another worker.
- **Profiles:** Automated scheduler and adapter contract profile; live Codex
  host profile for session/worktree creation and reuse.
- **External effects:** Creates or reuses campaign worker sessions and managed
  worktrees.

1. Advance the campaign once.
   - Ponytail atomically records the selected plan, session, worktree, branch,
     integration revision, and idempotency identity before dispatching it to the
     idle worker.
2. Repeat the same interrupted or concurrent request.
   - Ponytail resumes or reports the existing assignment; no second active
     assignment is created for the plan, session, or worktree.
3. Advance after no safe idle worker remains.
   - Ponytail records one assignment and creates one new session and managed
     worktree for the next deterministically selected ready plan.
4. When that managed worktree is detached, verify its exact checkout and
   dispatch revision, adopt it and establish its assignment branch using the
   host project's canonical tooling, then run authenticated campaign attach.
   - Attachment succeeds only after the branch prerequisite exists. No plan
     execution precedes authentication. If bootstrap fails, retry in the same
     session and checkout with the same token; no duplicate assignment or
     replacement worker is created. A pre-existing branch is preserved.

## Arc: Select only currently executable coordinator actions

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** Durable pending dispatch, rebase, and cleanup actions;
  one dispatch becomes dependency-blocked, one has already started, and more
  clean completed workers exist than current dispatch demand can reuse.
- **Profiles:** Automated scheduler and adapter contract profile.
- **External effects:** None; the command is read-only.

1. Run `ponytail campaign ready-actions <campaign> --json`.
   - The V1 result preserves every currently executable action envelope and
     excludes the blocked and already-started dispatches without changing the
     ledger or Git revision.
2. Advance until cleanup is selected.
   - Only enough clean completed workers are retained to satisfy dispatch
     demand after idle capacity is counted. Each surplus worker yields the
     canonical worktree-then-session cleanup actions.
3. Perform project-aware worktree retirement for a returned cleanup action.
   - Project resources such as databases, containers, and Docker networks are
     released before the managed checkout and bounded slot are reclaimed.

## Arc: Integrate a delivered revision after its checkout disappears

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** One managed worker has recorded an authenticated clean
  delivery, its session is waiting or completed at the assigned path, its
  branch still names that exact commit, and an unrelated plan is
  dependency-ready. Its checkout is initially present, then disappears.
- **Profiles:** Automated scheduler and Git integration profile; live Codex
  host-observation profile.
- **External effects:** Fast-forwards the delivered revision and dispatches
  unrelated ready work.

1. Refresh the complete host observation while the delivered worker checkout
   is still present and clean.
   - The waiting session's exact delivery is merge-ready without requiring the
     whole plan or the session to be closed.
2. Refresh again after that checkout disappears.
   - Status reports `CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY`, preserves the
     delivered revision and evidence, and does not classify the idle
     session as an unverified worker.
3. With the original rebase action still pending, record its exact delivered
   revision after checkout loss, then advance through reconciliation and
   integration.
   - The action result accepts the same fresh authenticated delivery and
     branch-tip proof without requiring the vanished checkout. Ponytail proves
     Git ancestry and fast-forwards only that delivered commit.
4. Advance again while the delivered plan remains open for final acceptance.
   - Ponytail selects unrelated dependency-ready dispatch despite the visible
     recoverable diagnostic.
5. Repeat with no authenticated delivery, an active working session, or a
   branch tip that no longer matches the delivery, and with a stale host
   observation while recording the rebase result.
   - The ordinary missing-checkout diagnostic or action-result guard blocks
     the mutation; no unverified revision is accepted.

## Arc: Recover a worker before rebase after checkout loss

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator and the existing campaign worker.
- **Prerequisites:** An authenticated assignment whose managed checkout is
  missing, a fresh complete observation of the same waiting or completed
  session, and a preserved assignment branch commit containing the dispatch
  revision. A delivered worker in `REBASE_REQUIRED` additionally has an exact
  authenticated delivery at that branch commit and a waiting or completed
  session.
- **Profiles:** Automated Git and adapter-contract profile plus live Codex
  managed-worktree recovery profile.
- **External effects:** Reconstructs the original checkout from the recorded
  main worktree in the same session; creates no replacement session,
  assignment, branch, or commit. Native snapshots remain preserved.

1. Reconcile the missing checkout with all recovery proofs present.
   - Status reports `CAMPAIGN_WORKTREE_RECOVERY_REQUIRED` instead of the
     ordinary blocking missing-checkout diagnostic.
2. Advance and read ready-actions.
   - Ponytail persists and returns exactly one `RECOVER_WORKTREE` action naming
     the existing session, checkout, branch, and preserved branch revision.
3. Observe the exact managed session as `working` while that action is pending
   and its original checkout is still absent.
   - The recovery diagnostic remains nonblocking, so `ready-actions` can
     expose an independent dispatch. Without the action, or after changing the
     assignment branch tip, the ordinary missing-checkout diagnostic blocks.
4. With no archived artifact, the worker invokes `ponytail worktree recover
   <attachment-token>` from a neutral cwd. Also exercise recovery without
   steps 1–2: coordinator initiation is not a prerequisite.
   - The original path, session, branch and committed revision remain exact.
     A matching existing recovery action is acknowledged by the command; the
     coordinator refreshes observations and verifies live host continuity.
5. Report an unobserved or unmanaged path, another repository, branch or
   revision, or a dirty checkout.
   - Ponytail rejects the result and retains the same pending action.
6. Verify the exact clean checkout and refreshed host association.
   - Ponytail preserves the original assignment and binding path, retains the
     original assignment and session, and clears the recovery condition. An
     undelivered worker still needs its first delivery. A delivered rebasing
     worker retains its original delivery but must rebase and deliver the new
     revision before it becomes merge-ready.
7. Repeat without one host, binding, branch, ancestry, or managed-worktree
   proof.
   - Ponytail reports ordinary `CAMPAIGN_WORKTREE_MISSING`, emits no recovery
     action, and creates no replacement worker. Capability-owned physical
     recovery remains available to that worker despite coordinator diagnostics.
8. Keep another plan dependency-ready while a delivered rebasing worker awaits
   recovery.
   - `ready-actions` exposes the exact recovery and independent dispatch
     actions without issuing a rebase for the missing checkout.

## Arc: Rebase and fast-forward completed work

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** A worker reports completion with durable plan evidence and
  a clean branch; another integration may advance the campaign branch.
- **Profiles:** Automated Git integration profile and live Codex worker profile.
- **External effects:** Requests worker rebases and fast-forward merges verified
  worker revisions into the campaign integration branch.

1. Reconcile the completed worker while its branch does not contain the current
   campaign integration revision.
   - Ponytail reports `REBASE_REQUIRED` and does not merge.
2. Rebase the worker and reconcile again.
   - Ponytail proves the current integration revision is an ancestor of the
     worker revision and reports `READY_TO_MERGE`.
3. Advance the campaign.
   - Ponytail performs only a fast-forward merge and records the exact merged
     worker revision.
4. Repeat the merge action after interruption.
   - Ponytail recognizes the already integrated revision and does not create a
     duplicate merge or lose the assignment.

## Arc: Dispatch independent work alongside the serialized join lane

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** One outstanding worker rebase and at least two independent
  dependency-ready unassigned plans.
- **Profiles:** Automated scheduler and adapter-contract profile.
- **External effects:** May request independent worker creation or reuse while
  preserving one serialized integration action.

1. Request a rebase for a completed worker, leave that action outstanding, and
   advance again.
   - Ponytail retains the exact rebase action and selects one ready plan for a
     distinct create-or-reuse action.
2. Advance again while both actions remain outstanding.
   - Ponytail selects the next independent ready plan without duplicating an
     assignment, session, worktree, or action.
3. Record one dispatch result by action ID.
   - Only that action changes; the rebase and other dispatch remain durable and
     retryable.
4. Attempt another join transition before resolving the rebase.
   - Ponytail neither requests a second rebase nor advances the integration
     revision. After the rebase result is recorded, ordinary fast-forward
     integration resumes.

## Arc: Revalidate a pending worker dispatch

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator and Codex host adapter.
- **Prerequisites:** A pending create or reuse action whose plan later gains an
  unmet prerequisite, plus an unrelated dependency-ready plan.
- **Profiles:** Automated scheduler and adapter-contract profile.
- **External effects:** May start one host worker operation; never duplicates it.

1. Re-run advance after changing the dependency graph before the host effect
   starts.
   - Ponytail marks the existing dispatch unready and returns its same action
     identity pending an authoritative host disposition.
2. Record `NOT_STARTED` and advance again.
   - Ponytail postpones the original assignment and selects the unrelated
     ready plan without changing the original attachment identity.
3. Repeat from a new pending action, but record `STARTED` with its host identity
   before changing the graph.
   - Ponytail retains that action and host identity. It rejects `NOT_STARTED`
     and never creates a replacement worker.

## Arc: Integrate delivery before final plan closure

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign worker and coordinator.
- **Prerequisites:** An active plan, a completed worker at a clean commit, and
  committed plan-owned validation evidence.
- **Profiles:** Automated Git, delivery-contract, and scheduler profile.
- **External effects:** Fast-forward integration, followed later by cleanup.

1. From the authenticated worker, record the exact revision and evidence paths
   with `ponytail campaign deliver`.
   - Dirty, mismatched, uncommitted, empty, or escaping evidence is rejected.
2. Observe the worker as completed and advance while the plan remains active.
   - Ponytail classifies ancestry and fast-forward integrates the delivery; it
     does not require or perform premature plan closure.
3. Run final acceptance on the integrated tree and leave the plan active.
   - The assignment remains `MERGED`; cleanup is not selected.
4. Close the plan only after acceptance passes, then advance.
   - Ponytail moves the assignment to cleanup. A failed gate may instead send
     the same worker through another delivery and integration cycle.

## Arc: Deliver a plan closure before its lifecycle move is integrated

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

1. Retain an integrated assignment while its plan remains active in the
   coordinator checkout. In that same worker, finish acceptance and move the
   same stable plan ID to the configured completed directory, updating links.
2. Commit the closure and run authenticated `campaign deliver` with the actual
   completed plan and sprint evidence paths.
   - Delivery succeeds while the coordinator still has the active path.
   - Evidence from another plan is rejected without changing delivery state.
3. Refresh the idle host observation and advance through the ordinary join.
   - The exact closure commit is integrated and only then becomes eligible for
     logical assignment release. The session and checkout remain retained.

Automated profile: `node --test --test-name-pattern='worker delivery resolves a closed plan' tests/campaign-orchestration.test.js`.

Live Codex profile passed on 2026-10-01: the original monitor-state worker's
closure delivery was accepted with its actual closed evidence paths, then
rebased through action `29850fad-a572-42d2-ba50-0c75ab00a47c` and fast-forward
integrated at `cd7985a11477102da02b0d2b79a7bfe2fedc4079`. The integrated
tree contains the closed plan and canonical campaign validation passes.
This proves the closure delivery/join Arc, not whole-campaign completion.

## Arc: Retain integrated workers; explicit retirement remains separately fenced

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** One completed but unmerged worker and one worker whose
  exact revision is present on the campaign integration branch and whose plan
  has passed final integrated acceptance and closed. For the explicit-retirement
  profile only, an existing legacy cleanup action and direct human retirement
  authority are required; the scheduler no longer creates cleanup actions.
- **Profiles:** Automated adapter contract profile and live Codex host profile.
- **External effects:** Automatic scheduling retains workers. Only explicit
  retirement removes the authorized checkout after resource cleanup and
  preserving any supported recoverable snapshot.

1. Attempt cleanup of the unmerged worker.
   - Ponytail refuses cleanup and retains the assignment.
2. Advance after the integrated worker's plan closes with no ready work.
   - Its logical assignment completes; the session/worktree pair remains
     retained. No archive action is executable. Follow the
     [retained-worker Suite](worker-worktree-retention.md) for reuse, bounded
     independent project pools, and worker-owned exact-path recovery.
3. Separately execute the human-authorized legacy retirement action.
   - The existing action names the exact session and worktree. The worker cleans
     project-owned resources, and the coordinator archives the original worker
     chat and observes that exact session as archived. `campaign retire-worktree`
     invokes the project's configured lifecycle adapter for that one claim.
     Both the directory and Git registration disappear before action success.
     No destination thread is created; the ordinary checkout and unrelated
     claims remain unchanged. No attached worktree artifact is required.
   - While the worker is working, the observation is stale, the checkout is
     dirty or unintegrated, or the adapter retains its claim, retirement is
     refused and the same action remains pending.
4. Interrupt explicit cleanup after its first external effect and resume it.
   - Ponytail reports `CLEANUP_PENDING`, repeats retirement by the original
     action ID after a crash between adapter completion and result recording, and
     never exposes the worker as idle while cleanup remains incomplete.
