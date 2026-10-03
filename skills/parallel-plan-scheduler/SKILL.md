---
name: parallel-plan-scheduler
description: >-
  Deprecated legacy workflow for Ponytail's parallel campaign scheduler. Use only
  when explicitly asked to inspect or operate its existing campaign ledgers.
---

<!--
Copyright (c) 2026 Ponytail contributors.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Parallel Plan Scheduler (Deprecated)

This is the historical operating protocol for Ponytail's parallel campaign
scheduler. Ordinary plan execution uses [plan-execution](../plan-execution/SKILL.md)
and never requires this scheduler. Do not activate or dispatch through this
protocol merely because a campaign exists or this skill is available; require
an explicit user request to operate the legacy scheduler. Preserve its
identity, authorization, and recovery constraints when maintaining an existing
ledger.

A campaign may relate multiple plans through explicit dependencies. Only when
coordinated multi-session execution is explicitly requested, assign each
concurrent plan to one worker, maximize safe parallelism, and serialize joins.
Each worker optimistically rebases its delivered branch onto the current
integration revision; the coordinator verifies and fast-forward merges it.
When worker capacity or a serialized join forces a choice among independent
ready plans, prioritize source-proven product repair over coverage expansion
without inventing a dependency or pausing already dispatched work.

### Campaign Scheduler Protocol

Traceability: implements REQ-PONYTAIL-CLI-AGENT-HARNESS

When the host provides the campaign orchestration commands and coordinated
multi-session execution is approved, the campaign coordinator must use their
durable state instead of remembering worker assignments in conversation:

1. Bind the coordinator with `ponytail plan-input coordinate <campaign-root>`,
   run `ponytail campaign validate --all`, and inspect `ponytail campaign
   status [<campaign-root>] --json` whenever coordination begins or resumes.
2. For every retained assignment session, use supported host tools to observe
   that exact session rather than relying on a partial thread listing. Record
   `working`, `waiting`, `completed`, `archived`, `missing`, or `unknown`, its
   reported worktree, and managed-worktree provenance with `ponytail campaign
   observe <campaign-root> --snapshot <json>`. The snapshot's complete session
   IDs must name exactly the sessions actually checked; absence from a partial
   listing is `unknown`, not `missing`. Refresh observations after any host
   result and at every safe coordination boundary while assignments remain
   unfinished, including when a wait returns or a worker becomes idle. An
   observation older than five minutes is stale and blocks mutation.
3. Inspect the returned status before any other campaign action. Resolve
   every blocking diagnostic first. For an idle session, inspect its exact
   thread to distinguish a worker waiting for coordinator input from one that
   has finished; respond to required input or record the completed observation
   instead of treating either state as automatically reusable. If
   `status.continuations` marks an existing assignment `ready: true`, wake
   exactly its named original session to finish that assignment. On Codex,
   require that worker to run the step 7 Goal handshake before continuation;
   keep its matching active Goal and do not restart with a standalone prompt.
   It may need
   runnable tasklets, tasklet review, worker-owned integration, or remaining
   plan acceptance; `phase` identifies which, without granting product-edit
   authority. Send ready continuations for distinct plans concurrently, then
   re-observe the exact sessions before sending another prompt. Do not send
   a duplicate prompt while the first host delivery or worker turn is
   unresolved. A `ready: false` continuation carries the exact objections:
   repair those first, and never replace a missing worker from this signal.
   Record a known external prerequisite with `report-blocker` before deciding
   whether to wake its worker. An unresolved report prevents a ready
   continuation even if the session is idle and its checkout exists; resolve
   it only after the prerequisite is repaired. Do not repeat an unchanged
   blocked test to inflate active-session counts.
   Closed-plan cleanup is not a continuation. If
   `readyToMerge` is nonempty, give the verified join priority: run `advance`
   and refresh status until its merge is recorded before reserving more
   dispatches. A `REBASE_REQUIRED` delivery is worker-owned; do not synthesize
   a coordinator rebase action for it.
4. Inspect `ponytail campaign runnable-plans [<campaign-root>] --json` for
   the exact plans whose campaign dependencies are complete and whose approved,
   reviewed execution sprint has a nonempty set of immediately runnable
   tasklets. Each record includes the sprint and tasklet IDs on the current
   integration tree; active assignments are included, so this is not a list of
   unassigned plans. Planning-only work and final acceptance without tasklets
   are not tasklet-ready dispatch. Do not substitute `readyPlans`, lifecycle,
   conversation, or dependency count for this query.
   Its V2 `execution` records identify the original assignment, session,
   checkout, pending action, dispatch state, and observed/reported anomalies.
   Compare `parallelism.theoreticalWorkers` with `observedRunnableWorkers`
   and `shortfall` at every safe coordination boundary. A null observed count
   means incomplete or stale evidence, not zero workers. Native `working`
   activity is not proof that a tasklet is executing: inspect the exact worker
   when it may instead be recovering, preparing, or closing earlier work.
   Work with each anomalously blocked original worker to resolve its exact
   prerequisite. Continue independent runnable work meanwhile. Request narrow
   user help when authorization, credentials, or a manual host operation is
   genuinely required; never bypass host review, duplicate a pending request,
   replace a started worker, or waive acceptance gates to increase the count.
   Exception: when the human explicitly authorizes retry of an exact unresolved
   STARTED creation, use `ponytail campaign retry-dispatch <campaign>
   <original-action-id> --authorization <non-secret-human-authorization-reference>
   --json`. Preserve the inventory evidence and its completeness limitation;
   never call absence from a partial listing proof of NOT_STARTED. This operation
   accepts only unprovisioned, unattached creations, preserves the unknown
   original receipt and its capacity reservation, revokes its capability, and
   returns one idempotent successor. Refresh `ready-actions` and execute that
   successor through ordinary authenticated dispatch. Do not retry an original
   native creation, send its old token, manually edit state, replace a missing-
   checkout worker, or release capacity. A capacity refusal requires safe reuse
   or actual capacity, not repeated retry. When the same plan has become
   review-ready but has no runnable implementation tasklets, the fenced retry
   requires a safe idle original campaign pair and returns `REVIEW_WORKER` for
   the exact sprint; no fresh worker or product-edit lease is authorized.
   Initial `STUB` planning is not eligible for this retry. Superseded late
   originals must not attach; inspect them separately without granting
   assignment ownership.
   Record a sanitized host refusal with `ponytail campaign report-blocker
   <campaign-root> --result <json>` from the bound coordinator. The V1 object
   contains `schemaVersion: 1`, the exact `assignmentId`, nullable `actionId`,
   `phase` (`DISPATCH`, `RECOVERY`, `ATTACH`, or `EXECUTION`), `state: "BLOCKED"`,
   `code` (`HOST_REVIEW_REJECTED`, `AUTHORIZATION_REQUIRED`,
   `MANUAL_ACTION_REQUIRED`, or `ENVIRONMENT_BLOCKED`), nonempty `summary`,
   and `requiredAction`. Do not include attachment capabilities, credentials,
   or raw logs. Reports survive coordinator restarts but confer no authority
   and do not transition assignments. After the prerequisite is demonstrably
   repaired, report `state: "RESOLVED"` with the evidence in `summary`, refresh
   complete host observation, and resume the same action only when its normal
   gates permit it. Do not classify a failed recovery as successful dispatch.
   Run `ponytail campaign schedule-ready [<campaign-root>] --json` to reserve
   all eligible unassigned or queued plans deterministically, reusing safe idle
   pairs first and respecting this campaign's new-creation limit. Existing
   safe idle pairs remain reusable even when grandfathered reservations exceed
   that limit. Execute its returned
   host actions through the same authenticated protocol below. The command
   does not start Codex sessions: the current supported CLI protocol lacks
   managed-worktree creation, so native host effects remain adapter-owned.
   Then run `ponytail campaign schedule-planning-ready [<campaign-root>]
   --json`. It reserves a dependency-ready initial `STUB` sprint selected by
   the canonical planning selector only on a safe idle pair originally created
   for this campaign. A zero-tasklet count alone is not eligibility: aggregate
   plans and `PLANNING` or `READY_FOR_REVIEW` sprints are not initial `STUB`
   selections. The typed `PLAN_WORKER` action grants the exact original worker
   planning authority for `payload.sprintId`, not product-edit authority or a
   new worker slot. Preserve a started action even if planning readiness
   changes; postpone only an action proven never started.
   Then run `ponytail campaign schedule-review-ready [<campaign-root>] --json`
   when a safe original campaign pair remains idle. This separate operation
   reserves approved, dependency-ready V3 sprints whose validated tasklets
   still require executing-agent review, or detailed `READY_FOR_REVIEW` V3
   planning with `execution: null`, a validated nonempty tasklet graph, and
   approved planning dependencies. It never creates or imports a
   session, consumes a new slot, or makes those tasklets implementation-ready.
   Repeating it preserves the action and assignment identities. Give
   implementation-ready work priority when the same idle pair is needed.
   Do not choose or activate plans agentically. Repeating this command resumes
   existing identities and cannot allocate a duplicate assignment. It does not
   perform joins; use the serialized join workflow independently.
   Run `ponytail campaign advance [<campaign-root>] --json` exactly once to
   request the next deterministic transition. One advance may add at most one
   durable host action or perform one core-owned transition.
5. Immediately run `ponytail campaign ready-actions [<campaign-root>] --json`.
   Execute only the `actions` returned by `ready-actions` for coordinator-initiated
   scheduler effects. This does not suspend plan-owned work in an existing
   authenticated assignment or the worker-owned recovery described below.
   `status.pendingActions` remains the
   complete durable recovery inventory and may also contain dependency-blocked
   or already-started dispatches that must not be invoked again. A returned
   STARTED `CREATE_WORKER` with `payload.resumeOnly: true` authorizes only a
   message to its original provisioned session to finish the same bootstrap;
   it never authorizes another native creation, replacement session, or
   second checkout. If no ready
   action is returned, inspect status and advance again only when another
   compatible transition is currently warranted. `ready-actions` is read-only:
   it never creates assignments, materializes actions, or performs effects.
   Status is a derived view: reconciling one persisted assignment can leave its
   returned status unchanged. When no action appears, compare the persisted
   ledger's assignment states and pending actions before and after `advance`;
   an unchanged status response alone does not prove a no-op. Continue one
   advance at a time while a durable transition occurred, refreshing host
   observation before it becomes stale. Stop at a genuinely unchanged ledger.
   When worker capacity looks inflated or cleanup is proposed, run `ponytail
   campaign reservation-audit [<campaign-root>] --json` before any release.
   It reconciles each counted slot with fresh host activity and Git integration
   evidence. A started creation with only a client identity is an unresolved
   outcome, not a stale reservation; do not release it because it is old or
   absent from a partial thread listing. A never-started, unprovisioned action
   for a no-longer-runnable plan may be released through its original
   `NOT_STARTED` action result. Keep confirmed worker pairs for reuse even when
   their work is integrated; missing checkouts need recovery, not deletion.
6. Resume each returned action by its exact action ID; never allocate a
   replacement session or worktree, and never assign a plan conversationally.
   For a resume-only `CREATE_WORKER`, verify the named bootstrap session and
   checkout still match the fresh status observation, establish or retain its
   exact Goal, and message that session the original attachment capability.
   It performs canonical upgrade, adoption, branch setup, and attachment in
   that order. Preserve the original STARTED action and record its success
   only after authenticated attachment; do not record another STARTED or
   PROVISIONED disposition merely because the message was sent.
   On Codex hosts, every new or resumed worker must have an active native
   Goal for its exact campaign assignment before it executes the action.
   A host message is only the bootstrap transport; do not treat its delivery
   or a completed turn as proof of a Goal. Use the worker Goal handshake in
   step 7 for dispatch and in step 3 for continuations. Do not fall back to a
   one-turn prompt when Goals are unavailable or cannot be verified.
   After initiating an asynchronous host effect, record that start, advance
   again, and rerun `ready-actions` before waiting when independent
   tasklet-ready work may exist. Use `schedule-ready` to fill all available
   independent dispatch capacity before waiting. This may expose distinct create-or-reuse
   actions while a historical rebase action remains outstanding, but it must
   neither execute an action twice nor request a second rebase. New deliveries
   use worker-owned optimistic rebasing and create no `REQUEST_REBASE` action.
   On resumption, inspect the named
   worker before repeating an unresolved host request. For `CREATE_WORKER`,
   `REUSE_WORKER`, `REVIEW_WORKER`, and `PLAN_WORKER`, `ready-actions` already proves that
   `payload.dispatch.ready` is true and its state is `NOT_STARTED`, except for
   the explicit resume-only original creation described above. The same
   applicable implementation or review predicate still holds. For an
   existing assignment, use the separate `status.continuations` readiness
   and the same original session; do not wake it for product tasklets unless
   its plan appears in `runnable-plans`. `TASKLET_REVIEW` and
   `PLAN_CONTINUATION` permit only their respective plan-owned work until
   the ordinary execution selector passes. A `REVIEW_WORKER` action authorizes only the exact
   `payload.sprintId` review and plan metadata reconciliation. If planning is
   `READY_FOR_REVIEW` with `execution: null`, it authorizes detailed planning
   review and a real approval decision, not product edits or an automatic
   `tasklets_reviewed` flag.
   A `PLAN_WORKER` action authorizes only initial planning of the exact
   `payload.sprintId`; product edits still require approved planning, tasklet
   review, and a nonempty ordinary execution selection.
   Delivered rebase/integration work remains independently executable, and
   workers retain autonomous recovery authority. As soon as
   the supported host operation begins,
   record `{"ok":true,"disposition":"STARTED","hostIdentity":"<id>"}` with
   `campaign action-result`; use the returned session ID or pending client ID
   as the stable host identity. If the plan becomes unready and the host proves
   the operation never started, record
   `{"ok":false,"disposition":"NOT_STARTED"}` so the scheduler can postpone
   that assignment and select unrelated ready work. Never report
   `NOT_STARTED` after a host operation begins.
7. For a `CREATE_WORKER` without `payload.resumeOnly`, create one supported
   managed-worktree worker and put
   the Goal handshake, bootstrap sequence, and `ponytail campaign attach <attachToken>`
   in its first instruction. The coordinator gives the worker
   its exact campaign and assignment IDs, plan ID, typed action and current
   authority, integrated completion condition, and verification commands.
   The human explicitly requested Goal-backed campaign workers; in the worker
   thread, call `get_goal` first. Keep a matching active Goal for this same
   assignment; if none exists and no unfinished conflicting Goal exists, call
   `create_goal` with an objective that names the exact campaign ID, plan ID,
   and assignment ID: complete that plan through verified integrated DONE,
   while obeying the current typed action and every later canonical readiness,
   validation, delivery, and join gate. Do not set
   a token budget unless the human explicitly supplies one. Call `get_goal`
   again and report the active objective to the coordinator. A mismatched,
   paused, or budget-limited Goal requires resolution through its native
   lifecycle; never overwrite it or claim that a one-turn message is enough.
   If native Goals are unavailable, report a host-capability blocker before
   attachment or plan work. The Goal persists across turns and typed
   continuations; it does not authorize work on another plan or product edits
   during a planning/review-only phase. Mark it complete only after the
   integrated plan is DONE with required evidence; a temporary wait for a
   coordinator join or next typed action is not completion.
   Before campaign attachment, the worker verifies its exact assigned checkout
   and dispatch revision. If detached, it uses the host project's canonical worktree tooling
   to adopt the checkout and establish its assignment branch at the completed
   bootstrap checkpoint (initially the exact dispatch revision); it does not
   create another checkout or alter an existing branch. Only then does it run
   the authenticated campaign attach command.
   Bootstrap establishes local worktree prerequisites only: no plan edits or
   execution precede authenticated attachment. For `REUSE_WORKER`,
   `REVIEW_WORKER`, or `PLAN_WORKER`, message
   only the exact session named by the action, previously created for this
   campaign. An unrelated idle chat is never a substitute, even if it shares
   the project or checkout. Require the same verified prerequisites and
   attach command. Retry the same attachment token in the same session
   after a prerequisite failure; do not allocate a replacement worker. Record
   the exact host session, canonical worktree, branch, and revision only after
   the attach hook authenticates them. For `REVIEW_WORKER`, the original worker
   activates its assigned plan in its checkout and reviews the entire named V3
   sprint and its atomic tasklet graph. If planning is `READY_FOR_REVIEW` with
   `execution: null`, it decides whether to approve that planning based on the
   actual review; it does not manufacture execution or tasklet-review status.
   Otherwise it records the reviewed execution-tasklet metadata. It commits
   the plan-owned review without product-path edits and delivers the clean
   milestone through the ordinary worker-owned rebase and coordinator
   fast-forward join. Only after the reviewed metadata is integrated and the
   ordinary execution selector returns nonempty runnable tasklets may that
   same assignment edit product paths. Attachment or a coordinator message
   never substitutes for the worker's actual review or marks tasklets reviewed
   automatically.
   For `PLAN_WORKER`, the same worker runs the canonical planning selector,
   authors and reviews the exact selected `STUB` sprint and its atomic graph,
   then delivers the clean planning milestone through the ordinary worker-owned
   join. Planning alone grants no product-path lease. Keep this assignment for
   later review, implementation, and acceptance rather than dispatching a
   second worker when planning completes.
   If the coordinator's integrated branch advances while that planning action
   is pending, the worker first fast-forwards its clean assigned branch to the
   integrated commit and retries `campaign attach` with the same token. This
   refreshes only its authenticated revision; the coordinator reports action
   success using the refreshed attachment, never the old revision. A dirty,
   divergent, or not-yet-integrated worker revision cannot refresh the binding.
   Successful attachment records an ACTIVE assignment, not plan activation or
   product tasklet execution. The coordinator's plan may remain OPEN while the
   original authenticated worker awaits its exact lifecycle/backlink leases.
   Preserve that proven bootstrap interval; do not repeat dispatch, manually
   rewrite assignments, or activate in the coordinator to conceal it. After
   acquiring those leases, the worker activates its assigned plan in its own
   checkout before delivering any milestone. A clean activation delivery uses
   the normal serialized rebase/fast-forward join even while the coordinator
   still has the OPEN locator. Refresh lifecycle and host observation after
   integration; activation alone never establishes tasklet execution.
   For `RECOVER_WORKTREE`, message only the action's existing session if it
   needs a reminder; recovery does not require coordinator initiation. The
   worker follows the worker-owned recovery protocol below. Do not request a
   new host-created path, session, assignment, branch, or commit. The canonical
   recovery command preserves the original path and acknowledges a matching
   existing recovery action itself from clean Git proof. The coordinator
   refreshes observations after recovery; it does not fabricate host evidence
   or record the command's result again. Recovery does not replace the required
   authenticated `campaign deliver` step.
8. Only for an already pending historical `REQUEST_REBASE`, message the named
   worker to rebase onto the exact `ontoRevision`, wait for completion, and
   record only the resulting clean revision. Do not create a new rebase request.
9. When assigned work and its focused validation are complete, the worker
   commits the plan-owned evidence and runs `ponytail campaign deliver
   <campaign-root> --result <json>` from its authenticated worktree. The result
   names the exact clean `revision` and a nonempty `evidencePaths` array. Keep
   the plan in active work; conversational completion and premature whole-plan
   closure are not delivery evidence.
10. The authenticated worker owns the optimistic join loop after delivery;
   do not wait for a coordinator `REQUEST_REBASE` instruction. Read `campaign
   status <campaign-root> --json` from that worker to obtain the current
   `integrationRevision` and its exact assignment. If its delivered branch
   does not contain that revision, use `semantic-rebase` to replay each owned
   commit onto that exact revision, run the focused proof, and deliver the new
   clean commit with its plan-owned evidence paths. Check status again. If
   another worker was merged meanwhile, repeat against the new revision.
   Once `READY_TO_MERGE`, tell the coordinator the exact assignment and
   delivered revision, then continue checking status in bounded intervals;
   do not edit or rewrite the delivered branch while it is merge-ready. The
   coordinator gives this join immediate priority and runs `advance`, which
   alone proves current-head ancestry and fast-forwards under the existing
   short worktree critical section. Do not run an independent merge command.
   If the coordinator branch advances first, the worker repeats the semantic
   rebase/delivery loop. No round-robin ordering is needed: for a finite set
   of competing deliveries, every contention requires another successful
   join; progress still requires the coordinator and remaining workers to
   keep acting. Do not claim a wall-clock deadline.
11. After `MERGED`, the same worker resumes its plan-owned acceptance against
   the integrated tree, without a new dispatch or coordinator prompt. Rebase
   its checkout to a newer integration revision first when acceptance depends
   on that newer tree. If acceptance creates another commit, deliver it and
   repeat step 10. Close the plan only after all applicable gates pass, then
   deliver and join the closure commit as another milestone. A failed gate
   keeps the plan active. If an external authorization or resource genuinely
   blocks the worker, report the exact gate; do not treat the coordinator as
   the routine trigger for the next step. Successful closure releases the
   logical assignment for safe reuse, not its session/worktree pair.
12. Then follow the next action returned by `ready-actions`. A `REUSE_WORKER`
   action retains the finished session and managed worktree for its named next
   plan. Retain every inactive session/worktree pair indefinitely, including
   when no plan is ready. `ARCHIVED` assignment state with false physical
   archive flags means a released assignment, not an archived worker chat.
   Do not archive worker chats, delete checkouts, or release their resource
   claims to obtain capacity. Historical `ARCHIVE_WORKTREE` and `ARCHIVE_SESSION`
   actions are excluded from `ready-actions` and superseded by `advance` as
   `ok:false, disposition:RETAINED`; never execute them or fabricate deletion
   success. Reuse only the first safe inactive pair with successful creation
   recorded in this campaign's ledger. Do not import idle workers from another
   campaign, even in the same top-level project. Fifteen retained worker
   sessions, including this campaign's creation reservations, is the limit per
   campaign. At `CAMPAIGN_WORKER_CAPACITY_REACHED`, finish already
   reserved executable actions or wait for safe reuse; do not spin advances,
   create a sixteenth worker, or retire one automatically. Other campaigns
   and top-level projects keep independent capacity and reuse pools.
13. For completed supported host effects, refresh the host observation
   first when the action changes a managed checkout path, then run `ponytail campaign action-result
   <campaign-root> <action-id> --result <json>` from the coordinator worktree.
   Recording one result changes only that named action. Then refresh
   observations and return to status before advancing. Repeating the same
   action or identical result is the required interruption-recovery path.

Explicit human-requested retirement is separate from this scheduler loop.
For an existing `ARCHIVE_WORKTREE` action that the human explicitly requests
to retire, clean only that worker's project-owned resources, archive the
original chat, and observe it as archived before `ponytail campaign
retire-worktree <campaign-root> <action-id> --json`. Its committed lifecycle
adapter must prove ownership and removal. Do not use thread handoff for retirement.
A Codex-managed worktree is not necessarily an archive artifact attached to a
chat. Retention is the default; plan closure is not retirement authority.

### Worker-Owned Checkout Recovery

Traceability: supports REQ-WORKER-WORKTREE-RETENTION

An original native worker may need recovery before its first adoption and
authenticated attachment. First correlate its ready session and exact native
cwd with the original started creation, and include that supported identity
and managed-worktree provenance in a fresh complete host observation. Record
`ponytail campaign action-result <campaign> <original-action-id> --result
'{"ok":true,"disposition":"PROVISIONED","sessionId":"<original-ready-session>","worktree":"<original-cwd>"}'`.
This enrolls bootstrap recovery authority only: it does not authenticate an
attachment, complete creation, or replace its client receipt, action,
assignment, or token. Never infer identity from a partial inventory or start
another creation. The same worker can then recover its original detached
dispatch checkpoint from a neutral cwd, immediately adopt it before setup,
establish its canonical assignment branch, and use the original attach token.
Record ordinary creation success only after authenticated attachment. Once
enrolled, capability-owned recovery does not require a fresh observation or a
coordinator reminder.

If adoption itself needs a tooling repair already integrated in the owning
top-level project, the original provisioned worker may run `ponytail worktree
upgrade <attachment-token> --revision <exact-integration-commit>` from an
existing neutral cwd. This canonical operation advances only its clean detached
checkout to that descendant, preserving original dispatch provenance and
creation identity. Do not manually switch revisions before attachment: an
unrecorded switch breaks recovery ownership. Upgrade checkpoints intent before
moving Git; retry the same target or run `worktree recover` to finish a pending
transition. Then immediately adopt, establish the branch at the completed
checkpoint, and attach with the original token. Full environment setup follows
adoption; bootstrap never authorizes plan edits or product tasklets. This path
does not rebase an authenticated worker or permit arbitrary revisions.

Every authenticated worker receives its owning top-level project, original
checkout path, preserved branch, main-worktree path, and attachment recovery
capability. Prompt hooks re-emit that durable context after interruption or
compaction, even with an absent checkout. This is the worker's responsibility:
recover without waiting for a coordinator action or permission to dispatch a
replacement. Do not run `create_worktree` from the missing cwd.

1. If the checkout is missing, invoke `ponytail worktree recover
   <attachment-token>` with the tool's working directory set to an existing
   neutral directory, such as the system temporary directory. This command
   authenticates the retained ownership and reconstructs only the original
   path from the recorded main worktree. Its JSON result identifies the same
   session, branch, path, and committed revision. The main worktree is a Git
   object source, never a source of project configuration or instructions.
2. Run the project's canonical adoption/setup from the restored checkout.
   Preserve its branch and session identity. Retry the same recovery command
   after a recoverable interruption; it never resets existing local edits.
3. Resume the existing assignment and report recovery to the coordinator.
   The command acknowledges a matching pending recovery action by its original
   identity; no fresh coordinator observation authorizes physical recovery.
   The coordinator still verifies live host continuity rather than inferring
   it from Git reconstruction, and refreshes its ordinary observation.

Git reconstruction restores committed state only. Preserve native snapshots
for uncommitted/untracked files and do not claim their restoration without
evidence. Wrong ownership, changed source, locked registration, occupied branch,
or missing objects are actionable recovery failures, not permission to create
a replacement pair. Disable the host's automatic worktree deletion for the
retained pool; Ponytail retention does not control that independent host setting.

For a historical recovery that moved the binding to a replacement checkout
while the native chat retained its original cwd, first refresh the coordinator's
complete host observation. The same worker then invokes the same recovery
command from a neutral cwd. It requires the authenticated initial dispatch and
completed recovery history to prove both paths, clean registered checkouts, and
the original detached checkpoint. It returns the branch and binding to that
original checkout, retains the replacement as a detached checkout, and preserves
assignment and delivery state. Interrupted transfers are retryable. Do not
invent a matching host observation or manually edit the ledger.

The host adapter executes only the typed action selected by the core. It does
not choose a ready plan, infer an idle worker, accept conversational completion
as evidence, decide integration order, or silently repair contradictory state.
Read-only `campaign status` invoked in an authenticated worker re-roots to its
owning top-level worktree and reports both paths. Mutating campaign commands in
a worker fail closed.

Blocking campaign diagnostics outrank new dispatch, integration, cleanup, and
ordinary plan work. The coordinator repairs or reconciles their named evidence
before continuing the campaign. It never suppresses a diagnostic by deleting
an assignment, guessing that a session ended, or treating an unverified
worktree as managed.

`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY` is an informational recovery
diagnostic, not a blocking one. It means the scheduler has independently
verified the authenticated delivery revision, fresh complete host observation
of the waiting or completed managed session, and the exact surviving branch
tip after the worker checkout disappeared. Continue only
through `advance` and `ready-actions`: the scheduler may still fast-forward
that exact revision and dispatch unrelated ready work. An
open `MERGED` assignment with the same verified missing checkout also produces
one typed `RECOVER_WORKTREE` action for its original session so it can finish
review or acceptance; execute that action without replacing the worker, while
independent dispatch remains available. Before a broad live recovery fanout,
verify Codex's separate automatic worktree-deletion setting will retain the
restored pool; otherwise restoring many idle checkouts can evict one another.
An
ordinary `CAMPAIGN_WORKTREE_MISSING` lacks that proof and remains blocking.
With the checkout present, the same exact delivery and idle `waiting` session
are a completed worker milestone, not evidence that the worker is still
editing; merge readiness still requires a clean checkout.

`CAMPAIGN_WORKTREE_RECOVERY_REQUIRED` is also nonblocking because its action
payload is already source-proven from the authenticated binding, fresh complete
host observation, managed-worktree identity, and surviving assignment branch.
It can also name a delivered worker in `REBASE_REQUIRED` when the exact
delivered revision remains at that branch tip and the session is waiting or
completed. Recover its checkout in the
same session before rebasing; keep the delivery record, and require
the ordinary rebase and new authenticated delivery before merge readiness.
While that exact action is pending, the worker may be `working` before its
checkout reappears; with fresh matching host and branch evidence this remains
a nonblocking in-flight recovery, not a new missing-worker fault. An absent
action or changed proof still blocks unrelated campaign mutation.
The worker follows the worker-owned recovery protocol without waiting for
`advance` or `ready-actions` to initiate it. Refresh complete host observations
after recovery. If
Ponytail reports ordinary `CAMPAIGN_WORKTREE_MISSING`, one of
those scheduler proofs is absent; it remains blocking for coordinator mutations
but does not prevent authenticated worker-owned recovery. Do not reconstruct
ownership conversationally or change assignment identities.
