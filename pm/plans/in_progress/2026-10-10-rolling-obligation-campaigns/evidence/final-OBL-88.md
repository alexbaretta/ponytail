# Final delivery assessment: OBL-88

Source revision: 7bd570a42ca49e9e6b6e32eec88fd87db9ebc4c5. Baseline: BASELINE-16. Binding: BIND-212.

Condition: Validate legacy sprint path ownership against execution ordering through a checked static implementation preserving the approved portable behavior and historical contract meanings.

Criterion: Strict compilation and unchanged TSTS cover the canonical implementation and its owned fixtures without bypasses; generated runtime and configured classification/mappings are synchronized. Focused executable proof demonstrates the entire condition, including applicable rejection, completion and non-mutation behavior. Inspected proof boundary: tests/sprint-graph.test.ts: transitive ordering and unordered sharing. Review that boundary for missing assertions before assessment; historical handwritten JavaScript tests must be converted to checked typed sources before this language obligation can be discharged.

Legacy ownership validation accepts shared exact paths only with transitive execution ordering and rejects an otherwise identical unordered overlap. Typed proof checks the valid map, rejected inputs and complete source values without mutation.

Fifteen focused typed/actual-filesystem ownership and sprint readiness cases passed on this exact clean source revision. Unchanged TSTS checked 1,371 files with zero violations. Existing strict build, runtime/traceability and full 896-test results remain applicable because their relevant source inputs are unchanged; their original provenance is retained. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/sprint-graph.test.js dist/tests/ready-sprints.test.js

2026-10-12T09:30:15.083189+00:00 – 2026-10-12T09:30:15.269852+00:00

~~~text
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (1.591083ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.177084ms)
✔ selects one V1 sprint and retains unordered-path validation (0.224667ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.15325ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (2.558083ms)
✔ planning starts only after approved prerequisites and preserves blocked and eligible inputs (0.123667ms)
✔ all sprint selectors preserve canonical readonly fixture values (0.102375ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.116292ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (71.052666ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (33.717875ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.402083ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.104791ms)
✔ both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs (0.988709ms)
✔ legacy path ownership recognizes transitive execution ordering and rejects unordered sharing (0.335958ms)
✔ V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file (3.498791ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 156.843416

~~~

## npm run check:tsts

2026-10-12T09:30:15.715298+00:00 – 2026-10-12T09:30:18.183355+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1371 files: no violations found.

~~~

## Documentary input renewal: CERT-301

Inspection source revision: 808d3df6b1f963edbdbb0d0038cac41c05edf235. Original certificate: CERT-194.

Every declared source, configuration, requirement and compiled-runtime input was inspected on its actual bytes. Only README.md changed before renewal; the corrected non-executable instructions now agree with actual campaign and legacy help. Original executed behavioral proof above is retained verbatim and reused on unchanged executable inputs; its dates and source revisions are not relabeled. The complete native Suite passed all 12 cases at a1cc7dc74f8b897062d238d177290ea35bf8894b; subsequent differences are confined to README and this plan's records. Historical certificates are explicitly invalidated, not rewritten. This fresh check renews the same condition and binding, without changing their meanings.

Inspection: 2026-10-12T10:51:00.216Z – 2026-10-12T10:51:00.319Z. Source/input equality passed; native Suite: 12 pass, 0 fail, 0 skip, 0 cancelled.
