# Delayed database indexing progress

- ID: `2026-10-17-BUG-delayed_database_index_progress`
- Type: BUG
- Status: closed
- Source and implementation authority: user's 2026-10-17 request, including the Gwen CLI output.
- Requirement: [REQ-TRACEABILITY-PROGRESS](../../requirements/open-features.md#req-traceability-progress-honest-indexing-progress).
- Scope: publication progress in `src/project-index.js` and its focused regression tests. Existing requirement applies unchanged; no new behavior contract is activated.

## Diagnosis and resolution

Publication starts its database-record counter after retained-row reads, file
writes and stale-row cleanup. Incremental reconciliation can spend most of its
time in these omitted operations; only the fast remaining loop is displayed.
The deterministic slow-client reproduction fails before the first file write
because no database progress has yet been rendered, in both TTY and redirected
output. This establishes an omitted-work defect independently of terminal
buffering. Separately, the renderer suppresses fast record updates for one second,
then the publisher enters an expensive synchronous freshness scan without flushing
the latest count. That scan also drops its source-progress callback. A second
reproduction checks the output at freshness entry with a fixed clock: it still
shows only 0% although the record loops have finished. Sub-second phases may
legitimately finish between periodic updates, but must not conceal completed
work before a slow following operation.

Start database progress before retained-row loading. Include file records and
removed records in the total, advance after their work completes, and preserve
the existing rule that 100% is emitted only after the publication commit.
Flush throttled counts at freshness entry, and forward progress through the
repeated traceability/plan source scans.

## Acceptance

- Render database-stage start before database reconciliation.
- Render intermediate counts during slow file writes and stale relationships cleanup in both TTY and printable redirected output.
- Preserve rollback, cache reuse, parameterized publication and post-commit completion behavior.
- Run focused project-index tests, incremental PostgreSQL CLI acceptance, applicable static/generated checks and the configured final core gate.

## Verification and disposition

Resolved. `node --test tests/project-index.test.js dist/tests/traceability-projection.test.js`
passed all 52 focused tests. The PostgreSQL incremental CLI integration test
passed, including immutable row reuse, deletion, rollback and full rebuild.
The real CLI in this checkout rendered initial, 99% and committed 100% database
counts for both corpora; its repeated plan freshness scan rendered advancing
manifest counts. Redirected output contained no control characters.

`npm test` exited 0: 578 JavaScript, 331 typed, 23 Pi, 4 MCP and 100 TSTS tests
passed (1,036 total), with installer checks and final TSTS validation of 1,687
files passing. Build-impact selected the root TypeScript target; its build
passed and generated runtime matches. Rule-copy, traceability and version
checks passed. Logs are retained under ignored `tmp/agents/index-progress-fix/`.

[Confirmed pattern observation](../../debugging-pattern-observations/2026-10-17-delayed_index_publication_progress.json).
