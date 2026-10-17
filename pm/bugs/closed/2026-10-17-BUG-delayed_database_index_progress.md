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

## Reopened after Gwen reproduction

The user reported a stationary `0/398 plan manifests` after the initial fix.
A read-only collection against the named Gwen checkout reproduced a 37,324 ms
callback gap before manifest 362. The expensive manifest references a 5.8 MB
obligation document with 294 certificates. Certificate input verification occurs
inside manifest collection, with no progress callback until that whole manifest
finishes. Earlier fast manifest updates were throttled, leaving 0% displayed.
The prior local acceptance did not cover this larger document shape.

Flush the current manifest count before obligation verification and report
certificate input work as a nested stage, counting completed input-set checks,
artifact existence checks and file digests. Verify against the actual Gwen
source collection without changing its files or database.

### Follow-up acceptance

The repeated read-only scan of Gwen's 398 manifests and 2,286 source files
completed in 33,222 ms. It emitted 871 certificate-input callbacks; the maximum
callback gap was 1,057 ms, compared with 37,324 ms before the correction.
The large manifest displayed advancing progress across 868 certificate inputs.
No Gwen files or database records were changed by this probe. Logs:
`tmp/agents/index-progress-fix/gwen-manifest-probe.log` and
`tmp/agents/index-progress-fix/gwen-manifest-after.log`.

Both new TTY/redirected regression cases passed. Final `npm test` exited 0:
580 JavaScript, 331 typed, 23 Pi, 4 MCP and 100 TSTS tests passed (1,038 total),
with installer checks and final TSTS validation of 1,687 files passing.
Rule-copy, generated-runtime, traceability and version checks also passed.
The full result is retained in `tmp/agents/index-progress-fix/followup-full.log`.
