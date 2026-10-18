# Batch Git certificate input existence checks

- ID: `2026-10-17-TASK-batch_git_certificate_checks`
- Type: TASK
- Status: closed
- Authority: user's 2026-10-17 report of slow certificate-input verification.
- Contract: [REQ-OBLIGATION-FRESHNESS](../../requirements/obligation-execution.md#req-obligation-freshness-obl-freshness); freshness semantics remain unchanged.
- Scope: `gitInputReasons` in the portable obligation runtime, focused tests, generated copies and installed plan-execution skill.

## Diagnosis and implementation

Read-only profiling of Gwen's actual manifest collection took 46,939 ms.
Git object checks launched 4,893 processes and consumed 37,893 ms; separate
tracked comparisons used 254 processes (4,091 ms), and untracked comparisons
127 (2,751 ms). There were 127 distinct Git input sets and 4,766 path
occurrences. One process per path dominates the cost.

Replace per-path `cat-file -e` commands with one native batch check per pass.
Group index comparisons by revision and share a single working-tree/index
comparison. Both must match: an index difference remains stale even when
working bytes have been restored. Resolve current certificate membership through
the canonical history replay and inspect only dependencies that can affect the
current projection; preserve all historical records in the index. Preserve revision validation, literal path treatment, missing-object
rejection, proposed-input checks, both working-tree/index comparisons and
untracked-file checks. No result cache, relaxed freshness or persistence change.

## Acceptance

- One object batch and one untracked inspection per pass; one working-tree comparison and one index comparison per distinct active revision.
- Existing freshness regressions pass, including staged edits hidden by restored working bytes, deletions, unavailable commits and untracked files.
- Batch framing handles spaces and linefeeds in present and absent paths.
- Repeat the read-only Gwen profile and compare elapsed time and command counts.
- Run configured core, static and generated checks; refresh the installed skill.

## Focused results

The read-only Gwen scan fell from 46,939 ms to 3,273 ms (14.3 times faster).
Git process counts fell from 4,893 object / 254 diff / 127 untracked commands
to 1 / 2 / 1 on the active certificate set. No mutable result cache survives an
inspection. Both pre-publication and final freshness checks remain in place.
Focused proof: 87 tests passed, including scope isolation, staged restoration,
renames, unavailable repositories/revisions, unusual filenames, inactive-proof
cache reuse and active-proof invalidation.

An isolated full plan-index build using Gwen's 2,286 real source files published
212,720 records in 118,941 ms; an unchanged update took 4,925 ms with zero parsed
files and 2,286 reused, retaining the same generation. The probe removed its own
project rows and left Gwen's files and index generations untouched. Full-build
publication latency is a separate measured SQL bottleneck, handled separately.
Logs: `tmp/agents/index-progress-fix/gwen-input-profile*.log`,
`performance-focused.log`, and `performance-isolated-index.log` in that directory.
Final core acceptance and installed-skill refresh completed; see final acceptance below.

## Final acceptance

Resolved. Final `npm test` exited 0: 581 JavaScript, 337 typed, 23 Pi, 4 MCP and
100 TSTS tests passed (1,045 total), with installer checks and final TSTS
validation of 1,697 files passing. Rule-copy, version, generated-runtime,
traceability and observation-schema checks passed. The installed plan-execution
runtime matches its canonical source; local installer verification passed.
No Gwen coordinator was contacted, and the isolated measurement projects were
removed without modifying Gwen's files or published index generations.

Final log: `tmp/agents/index-progress-fix/performance-full.log`.
