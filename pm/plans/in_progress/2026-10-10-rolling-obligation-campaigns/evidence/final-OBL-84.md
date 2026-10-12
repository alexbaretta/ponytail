# Final delivery assessment: OBL-84

Source revision: 8bc2cf231f0895abf5c0dfc7da9ebf6c8e448f8a. Baseline: BASELINE-16. Binding: BIND-208.

Condition: Read physical V2 sprint metadata through a checked static implementation preserving the approved portable behavior and historical contract meanings.

Criterion: Strict compilation and unchanged TSTS cover the canonical implementation and its owned fixtures without bypasses; generated runtime and configured classification/mappings are synchronized. Focused executable proof demonstrates the entire condition, including applicable rejection, completion and non-mutation behavior. Inspected proof boundary: Same proof, including reviewed execution and null execution. Review that boundary for missing assertions before assessment; historical handwritten JavaScript tests must be converted to checked typed sources before this language obligation can be discharged.

The physical V2 sprint reader preserves reviewed-execution and null-execution meaning independently of V1/V3. Focused typed fixtures verify every field in the valid reader result, malformed value rejection and unchanged input/source strings rather than normalizing old bytes in place.

Forty focused typed/actual-filesystem cases passed on this exact clean source revision: thirty-seven obligation/sprint reader/selector cases and three sprint graph cases. Unchanged TSTS checked 1,359 files with zero violations. Existing strict build, runtime/traceability and full 896-test results remain applicable because their relevant source inputs are unchanged; their original provenance is retained. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/obligations.test.js dist/tests/sprint-metadata.test.js dist/tests/ready-sprints.test.js

2026-10-12T09:18:52.430437+00:00 – 2026-10-12T09:18:52.805369+00:00

~~~text
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (2.590708ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.583833ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (4.876375ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (3.721625ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.31325ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (6.351875ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.242708ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.634875ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (4.289125ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (3.323208ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (2.301417ms)
✔ stale proof forces honest disturbance before new productive acceptance (3.852791ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.266167ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (223.825375ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.148291ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (22.042708ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.572042ms)
✔ reader cannot hide declared membership from the accepted current observation (1.2595ms)
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (1.659209ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.203417ms)
✔ selects one V1 sprint and retains unordered-path validation (0.245ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.155416ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (3.743041ms)
✔ planning starts only after approved prerequisites and preserves blocked and eligible inputs (0.129458ms)
✔ all sprint selectors preserve canonical readonly fixture values (0.09625ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.130708ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (74.985125ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (36.405375ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.441542ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.113583ms)
✔ physical sprint readers preserve planning, version-specific execution and null execution (1.336375ms)
✔ physical V1 sprint metadata retains null execution and rejects malformed inputs without mutation (0.79525ms)
✔ physical V2 sprint metadata preserves reviewed and null execution without mutating valid or malformed inputs (0.291917ms)
✔ physical V3 sprint metadata preserves its complete value and leaves rejected input unchanged (0.169ms)
✔ unknown sprint metadata rejects invalid reviewed flags, paths, identity and block count (0.247292ms)
✔ discovery retains numeric ordering and rejects duplicate ordinals and mixed physical versions (2.046417ms)
✔ discovery preserves homogeneous physical collections and files and rejects absent or empty collections (2.972833ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 343.0365

~~~

## node --test dist/tests/sprint-graph.test.js

2026-10-12T09:19:53.587212+00:00 – 2026-10-12T09:19:53.669842+00:00

~~~text
✔ both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs (0.930666ms)
✔ legacy path ownership recognizes transitive execution ordering and rejects unordered sharing (0.315792ms)
✔ V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file (3.171208ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 48.394208

~~~

## npm run check:tsts

2026-10-12T09:18:53.238648+00:00 – 2026-10-12T09:18:55.543161+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1359 files: no violations found.

~~~

## Documentary input renewal: CERT-297

Inspection source revision: 808d3df6b1f963edbdbb0d0038cac41c05edf235. Original certificate: CERT-190.

Every declared source, configuration, requirement and compiled-runtime input was inspected on its actual bytes. Only README.md changed before renewal; the corrected non-executable instructions now agree with actual campaign and legacy help. Original executed behavioral proof above is retained verbatim and reused on unchanged executable inputs; its dates and source revisions are not relabeled. The complete native Suite passed all 12 cases at a1cc7dc74f8b897062d238d177290ea35bf8894b; subsequent differences are confined to README and this plan's records. Historical certificates are explicitly invalidated, not rewritten. This fresh check renews the same condition and binding, without changing their meanings.

Inspection: 2026-10-12T10:51:00.216Z – 2026-10-12T10:51:00.319Z. Source/input equality passed; native Suite: 12 pass, 0 fail, 0 skip, 0 cancelled.

# Final archive-corrected assessment: CERT-389

Source revision: d54ffb13e157049fc27191db4804a517fd34773a. Baseline: BASELINE-17. Binding: BIND-208 .

Condition: Read physical V2 sprint metadata through a checked static implementation preserving the approved portable behavior and historical contract meanings.

Criterion: Strict compilation and unchanged TSTS cover the canonical implementation and its owned fixtures without bypasses; generated runtime and configured classification/mappings are synchronized. Focused executable proof demonstrates the entire condition, including applicable rejection, completion and non-mutation behavior. Inspected proof boundary: Same proof, including reviewed execution and null execution. Review that boundary for missing assertions before assessment; historical handwritten JavaScript tests must be converted to checked typed sources before this language obligation can be discharged.

The physical V2 sprint reader preserves reviewed-execution and null-execution meaning independently of V1/V3. Focused typed fixtures verify every field in the valid reader result, malformed value rejection and unchanged input/source strings rather than normalizing old bytes in place. Documentary-input renewal inspected equality of every other declared source/configuration/runtime input and retains original passing executable proof without relabeling its provenance.

Current assessment inspects the completed executable evidence and verifies that differences from the committed execution source are confined to plan records. The bound check is this fresh inspection; original test revisions/dirty state remain in the hashed shared evidence rather than being relabeled. Actual final proof: 897 repository tests, 12 complete native Suite cases, 19 focused fixture/archive cases and one real PostgreSQL binding query passed with no failures/skips/cancellations. Existing TSTS checked 1,453 files without violations. Full raw command output, original revision, timestamps and failure-to-correction provenance are retained in [final acceptance](final-acceptance.md); this certificate hashes that completed evidence record. The full repository run used the staged final source before commit 080d86a; the native Suite ran from clean commit 080d86a. All relevant code/configuration/runtime inputs remain unchanged. Original earlier inspection text above remains historical and does not substitute for these final runs.
