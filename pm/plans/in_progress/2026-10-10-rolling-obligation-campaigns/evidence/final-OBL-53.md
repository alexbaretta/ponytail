# Final delivery assessment: OBL-53

Source revision: 00aadf1e0dfe0cc73434bfef6f59e074fa277cfb. Baseline: BASELINE-16. Binding: BIND-177.

Condition: Apply the intentional fast-rebase policy after accepted review, with semantic inspection triggered by textual conflict.

Criterion: Increment integration Git Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Fast integration uses interactive rebase for clean commits, requests fresh focused proof on a changed base, preserves unrelated branches and requests semantic inspection only when textual conflict occurs. Real Git proof requires inspection of the exact conflicting commit before continuation and preserves original reviewed intent.

Seventeen focused typed/Git review and integration cases, four real PostgreSQL review workflows and two native adversarial/replacement reviewer workflows passed on this exact clean source revision. Unchanged TSTS checked 1,409 files with zero violations. Existing strict build, runtime/traceability and full 896-test results remain applicable because their relevant source inputs are unchanged; their original provenance is retained. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/rolling-review.test.js dist/tests/rolling-integration.test.js

2026-10-12T09:52:20.193227+00:00 – 2026-10-12T09:52:27.045239+00:00

~~~text
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (542.766958ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (569.31125ms)
✔ fast integration refuses a changed checkout before fetching or replaying (346.103125ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (818.831667ms)
✔ upstream divergence requests another rebase and preserves both revisions (568.758834ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1439.389833ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (1039.963792ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (788.725791ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.539667ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (658.135875ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.5865ms)
✔ reviewer replacement records loss and fresh identities without changing historical review contracts (1.337542ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.190666ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (0.529167ms)
✔ review completion requires the exact terminal turn and validated final message (0.390375ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.27225ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.089833ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6821.871375

~~~

## node --test '--test-name-pattern=real PostgreSQL records lost reviewer|real PostgreSQL serializes allocation, retains ownership and persists' dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T09:52:23.113151+00:00 – 2026-10-12T09:52:55.808649+00:00

~~~text
✔ real PostgreSQL records lost reviewer replacement and fences the old actor while retaining fresh review after restart (9892.977541ms)
ℹ Lost review 8296133b-4fc9-4867-9c10-febdf4b7e117 retained unchanged; recorded replacement e668589f-7962-44ca-8301-cfcee87c7873; old dispatch and decisions fenced after restart; fresh review pending.
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (9237.911166ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (6648.401334ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (6704.065167ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 32664.036958

~~~

## node --test '--test-name-pattern=live adversarial reviewer|live replacement reviewer' dist/tests/rolling-codex.integration.js

2026-10-12T09:53:09.045454+00:00 – 2026-10-12T09:54:36.642843+00:00

~~~text
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (40224.338791ms)
ℹ {"timestamp":"2026-10-12T09:53:15.128201Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T09:53:15.128241Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T09:53:15.612849Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-12T09:53:15.612884Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T09:53:16.282200Z","level":"WARN","fields":{"message":"state db discrepancy during find_thread_path_by_id_str_in_subdir: falling_back"},"target":"codex_rollout::list"}
ℹ {"timestamp":"2026-10-12T09:53:16.298019Z","level":"WARN","fields":{"message":"state db discrepancy during find_thread_path_by_id_str_in_subdir: falling_back"},"target":"codex_rollout::list"}
ℹ native review=ed9f7400-f0ae-4f0d-9e0e-f9d3c6ca99bc; thread=01a12f87-db55-70e1-96e2-7e41d5b82754; session=01a12f87-db55-70e1-96e2-7e41d5b82754; candidate=3edf626de48fe25e55da1829da9bc2e4be285b10; terminal=completed; final={"schemaVersion":1,"reviewId":"ed9f7400-f0ae-4f0d-9e0e-f9d3c6ca99bc","revision":"3edf626de48fe25e55da1829da9bc2e4be285b10","reviewerSessionId":"01a12f87-db55-70e1-96e2-7e41d5b82754","completedAt":"2026-10-12T02:53:42.523-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and acceptance group ROLL-INVENTORY-T2. The retained syntax-check proof matches the candidate's digest but cannot establish the required value. Restore the exported value to exactly 1 and retain proof that verifies that condition."]}
ℹ native review=ed9f7400-f0ae-4f0d-9e0e-f9d3c6ca99bc; thread=01a12f87-db55-70e1-96e2-7e41d5b82754; session=01a12f87-db55-70e1-96e2-7e41d5b82754; candidate=3edf626de48fe25e55da1829da9bc2e4be285b10; decision=rejected; findings=["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and acceptance group ROLL-INVENTORY-T2. The retained syntax-check proof matches the candidate's digest but cannot establish the required value. Restore the exported value to exactly 1 and retain proof that verifies that condition."]; recovered after App Server restart
✔ live replacement reviewer freshly reviews the exact candidate after recorded original reviewer loss (47175.963667ms)
ℹ {"timestamp":"2026-10-12T09:53:55.381468Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-12T09:53:55.381505Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T09:53:55.717575Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-12T09:53:55.717608Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-12T09:53:55.892843Z","level":"WARN","fields":{"message":"state db discrepancy during find_thread_path_by_id_str_in_subdir: falling_back"},"target":"codex_rollout::list"}
ℹ {"timestamp":"2026-10-12T09:53:55.892947Z","level":"WARN","fields":{"message":"state db discrepancy during read_repair_rollout_path: upsert_needed (slow path)"},"target":"codex_rollout::state_db"}
ℹ Lost review 57058344-81dd-4149-ae98-3f1d2b663cb6 retained unchanged; recorded replacement 704d73c6-d623-4e04-8c59-f22b16492e00; old dispatch and decisions fenced after restart; fresh review pending.
ℹ native review=704d73c6-d623-4e04-8c59-f22b16492e00; thread=01a12f88-7abf-7970-b697-7b6a7ed9804b; session=01a12f88-7abf-7970-b697-7b6a7ed9804b; candidate=cd57d5cfe2c27411c57865a482749dc474e994b2; terminal=completed; final={"schemaVersion":1,"reviewId":"704d73c6-d623-4e04-8c59-f22b16492e00","revision":"cd57d5cfe2c27411c57865a482749dc474e994b2","reviewerSessionId":"01a12f88-7abf-7970-b697-7b6a7ed9804b","completedAt":"2026-10-12T02:54:28-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. Restore the initializer to exactly 1 and retain evidence demonstrating that condition; the syntax-only result in proof.txt:1 does not establish it."]}
ℹ native review=704d73c6-d623-4e04-8c59-f22b16492e00; thread=01a12f88-7abf-7970-b697-7b6a7ed9804b; session=01a12f88-7abf-7970-b697-7b6a7ed9804b; candidate=cd57d5cfe2c27411c57865a482749dc474e994b2; decision=rejected; findings=["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. Restore the initializer to exactly 1 and retain evidence demonstrating that condition; the syntax-only result in proof.txt:1 does not establish it."]; recovered after App Server restart
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 87570.090292

~~~

## npm run check:tsts

2026-10-12T09:52:24.383635+00:00 – 2026-10-12T09:52:26.951751+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1409 files: no violations found.

~~~

## Documentary input renewal: CERT-257

Inspection source revision: 808d3df6b1f963edbdbb0d0038cac41c05edf235. Original certificate: CERT-215.

Every declared source, configuration, requirement and compiled-runtime input was inspected on its actual bytes. Only README.md changed before renewal; the corrected non-executable instructions now agree with actual campaign and legacy help. Original executed behavioral proof above is retained verbatim and reused on unchanged executable inputs; its dates and source revisions are not relabeled. The complete native Suite passed all 12 cases at a1cc7dc74f8b897062d238d177290ea35bf8894b; subsequent differences are confined to README and this plan's records. Historical certificates are explicitly invalidated, not rewritten. This fresh check renews the same condition and binding, without changing their meanings.

Inspection: 2026-10-12T10:51:00.216Z – 2026-10-12T10:51:00.319Z. Source/input equality passed; native Suite: 12 pass, 0 fail, 0 skip, 0 cancelled.
