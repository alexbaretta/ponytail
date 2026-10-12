<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# OBL-107 binding-history component proof

Source revision c3eeb49, dirty approved component/configuration/management
inputs. BASELINE-9 froze this component's paths before source edits. New
TypeScript implementation and all six direct fixture tests are checked. The
additional 17 unchanged historical JavaScript tests supply V1 compatibility
regression proof; their own language-migration obligations stay unresolved.

The physical binding-history V1 contract is distinct from the original obligation
document V1. Its reader and append-one amendment API preserve immutable prefixes,
validate declared coordinator authority and current accepted baseline, reject
both stale global and stale per-obligation predecessors, enforce exact bounded
execution and prerequisite membership, and reject dependency cycles after every
revision. Projection retains canonical IDs/counts and never rewrites conditions,
criteria or original execution fields. Every accepted prefix remains replayable;
an earlier projection retains its earlier permissions after later amendments.

Shared execution-field validation has one canonical owner. Its rules were moved
into the exported reader without changing the historical V1 shape or accepted
meanings. Full existing V1 compatibility tests pass. No alias or second execution
validator was introduced. The component uses installed lossless JSON and native
Node/TypeScript facilities; it requires no host plugin, database or new resource.

Strict root build passed after final source edits; generated adjacent runtime,
contract registry, source mappings and OpenClaw resource copies are synchronized.
TSTS was applied unchanged. Source/type review finds no explicit any, assertions,
non-null assertions or compiler suppressions in the 65 owned root TypeScript
files. Existing TSTS adds 17 covered files, for 82 canonical TypeScript paths.

This component does not yet authorize an amended edit assignment: shared
portable/rolling selector projection, frozen live lease enforcement and bound
certificate acceptance remain necessary integration work under the design's
binding prerequisite. No database suspension or native worker cessation claim
is made from this in-memory component proof.

Command: node --test dist/tests/obligation-binding-history.test.js tests/obligations.test.js; exit 0, 23 tests, zero failures/skips/cancellations.

```text
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (42.159417ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (36.077833ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (34.029083ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (20.226792ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (22.783416ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (29.947541ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles (2.784083ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.656917ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (5.312875ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (3.942917ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (3.781208ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.161209ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.966584ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (5.559084ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (2.975542ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (2.24275ms)
✔ stale proof forces honest disturbance before new productive acceptance (3.968458ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.623625ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (151.588542ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.3975ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (25.191292ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.326458ms)
✔ reader cannot hide declared membership from the accepted current observation (1.542791ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 270.819167
```

Build: npm run build; exit 0.

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js

```

Configured unchanged TSTS: exit 0.

```text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 891 files: no violations found.
```

Bounded current compiler/source inspection:

```text
(node:90827) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/alex/git/ctosclub/ponytail/tmp/binding-history/coverage-current.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/alex/git/ctosclub/ponytail/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
tsconfig.json: 65 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
tsts/tsconfig.json: 17 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
82 owned TypeScript files covered (65 Ponytail, 17 existing TSTS); zero root-owned type bypasses; checker source/tests unchanged from campaign start
Fresh npm run build passed on these final source inputs; runtime materialization check passed. Remaining handwritten executable owners and global language/runtime completeness stay unresolved
```

Runtime check, OpenClaw tests, eight rule copies, pinned versions and campaign
structure pass. Reverse-view generation ran and retains the same nine unresolved
review/publication/interface coverage gaps; it is not a global traceability pass.

```text

> @alexbaretta/ponytail@4.8.4 build:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json --write

error traceability-coverage: REQ-ROLLING-REVIEW lacks implementation coverage
error traceability-coverage: REQ-ROLLING-REVIEW lacks unit-test coverage or a justified disposition
error traceability-coverage: REQ-ROLLING-REVIEW lacks integration-test coverage
error traceability-coverage: REQ-ROLLING-PUBLICATION lacks implementation coverage
error traceability-coverage: REQ-ROLLING-PUBLICATION lacks unit-test coverage or a justified disposition
error traceability-coverage: REQ-ROLLING-PUBLICATION lacks integration-test coverage
error traceability-coverage: REQ-ROLLING-INTERFACES lacks implementation coverage
error traceability-coverage: REQ-ROLLING-INTERFACES lacks unit-test coverage or a justified disposition
error traceability-coverage: REQ-ROLLING-INTERFACES lacks integration-test coverage
```
