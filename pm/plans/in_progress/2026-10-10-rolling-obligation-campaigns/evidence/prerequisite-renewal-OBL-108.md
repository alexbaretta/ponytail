# Prerequisite renewal: OBL-108

Source revision: e420047c40141ccaa2b9aa7a61a9bba8ceb480aa. Baseline: BASELINE-16. Binding: BIND-123.

Condition: Explicit binding-aware portable and rolling selector queries derive readiness and bounded paths from the same coordinator-authorized current binding projection while preserving historical document and query meanings.

Criterion: Typed portable CLI and real Git graph proof demonstrate current prerequisite/path projection, coordinator-only history input identity, rejected stale/foreign/invalid histories and retained legacy behavior without rewriting historical records. Strict build, unchanged TSTS, runtime/resource mirrors and traceability mappings pass. This query outcome does not authorize a live amended lease or bind candidate acceptance; those remain separate required integration work.

Real temporary Git repositories and the actual portable CLI demonstrate shared current binding selection with the rolling graph: identical readiness and paths, coordinator-owned history identity, stale and foreign history rejection, and preserved historical document/query behavior.

Fifteen focused tests pass without failures, skips or cancellations. The actual selector CLI exercises real Git repositories. TSTS, traceability, generated runtime/resources, rules, versions, manifests, adapters and registry pass. No source input changed since the strict compilation and 883-test full acceptance on ff5bb07; that full run is reused, not claimed as a new invocation. This record renews only the named prerequisite; final whole-campaign rollups remain unresolved.

## node --test dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligation-certificate-bindings.test.js

2026-10-12T05:27:26.022Z – 2026-10-12T05:27:56.347Z

~~~text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (4249.030917ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (3254.211333ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (2974.409292ms)
✔ lease use fences graph and generation, operations and exact changed paths (3273.172333ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (3055.213542ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (2771.166041ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (3088.65875ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (2884.374083ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (2908.13675ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (3058.894041ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (2876.011083ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (3181.766375ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (2932.859834ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (3265.950458ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (3050.712792ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 30287.924667

~~~

## npm run check:traceability

2026-10-12T05:27:56.365Z – 2026-10-12T05:27:57.223Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json

Traceability checked 827 relationships: no violations found.

~~~

## npm run check:tsts

2026-10-12T05:27:57.239Z – 2026-10-12T05:27:59.525Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1253 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T05:27:59.544Z – 2026-10-12T05:27:59.579Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-12T05:27:59.595Z – 2026-10-12T05:27:59.630Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-12T05:27:59.647Z – 2026-10-12T05:27:59.683Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-12T05:27:59.700Z – 2026-10-12T05:27:59.736Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-12T05:27:59.755Z – 2026-10-12T05:27:59.787Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-12T05:27:59.804Z – 2026-10-12T05:27:59.837Z

~~~text
Validated 39 registry entries.

~~~
