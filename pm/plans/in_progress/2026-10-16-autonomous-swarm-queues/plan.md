<!-- Copyright (c) 2026 Alex Baretta. MIT License. -->
# Autonomous swarm queues

Status: closed
Approval: direct stakeholder implementation, installation and coordinator transition request, 2026-10-16.

Historical coverage: plans-implementation REQ-SWARM-QUEUES from plan 2026-10-16-autonomous-swarm-queues
Historical coverage: plans-verification REQ-SWARM-QUEUES from plan 2026-10-16-autonomous-swarm-queues

Canonical obligations: [REQ-SWARM-QUEUES](../../../requirements/swarms.md#req-swarm-queues-autonomous-campaign-execution).

1. Implement durable swarm-scoped task and coordinator request queues in the existing PostgreSQL database; atomic preferred acquisition and stealing; exact original-worker claims; parking and candidate preservation; FIFO request service; truthful inspection and legacy allocation fencing.
2. Implement coordinator/worker discovery with canonical requirement, UAT, issue, plan and obligation updates through one serialized recoverable operation. Preserve prior evidence, gates, ownership and accepted conditions.
3. Replace assignment-local goals and coordinator dispatch gates in swarm/QA/rolling skills with a campaign-wide autonomous worker goal and queue protocol. Generate copies, validate contracts, concurrency, recovery and real CLI behavior, run final repository acceptance.
4. Install changed skills and CLI, give the authorized Gwen coordinator the protocol and verify host behavior separately from policy/tool tests. The later stakeholder instruction supersedes further replacement/startup: drain and retire this swarm, preserve source/evidence and unfinished work, and verify zero worker bindings and managed memberships. Never fake goal completion or acceptance; retain the canceled live-rollout history explicitly.

The two pre-existing staged repository-QA plan files are outside this change. No unrelated traceability-version or semantic-rebase proposal is included. No new cloud resource, daemon, native session API or publication authority is introduced.

## Evidence

Implemented the durable PostgreSQL queue, strict V1 command/state/result/verdict
contracts, V5 swarm inspection, atomic original-worker claims and compatible
stealing, source-preserving handoff, FIFO service initiation, candidate-bound
review/discharge, autonomous base refresh, recoverable PM discovery, and legacy
allocation/lifecycle fences. Canonical skills and generated OpenClaw copies now
specify campaign-wide goals and the autonomous queue loop.

Focused acceptance: 14 tests passed, including real PostgreSQL/installed CLI
coverage, concurrent claims, preservation, discovery recovery and inspection-only
source-assessment discharge without fabricated execution receipts. Independent
read-only review found no remaining P1/P2 defect. Runtime generation, registry
(41 entries), rule copies (8), versions (7), and traceability (1115 relationships)
passed. Final `npm test` passed: 1029 tests (571 JavaScript, 331 typed,
23 pi, 4 MCP, 100 TSTS), installer checks, and TSTS over 1679 files with
no violations. No skipped or cancelled tests were reported.
Logs: ignored `tmp/agents/autonomous-swarm-queues/`.

Installation: `./scripts/install.sh` succeeded. Installed swarm, QA swarm and
plan-execution copies and the existing local plugin were refreshed; the final
swarm queue reference matches both installed skill and plugin cache byte for
byte. Installed `ponytail swarm queue --help` succeeds.

Live adoption is in progress in coordinator session
`01a1423d-b59e-7dc3-92f6-eda2a322c745`, owner
`/Users/alex/git/gwen.vc/gwen-worktrees/gwen-001`. The coordinator seeded 69
clusters covering all 222 unresolved effective obligations. Its independent
scope audit found no erroneous global metadata reservation. Original roots,
dirty files, native indexes, refs and evidence are preserved. Replacement W24
`01a14615-50d7-75c3-80be-03be115079ad` is admitted in native root
`/Users/alex/.codex/worktrees/587e/gwen-001`, using the same selected project
`local-a256a6869293033bfdfa5d0b4a57e597`. Execution release was sent after the
inspection-only correction passed and installation refreshed. Live host verification confirms W24 has an active campaign-wide goal and queue
claim TASK-OBL-7 at current base 0d8fd7706e52a6357383c4697488ba9a156325ed;
its source assessment is running. Seven superseded chats are detached/archived
after quiescence; all 15 original physical roots remain retained. Eight original
source-owning workers remain registered while handoffs are reconciled. Remaining
replacement roster migration still requires host verification;
queue adoption does not establish Gwen campaign acceptance.


Tooling/skills implementation committed as `c7711218`. Six additional native
replacement sessions have been created under the same selected project.
Admission reached an explicit client-project authority gate: normal Git branch
creation/fast-forward writes need literal human authorization for shared
`/Users/alex/git/gwen.vc/gwen/.git`, outside the worker roots. Automatic approval review rejected two prepared admissions on this gate;
four others are ready for binding and goals. The coordinator and this chat have surfaced it
to the user; no other agent can supply that authorization. Preserve pending
admissions and original source; continue independent authorized queue work.
Full roster migration remains incomplete, so this plan stays in progress.


The live pilot exercised the intended continuity behavior: it parked help
requests and claimed compatible work without waiting. The coordinator answered
its index-finalization request and allocated one permitted CPU setup slot while
continuing replacement admission. This is live protocol evidence, not campaign
completion or a guarantee that genuine exhausted-work/authority gates disappear.


## Existing-obligation assessment correction

The live coordinator exposed a canonical publication gap: `discover` required new
tasks and requirement/UAT edits even for an unchanged-source requirementless gate
assessment. Focused real-PostgreSQL reproduction confirmed the validator as the
cause. The same physical V1 operation now supports coordinator `kind: work`
with `tasks: []`, only the canonical checkpoint and referenced plan assessment
artifacts, and unchanged baselines, obligation definitions and binding history.
Canonical certificate additions and checkpoint reacceptance of existing certificates
require coordinator authority regardless of task list, including identical
existing-task no-ops. Freshness, neutral checkpoint
semantics, exact host review and candidate-bound queue resolution remain intact.
No source commit or invented execution receipt is required. Respect the client
plan's prohibition on acceptance-only commits; fold PM records into its next
permitted productive change.

Focused queue tests pass (4), including real neutral requirementless gate
publication/resolution, idempotence and rejection before publication of worker
certification, no-op task authority bypass, unrelated PM edits and scope changes.
Observation: [assessment coupled to discovery](../../../debugging-pattern-observations/2026-10-16-assessment_coupled_to_discovery.json).
Correction acceptance: all 1029 tests passed. The full command reached the
final static gate, which initially rejected the two untracked observations;
after staging them, `npm run check:tsts` passed over 1681 files. Unchanged
passing test suites were reused. Live coordinator discharge is verified below.


## Queue service and native retention continuation

The coordinator reported a second failure after native cleanup: a valid owner
could not `take` requests because full swarm inventory rejected a retained sibling
with missing Git metadata. A disposable peer-root regression reproduced the same
fatal error. CLI owner resolution now queries only the invoking project/root,
rejects ambiguous ownership, and retains execution-time owner/worker Git,
session, generation and marker checks. Worker status and coordinator `take` pass
with a stale sibling. Observation: [queue service depended on sibling health](../../../debugging-pattern-observations/2026-10-16-queue_service_depended_on_sibling_health.json).

Both fixes passed the focused 11-test queue/inventory selection and independent
read-only review. Installed skills/CLI were refreshed and byte-checked.
Continuation acceptance: 1029 tests passed, installer suite passed, and final
TSTS passed after staging the two observation records. Rule copies (8),
versions (7), registry (41), traceability (1115 relationships) and generated
runtime checks passed.

Correction to earlier physical-retention checkpoint: subsequent native host
archive/automatic cleanup removed several original checkouts. Coordinator reports
W12/13/14/15/16/19/20/21/22 roots missing and W18 present without valid Git
metadata; original W9/10/11/17 remain valid. The earlier archived-chat guidance
incorrectly assumed physical checkout preservation. Official host documentation
confirms managed chat archival deletes the checkout and automatic cleanup has a
separate native worktree limit; pinning protects against automatic cleanup.
Skills now require retention protection before provisioning and prohibit archive
while a checkout/ignored evidence must remain available. Creation is stopped;
coordinator is pinning needed chats and investigating original host restoration.
Exact dirty-source/index snapshots remain preserved, but survival of every ignored
proof is unverified. No Git metadata is reconstructed and no source ownership is
silently transferred. Migration remains incomplete pending verified restoration
and the existing explicit shared-Git authority gate.


Live correction acceptance: the coordinator recovered queue service with normal
existing-PostgreSQL sandbox escalation and answered all 18 pending FIFO help
requests. `OBL-7` canonical assessment publication succeeded with `tasks: []`,
only the obligation document plus nine referenced plan artifacts, unchanged
baselines/definitions/history, and no acceptance-only Git commit. Certificate
`CERT-OBL7-diagnostic-parity-0d8fd7706e` is fresh and canonical satisfaction
includes OBL7. Root-read accepted-resolution receipt confirms TASK-OBL-7 `done`
and its request `resolved`/`accepted`, with no pending discovery. The 557 coverage
gaps remain unresolved work, not a QA pass. All 23 needed chats have verified
pins; missing native checkout and ignored-evidence restoration remain incomplete.


A subsequent OBL17 proof-reuse report did not establish a tooling defect.
Direct receipt/Git inspection shows candidate b8f1261cdf446753517ab868bddc0db925fcdd36
changes `packages/incremental-build/test/incremental-vitest-cross-session.integration.test.ts`
inside the original proof's declared `packages/incremental-build` inputs.
Canonical `gitInputReasons` reports changed inputs. No reuse bypass, receipt
relabeling or scope narrowing was implemented. The coordinator was instructed to
correct its earlier no-rerun answer and perform only the configured focused
selection for the changed inputs when its resource slot is available.


## Proof input scope clarification

W28's structural-proof receipt declared every tracked top-level root, including
`pm` and `tmp`, so canonical assessment publication invalidated an unrelated
bookkeeping input. Direct checker inspection confirms it actually reads UAT,
requirement sources/coverage, the Arc registry and local-link targets: those
consumed PM files remain relevant. Canonical plan-execution guidance now requires
a complete consumer-derived scope before execution, rejects tracked-root
fingerprinting as a shortcut, distinguishes artifacts/target verification from
command inputs, and preserves old receipts unchanged. Correct a mistaken scope
only for a new configured focused run; no broad freshness bypass is introduced.
Swarm and rolling guidance link to that one policy owner. Installed copies were
refreshed. Focused policy/swarm checks passed (14); OpenClaw generation, rule
copies, versions and traceability passed.


## Queue payload recovery and migration correction

The live queue grew to 188,884,016 bytes because V1 embedded evidence bytes and
returned full accumulated state; workers retained earlier responses as evidence.
The canonical commands then exhausted Node's heap. V2 retains immutable chunked
request/source/review payloads in the existing database and returns bounded
receipts, explicit inventory pages and artifact chunks. Strict historical V1
readers remain; the first authorized command streams migration transactionally
and preserves the exact original state text. A failed migration rolls back both
state and new payload writes. Independent review caught eager file reads and
inline source snapshots; those paths were corrected before release.

Historical live counts and OBL7 freshness above describe their publication time.
Later discovery added obligations 224–226 and changed canonical inputs; current
freshness must be reassessed. The user has now explicitly authorized normal
campaign Git metadata operations in the shared Gwen `.git` directory, excluding
push, deployment, destructive resets and unrelated changes. The coordinator
reports a shutdown/drain direction; no further replacement sessions are being
created. Actual source restoration, retirement and bookkeeping must be verified
separately from tooling acceptance. No full roster migration is claimed.


Payload recovery committed as `27c241df`. Full acceptance passed all 1029 tests,
installer suite and TSTS over 1685 files. Installed skill/plugin copies match.
Live recovery succeeded: V2 receipt 294 bytes, sequence 147, 72 tasks, 36 requests,
no pending discovery. The exact 188884016-byte archive retains SHA256
`f77e0ff2371aba0c63db23d6001a6c93487c2e30ab2813783d304763801e5a88`;
operational state is 5025901 bytes. These counts are a recovery checkpoint.

The human directly confirmed retirement here: retire inactive workers and drain
and retire the rest; no replacement swarm. All four useful workers are now
reported host-verified idle and their final artifacts/dirty source are copied.
V3 adds coordinator-only evidence-backed suspension, preserving unfinished state
and exact bound generations while fencing further mutations. V6 inventory
separates missing native directories/metadata from available roots. Bookkeeping
retirement of an already missing native checkout requires that exact generation's
suspension/preservation record; existing foreign identities remain rejected.
This is cancellation of execution, never acceptance of unfinished obligations.


Shutdown focused proof passed 15 queue/inventory/native-worktree tests and the
additional focused missing-native-membership release workflow. Missing-root
membership release remains limited to removed original workers, exact suspended
generations, host-origin checkouts and explicitly empty configured resource
cleanup; other cleanup obligations remain protected. Independent review found no
remaining demonstrated P1/P2 issue after the admission-fence correction.


All 23 requested worker chats were archived and all 13 current bindings detached.
Seven missing reservations remained from workers removed before the suspension
snapshot. A proposed broad relaxation was rejected by automatic approval review;
it was not applied. Instead, a separate exact-selector retirement authorization
records append-only original worker/generation/root identities and preservation
proof, leaving the snapshot guard unchanged. Focused real CLI authorization and
release pass under `ponytail_index_writer`, including wrong-generation and worker
actor rejection. Independent review caught table creation outside schema grants;
it was moved inside the existing transaction/owner/grant boundary and verified.
No new worker binding, source reconstruction or task completion is introduced.


## Verified stakeholder-directed retirement

The newer human instruction cancels live replacement/startup: retire inactive
workers and drain/retire productive workers. All 23 targeted current-swarm chats
are archived; seven earlier archived original workers were also verified. Direct
read of the final V6 owner inventory confirms zero worker bindings and zero
managed memberships. Queue V3 remains suspended at sequence 147 with 72 tasks,
36 requests and no pending discovery. The recurring keepalive is paused. No
unfinished task/obligation was falsely accepted, no replacement was started, and
the coordinator remains available. Its final report is retained under the owner
checkout's ignored `tmp/agents/traceability-retirement/`.

The exact addendum for seven earlier-removed originals succeeded through the
canonical CLI, followed by all seven ordinary exact-generation releases. Neither
snapshot authority nor unrelated records were relaxed. The coordinator verified
276 current preservation artifact hashes, the 535-object original source pack
and the W24 source bundle. Of the 23 targeted native roots, 22 roots and their
Git registrations are gone; W18 retains only a cache directory without a Git
registration, intentionally untouched. Earlier native cleanup's historical
ignored-evidence survival remains unverified; these new backup checks do not
retroactively establish that every older ignored artifact survived.

Tooling commits: `27c241df` payload recovery, `4f884b8f` shutdown/retirement,
and `e8a24656` exact historical-retirement authority. The source and installed
swarm/plugin skill copies match. Full shutdown acceptance passed 1029 tests;
final acceptance after the historical-retirement addition is recorded below. Live activation of a replacement swarm was canceled by
the stakeholder and is not claimed as completed campaign acceptance.


Final acceptance: the full command passed 571 JavaScript tests and 330 typed
tests, then exposed one missing command mention in the main swarm skill (the
canonical detailed reference already documented it). Added the reference and
reran affected skill checks; unchanged passing code-test inputs retain their
proof under the configured reuse rule. The remaining installer, pi/MCP, TSTS
unit/static and structural checks are recorded with the final result.


Closed for the latest approved tooling-and-retirement scope. The original
replacement rollout is explicitly canceled, not certified successful. The record
retains its established path under project-local placement rules. Final proof:
1029 unique tests pass (571 JavaScript, 331 typed including corrected skill
coverage, 23 pi, 4 MCP, 100 TSTS), installer tests pass, TSTS checks 1685 files
without violations, and traceability/registry/rule-copy/version/runtime checks
pass. Unchanged passing suites were reused after the documentation-only fix.
Source/evidence and inactive campaign ownership remain preserved as stated above.
