# Final delivery assessment: OBL-29

Source revision: 50af3b16bfceb5257afa819cab08aaa9baadeda3. Baseline: BASELINE-16. Binding: BIND-153.

Condition: Prefer eligible stopped inactive assignments over new work while retaining their ownership.

Criterion: `tests/rolling-campaign.test.ts`; PostgreSQL Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Unblocked stopped inactive owners resume before new work. Typed scheduling and real PostgreSQL workflows demonstrate retained obligation/worktree/session ownership, capacity accounting and a fresh generation for the original resumed assignment.

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

## Documentary input renewal: CERT-240

Inspection source revision: 808d3df6b1f963edbdbb0d0038cac41c05edf235. Original certificate: CERT-149.

Every declared source, configuration, requirement and compiled-runtime input was inspected on its actual bytes. Only README.md changed before renewal; the corrected non-executable instructions now agree with actual campaign and legacy help. Original executed behavioral proof above is retained verbatim and reused on unchanged executable inputs; its dates and source revisions are not relabeled. The complete native Suite passed all 12 cases at a1cc7dc74f8b897062d238d177290ea35bf8894b; subsequent differences are confined to README and this plan's records. Historical certificates are explicitly invalidated, not rewritten. This fresh check renews the same condition and binding, without changing their meanings.

Inspection: 2026-10-12T10:51:00.216Z – 2026-10-12T10:51:00.319Z. Source/input equality passed; native Suite: 12 pass, 0 fail, 0 skip, 0 cancelled.
