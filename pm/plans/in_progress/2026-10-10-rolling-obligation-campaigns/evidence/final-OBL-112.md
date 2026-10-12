# Final delivery assessment: OBL-112

Source revision: 05122abc5c534589cb4702db76939621b973805f. Baseline: BASELINE-16. Binding: BIND-236.

Condition: Coordinator checkpoint acceptance checks amended obligation certificates against their actual frozen submission bindings, candidate revisions and fresh proof inputs without rewriting or weakening historical V1 document or acceptance semantics.

Criterion: An independently versioned typed binding artifact and portable acceptance boundary reject forged or stale submission identities, wrong current revisions, unmet current prerequisites, unauthorized or mismatched execution proof and absent/stale binding artifacts. The same immutable V1 obligation records, accepted prefixes and legacy adequacy checks are preserved. Real PostgreSQL/Git proof reads the actual retained submission and demonstrates acceptance on reconciled inputs plus rejection after relevant changes. Strict compilation, unchanged TSTS, generated runtime/host resources and configured traceability pass for the affected boundary. This component does not establish adversarial review, production integration/publication or CLI/MCP orchestration.

Bound checkpoint acceptance compares the actual frozen submission with the current binding, candidate revision, authority and prerequisites. Typed and actual PostgreSQL/Git proof reject forged identities, stale inputs, absent bindings and unauthorized scope changes, preserve physical V1 historical semantics, and serialize accepted integrated document publication and recovery.

Twenty-seven focused cases passed on this exact clean source revision: twenty-four typed/Git boundary tests and three actual PostgreSQL workflows. Unchanged TSTS checked 1,311 files without violations. Original native actor execution evidence is retained under its original source revisions; these component results are not substituted for native execution. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/rolling-worker-submission.test.js dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-campaign-store.test.js

2026-10-12T08:23:49.945062+00:00 – 2026-10-12T08:24:27.102045+00:00

~~~text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (5573.722334ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (3895.128875ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (4675.558666ms)
✔ lease use fences graph and generation, operations and exact changed paths (3521.539375ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (3600.027666ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (3696.959666ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (3352.694792ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (3863.066208ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (3649.63875ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (3354.37075ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (3367.228292ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (4213.559959ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (4783.704041ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (3523.732958ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (3626.604542ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (26.686375ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (14.039458ms)
✔ V3 configuration normalizes historical inputs without changing their bytes (65.584125ms)
✔ V3 assignment execution is explicit and historical scopes normalize without widening authority (0.830417ms)
Rebasing (1/1)
Stopped at 4e59bcc...  # candidate
You can amend the commit now, with

  git commit --amend 

Once you are satisfied with your changes, run

  git rebase --continue
Successfully rebased and updated refs/heads/master.
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (1784.026125ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (300.340667ms)
✔ submission rejects a clean interactive rebase edit stop until the rebase completes (322.30925ms)
✔ submission rejects merge history and reverted out-of-scope commits (424.294ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (97.967708ms)
ℹ tests 24
ℹ suites 0
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 37126.683709

~~~

## node --test '--test-name-pattern=real PostgreSQL serializes allocation, retains ownership and persists accepted review$|submission collection binds|integrated certificate assessment uses retained' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T08:23:53.754366+00:00 – 2026-10-12T08:24:23.659855+00:00

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (12196.014875ms)
✔ submission collection binds terminal idle actor and exact passing candidate before review (6815.945333ms)
ℹ component submission revision=9e62e99119ffe4612d491e3c69c9c9fff84ee04e; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ integrated certificate assessment uses retained published proof and serializes accepted record publication (10669.592958ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 29866.211125

~~~

## npm run check:tsts

2026-10-12T08:23:55.521183+00:00 – 2026-10-12T08:23:58.560980+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1311 files: no violations found.

~~~
