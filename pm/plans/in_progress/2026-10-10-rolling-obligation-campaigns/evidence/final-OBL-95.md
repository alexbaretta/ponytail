# Final delivery assessment: OBL-95

Source revision: d78d3ee40160465cb5cb4b000f8aa5375a8b53a8. Baseline: BASELINE-16. Binding: BIND-219.

Condition: Execute sprint-selection CLI modes with exact JSON and error exits through a checked static implementation preserving the approved portable behavior and historical contract meanings.

Criterion: Strict compilation and unchanged TSTS cover the canonical implementation and its owned fixtures without bypasses; generated runtime and configured classification/mappings are synchronized. Focused executable proof demonstrates the entire condition, including applicable rejection, completion and non-mutation behavior. Inspected proof boundary: tests/ready-sprints-cli.test.ts. Review that boundary for missing assertions before assessment; historical handwritten JavaScript tests must be converted to checked typed sources before this language obligation can be discharged.

The generated sprint-selection CLI returns exact planning, execution and completion JSON with status zero, preserves actual file bytes, and rejects unknown grammar with exact stderr and exit one.

Thirty focused typed/actual-filesystem sprint review, CLI and physical tasklet cases passed on this exact clean source revision. Unchanged TSTS checked 1,383 files with zero violations. Existing strict build, runtime/traceability and full 896-test results remain applicable because their relevant source inputs are unchanged; their original provenance is retained. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/ready-sprints.test.js dist/tests/ready-sprints-cli.test.js dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js

2026-10-12T09:40:39.694227+00:00 – 2026-10-12T09:40:39.913512+00:00

~~~text
✔ generated sprint CLI preserves planning, execution and completion JSON (109.195958ms)
✔ native sprint CLI preserves grammar error output and exit status (33.597125ms)
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (1.571375ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.191042ms)
✔ selects one V1 sprint and retains unordered-path validation (0.42125ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.211042ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (2.489167ms)
✔ planning starts only after approved prerequisites and preserves blocked and eligible inputs (0.130958ms)
✔ all sprint selectors preserve canonical readonly fixture values (0.099334ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.139ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (73.214ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (34.5505ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.457959ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.123708ms)
✔ retains strict physical V1 parsing and scalar selection (41.300958ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (5.277166ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (5.751709ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (4.150583ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (5.301583ms)
✔ selects the highest-ranked V2 tasklet (9.268125ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.432875ms)
✔ blocks tasklets until dependency-feature validation is complete (3.091333ms)
✔ uses prior affinity and graph criteria deterministically (1.19275ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (39.829541ms)
✔ V3 returns one complete ordered batch (1.265667ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.655833ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (7.086584ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.40475ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.393917ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.386708ms)
ℹ tests 30
ℹ suites 0
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 189.037083

~~~

## npm run check:tsts

2026-10-12T09:40:46.800310+00:00 – 2026-10-12T09:40:49.250006+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1383 files: no violations found.

~~~

## Documentary input renewal: CERT-308

Inspection source revision: 808d3df6b1f963edbdbb0d0038cac41c05edf235. Original certificate: CERT-201.

Every declared source, configuration, requirement and compiled-runtime input was inspected on its actual bytes. Only README.md changed before renewal; the corrected non-executable instructions now agree with actual campaign and legacy help. Original executed behavioral proof above is retained verbatim and reused on unchanged executable inputs; its dates and source revisions are not relabeled. The complete native Suite passed all 12 cases at a1cc7dc74f8b897062d238d177290ea35bf8894b; subsequent differences are confined to README and this plan's records. Historical certificates are explicitly invalidated, not rewritten. This fresh check renews the same condition and binding, without changing their meanings.

Inspection: 2026-10-12T10:51:00.216Z – 2026-10-12T10:51:00.319Z. Source/input equality passed; native Suite: 12 pass, 0 fail, 0 skip, 0 cancelled.

# Final archive-corrected assessment: CERT-400

Source revision: d54ffb13e157049fc27191db4804a517fd34773a. Baseline: BASELINE-17. Binding: BIND-219 .

Condition: Execute sprint-selection CLI modes with exact JSON and error exits through a checked static implementation preserving the approved portable behavior and historical contract meanings.

Criterion: Strict compilation and unchanged TSTS cover the canonical implementation and its owned fixtures without bypasses; generated runtime and configured classification/mappings are synchronized. Focused executable proof demonstrates the entire condition, including applicable rejection, completion and non-mutation behavior. Inspected proof boundary: tests/ready-sprints-cli.test.ts. Review that boundary for missing assertions before assessment; historical handwritten JavaScript tests must be converted to checked typed sources before this language obligation can be discharged.

The generated sprint-selection CLI returns exact planning, execution and completion JSON with status zero, preserves actual file bytes, and rejects unknown grammar with exact stderr and exit one. Documentary-input renewal inspected equality of every other declared source/configuration/runtime input and retains original passing executable proof without relabeling its provenance.

Current assessment inspects the completed executable evidence and verifies that differences from the committed execution source are confined to plan records. The bound check is this fresh inspection; original test revisions/dirty state remain in the hashed shared evidence rather than being relabeled. Actual final proof: 897 repository tests, 12 complete native Suite cases, 19 focused fixture/archive cases and one real PostgreSQL binding query passed with no failures/skips/cancellations. Existing TSTS checked 1,453 files without violations. Full raw command output, original revision, timestamps and failure-to-correction provenance are retained in [final acceptance](final-acceptance.md); this certificate hashes that completed evidence record. The full repository run used the staged final source before commit 080d86a; the native Suite ran from clean commit 080d86a. All relevant code/configuration/runtime inputs remain unchanged. Original earlier inspection text above remains historical and does not substitute for these final runs.
