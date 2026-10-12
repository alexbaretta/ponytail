# Final delivery assessment: OBL-31

Source revision: 50af3b16bfceb5257afa819cab08aaa9baadeda3. Baseline: BASELINE-16. Binding: BIND-155.

Condition: Reserve each obligation/worktree pair once under concurrent allocation requests.

Criterion: `tests/rolling-campaign-store.integration.test.ts` demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Real concurrent PostgreSQL allocation requests reserve one obligation/worktree pair, return the same original allocation and preserve uniqueness. The workflows retain assignment and external action identity across restart and subsequent allocation.

Six focused cases passed on this exact clean source revision: three typed scheduling cases and three actual PostgreSQL workflows. Unchanged TSTS checked 1,278 files without violations. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test '--test-name-pattern=maximal scheduling|suspended workers|scope changes' dist/tests/rolling-campaign.test.js

2026-10-12T07:36:01.159089+00:00 – 2026-10-12T07:36:01.244371+00:00

~~~text
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.610291ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.4ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.237792ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 51.558042

~~~

## node --test '--test-name-pattern=real PostgreSQL serializes allocation' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T07:36:05.604255+00:00 – 2026-10-12T07:36:26.869027+00:00

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (8807.625042ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (6218.651833ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (6056.966917ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 21236.066792

~~~

## npm run check:tsts

2026-10-12T07:40:02.792440+00:00 – 2026-10-12T07:40:05.043498+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1278 files: no violations found.

~~~
