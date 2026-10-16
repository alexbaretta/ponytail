<!-- Copyright (c) 2026 Alex Baretta. MIT License. -->
# Autonomous swarm queues

Status: in_progress
Approval: direct stakeholder implementation, installation and coordinator transition request, 2026-10-16.

Traceability: plans-implementation REQ-SWARM-QUEUES from plan 2026-10-16-autonomous-swarm-queues
Traceability: plans-verification REQ-SWARM-QUEUES from plan 2026-10-16-autonomous-swarm-queues

Canonical obligations: [REQ-SWARM-QUEUES](../../../requirements/swarms.md#req-swarm-queues-autonomous-campaign-execution).

1. Implement durable swarm-scoped task and coordinator request queues in the existing PostgreSQL database; atomic preferred acquisition and stealing; exact original-worker claims; parking and candidate preservation; FIFO request service; truthful inspection and legacy allocation fencing.
2. Implement coordinator/worker discovery with canonical requirement, UAT, issue, plan and obligation updates through one serialized recoverable operation. Preserve prior evidence, gates, ownership and accepted conditions.
3. Replace assignment-local goals and coordinator dispatch gates in swarm/QA/rolling skills with a campaign-wide autonomous worker goal and queue protocol. Generate copies, validate contracts, concurrency, recovery and real CLI behavior, run final repository acceptance.
4. Install changed skills and CLI, give the authorized Gwen coordinator exact migration instructions, verify preservation and transition. Gracefully replace workers where their obsolete unfinished goals prevent adoption; never fake goal completion or erase source. Preserve pending work and real approval denials. Record actual host acceptance separately from policy/tool tests.

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
