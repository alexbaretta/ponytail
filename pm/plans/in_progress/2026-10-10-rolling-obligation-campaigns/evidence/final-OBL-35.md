# Final delivery assessment: OBL-35

Source revision: ded30fbcdea0206445b33ff9080a9d080676a993. Baseline: BASELINE-16. Binding: BIND-159.

Condition: Reconcile an accepted graph change before subsequent database allocation.

Criterion: PostgreSQL Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Authoritative file changes produce a new coordinator graph identity. The PostgreSQL workflow reconciles each checked change before allocation, rejects obsolete digests and only resumes the original owner after the accepted prerequisite is satisfied.

Four focused cases passed on this exact clean source revision: physical-path unit proof, two real Git worktree lifecycle Arcs, and one real PostgreSQL release/reconciliation workflow. Unchanged TSTS checked 1,291 files without violations. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js

2026-10-12T07:56:25.559596+00:00 – 2026-10-12T07:56:26.956600+00:00

~~~text
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (783.004125ms)
✔ retirement cleanup verifies owner, preserves caches and user work, and retains failed cleanup (532.014792ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (1.851375ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1365.914583

~~~

## node --test '--test-name-pattern=real PostgreSQL serializes allocation, retains ownership and persists accepted review$' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T07:58:56.879635+00:00 – 2026-10-12T07:59:06.254859+00:00

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (9161.335833ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9345.492792

~~~

## npm run check:tsts

2026-10-12T07:58:58.191684+00:00 – 2026-10-12T07:59:00.771910+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1291 files: no violations found.

~~~
