# Final delivery assessment: OBL-22

Source revision: 2fc808cf902d4cc6a31ee42ba4db9489001ffc4f. Baseline: BASELINE-16. Binding: BIND-146.

Condition: Resolve and retain the campaign publication target using explicit, project, then Git defaults.

Criterion: `tests/rolling-campaign.test.ts`; configuration Git Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

The configuration resolver preserves explicit user, project and effective Git default precedence and persists the chosen remote/branch. The real Git configuration Arc verifies checkout identity, project defaults and Git defaults; typed cases exercise explicit overrides and invalid refs.

Twelve focused tests passed on this exact clean source revision, including real Git configuration and graph Arcs. Unchanged TSTS checked 1,266 files and traceability checked 855 relationships without violations. Runtime generation was checked on this revision. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/rolling-campaign.test.js dist/tests/rolling-campaign.integration.test.js

2026-10-12T07:13:36.910580+00:00 – 2026-10-12T07:13:40.670250+00:00

~~~text
✔ configuration boundary uses the designated Git checkout and effective defaults (131.628875ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (3476.1065ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.34075ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.388708ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (0.819542ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (51.530209ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (94.771625ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.503459ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.495125ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.398208ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.249792ms)
✔ V2 cleanup declaration preserves V1 physical meanings and normalizes unknown retirement safely (0.344416ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3727.535125

~~~

## npm run check:tsts

2026-10-12T07:13:38.173021+00:00 – 2026-10-12T07:13:40.602227+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1266 files: no violations found.

~~~

## npm run check:traceability

2026-10-12T07:13:39.431682+00:00 – 2026-10-12T07:13:40.320558+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json

Traceability checked 855 relationships: no violations found.

~~~

## Documentary input renewal: CERT-233

Inspection source revision: 808d3df6b1f963edbdbb0d0038cac41c05edf235. Original certificate: CERT-142.

Every declared source, configuration, requirement and compiled-runtime input was inspected on its actual bytes. Only README.md changed before renewal; the corrected non-executable instructions now agree with actual campaign and legacy help. Original executed behavioral proof above is retained verbatim and reused on unchanged executable inputs; its dates and source revisions are not relabeled. The complete native Suite passed all 12 cases at a1cc7dc74f8b897062d238d177290ea35bf8894b; subsequent differences are confined to README and this plan's records. Historical certificates are explicitly invalidated, not rewritten. This fresh check renews the same condition and binding, without changing their meanings.

Inspection: 2026-10-12T10:51:00.216Z – 2026-10-12T10:51:00.319Z. Source/input equality passed; native Suite: 12 pass, 0 fail, 0 skip, 0 cancelled.
