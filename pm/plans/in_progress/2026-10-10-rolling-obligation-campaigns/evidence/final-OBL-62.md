# Final delivery assessment: OBL-62

Source revision: 20c4e021ad5e1ad911aa1d0b5b8ca0a1d68694ff. Baseline: BASELINE-16. Binding: BIND-186.

Condition: Reconcile mainline push races and unknown outcomes, refresh changed-input proof and synchronize the campaign base.

Criterion: Publication recovery Git Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Normal, lost-acknowledgement, race, unavailable-remote and rejected-push PostgreSQL/Git workflows retain immutable publication observations. Changed upstream invalidates old candidate QA, history-preserving refresh requires new passing proof, and confirmed publication synchronizes the campaign base without force or duplicate delivery.

Twenty-three focused typed/Git publication and coordinator decision cases, five real PostgreSQL mainline publication scenarios and one real shared-operation replenishment/decision Arc passed on this exact clean source revision. Unchanged TSTS checked 1,429 files with zero violations. Existing strict build, runtime/traceability and full 896-test results remain applicable because their relevant source inputs are unchanged; their original provenance is retained. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/rolling-publication.test.js dist/tests/rolling-publication.integration.test.js dist/tests/rolling-operations.test.js

2026-10-12T10:08:59.810799+00:00 – 2026-10-12T10:09:03.068412+00:00

~~~text
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (11.04925ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.274917ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.1175ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.118ms)
✔ attached working worker receives an executable next action before new allocations (0.097083ms)
✔ rejected work stops its original worker before resume-first replenishment (0.084833ms)
✔ known worker instruction is collected and unknown creation keeps its original ownership (0.12675ms)
✔ pending original attachment is observed before worker dispatch and stopped workers are not restarted (0.150292ms)
✔ new review request is dispatched before attempting to inspect its nonexistent turn (0.095917ms)
✔ review decisions observe known turns and preserve uncertain original dispatch ownership (0.153125ms)
✔ retired unassigned checkout is released even when no obligation is unblocked (0.105791ms)
✔ attached retirement requires current cleanup eligibility before releasing its checkout (0.094292ms)
✔ published accepted increment retires instead of repeating integration (0.119875ms)
✔ published delivery requests current certificate acceptance before worker retirement (0.0855ms)
✔ ready publication selections supply the exact threshold or partial-flush command (0.1005ms)
✔ publication blockers and below-threshold waiting never invent a freeze action (0.198333ms)
✔ coordinator suggests final closure only after fresh scope, released owners and publication drain (0.126417ms)
✔ mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree (2528.697541ms)
✔ conflicting mainline preserves the publication branch, merge state and published campaign refs (648.500125ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (1.079209ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.148209ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (103.711ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (0.837417ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3228.221541

~~~

## node --test '--test-name-pattern=mainline .* publication' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T10:09:02.171741+00:00 – 2026-10-12T10:10:05.175148+00:00

~~~text
✔ mainline normal publication retains one observation and synchronizes the campaign after restart (12038.021791ms)
✔ mainline lost_ack publication retains one observation and synchronizes the campaign after restart (11735.784125ms)
Switched to a new branch 'main'
To /private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-store-LNDfJA/managed/increment-remote.git
   2630bbc..f34c993  main -> main
✔ mainline race publication retains one observation and synchronizes the campaign after restart (13095.622542ms)
✔ mainline unavailable publication retains one observation and synchronizes the campaign after restart (12951.58825ms)
✔ mainline rejected publication retains one observation and synchronizes the campaign after restart (12997.264541ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 62972.292625

~~~

## node --test '--test-name-pattern=shared operations initialize' dist/tests/rolling-operations.integration.test.js

2026-10-12T10:10:14.157546+00:00 – 2026-10-12T10:10:19.770642+00:00

~~~text
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (5514.183042ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5582.042167

~~~

## npm run check:tsts

2026-10-12T10:09:03.451551+00:00 – 2026-10-12T10:09:05.905402+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1429 files: no violations found.

~~~
