# OBL-49 worker submission collection component

Recorded under BIND-44 / BASELINE-14. This is component implementation and
executed evidence, not discharge of the Worker submission Git Arc. The native
code implementation and fresh full semantic rebase remain unverified.

The collector reads the original attached worker's durable instruction turn,
resumes only its recorded native identity and checkout, and observes that same
turn to completion. It requires idle native activity and a final strict V1 JSON
submission before calling the existing coordinator-fenced submission operation.
Unknown, active, failed, interrupted, malformed and foreign-session results
cannot establish a review candidate. Collection does not create a new session,
instruction turn or retry. The existing store validates exact HEAD, clean Git
state, current base, graph and generation, scoped history and focused proof.

Validation after the final component edit:

- Configured strict build passed; generated runtime synchronization passed.
- Focused worker, native protocol, submission and store unit tests: 18 passes,
  no failures, skips or cancellations.
- Existing local PostgreSQL integration suite: eight passes, no failures,
  skips or cancellations. The collection case executes two real focused fixture
  tests, records their output and input hashes, rejects active and unsuccessful
  native states and malformed/foreign results, and persists the exact candidate
  in REVIEW. A restarted store replays that receipt without changing it.
- The child focused test command explicitly requests TAP. The first collection
  run failed because Node selected a human-readable reporter while the harness
  expected TAP; the reporter correction passed the complete store suite.
- Unchanged TSTS checked 1,009 tracked files without violations before adding
  this record. Rule-copy and version checks passed.
- Traceability regeneration retains the six known publication/interface
  coverage gaps; it does not establish final campaign acceptance.

Outputs are retained locally under `tmp/binding-selectors/worker-submission-`:
`build.txt`, `focused.txt`, `store.txt`, `tsts.txt`, `rule-copies.txt` and
`traceability.txt`. The controlled native fixture supplies the worker's final
JSON for this component case; it does not prove actual native code editing or
semantic rebase. Shared input edits stale intersecting prior accepted evidence
until explicit renewal. No new certificate or discharge count is asserted here.

## Unfinished rebase regression

BIND-46 includes the canonical submission unit tests. A real one-commit
interactive rebase paused at an edit stop had empty Git porcelain status and
the exact proposed HEAD. The pre-repair validator accepted it; the regression
failed with a missing expected exception. Validation now checks Git-resolved
absolute paths for both rebase backends and rejects retained operation state.
After `git rebase --continue`, the same candidate passes. The confirmed defect
is recorded in
`pm/debugging-pattern-observations/2026-10-11-clean_checkout_during_unfinished_rebase.json`.

Latest component proof: strict build passed, ten worker/submission unit tests
passed, the exact native command approval regression passed, and the local
PostgreSQL suite passed all nine tests. Unchanged TSTS checked 1,013 files with
no violations. Outputs: `tmp/binding-selectors/worker-submission-state-` files
`before.txt`, `build.txt`, `focused.txt`, `store.txt`, and `tsts.txt`; the
approval regression is `worker-submission-approval-focused.txt`.
These establish component correctness, not the still-pending native semantic
rebase Arc or discharge. Traceability regeneration still reports the six
publication/interface gaps.

## Complete worker evidence outline

The native worker reached real edit/rebase/QA execution but initially guessed
incompatible evidence field types. Production instructions now serialize a
complete `RollingWorkerSubmissionV1` outline, including its typed evidence,
frozen selection and target. Clearly labelled placeholders must be replaced;
they establish no evidence. The instruction test substitutes valid example
values and passes the complete outline through the unchanged canonical physical
reader. Instructions also prohibit extra record keys; the reader's existing
unknown-key test now uses the observed `stoppedAt` field.

After this final instruction edit, strict build and runtime synchronization
passed, all ten focused worker/submission tests passed, and unchanged TSTS
checked 1,014 files without violations. The two affected database instruction
and collection cases passed after the complete outline edit. Exact outputs are
`tmp/binding-selectors/worker-submission-exact-` files `build.txt`,
`focused.txt`, `tsts.txt` and `traceability.txt`, plus
`worker-submission-evidence-store.txt`. Traceability still reports six known
publication/interface gaps. The observation JSON passes syntax checking and
manual review against the canonical pattern-observation schema; an automated
JSON Schema validator is not installed. No certificate or discharge is
asserted from these component results.
