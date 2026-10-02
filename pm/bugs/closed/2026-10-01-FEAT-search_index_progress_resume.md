<!-- Copyright (c) 2026 Alex Baretta. Licensed under the MIT License. -->

# 2026-10-01-FEAT-search_index_progress_resume

## Status

closed

## Source and authorization

Explicit stakeholder implementation request, 2026-10-01: expose full-text
index maintenance/search under `ponytail search`, show TTY/non-TTY progress
and ETA, and resume interrupted ingestion incrementally.

Traceability: introduces REQ-REPOSITORY-TEXT-INDEX from issue 2026-10-01-FEAT-search_index_progress_resume

## Scope and implementation sequence

Canonical requirement: [repository text index](../../requirements/repository-text-index.md).
Acceptance: [progress/resumption Arc](../../uat/repository-text-index.md#arc-update-with-progress-and-resume-after-interruption).

1. Replace the full-text `grep` CLI family with `search query`; add
   `search update-index`, preserving reference QA as a separate policy check.
2. Commit each complete history unit atomically; keep refs and overlay
   publication together after ingestion. Preserve the existing writer key and
   release its session-scoped lock on success, failure, or disconnected process.
3. Render commit progress with cli-progress in a TTY and the requested
   cumulative markers in non-TTY output; distinguish final publication.
4. Prove interruption/resumption with real Git/PostgreSQL, progress formatting
   with focused tests, then run core/traceability/distribution checks.

## Confirmed mechanism

The old cold indexer wraps all commits, refs, and overlay in one transaction.
Every interruption discards all newly ingested history. The live GWEN build
started at approximately 18:04 remains untouched; it has no progress telemetry
and no defensible ETA. This change will apply to subsequent processes.

## Verification

Implemented `search update-index` and `search query`, cli-progress TTY bars,
non-TTY markers/ETA, per-commit checkpoints, and atomic final publication.
Focused CLI/index tests and real PostgreSQL tests pass, including an actual
SIGKILL after a durable checkpoint, preserved publication, new commits after
interruption, and resumed ingestion that skips completed history. Build-impact
selected TSTS due to the dependency manifests; its build passes. Final
`npm test` passes: 512 core tests, Codex installer checks, 23 Pi tests, four
MCP tests, 80 TSTS tests, and the 588-file structure check. The first sandboxed
attempt lacked database access; the first database-enabled run passed its tests
but rejected the untracked issue at the structure gate. Staging the cohesive
change and rerunning the complete command resolved that gate. Traceability
(229 relationships), generated metadata, rule-copy, version, and diff checks pass.

The installed plugin and its runtime dependencies were refreshed. The human
explicitly requested stopping the old GWEN job after implementation so they
can restart in a terminal. Exact PID 45293 was verified against its command
and GWEN cwd, then terminated at about 19:23 after 1h19m. Its transaction had
been blocking final core test queries; both Node and wrapper are now absent.
No GWEN index restart or reference-QA success is claimed.
