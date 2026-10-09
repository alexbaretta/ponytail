# Activated feature acceptance Suite

[UAT index](index.md) · [Requirements](../requirements/open-features.md)

These Arcs are acceptance contracts, not passing execution evidence.

Execution receipts are recorded below; S04 remains unexecuted.

## Arc: Resume durable traceability batches

Traceability: verifies REQ-TRACEABILITY-BATCH-RESUME

- Actor: repository developer; profile: real CLI/Git and local PostgreSQL.
- Prerequisite: isolated configured repository spanning several file batches.
- Effects: test-owned index rows only, finalized by the harness.

1. Publish a complete baseline; begin another index run and abruptly terminate
   its process after a durable file batch but before publication.
   - Readers retain the baseline; completed parse checkpoints survive.
2. Restart with compatible inputs.
   - Completed work is reused, incomplete work retried; final logical index
     equals uninterrupted processing with no missing/duplicate relationships.
3. Repeat with dirty edits without HEAD change, addition, rename, deletion,
   and configuration/parser identity change between failure and restart.
   - Incompatible work is invalidated, current files are accurately indexed.
4. Exercise competing same-key writers and independent worktrees/corpora.
   - Same-key serialization remains intact; unrelated publications unaffected.

## Arc: Observe truthful traceability progress

Traceability: verifies REQ-TRACEABILITY-PROGRESS

- Actor: CLI user; profile: real CLI with TTY and redirected-file captures.
- Prerequisite: enough configured files for intermediate progress.
- Effects: test-owned repository/index state and logs.

1. Index in a TTY and redirect another run to a file.
   - A bar advances; regular-file progress uses printable text and newlines,
     not cursor controls, and is visible before final publication.
2. Request JSON output, then interrupt/fail separate runs.
   - Results remain independently parseable; failed runs never claim success.

## Arc: Enforce shared transport contracts

Traceability: verifies REQ-TSTS-SHARED-MESSAGE-CONTRACTS

- Actor: developer; profile: configured TSTS/TypeScript fixture and CLI tests.
- Prerequisite: owned producer/consumer APIs and designated typed adapters.
- Effects: test-owned source fixtures and diagnostics only.

1. Analyze unrestricted signatures, independent equivalent endpoint contracts,
   bypass overloads, unregistered channels and unrestricted dynamic strings.
   - Each fails with actionable diagnostics at the offending source.
2. Analyze both endpoints deriving from the canonical finite channel map and
   a designated adapter containing a raw dependency transport.
   - Typed shared contracts pass; object sends to JSON-text channels fail,
     correctly typed string sends pass. Runtime validation remains required.

## Arc: Validate the TypeScript-only final tree

Traceability: verifies REQ-TYPESCRIPT-ONLY-SOURCE

- Actor: maintainer; profile: real repository build/install/test workflow.
- Prerequisite: final migration tree and complete source/generated inventory.
- Effects: owned build artifacts and isolated installer fixtures.

1. Compile and analyze all migrated sources/tests, then run final configured
   tests, installers, package entrypoints and generated-adapter checks.
   - Strict compiler/TSTS and workflows pass with no authored JS remaining.
2. Add an owned handwritten JS candidate to an isolated fixture.
   - Regression enforcement rejects it but accepts documented generated JS.
3. Verify benchmark ownership and its separate execution.
   - Core commands neither provision nor execute benchmarks.

## Execution receipts: 2026-10-09

S01: `node --test tests/project-index.test.js` passed 33/33 at the S01 gate.
`node --test tests/traceability-batch-resume.test.js` passed real PostgreSQL
SIGKILL, checkpoint reuse/invalidation, same-key writer contention,
independent-worktree publication and add/rename/delete/configuration coverage.
No skips; isolated test UUIDs and fixture roots were cleaned up.

S02: focused projection suite passed 36/36; final progress subset passed 7/7.
Real PostgreSQL checkpoint counters passed. Actual CLI regular-file captures
had 35 printable progress lines and separately parsed V2 JSON (140 traceability
files, 135 plan files). Actual PTY showed both corpus bars. Actual SIGINT after
start exited 130 with empty stdout and actionable stderr, without false success.

S03: strict TSTS build and compiler/configuration/CLI fixtures establish the
rejection and acceptance matrix. Exact final counts and revision are retained
in [S03](../plans/in_progress/2026-10-09-open-feature-requests/sprints/S03.md).
External runtime validation remains client-owned, not proven by this static rule.

S04 and plan-wide final acceptance remain pending. These receipts do not claim
the TypeScript-only repository requirement or the whole plan is complete.
