# Final delivery assessment: OBL-30

Source revision: 50af3b16bfceb5257afa819cab08aaa9baadeda3. Baseline: BASELINE-16. Binding: BIND-154.

Condition: Prevent changed assignment scope or another campaign's conflicting ownership from entering a selected batch.

Criterion: `tests/rolling-campaign.test.ts` demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Changed scopes remain blocked until reconciliation, and another campaign ownership still excludes conflicting paths. Current focused typed proof distinguishes retained inactive scope from a revised proposed scope and treats foreign owners as capacity/resource constraints.

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

## Documentary input renewal: CERT-241

Inspection source revision: 808d3df6b1f963edbdbb0d0038cac41c05edf235. Original certificate: CERT-150.

Every declared source, configuration, requirement and compiled-runtime input was inspected on its actual bytes. Only README.md changed before renewal; the corrected non-executable instructions now agree with actual campaign and legacy help. Original executed behavioral proof above is retained verbatim and reused on unchanged executable inputs; its dates and source revisions are not relabeled. The complete native Suite passed all 12 cases at a1cc7dc74f8b897062d238d177290ea35bf8894b; subsequent differences are confined to README and this plan's records. Historical certificates are explicitly invalidated, not rewritten. This fresh check renews the same condition and binding, without changing their meanings.

Inspection: 2026-10-12T10:51:00.216Z – 2026-10-12T10:51:00.319Z. Source/input equality passed; native Suite: 12 pass, 0 fail, 0 skip, 0 cancelled.

# Final archive-corrected assessment: CERT-332

Source revision: d54ffb13e157049fc27191db4804a517fd34773a. Baseline: BASELINE-17. Binding: BIND-154 .

Condition: Prevent changed assignment scope or another campaign's conflicting ownership from entering a selected batch.

Criterion: `tests/rolling-campaign.test.ts` demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Changed scopes remain blocked until reconciliation, and another campaign ownership still excludes conflicting paths. Current focused typed proof distinguishes retained inactive scope from a revised proposed scope and treats foreign owners as capacity/resource constraints. Documentary-input renewal inspected equality of every other declared source/configuration/runtime input and retains original passing executable proof without relabeling its provenance.

Current assessment inspects the completed executable evidence and verifies that differences from the committed execution source are confined to plan records. The bound check is this fresh inspection; original test revisions/dirty state remain in the hashed shared evidence rather than being relabeled. Actual final proof: 897 repository tests, 12 complete native Suite cases, 19 focused fixture/archive cases and one real PostgreSQL binding query passed with no failures/skips/cancellations. Existing TSTS checked 1,453 files without violations. Full raw command output, original revision, timestamps and failure-to-correction provenance are retained in [final acceptance](final-acceptance.md); this certificate hashes that completed evidence record. The full repository run used the staged final source before commit 080d86a; the native Suite ran from clean commit 080d86a. All relevant code/configuration/runtime inputs remain unchanged. Original earlier inspection text above remains historical and does not substitute for these final runs.
