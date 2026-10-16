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
