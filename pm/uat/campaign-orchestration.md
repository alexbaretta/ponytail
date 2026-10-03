<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign orchestration Suite

## Arc: Explicit unknown-outcome creation retry

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

Actor: bound coordinator with direct human authorization for the exact original
creation. Prerequisite: unknown STARTED outcome, no provisioned/attached identity,
fresh complete retained-session observation and immediately runnable tasklets.

1. Run `ponytail campaign retry-dispatch <campaign> <original-action-id>
   --authorization <non-secret-reference> --json`. Expect one successor with
   the same assignment and new capability; original action/client receipt remain.
2. Repeat after CLI restart. Expect the same successor, no extra reservation.
3. Try old capability and late original result. Expect rejection without changing
   successor ownership. Execute successor only through normal ready-actions.
4. Try provisioned/attached original, stale observation, blocked tasklets or full
   capacity without reuse. Expect refusal without mutation. With safe idle reuse,
   expect REUSE even at capacity; original reservation remains counted.

Automated proof uses real-Git Node fixtures in campaign-orchestration.test.js;
native creation remains host-owned and is not claimed by repository acceptance.

## Arc: Authenticate, activate, and integrate an initially open plan

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

1. Dispatch a runnable OPEN plan to its original retained worker, authenticate
   attachment, and record the matching successful REUSE result.
   - ACTIVE/OPEN is a valid proven bootstrap interval. No duplicate is created.
2. Try to deliver before activating the worker's plan.
   - Delivery fails actionably without publishing milestone evidence.
3. Acquire the exact lifecycle/backlink leases, activate in that worker,
   commit clean proof, and deliver through the normal command.
   - The activation milestone becomes merge-ready despite the coordinator's
     still-OPEN plan; normal advancement integrates it with identity retained.
4. Supply ACTIVE/OPEN without matching authenticated successful dispatch, or
   change the plan to a rejected/deferred lifecycle.
   - Lifecycle diagnostics still block inconsistent state.

Automated profile: `node --test tests/campaign-orchestration.test.js`.

## Arc: Query runnable plans and fill independent dispatch capacity

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

1. Provide plans with unmet plan dependencies, an unreviewed execution sprint,
   an all-DONE tasklet set, and a reviewed sprint with immediately-ready tasklets.
   Run `ponytail campaign runnable-plans <campaign> --json`.
   - Only plans with satisfied campaign prerequisites and nonempty canonical
     tasklet readiness appear, with exact sprint/tasklet IDs. Active eligible
     plans are included. The query leaves Git and the ledger unchanged.
   - Change the eligible V3 sprint to `IN_PROGRESS`: it remains runnable with
     the same tasklet IDs, while the ordinary sprint-start query excludes it.
     An existing started sprint takes precedence over a pending sprint in its
     plan; missing approval, review, or completed dependencies cannot be
     bypassed to resume it.
2. With fresh complete host observations, run `campaign schedule-ready` twice.
   - All eligible unassigned or queued plans receive deterministic, retry-stable
     reservations, using idle retained pairs before creation. The fifteen-pair
     new-creation limit applies to this campaign alone. Existing
     rebase actions remain serialized and their identities remain unchanged.
   - Returned host actions are not evidence that a Codex worker has started.
   - With thirty-five grandfathered reservations, two safe idle campaign pairs,
     and three eligible unassigned plans, two ordered `REUSE_WORKER` actions
     appear; no new `CREATE_WORKER` action appears. A second call preserves
     both action identities.
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

- 2026-10-01 native reporting profile with installed `93d5d75`: all three
  sanitized coordinator reports succeeded through ordinary supported exec
  without manually supplying identity. The durable V1 record and refreshed
  V2 query preserve all original assignment/action/session identities and
  show three REPORTED `HOST_REVIEW_REJECTED` blockers; the two enrolled
  original creations also retain OBSERVED missing-checkout diagnostics.
  Fresh complete eighteen-session observation reports theoretical three,
  observed runnable zero, observed working one (closure), and shortfall three.
  The initial native failure exposed separate hook/CLI environments and was
  reproduced before correction. Reporting and persistence are live-proven;
  pending human authority, blocker resolution, and product activation are not.

- 2026-10-01 live V2 diagnostic profile on integrated GWEN `9d414b35`:
  before observation refresh, activity counts were null; after exact native
  session checks and complete observation, the summary reported three
  theoretically runnable plans, zero observed runnable workers, one worker
  doing earlier closure, and shortfall three. Both pre-attach original missing
  checkouts retained their exact session/action identities and recovery advice.
  Reserved slots 35 reconcile to sixteen retained paths plus nineteen pending
  creation reservations, not thirty-five running sessions. Historical started
  reservations must not be silently canceled. Durable refusal recording and
  successful repair/activation remain pending; query success is not acceptance
  of the still-blocked product tasklets.

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
   - When one working session has two earlier released assignments and one
     current assignment, `sessionAssignments` retains all three associations,
     but `workingSessions` contains that session exactly once with its current
     campaign item.
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

## Arc: Workers optimistically rebase and coordinator joins

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Two authenticated campaign workers and their coordinator.
- **Prerequisites:** Both workers have plan-owned evidence and clean branches
  based on the same integration revision; their managed sessions are working.
- **Profiles:** Automated Git integration profile and live Codex worker profile.
- **External effects:** Workers rewrite only their own branches; the coordinator
  fast-forward merges verified deliveries into the campaign integration branch.

1. Both still-working workers deliver their exact clean commits with committed
   plan-owned evidence and fresh complete managed-session observations.
   - Both become `READY_TO_MERGE`; neither needs a coordinator rebase request.
   A dirty checkout, mismatched branch or delivery, or incomplete host proof
   cannot become ready merely because its session is working.
2. The coordinator advances one join. The second worker checks status again.
   - The first commit fast-forwards exactly once; the second becomes
     `REBASE_REQUIRED`. No new `REQUEST_REBASE` action is created.
3. Without a coordinator message, the second worker semantically rebases onto
   the new integration revision, runs focused validation and redelivers.
   - Ponytail reports `READY_TO_MERGE`; coordinator advance fast-forwards it.
   An additional competing merge requires another worker retry, not a lock.
4. Repeat advance after interruption, then continue plan-owned acceptance in
   the same worker session.
   - No duplicate merge or replacement assignment occurs. The worker may
     deliver further acceptance and closure commits without a new dispatch.

Automated profile: `node --test --test-name-pattern='working workers retry optimistic' tests/campaign-orchestration.test.js`.
Live Codex worker-continuity and semantic-review evidence remain a separate gate.

### Partial live Codex proof, 2026-10-02

The original GWEN authentication worker session
`01a0f688-2e16-7c53-b3bb-72a5bb72dc30` retained its authenticated
assignment and clean branch while the campaign integration revision advanced
to `1da6513daff4a9646d16ed653f8b0941f2bfc923`. Its earlier delivery at
`7af49b4ae002c66947a5008005d2145fde8000be` became `REBASE_REQUIRED`.
Under the refreshed installed skill, the same worker independently rebased,
validated, and redelivered clean commit
`d980c2cad9ab90f7ede1561958fc1da0418ee6e2`, which the scheduler classified
`READY_TO_MERGE` without a new `REQUEST_REBASE` action. The coordinator
refreshed the complete nineteen-session host observation and used canonical
`campaign advance` to fast-forward exactly that commit. The integration
revision and assignment state then matched `d980c2c` and `MERGED`; the same
worker continued integrated acceptance on that revision. It subsequently
committed the remaining acceptance-gate record at
`386d972600e2c8f1f9a444e4aedb63f83ac07f28`, delivered it, and the
coordinator used the same canonical advance path to fast-forward that second
milestone. No new worker assignment or independent Git merge was used.

This proves one live worker-owned rebase/redelivery/join cycle and native
session continuity. It does not prove simultaneous two-worker contention, a
second retry, or completed integrated acceptance. The worker's remaining
browser Arcs include unproved fixture cases and a human password handoff;
they are not marked passed.

## Arc: Dispatch independent work alongside the serialized join lane

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** One historical outstanding worker rebase action and at least two independent
  dependency-ready unassigned plans.
- **Profiles:** Automated scheduler and adapter-contract profile.
- **External effects:** May request independent worker creation or reuse while
  preserving one serialized integration action.

1. Retain a pre-existing rebase action for a completed worker, and
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
   - If the same worker resumes edits or commits another undelivered tasklet,
     the assignment returns to `ACTIVE`, retaining its identity. Independent
     ready actions remain accessible; no new work is merged before delivery.
   - Closing a plan with unintegrated work still blocks unsafe cleanup.
4. Close the plan only after acceptance passes, then advance.
   - Ponytail moves the assignment to cleanup. A failed gate may instead send
     the same worker through another delivery and integration cycle.

Live consumer evidence, 2026-10-02: after installing `a72e3cc`, the GWEN
coordinator refreshed all 18 original sessions at `2026-10-02T08:31:17.502Z`
and ran canonical advancement. Independent read-only inspection at
`2026-10-02T01:32:41-07:00` confirmed original assignment
`a9e4a968-adad-4ae0-9b40-6275babfc319` persisted as `ACTIVE` at worker commit
`f527c6ee0548a4a87260a26c5b94d74d7ac0da4a`, with no assignment diagnostic.
`ready-actions` was accessible and returned no actions. Fresh parallelism was
10 theoretical, one working runnable worker, nine shortfall, and two reusable
pairs; remaining external prerequisites still constrained dispatch. This proves
the resumed-work transition, not T041 acceptance or campaign completion.

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

## Arc: Explain and resolve runnable-plan concurrency shortfalls

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator and the existing affected worker.
- **Prerequisites:** Three dependency/tasklet-ready plans; one original started
  creation whose provisioned checkout is absent, one reuse refused by host
  review before activation, and one independent eligible plan. Retained pool
  and reservation evidence is available in the same top-level project.
- **Profiles:** Automated CLI/adapter proof and live Codex host observation.
- **External effects:** Diagnostic queries are read-only. Blocker reports modify
  only scoped diagnostic records, not assignments or host state. Repair and
  activation require the ordinary authority and authentication gates.

1. Query runnable plans with fresh complete observations.
   - All three eligible plans remain listed. The report identifies the absent
     original checkout automatically, preserves original action/session IDs,
     and compares observed runnable workers with achievable pool capacity.
     Closure activity is reported separately from runnable-plan activity.
2. Record the exact host-review rejection and required human action for the
   failed reuse or recovery; repeat the diagnostic query after process restart.
   - The unresolved report survives, identifies its failed phase and action,
     and carries no attachment capability or credentials. It is not success,
     cancellation, a duplicate assignment, or authorization to retry.
3. Work with the named worker; request the narrow human authorization or manual
   operation only when required, without duplicating an outstanding request.
   - Independent executable work proceeds. No replacement, bypass, or unready
     plan is activated to inflate concurrency.
4. Resolve the report after verified repair and refresh host evidence.
   - The query reflects the current checkout/activity and report disposition;
     the original action can resume through the normal protocol. Resolution
     alone cannot claim native activation or authenticated attachment.
5. Repeat with missing, incomplete, and stale host evidence, and with a full
   pool lacking a safe reusable pair.
   - Observed concurrency is unknown when unproved. Capacity wait is distinct
     from anomalous execution failure; no sixteenth reservation is made.
     Historical runnable-output readers remain supported and malformed blocker
     records, cross-assignment actions, and unauthorized reporters fail.
6. Repeat with four already-assigned, tasklet-ready plans: a manual handoff
   gate, a delivered worker with a missing checkout and separate environment
   prerequisites, and two original STARTED creations awaiting project-owned
   capacity/adoption repair. Give the project two safe idle pairs but no new
   creation slots.
   - The query reports all four theoretical workers and zero workers actually
     executing their runnable tasklets. It distinguishes reported manual and
     environment gates from observed checkout loss, retains every original
     identity, and does not reassign any of the four plans merely because two
     unrelated pairs are reusable. A worker performing rebase or closure alone
     does not reduce the product-tasklet shortfall.
7. Clear one gate using its supported authority, refresh the complete host
   observation, and resume that exact worker through authenticated attachment
   or existing-assignment execution as appropriate.
   - A resolved blocker report, accepted message, reservation, or merge-ready
     delivery alone does not change observed native worker activity. A worker
     may become `working` while performing recovery or rebase, so the
     coordinator inspects its exact phase before claiming tasklet execution.
     Independent runnable work stays eligible while a proved
     missing-after-delivery checkout awaits recovery.
8. Keep one plan tasklet-ready but observe its original worker as `working`
   solely because it is semantically rebasing a previous delivery. Repeat
   while that worker runs checkout recovery, then while it actually executes
   the exact ready tasklet.
   - `observedRunnableWorkers` counts the working session in all three
     observations because its plan is runnable; it is a session-concurrency
     measure, not a tasklet-execution count. The coordinator reports the
     first two phases as non-tasklet activity and claims product execution
     only after verifying the exact tasklet phase separately.

## Arc: Assign an idle campaign worker for tasklet review without granting implementation

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Bound campaign coordinator and an original campaign worker.
- **Prerequisites:** An approved V3 sprint with validated but unreviewed
  tasklets and completed execution dependencies; one safe idle pair created
  for this campaign. Also include a reviewed implementation-ready plan and a
  distinct campaign's idle pair as controls.
- **Profiles:** Automated CLI and live Codex host attachment.
- **External effects:** One durable reuse assignment; no new Codex session,
  checkout, capacity reservation, or product edit.

1. Run `campaign runnable-plans --json` and `campaign schedule-ready --json`.
   - The unreviewed sprint is absent from implementation-ready plans and is
     not dispatched as product work.
2. Run `campaign schedule-review-ready --json` twice.
   - Exactly one typed review-only action reserves the original safe idle
     campaign pair for the approved sprint. Both calls return the same action
     and assignment identities; neither uses the other campaign's pair or
     creates a new reservation.
3. Start and attach that exact worker through the authenticated action. Have
   it inspect and reconcile the sprint's atomic tasklets.
   - Before a real review and selector pass, product-path edits are refused.
     Attachment alone does not set `tasklets_reviewed` or claim completion.
4. After the worker records the reviewed metadata and its plan-owned commit is
   integrated, rerun the ordinary implementation selector and scheduling.
   - Only the reviewed, dependency-ready tasklets become implementation-ready;
     no second concurrent assignment of the same plan or pair is made.
5. Repeat with stale host evidence, unfinished prior assignment, unintegrated
   branch, or no original safe pair.
   - No review dispatch occurs, and the exact objection remains visible.

## Arc: Assign an initial planning sprint without inventing runnable tasklets

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Bound campaign coordinator and original idle campaign workers.
- **Prerequisites:** One approved member plan with a dependency-ready `STUB`
  sprint and no tasklets; a separate reviewed implementation-ready plan; two
  safe idle pairs created for this campaign. Include aggregate zero-tasklet
  plans and unmet campaign dependencies as controls.
- **Profiles:** Automated CLI and live Codex host attachment.
- **External effects:** One durable planning reuse assignment; no new session,
  checkout, product edit, or inferred approval.

1. Run `campaign schedule-ready --json`, then
   `campaign schedule-planning-ready --json` twice.
   - Implementation and planning reserve distinct original pairs. The second
     planning call returns the same action and assignment identities; only the
     selector-ready `STUB` receives a `PLAN_WORKER` action.
2. Start and attach that exact original worker; have it run the planning
   selector, author the named sprint's graph, and deliver a clean planning
   milestone.
   - Attachment or an empty tasklet count never authorizes a product edit or
     marks the sprint approved or reviewed without the worker's real evidence.
   - While the action remains pending, advance the coordinator to an integrated
     descendant and fast-forward the clean worker branch. Retrying the same
     attachment refreshes its revision, and the exact action result persists
     through a ledger reload. A dirty or unintegrated worker revision cannot
     refresh the binding.
3. Make the sprint unready before an unstarted action, then repeat
   `ready-actions`; separately repeat after a started action.
   - The unstarted action is withheld and can be postponed. The started action
     keeps its original host identity and is not duplicated.
4. After the planning milestone joins, continue the same assignment through
   tasklet review and the ordinary execution selector.
   - Product implementation begins only after its independent review and
     nonempty runnable-tasklet proof; no replacement worker is created.

## Arc: Block a sprint until an external tasklet is integrated

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator and worker assigned to the dependent plan.
- **Prerequisites:** Two sibling campaign plans; a V4 tasklet graph in one
  sprint names a tasklet in the other plan as an external prerequisite. Keep
  an independent sprint ready as a control.
- **Profiles:** Automated campaign graph and live integrated-tree selection.
- **External effects:** No dispatch for a blocked sprint; no new host session.

1. Leave the external target unchecked on the coordinator's integrated tree.
   - The dependent sprint is neither reviewable nor implementation-runnable;
     independent work remains eligible.
2. Mark the target DONE only in the coordinator working tree, then commit it
   while its plan remains open.
   - The uncommitted marker does not release the sprint. Once the exact DONE
     record joins HEAD, the dependent sprint becomes eligible without waiting
     for whole-plan closure. A worker verifies this integrated status through
     `campaign tasklet-prerequisites --json` before proceeding.
3. Name a missing target, a target outside the campaign, then a cycle.
   - Each invalid graph fails validation with an actionable dependency error;
     Ponytail never infers an edge from prose.
4. Keep the target tasklet in an authored graph whose sprint has
   `execution: null`.
   - The edge resolves and reports `PENDING`; the frozen sprint has zero
     executable tasklets, and neither sprint is dispatched. Even an integrated
     DONE marker without an execution lease does not satisfy the edge.

## Arc: Resume an unfinished assignment only through its original idle session

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Bound campaign coordinator and the originally assigned worker.
- **Prerequisites:** An unfinished assigned plan, one observed waiting original
  session with its managed checkout, and independent control cases with a
  working session, missing checkout, pending action, conflicting assignment,
  and closed plan.
- **Profiles:** Automated CLI and live Codex host observation.
- **External effects:** Read-only status followed by an authorized message to
  the exact original session; no new session or checkout.

1. Refresh a complete host observation and inspect campaign status.
   - The idle original assignment is marked resumable with its plan, session,
     checkout, and kind of remaining work; already working and closed cases
     are not marked ready.
2. Wake only the exact ready session and have it use its canonical selectors.
   - It continues permitted tasklet, review, integration, or final acceptance
     work without replacing its assignment or bypassing an execution gate.
3. Remove the checkout, make host evidence stale, add a pending action, or
   assign the same plan, session, or checkout to a second live assignment.
   - Status retains the unfinished assignment but marks the wakeup blocked
     with the exact reason; no replacement worker is inferred.

## Arc: Audit every campaign worker reservation before cleanup

Traceability: verifies REQ-CAMPAIGN-ORCHESTRATION

- **Actor:** Campaign coordinator.
- **Prerequisites:** A campaign with a retained created worker, an unstarted
  dispatch for a now-unrunnable plan, a started creation with only a client
  identity, a provisioned session awaiting attachment, and a superseded start.
- **Profiles:** Automated CLI and live read-only host/Git inspection.
- **External effects:** The audit reads campaign, host, worktree, and Git state;
  it does not release a reservation or delete a session or checkout.

1. Run `ponytail campaign reservation-audit <campaign> --json`.
   - It emits one versioned record per counted capacity slot, distinguishing
     confirmed sessions, provisioned sessions, started-unknown creations, and
     never-started reservations; its count equals campaign capacity accounting.
2. Observe the retained worker waiting on a clean checkout with all known
   revisions integrated; then add a worker-only commit and repeat.
   - The first audit reports no unmerged commit but still forbids release of
     the retained pair. The second reports unmerged work and forbids release.
3. Refresh complete host observations, then let them expire.
   - Fresh observations report each confirmed session's actual activity;
     expired or incomplete observations report `unknown`, never inferred idle.
4. Inspect the pending and superseded starts without a confirmed session ID.
   - Their creation outcome remains unknown and release is forbidden regardless
     of age, missing thread-list entry, or plan closure. A provisioned session
     is reported as such, not as a reservation without a chat.
5. Inspect the never-started, unprovisioned reservation after its plan becomes
   unrunnable.
   - The audit identifies it as releasable through the existing `NOT_STARTED`
     action-result protocol. A still-runnable plan is not releasable.

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
