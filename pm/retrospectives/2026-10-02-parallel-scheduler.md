# Parallel campaign scheduler: September 29–October 2, 2026

This is an evidence-backed account of the attempt to run the GWEN campaign at
maximum safe parallelism through Ponytail. It records what was requested, what
was built, why successive repairs were needed, and what was *not* proved. It is
not a new scheduler design or an assertion that GWEN work was completed. The
stakeholder has stopped using the scheduler to dispatch GWEN workers and asked
the coordinator to proceed serially, using Ponytail for queries and validation
only. The [campaign requirement](../requirements/campaign-orchestration.md),
[architecture](../architecture/campaign-orchestration.md), and
[UAT](../uat/campaign-orchestration.md) retain the detailed contracts and test
cases; this document preserves the history needed to reconsider them.

## Evidence and limits

The contemporaneous stakeholder requests and coordinator/worker reports in the
Ponytail conversation are the source for intent and live symptoms. The cited
commits were checked with `git log -p`/`git show`; their patches establish what
the code and skill actually changed, not that the host accepted it. The
[initial orchestration plan](../plans/closed/2026-09-29-campaign-orchestration/plan.md),
[retention requirement](../requirements/worker-worktree-retention.md), and the
linked incident records below provide durable acceptance claims and narrower
live evidence. Counts below are *snapshots at their stated revisions*, not a
current GWEN census. “Fixed in code” means a source change and its focused
proof, not end-to-end live success. No GWEN worker was dispatched to prepare
this account.

## Intended outcome and initial model

The user wanted a deterministic, programmatic view of campaign sessions,
assignments, active/idle state, Codex worktrees, and inconsistencies: missing
sessions or checkouts, duplicate assignments, and mismatched plan states.
Commands with an explicit campaign were to tolerate multiple active campaigns;
commands outside `ponytail campaign` were not to enforce campaign uniqueness.
The coordinator needed executable actions for dependency-ready plans,
serialized integration, and eventually resource cleanup. The decisive
acceptance criterion became stronger and repeatedly explicit: every genuinely
runnable plan should have a working session, up to the safe worker limit.
Reservations and messages were not substitutes for native execution.

The September 29 implementation (`59865c3`, with host ownership in `8bc2186`
and coordinator instructions in `7464fc4`) introduced a durable
ledger, typed host actions, authenticated attachment, observation, and
fast-forward joining. It used one `pendingAction` for the whole campaign;
`advanceLedger` returned that action before considering independent plans.
Dispatch tested plan lifecycle and declared plan dependencies, not whether a
tasklet could actually run. Rebase/merge eligibility depended on the entire
plan being closed, and `MERGED` led to automatic worktree/session archiving.
Those were real design choices visible in the initial patch, not later host
failures. The closed initial plan records passing focused and full tests and a
test-owned create/archive host cycle. That proof did not exercise sustained,
high-parallelism GWEN execution, missing checkouts, unknown creation outcomes,
or multiple simultaneous deliveries.

The initial plan deliberately kept the scheduler core separate from Codex host
effects: no private Codex API was available to Ponytail, so the coordinator
agent was the trusted actuator for typed create, observe, and archive actions.
The plan required durable pending state before each effect, idempotent result
recording, one coordinator per selected top-level checkout, worker attachment
bound to native session and path, idle-worker reuse before creation, and
fast-forward-only integration. It explicitly did *not* infer dependencies
from parentage, file overlap, or chat history. Later requests changed some
acceptance criteria—especially multiple active campaigns, no automatic
retirement, and actual concurrent tasklet execution—but those were not
capabilities established by the initial live host cycle.

## How the repair sequence unfolded

| Period / evidence | Failure or changed requirement | Repair and observed limit |
| --- | --- | --- |
| September 30–October 1; `f93ceb8`, `5bb9355`, `363330a` | Multiple active campaigns and pre-existing active plans did not fit the initial selection/ledger assumptions. | Explicit campaign selection, non-campaign isolation, and reconciliation of already-active plans were added. These addressed scope and import, not worker activation. |
| October 1; `9e7b745` | A stale `CREATE_WORKER` could remain selected after its plan became dependency-blocked. A worker could not join until whole-plan closure, although closure required its changes and integrated QA. | Dispatch readiness was revalidated; a *proven not-started* creation could be postponed. A clean exact worker delivery with evidence became merge-ready before whole-plan closure. Already-started creations deliberately retained identity and uncertainty. |
| October 1; `42f60ec`, `e9d8049` | One pending effect blocked all independent dispatch while a join/rebase waited. | Ledger V2 gained `pendingActions[]`, multiple independent dispatches, one integration lane, and `ready-actions`. Initial `ready-actions` intentionally hid `STARTED` creations; that later stranded provisioned originals that needed resumption. |
| October 1; `aa8035e` through `f4f735f` | Missing worker checkouts blocked integration; `archive_worktree` rejected unattached/handoff-created checkouts; successful Codex handoff did not retire the source Git worktree. | Several exact-action recovery/retirement paths and project-owned cleanup preflights were added. The [handoff incident](../bugs/closed/2026-10-01-BUG-handoff_is_not_worktree_retirement.md) confirms the false handoff postcondition. None made missing native artifacts universally recoverable. |
| October 1; `081a50f`, `c476db9` | Cleanup was occurring before a session was safely disposable. The user reversed automatic deletion: retain session/worktree pairs, reuse safe idle pairs, limit retained workers to 15, and let the original worker recover its checkout from the main worktree. | Automatic archive action production stopped; worker-owned exact-path recovery was added. The first capacity implementation counted other campaign ledgers and imported idle workers, later corrected. Ponytail retention did not configure the independent Codex host cleanup policy. |
| October 1; `ad1f1d0`, `59783bb` | Dependency-ready plans could have zero runnable tasklets; a worker was activated only to say it could not proceed. The user requested one batch command and an explicit theoretical-versus-observed shortfall. | `runnable-plans` and `schedule-ready` began using nonempty runnable tasklets, and anomaly/shortfall diagnostics were added. This prevented one false-positive class but conflated “no tasklet now” with “nothing left for this assigned session to do.” |
| October 1; `ea5536a`, `93d5d75` | The new `report-blocker` command failed with `CAMPAIGN_COORDINATOR_REQUIRED` in the installed GWEN coordinator although direct CLI tests passed. The hook did not match the command, and the command process lacked the hook's assumed `PLUGIN_DATA`/`PONYTAIL_SESSION_ID` identity. | The command was routed through the hook and authenticated using the actual native command-side session identity. A separated-environment regression reproduced the failure; live retry of the original three reports passed. That made diagnostic reporting work, but did not clear the reported host reviews or activate workers. |
| October 2; `ae06663`, `a307361`, `f2e2523` | Unknown `STARTED` creations, stale reservations, and 35 retained/reserved slots prevented new dispatch despite few or no workers running. Reuse could import a same-project session from another campaign. | Fenced retry preserved uncertain original receipts; reuse/capacity was restricted to successful same-campaign creation provenance; `reservation-audit` exposed each reservation, activity, Git evidence and release objections. The audit was read-only and did not automatically release all 35. |
| October 2; `d55d680`, `442b906`, `047e911` | Coordinator-directed rebases and one-turn prompts created too much coordination work; a session could finish tasklets but still owe rebase, merge, or plan acceptance. | Workers were instructed to deliver and optimistically rebase until the integration head was current; status gained `continuations`; Codex workers were instructed to establish a persistent Goal. One GWEN worker rebased and joined without a new rebase request, but two-worker contention and persistent-Goal live acceptance were not proved. |
| October 2; `8ce6a09`, `c083846`, `3b5599d`, `d3ec71d`, `79fd169` | The strict runnable-tasklet selector prevented review/planning needed to make tasklets runnable; cross-plan tasklet gates and prose-only dispatch prerequisites were not in the machine graph. | Separate authenticated review/planning dispatch, integrated cross-plan tasklet gates, validation of explicit linked `Dispatch only after` dependencies, and a fenced review retry were added. These corrected specific graph/readiness gaps; the [review deadlock](../bugs/in_progress/2026-10-02-BUG-worker_review_dispatch_deadlock.md) still records live acceptance as pending. |
| October 2; `d25b026` | An original provisioned `STARTED` worker could be idle and ready to attach, but initial `ready-actions` excluded it as though only a new creation were possible. | V7 ready actions exposes a narrowly verified `resumeOnly` action with the original session/path/action identity. This was the last source commit inspected here, not proof of a full campaign recovery. |

This chronology is deliberately grouped by causal class. Numerous narrower
commits (for example `2a71ddc`, `71670bc`, `7228521`, `bde2674`, `394adca`)
repaired waiting deliveries, in-flight/pre-attachment recovery, bootstrap
checkpoints, and merged-worker checkout loss. Their presence shows repeated
previously unmodeled lifecycle states; it does not establish that each repair
worked on every live Codex host path.

The planning path exposed another incomplete adapter transition. The
[initial-planning incident](../bugs/in_progress/2026-10-02-BUG-initial_planning_dispatch_gap.md)
records an eligible `STUB` with no tasklets that neither implementation nor
review dispatch could assign. After `PLAN_WORKER` was introduced, a live reused
worker first attached at a stale pre-fast-forward revision, and the ledger's
completed-action reader rejected its new action type. `9111548` repaired the
revision refresh; the incident still calls for live acceptance of the whole
planning dispatch. This is distinct from permitting empty tasklet sets to
masquerade as runnable implementation.

## What the live evidence actually showed

The [open activation incident](../bugs/open/2026-10-01-BUG-runnable_campaign_workers_not_activated.md)
records three useful, non-interchangeable snapshots:

- At GWEN revision `9d414b35`, three plans had runnable tasklets and zero
  product-tasklet workers. Two original creations were blocked at permission
  review for outside-checkout recovery; one reuse was blocked when its
  authenticated capability message was rejected. A reservation was not an
  attached, executing session.
- At `46d710fa`, the query found nine theoretically runnable plans, zero
  observed executors, 35 reservations and no reusable pairs. The audit counted
  17 distinct retained worker paths, 16 pending creations and two superseded
  unknown-outcome creations; only six of the 17 recorded checkouts existed.
  Some reservations protected real unknown effects or unfinished work, so
  “zero running” did not make all 35 safely releasable.
- At `1da6513d`, four plans remained theoretically runnable, zero were observed
  executing their tasklets, one worker was working on another phase, and two
  pairs were potentially reusable. The four plans already had assignments;
  their blockers included an external password-reset handoff, a delivered but
  missing standalone checkout plus prerequisites, and two original `STARTED`
  creations awaiting project-owned capacity repair. Reassigning an idle pair
  would not by itself discharge those identities or obligations.

Other live reports showed zero, one, or two active sessions at different times;
they are not a single stable measurement. The user repeatedly asked for
maximum parallelism and saw no corresponding increase in completed tasklets.
The [autonomous-join issue](../bugs/in_progress/2026-10-02-FEAT-worker_autonomous_optimistic_join.md)
records one successful original-worker rebase, redelivery, fast-forward join,
and post-merge continuation. That is meaningful partial proof, not evidence
that the scheduler could activate and sustain 15 concurrent workers.

The [retained-checkout incident](../bugs/open/2026-10-02-BUG-retained_worker_checkout_removed_by_host.md)
establishes that a GWEN checkout disappeared after an authenticated delivery
even after Ponytail stopped automatic archival. For one worker, same-session
recovery and redelivery succeeded. The deletion trigger and installed Codex
worktree-cleanup setting were not verified; attributing every disappearance
to Ponytail, or promising worker self-recovery whenever Codex refuses to
submit a prompt, would exceed the evidence. Host permission review, session
creation, native artifact attachment, and Git checkout retention were distinct
boundaries from Ponytail's ledger.

## Why incremental repair did not produce the requested parallelism

The first scheduler model treated “pending action,” “plan ready,” “worker idle,”
and “assignment done” as simpler states than the host workflow allowed. As
soon as multiple creations, uncertain starts, retained checkouts, delivery
before closure, review-only work, external tasklet gates, and post-merge work
appeared, each scalar predicate acquired exceptions. Several repairs were
necessary and correct locally, but each unlocked a subsequent boundary: a
ready plan might have no runnable tasklet; a runnable tasklet might already
belong to an unfinished session; an idle session might own unmerged changes;
a reserved creation might have succeeded natively but not attached; a retained
worker might have lost its physical checkout; and a Goal might be specified in
skill prose without native proof of continuing execution. `schedule-ready`
could reserve work, but it could not force Codex to accept, run, retain, or
resume the corresponding chat.

The tests were strongest for deterministic ledger transitions, validation,
Git reconstruction, and contract parsing. The repeated GWEN shortfalls were
at the composition boundary among ledger, skill-driven coordinator, Codex
native session/worktree APIs, host permission review, and actual tasklet
execution. Passing focused or full repository tests, a successful reservation,
or a delivered prompt was never an end-to-end parallelism pass. The open
activation and host-retention issues explicitly leave that proof outstanding.
The remediation cadence also violated the spirit of the debugging skill's
“reassess after repeated failed corrections” rule: source changes continued
across multiple lifecycle classes while the central observed metric—working
sessions doing runnable GWEN tasklets—remained below the requested level.
That is an assessment of the process and outcome, not a claim that every
individual change was defective.

## Plan and session state-transition model

The attempted scheduler was not one linear FSM. Its effective state was the
product of three independently changing records, plus Git evidence. Conflating
them was a recurring source of false readiness and premature cleanup:

| Dimension | States and source of truth | Meaning for execution |
| --- | --- | --- |
| Whole plan | The host-configured lifecycle directories, normally `open`, `in_progress`, `closed`, `deferred`, or `rejected`; the manifest must agree. | `open` can be dependency-ready for planning, review, or dispatch; `in_progress` is not proof that a worker is running; `closed` requires final integrated acceptance. Deferred/rejected plans are not successful completions. Sprint planning/execution and tasklet markers are finer-grained, separate state. |
| Assignment | Ledger states `DISPATCH_PENDING`, `ACTIVE`, `WORK_COMPLETE`, `REBASE_REQUIRED`, `READY_TO_MERGE`, `MERGED`, `CLEANUP_PENDING`, `ARCHIVED`. | These describe a plan-to-session lease and its integration progress, **not** native Codex activity. `ARCHIVED` became a logical released assignment; it does not imply deletion of the session or checkout. `CLEANUP_PENDING` and physical archive flags remain historical schema states, not permission for automatic retirement. |
| Native session | Fresh, complete host observation reports `working`, `waiting`, `completed`, `archived`, `missing`, or `unknown`, with session ID, cwd, and managed-worktree provenance. | `waiting` and `completed` can mean a worker is awaiting the next prompt or join, not that its plan is done. `working` does not prove tasklet execution. `missing` requires a complete inventory; `unknown` or a stale observation must not be converted into `missing` or `idle`. No session exists before native creation, even when an assignment is reserved. |

The principal transitions, and the evidence that drives them, were:

| Transition | Driver and guard |
| --- | --- |
| Plan `open` → `in_progress` | Approved work and a valid readiness selection, followed by the worker's committed lifecycle move and integration into the coordinator tree. A reserved assignment or authenticated attachment alone does not activate the plan. |
| Unassigned → `DISPATCH_PENDING` | A scheduler reservation for a dependency-ready, tasklet-ready plan, or an eligible planning/review phase. Its typed `CREATE_WORKER`, `REUSE_WORKER`, `PLAN_WORKER`, or `REVIEW_WORKER` action may be `NOT_STARTED`, `STARTED` with an uncertain native outcome, or provisioned but not yet attached. Only a proven `NOT_STARTED` action may be postponed; an uncertain start retains its identity. |
| `DISPATCH_PENDING` → `ACTIVE` | The exact native session and managed checkout are established, the worker adopts and branches the checkout, authenticated attachment binds session, path, branch, and assignment, and the original action succeeds. This is not evidence that tasklets have begun. |
| `ACTIVE` → `WORK_COMPLETE` → `REBASE_REQUIRED` or `READY_TO_MERGE` | The worker commits an exact clean milestone and authenticates `deliver` with evidence paths. Reconciliation verifies that delivery against the worker branch and current integration head. A dirty/missing proof remains incomplete; a delivered revision behind the head needs semantic rebase and redelivery; one containing the current head can be merge-ready. These states can recur for planning, review, implementation, and final acceptance milestones. |
| `READY_TO_MERGE` → `MERGED` | The coordinator's serialized `advance` checks current-head ancestry and performs `git merge --ff-only` of that exact revision. If another join advanced the head first, the worker returns to rebase/redelivery rather than treating the earlier merge-readiness as durable. |
| `MERGED` → `ACTIVE` or plan `in_progress` → `closed` | If integrated work leaves plan gates open, the **same** session continues review, tasklets, or acceptance and may deliver another milestone. Only final validated acceptance and a joined closure commit establish `closed`. A merge by itself never means plan completion. |
| `closed` with integrated delivery → `CLEANUP_PENDING` → `ARCHIVED` | Historically, reconciliation entered cleanup and archive actions could remove the pair. The later retention rule instead releases the logical assignment for same-campaign reuse while preserving the session and checkout. Physical retirement requires separate explicit authority and proof. A safe idle pair may then receive a new assignment, repeating the dispatch/attach cycle without creating a new session. |

Checkout loss, host review rejection, absent credentials, and stale observations
are **faults or guards**, not additional successful FSM transitions. Recovery
of a missing checkout preserves the original session, path, assignment, and
branch when their ownership and commit evidence can be proved. A session whose
checkout vanished might be unable to receive any prompt; neither the ledger
nor a surviving Git branch proves native continuity.

If scheduler memory is lost, reconstruct only what independent authorities can
actually prove, in this order:

1. Inventory the configured plan directories, manifests, sprint metadata, and
   tasklet markers on the **integrated** tree. Validate campaign parent and
   prerequisite edges. This recovers plan lifecycle and potential work, but
   not session ownership or whether a native operation started.
2. Obtain a fresh, complete Codex inventory for every candidate session and
   inspect its actual cwd, managed-worktree provenance, and activity. Compare
   Git worktree registration, branch, clean status, revision, and ancestry
   against the coordinator head. A partial inventory or missing path is not
   proof that a creation failed or a session ended.
3. Correlate surviving authenticated worker bindings, creation/action receipts,
   delivery records and evidence paths by campaign, assignment ID, session ID,
   worktree, branch, and commit. A clean branch whose delivered commit is an
   ancestor of the integration head supports `MERGED`; one containing the
   current head may support `READY_TO_MERGE`; a divergent delivered branch
   supports `REBASE_REQUIRED`. The exact delivery and host proofs still govern
   each classification. Unmerged Git commits without an authenticated owner
   are preserved work, not a license to assign or merge them.
4. Reconcile contradictions explicitly. A plan can be `in_progress` with no
   working session; a session can be `waiting` while its plan still has work;
   a missing checkout can coexist with a valid delivery. Preserve the most
   conservative state and stop only the affected unsafe transition until its
   original identity and authority are established.

The plan tree and Git history cannot recreate an erased action ID, idempotency
key, attachment capability, authenticated session binding, unknown native
creation outcome, or uncommitted checkout contents. If those records are gone
and no independent authenticated receipt survives, the exact assignment state
is **unknown**, not implicitly `NOT_STARTED`, `ARCHIVED`, or safe to reuse.
This is the irreducible recovery limit behind several of the 35-reservation
and missing-checkout incidents; a replacement session would be a new,
explicitly authorized operation, not deterministic recovery of the old FSM.

## State left for a clean reconsideration

1. Separate repository readiness, safe assignment/reservation, native
   activation, continuous execution, delivery, integration, and plan DONE in
   both design and acceptance evidence. Report each count independently.
2. Make original session/action/checkpoint identity and ownership explicit
   through unknown creation, missing checkout, retry, review, and
   post-merge continuation. Do not treat host observation as the same thing
   as a durable effect or a worker's proven ability to receive a prompt.
3. Treat Codex retention and permission policy as external contracts requiring
   live verification. Ponytail cannot make a host checkout persist merely by
   declining to archive it.
4. Prove the intended concurrency with at least two independent runnable
   plans reaching authenticated *simultaneous tasklet execution*, then
   delivery, join, continuation, and DONE under the same host conditions.
   One-worker join, synthetic ledger tests, and 15 reserved slots are weaker
   milestones, not substitutes.
5. Resolve the open [activation](../bugs/open/2026-10-01-BUG-runnable_campaign_workers_not_activated.md)
   and [host-retention](../bugs/open/2026-10-02-BUG-retained_worker_checkout_removed_by_host.md)
   evidence before asserting readiness to re-enable automated GWEN dispatch.

These are proof obligations distilled from the attempt, not authorization to
redesign or restart parallel scheduling. The immediate operational outcome is
the stakeholder's serial GWEN path with read-only Ponytail queries and
validation. The campaign's final completion and the scheduler's eventual
redesign are outside this retrospective's acceptance claim.
