# Batch index search publication and reuse immutable text

- ID: `2026-10-17-TASK-bulk_index_search_publication`
- Type: TASK
- Status: in_progress
- Authority: user's 2026-10-17 report that complete index rebuilds are too slow.
- Contract: existing [traceability index](../../requirements/traceability-index.md) and unchanged-input reuse; no schema or acceptance meaning changes.
- Scope: traceability/plan search-document publication, typed batch component, generated runtime, focused proofs and ownership documentation.

## Diagnosis and implementation

After the independent Git inspection repair, an isolated build of Gwen's real
2,286 plan inputs published 212,720 records in 118,941 ms. An unchanged update
reused every file and retained the generation in 4,925 ms. The full-build log
shows search publication as the remaining slow tail. It executes two SQL
statements per search record and updates an existing content-addressed text
row even when its hash and content have not changed.

Publish search records in bounded, parameterized batches inside the existing
atomic publication transaction. Insert immutable text with conflict-ignore;
keep desired search metadata upserts and preserve content-hash ordering,
retained-record skip logic, source freshness validation and post-commit success.
The typed component owns batch behavior independently of CLI/Git integration.

## Acceptance

- Hundreds of records require bounded batches rather than one SQL call per row.
- Publication callbacks follow successful text and search writes; failed SQL must not report those rows published.
- A rebuild must not rewrite unchanged shared text tuples.
- Existing incremental row reuse, deletion, rollback and rebuild behavior remains correct.
- Repeat the isolated full/unchanged measurements on Gwen data and remove probe-owned rows.
- Complete configured core, static and generated checks.

## Focused results

The new typed publisher streams content-hash-ordered records in batches of at
most 256 rows or 1 MiB of parameter text. One larger row is sent alone, retaining
prior accepted input sizes. Text inserts use conflict-ignore; search metadata
still uses its existing upsert contract. Publication counts follow successful
completion of both statements, within the existing outer transaction.

50 focused tests and the PostgreSQL incremental integration test passed.
The new physical-tuple regression failed before the change and passed afterward.
The repeated isolated Gwen measurement published the same 212,720 records from
2,286 source files in 46,100 ms, versus 118,941 ms before SQL batching. Its
unchanged update took 4,843 ms, parsed zero files, reused all 2,286 and retained
the same generation. Probe-owned project rows were removed.
Logs: `tmp/agents/index-progress-fix/publication-focused.log`,
`publication-before-integration.log`, `publication-integration.log`, and
`performance-isolated-index-after.log`. Final core acceptance remains pending.
