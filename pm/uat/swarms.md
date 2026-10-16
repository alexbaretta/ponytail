<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Swarm acceptance Suite

[UAT index](index.md) · [Canonical requirements and obligations](../requirements/swarms.md)

Final CLI acceptance passed on 2026-10-14 under the session-operation boundary.
Focused automated evidence below is partial and does not establish release
acceptance. Native-control evidence is historical and superseded.
Use disposable checkouts and isolated rows in the existing project database
for automated lifecycle proof. The coordinator establishes session cessation
and observes activity through host tools; these are not CLI capabilities.

**Scope correction, 2026-10-13:** Swarm CLI acceptance exercises database
bookkeeping and worktree operations with Codex unavailable. The coordinator
performs session creation, cancellation, quiescence and renaming through host
tools. Earlier native-control evidence below is historical and is not a required
CLI acceptance gate. No API operation may be introduced to satisfy those records.

**Database clear evidence:** The installed `swarm clear` command succeeds from
an assigned managed checkout and reports empty owner membership and an unbound
coordinator. It preserves checkouts and session-origin rows without calling Codex.
PostgreSQL proof includes legacy lease release, retained campaign evidence,
sibling-owner isolation, original-session attachment after a fresh coordinator,
and worker numbering restarting at one. Cleanup uses the original START_WORKER
resource generation, retains ownership for unknown resource provenance or failed
checks, and refuses a foreign marker introduced during cleanup. The coordinator,
not this command, establishes session quiescence before invocation.

## Arc SWARM-NATIVE-FORK: Admit fresh native worktree sessions

Traceability: verifies REQ-SWARM-WORKTREES
Traceability: verifies REQ-SWARM-SKILL

**Acceptances:** OBL-17, OBL-18, OBL-19. A native worker has its own checkout and retains the
coordinator's exact non-null host project ID.

1. Freeze the coordinator project ID. Create a fresh project-targeted session
   with the host's worktree option,
   wait for setup, and inspect the returned child. Verify the same project ID,
   a distinct native cwd and the same Git common directory. Verify it has no inherited coordinator conversation. Keep the child on hold.
2. Run `ponytail swarm worktree-enroll --path <actual-native-cwd> --json`.
   Repeat and verify the same membership generation. Bind the verified child
   identity and real plan/sprint assignment. Read back the exact association.
   Include uncommitted source copied by the fork and verify its bytes remain
   unchanged through enrollment and release; admission does not require deleting
   or committing inherited source.
3. Reject a foreign repository, user checkout and conflicting owner without
   changing membership. Release or clear an admitted quiescent worker and verify
   its checkout remains physically present and cannot enter numbered-pool reuse
   or deletion. Preserve dirty or unknown resources.
4. Before reporting the requested swarm configured, compare every requested
   worker against both host identities and current DB inventory. Creating
   chats, enrollment alone or parent-root commands do not establish admission.
5. When execution is authorized, instruct each worker to establish its bounded
   assignment through `create_goal` in that worker session. Inspect `get_goal`
   evidence of the active goal and acceptance conditions, and verify work
   continues after the first turn. A matching unfinished goal is retained.
   Held initialization stays held; completion requires verification and discharge.

6. In an authorized adopted campaign, replenish with the bound original session,
   worker generation and checkout generation. Verify exactly one frozen lease
   and the same native root/session/membership in campaign and swarm read-back.
   Retry concurrently; retain the same assignment. Reject stale generations,
   foreign ownership, changed markers and untargeted second-root allocation.
   Record inactivity, replenish that original native worker, and bind its renewed
   lease generation. Normal next-actions target its original session.

## Arc SWARM-CONTINUITY: Execute complete assignments and respond to help

Traceability: verifies REQ-SWARM-SKILL

**Acceptances:** OBL-20, OBL-21. Use retained original sessions and the configured
resource budgets; do not restart live operations to demonstrate adoption.

1. Give a worker a complete bounded assignment with light proofs, one pending
   heavy operation and an independent remaining repair. Let a focused check pass.
   - The worker keeps its original assignment goal, reports progress, and
     continues the independent repair without asking for another small grant.
2. Queue its heavy operation while another original handle is live. Introduce
   one necessary out-of-lease path and retain a genuine host approval denial.
   - The worker preserves the live handle and current scope, prepares the exact
     scope request, and continues available in-scope work. It does not mark the
     goal complete or bypass the denial. A blocked native goal without a resume
     API is reported honestly, not replaced or falsely completed.
3. While coordinator integration is running, surface the scope request and a
   completed resource holder among more than eight original workers.
   - The coordinator sweeps every batch, answers the routine ownership decision
     within its authority, reconciles the binding, hands off the released slot
     and confirms the original session response before starting more long work.
     The original integration handle continues; a heartbeat is not substituted
     for this service loop. Required human authority is requested once.
4. Reinspect idle unfinished workers and actual goals after adoption.
   - Every idle worker has a concrete cause and next action. Passing a small
     check is not accepted as completing the whole assignment; real waits and
     native-goal limitations are distinguished from executing sessions.

## Arc SWARM-OWNERS: Select the owner and retain orphaned workers

Traceability: verifies REQ-SWARM-OWNERSHIP

**Acceptances:** ACC-SW-01 (OBL-1), ACC-SW-02 (OBL-2).
**Requirements:** REQ-SWARM-OWNERSHIP.
**Prerequisites:** Two user worktrees in one repository, one managed checkout
owned by the first, and bound worker/coordinator sessions.

1. Invoke swarm inspection from the first owner and its managed checkout.
   Both identify the first owner. From the second user checkout, it identifies
   the second owner's distinct swarm. Ambiguous membership fails explicitly.
2. Attempt simultaneous incompatible coordinator bindings to one swarm.
   At most one succeeds; the other cannot replace it.
3. Simulate coordinator loss. Worker/checkouts remain bound and visible, with
   coordinator unavailability distinguished from an explicitly empty binding.

**Partial evidence (2026-10-13):** Step 1's physical owner/managed selection,
sibling isolation and read-only CLI behavior pass in
`tests/swarm-info.integration.test.ts`. Step 2's storage race and stale-unbind
protection pass in `tests/swarm-store.integration.test.ts`; another owner's
coordinator remains independent. Explicit coordinator unbinding preserves
legacy worker records, but native coordinator loss/observation and membership
adoption in step 3 remain pending. ACC-SW-01 and ACC-SW-02 are not yet accepted.

**Coordinator adapter evidence:** Controlled native protocol observation checks
session and checkout identity before binding without acquiring a writer.
The installed bind CLI with a controlled native executable resolves managed
invocation to its owner and records distinct native thread/session identities.
The installed `coordinator-unbind` command rejects stale session IDs and
preserves workers; V2 inventory reports bound, unbound and unrecorded states
distinctly. Live native bind/unbind now passes in
`tests/swarm-coordinator.integration.ts`, while the original writer remains
open: the original session survives unbinding and source remains unchanged.
Only the disposable test teardown archives that verification actor.
Coordinator-loss recovery with explicitly bound workers remains pending.

## Arc SWARM-INFO: Diagnose membership and execution

Traceability: verifies REQ-SWARM-INFO

**Acceptances:** ACC-SW-03 (OBL-3), ACC-SW-04 (OBL-4).
**Requirements:** REQ-SWARM-INFO.
**Prerequisites:** An empty swarm and an inhabited swarm containing idle and
executing workers, a missing checkout and an unavailable native observation.

1. Run `ponytail swarm info` in each owner. Empty inventory succeeds; inhabited
   inventory shows exact session IDs/names, paths, assignments and associations.
2. Compare human and machine-readable inventories from the owner and a managed
   checkout. Membership agrees, excludes other owners and performs no mutation.
3. With Codex unavailable, verify activity remains explicitly unobserved and
   missing checkout resources remain distinguishable. A working assignment is
   never shown as proof of actual execution or Desktop visibility.

## Arc SWARM-SESSIONS: Remove and conditionally reattach originals

Traceability: verifies REQ-SWARM-SESSIONS

**Acceptances:** ACC-SW-05 (OBL-5), ACC-SW-06 (OBL-6), ACC-SW-07 (OBL-7).
**Requirements:** REQ-SWARM-SESSIONS.
**Prerequisites:** A native worker executing an assigned task in its recorded
checkout, two user owners, and real host reattachment capability inspection.

1. Read the exact non-null Codex project ID of the original coordinator session
   that the user created through the UI. Create the worker in its designated
   checkout, establish and verify the same project association before dispatch
   or binding, and ask the worker which Codex project it belongs to. It reports
   the coordinator's project. A projectless or different-project worker is not
   admitted; conflicting/cross-owner binding fails without modifying either swarm.
2. Establish quiescence through host tools before invoking removal. Verify the
   CLI fences the matching assignment and removes membership, preserving source
   and evidence; active Git operations or conflicting ownership refuse removal.
3. Verify session-origin metadata survives removal. Rebind the same identity to
   the same owner and checkout without session API calls. Host resumption is a
   separate coordinator operation, where supported.
4. Attempt attachment to another owner after removal. It still fails because
   session provenance survives removal and clearing.

**Removal boundary evidence:** PostgreSQL tests prove exact-generation intent,
unknown-interrupt retention, explicit active/notLoaded/systemError refusal,
ignored-marker removal only after idle/terminal proof, and exclusive checkout
transfer with permanent cross-owner worker refusal. The real native Arc shows
`worker-unbind` from an observer retaining REMOVING when its original runtime is
notLoaded. The owning App Server can then remove that same worker without
archiving it and rebind the original session to the same owner/checkout with a
fresh worker generation/number. Six integration/live tests and nineteen
unit/help/protocol tests pass. This proves the core boundary and the observer
refusal; complete installed-CLI removal through the original desktop runtime,
active-turn native cancellation and campaign-lease fencing remain pending.

## Arc SWARM-NAMES: Identify assignments and final completion

Traceability: verifies REQ-SWARM-SESSIONS

**Acceptances:** ACC-SW-08 (OBL-8), ACC-SW-09 (OBL-9).
**Requirements:** REQ-SWARM-SESSIONS.
**Prerequisites:** Two workers with plan/sprint assignments and full assignment IDs.

1. Inspect native names and info. Names use one-indexed W numbers, the proper
   P/S short identifier and exactly three summary words; full IDs resolve uniquely.
2. Change an assignment and inspect the updated original session name.
3. Complete a worker session and confirm the coordinator prepends `DONE `.
   Naming alone changes no acceptance, resource ownership or physical existence.

**Worker storage evidence:** `tests/swarm-store.integration.test.ts` exercises
independently modeled native identities against the real project database and
physical checkouts. Concurrent admission to one checkout has exactly one winner;
same-assignment retry preserves its number/generation. Sibling swarms number
independently, workers sharing a full plan share the short plan label, and the
three-word desired name has the required W/P/S and DONE form. Coordinator loss
preserves the bound worker; simulated historical REMOVED state still cannot
change its original owner/checkout. The test failed before implementation and
passes after it, with accepted adversarial review. This establishes the storage
boundary only; native naming, cessation, removal/reattachment and installed worker
CLI acceptance remain pending.

**Native admission evidence:** The installed `worker-bind` CLI observes original
identity, binds the exact managed checkout/assignment, sets its canonical native
name, and confirms that name without resuming or acquiring its writer. V4 inventory
retains old readers and distinguishes desired names from observed native titles
and statuses or explicit unavailability. `notLoaded` does not become an idle
claim. Controlled CLI/PG and real native acceptance pass; the original coordinator
and worker writers stay open during the live Arc. Naming transport failure retains
the exact binding for retry. Nineteen unit/help/protocol and five focused integration
tests pass. Native removal/reattachment, DONE naming and lifetime origin across
project lifecycle changes remain pending; these are not discharged by admission.

**Completion naming evidence:** `worker-complete` records the DONE naming intent
for an exact bound worker generation before the native request and confirms the
original native name. PostgreSQL proof rejects stale generations, foreign owners
and changed native identity, preserves ACTIVE checkout ownership, and retains the
same intent after a lost naming acknowledgement. The installed CLI live Arc
confirms `DONE W1 P1 Verify original worker` while the original writer stays open
and idle and its unarchived session remains bound. This is session completion
naming, not obligation discharge or worker removal. Four focused integration/live
tests and nineteen unit/help/protocol tests pass. Removal and reattachment remain
pending.

## Arc SWARM-CHECKOUTS: Allocate, release, transfer and reclaim

Traceability: verifies REQ-SWARM-WORKTREES

**Acceptances:** ACC-SW-10 (OBL-10), ACC-SW-11 (OBL-11),
ACC-SW-12 (OBL-12), ACC-SW-13 (OBL-13).
**Requirements:** REQ-SWARM-WORKTREES.
**Prerequisites:** Two user owners, released managed checkouts in the configured
physical pool, project setup/cleanup tooling and a protected active checkout.

1. Compete for one available checkout; exactly one claim succeeds. Exhaust the
   pool and verify normal allocation creates/setup a new managed checkout while
   explicit existing-only allocation creates nothing.
2. Release a quiescent checkout. Verify its files survive. Reassign it to the
   original owner, then release and assign to the second owner. Transfer while
   a prior worker owns/can write it fails; a user checkout cannot be allocated.
3. Delete one released checkout. Verify configured resource cleanup, preserved
   user/active checkouts and truthful retry outcomes.
4. Delete all remaining unassigned managed checkouts. Introduce one cleanup
   failure, observe per-resource results and retry outstanding cleanup. Assigned
   resources and user checkouts remain intact.

**Partial internal evidence:** `tests/swarm-worktrees.integration.test.ts` proves
exclusive lowest-number claims from the existing canonical pool, transfer after
release, stale-generation refusal, marker/native-actor protection, and preservation
of dirty source through quarantined release. A clean stopped interactive rebase
blocks both claim and release. Legacy project reset refuses retained memberships
before inventory or checkout changes. Focused swarm/reset/allocator proof passes
eight tests; adversarial review accepts this internal increment. Provisioning,
resource cleanup, worker cessation, deletion and real CLI lifecycle acceptance
remain pending; these results do not discharge ACC-SW-10 through ACC-SW-13.

**Inventory evidence:** V3 exposes an explicit retained membership generation and
an absent campaign assignment. `tests/swarm-info.integration.test.ts` exercises
standalone managed invocation through the real installed CLI, owner equivalence,
sibling isolation and rejection of contradictory campaign/swarm owners. Historical
V1/V2 reader proofs remain intact. Native activity is still explicitly unobserved.

**Allocation CLI evidence:** The installed CLI Arc in
`tests/swarm-worktrees.integration.test.ts` creates checkout 101 with project
setup, releases it from managed invocation with project cleanup, then reuses it
with a fresh membership generation. Stale release fails. A deliberate setup
failure retains checkout 102 and its exact base/generation; `worktree-setup`
resumes it and completed retry does not rerun setup. Cleanup failure retains
ownership and source until retry. Replacing an enrolled user checkout with a
foreign clone cannot redirect pending setup. Seven unit/help and four focused
integration tests pass. No live worker was dispatched; worker cessation and the
complete deletion Arc remain pending.

**Deletion CLI evidence:** `worktree-delete --number` and `worktree-delete --all`
pass through the installed CLI and real Git/PostgreSQL. Tests preserve assigned
checkout 102 and the user root, recover selected/all cleanup failure, and retry
only outstanding removals. Pending deletion independently fences allocation even
if the pool row incorrectly appears available. Canonical pool reset removes old
resource receipts. An original source commit is detached and its branch removed;
revision-specific Git refs retain that source through reset/recreation/deletion of
worktree 101. Eight unit/help and eight focused integration tests pass, with
accepted adversarial review. Native worker lifecycle acceptance remains pending.

## Arc SWARM-CLEAR: Release resources and restart

Traceability: verifies REQ-SWARM-CLEAR

**Acceptance:** ACC-SW-14 (OBL-14).
**Requirement:** REQ-SWARM-CLEAR.
**Prerequisites:** A swarm with workers/coordinator, assignments and leases;
another owner's independent swarm; existing campaign delivery evidence.

1. Establish worker quiescence through host tools, then clear the first swarm.
   Failed resource checks retain unresolved ownership; completed clear leaves no
   workers, coordinator, managed-worktree bindings or stale reservations.
2. Verify sessions/checkouts, source changes and historical delivery/publication
   records survive. The second owner's state is unchanged.
3. Bind a new coordinator and start a fresh campaign using retained safe resources.
   Repeat from an orphaned swarm to establish coordinator-loss recovery.

## Arc SWARM-CLI: Discover the complete chapter

Traceability: verifies REQ-SWARM-CLI

**Acceptance:** ACC-SW-15 (OBL-15).
**Requirement:** REQ-SWARM-CLI.
**Prerequisites:** Installed CLI and chapter/command implementations.

1. Root help lists swarm; chapter help lists every approved operation. Each
   command's help explains its arguments, owner resolution and effects.
2. Invalid commands produce the relevant scoped usage. Help performs no mutation.
3. Exercise resource operations through the real CLI and campaign consumers;
   both expose the same ownership state, not independent registries. Verify
   previous session creation/query/management subcommands are retired rather
   than available as aliases; campaign planning queries do not expose a second
   session-management interface.

## Arc SWARM-SKILL: Use exported guidance to execute in parallel

Traceability: verifies REQ-SWARM-SKILL

**Acceptance:** ACC-SW-16 (OBL-16).
**Requirement:** REQ-SWARM-SKILL.
**Prerequisites:** Implemented swarm chapter, a registered canonical skill and
generated/installed host copies, and a plan with independent ready obligations.

1. Compare exported guidance with real chapter and subcommand help. Every
   prescribed command exists and uses the canonical ownership/lifecycle path.
2. Have the coordinator follow it to inspect the owning swarm and dispatch
   compatible original top-level workers concurrently up to configured N,
   without an extra instruction to parallelize. Verify actual native activity
   and exact instruction receipt; unknown sends do not cause duplicate dispatch.
3. Have each worker use an identifiable read-only local reviewer subagent for
   its exact candidate and correct findings with that reviewer. Verify the
   coordinator records the accepted attestation and proceeds to integration
   without performing the review again. When the host cannot expose such a
   reviewer, verify the coordinator assigns a top-level reviewer as a fallback.
4. Follow completion-first and publication gates, rename completed sessions,
   then quiesce/remove workers and release or clear resources. Preserved sessions
   remain bound to their original user-worktree provenance; checkouts can transfer
   only after prior ownership is relinquished. Inspect both owner and managed
   checkout to confirm truthful resulting membership.

### Session command retirement regression evidence

The campaign CLI, root command registry, chapter/subcommand help and optional MCP
registration omit all session API operations. Direct retired-command invocation
fails before opening project state. `campaign next-actions` identifies session
work with `hostAction`, preserving the prerequisite action, assignment and review
records; pure publication and integration operations retain `command`.

Focused proof: 39 tests in `rolling-operations`, `rolling-cli-registry`, `cli-help`
and campaign compliance; the isolated PostgreSQL `shared operations initialize
defaults` integration proves actual MCP registration parity and coordinator
decisions. TSTS checked 1,642 files without violations. This does not establish
final plan acceptance or the pending swarm skill acceptance.

### Swarm skill publication evidence

The canonical registered `swarm` skill separates coordinator host session
operations from CLI/MCP bookkeeping and worktree operations. Five focused tests
validate shipped command references and the real Codex installer copy into an
isolated home (plugin installation mocked, skill-copy path real). Generated
OpenClaw and registry resources are synchronized. This establishes publication
proof, not final parallel-campaign acceptance: campaign reservation adoption,
host-submission recording and reviewer-verdict recording remain pending public
bookkeeping transitions. The procedure explicitly identifies these gaps.

### Atomic campaign checkout ownership evidence

For an enrolled swarm, campaign allocation refuses an absent coordinator and
rolls back all reservations. Concurrent replenishment records campaign and swarm
ownership together; actual `swarm worktree-setup` prepares the same numbered
checkout without a second allocation. A coordinator on a different publication
branch still records the configured campaign increment as the setup base.
Focused proof: the `shared operations initialize defaults` PostgreSQL/CLI Arc.
Host session attachment, submission and verdict recording remain separate pending
work; this checkpoint does not establish complete campaign acceptance.

### Host-created worker attachment evidence

Actual `swarm worker-bind` records the original host identity in both swarm and
campaign accounting in one transaction, completes its pending creation action
and retries with the same identity. The PG/CLI Arc rejects a wrong plan and a
reconciled stale execution scope without attaching a session. The stale-path
regression first failed because admission succeeded, then passed after checking
the current effective paths. Existing standalone binding and owner-inventory
Arcs remain green. No command contacts Codex or claims observed native activity.

Result/verdict recording and retained worker lifecycle transitions remain pending;
this evidence does not establish final campaign acceptance.

### Host result and review bookkeeping evidence

The real campaign CLI records host-collected V1 worker submissions and accepted
or rejected adversarial verdicts. Existing PostgreSQL/Git proof checks enforce
the original session, current frozen lease, exact clean candidate/base and
independent assigned reviewer. Replays retain the immutable proposal/decision.
The optional MCP adapter registers the same typed operations and schemas.
Focused evidence: both manual `persists accepted/rejected review` Arcs and the
`shared operations initialize defaults` MCP parity Arc; scoped command/help tests
also pass. Neither bookkeeping command uses Codex APIs. Retained worker lifecycle
and final plan acceptance remain pending.

### Individual worker lease release evidence

The real CLI detaches an original retained worker with a pending resumption,
cancels only that assignment's outstanding actions and marks its lease released.
A repeated unbind succeeds without deleting the session, checkout, submitted
proposals or review records. Subsequent release invokes project cleanup with the
original resource generation and released assignment context, preserving dirty
source in quarantine. A cleanup callback that creates a new session marker causes
release refusal with membership retained; retry succeeds after resolving that
fixture marker. Focused PG/CLI and existing clear/standalone binding Arcs pass.
Retained worker reactivation and final acceptance remain pending.

### Retained original-worker reactivation evidence

The real swarm CLI rejects stale inactivity generations and unknown blockers,
records the original worker inactive without native observation/control, and
allows compatible replacement work. When its blocker is satisfied, replenishment
selects that retained worker first. Repeated worker-bind using the renewed lease
generation completes the resumption bookkeeping while preserving the original
session, checkout and swarm worker number. Missing/stale resumption generations
are refused. Scoped unit/help and PG/CLI proof pass; runtime activity remains
unobserved. Final acceptance remains pending.

### Scope-changing lease renewal

`campaign renew-lease` exposes the existing pure database renewal boundary.
After an approved graph amendment and recorded quiescence/inactivity, it freezes
the current authorized scope under a fresh generation. The original session,
checkout and INACTIVE state remain unchanged; stale generations are rejected.
`next-actions` recommends this command rather than a host session operation.
The previous worker command spelling is removed, and CLI/MCP use the same typed
operation. Session resumption remains a separate coordinator host operation.
Focused evidence: 30 operation/help/skill tests, two accepted/rejected review
PostgreSQL scenarios covering amended leases and retained ownership, and four
MCP tests pass. TSTS checked 1,648 files without violations; read-only adversarial
review found no material defect. The prior broad typed run passed 325 tests before
this renewal change; it is not final-tree acceptance for this increment.

### Final acceptance disposition

ACC-SW-01 through ACC-SW-16 are accepted for the corrected CLI/resource and
exported-skill scope. Actual host session control remains coordinator-owned;
historical native-control Arcs are superseded and are not CLI acceptance gates.
Complete `npm test` passed all 1,011 tests across its five families, the installer
suite, generators, 1,085 traceability relationships and TSTS analysis of 1,649
files. The closed swarm plan records the canonical assessments and evidence.

## SWARM-AUTONOMOUS-QUEUE Arc

Traceability: verifies REQ-SWARM-QUEUES

Start one queue campaign on a disposable repository and isolated rows in the existing local database. Admit original workers with distinct worktrees. Queue preferred tasks, dependency-blocked tasks and conflicting paths. Race claims: each task has one owner; preferred ready work is FIFO; another worker steals compatible work with relevant context. Queue help from one worker and an exact reviewed candidate from another; preserve source/refs and acquire other compatible work before coordinator acknowledgment. Start the first request, leave its operation pending, and receive the next request in FIFO order. Restart and retry without duplicating work.

Discover another obligation from a worker and from the coordinator during execution. Update applicable requirements/UAT/issue/plan/obligation records through the CLI. Concurrent edits must fail with actionable stale-input evidence. Interrupt document publication, recover the same operation, and prove that no task becomes claimable before all required records exist. Dependency satisfaction and final task/campaign completion require canonical acceptance, not queue receipts. Reject cross-owner/stale identity, path overlap, symlink escape, fabricated review, incomplete discovery and simultaneous legacy allocation.

After repository acceptance, install the CLI and changed skills. The existing Gwen coordinator preserves every old worker candidate/dirty tree and pending request before retiring obsolete goal sessions. Replacement workers retain its exact project, have unique native worktrees and campaign-wide goals, and actually claim queue work. Record tool acceptance and live adoption separately.


Queue growth recovery: retain a V1 queue larger than the process heap, containing
nested historical queue-response evidence. Run the canonical CLI with a 128 MiB
heap. Verify transactional streaming migration, exact original archive byte count
and digest, unchanged tasks/ownership/candidates and evidence bytes, bounded V2
receipts, explicit paginated inventory and cross-chunk evidence reads. Interrupt
before publication and verify the original state and blob count are unchanged.
After recovery, claim and hand off another task and service the FIFO queue.


Stakeholder shutdown: establish host quiescence and verified source/evidence
preservation for the entire bound roster, then issue coordinator-only `suspend`.
Verify exact-generation snapshot, unchanged tasks/claims/candidates/requests,
idempotence and rejection of further claims/completion. Retire a checkout already
removed by its native host without recreating or editing its missing Git metadata;
reject any missing-root retirement not covered by that exact suspension generation.
V6 inventory must show suspension and missing-directory/metadata distinctions.
After unbind, preserved unfinished obligations remain unfinished.


Earlier retirement reconciliation: remove an original worker before suspension,
retain its exact membership and verified source, and simulate native root loss.
Normal release must refuse missing retirement authority. The coordinator records
an explicit addendum for the actual membership UUID through `retirement-authorize`;
reject changed selectors and worker authority, verify immutable/idempotent evidence,
then release that exact historical membership. Exercise authorization and release
under the nonadministrator project-index writer role. Other memberships, queue
state, earlier suspension evidence and unfinished obligations remain untouched.
