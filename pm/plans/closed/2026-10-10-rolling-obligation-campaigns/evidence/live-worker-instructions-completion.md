# Exact native worker responsibility acceptance

Clean revision c9c8b7aeb66230534f5ba24f41ecfa133ffe3215. OBL-45 retains its original condition and full application worker-start Arc criterion. The coordinator constructs current obligation conditions, requirement paths and hashes, populated acceptance Arc/step references, implementation and source IDs, unit/integration selections, campaign configuration, QA argv and the exact frozen lease. A project transaction reconstructs and validates those instructions before claiming one dispatch. The actual attached native session is resumed; no substitute session receives the responsibility.

The actual worker inspected the synthetic TypeScript fixture, ran focused fixture QA and returned every assigned requirement, acceptance Arc/step, implementation, unit/integration, permitted-path, generation and target reference. The checkout and revision remained unchanged. After App Server restart, the application resumed the same session and recovered the completed instruction turn and exact durable dispatch. Model and permissions remain host-configured. The test harness removes inherited NODE_TEST_CONTEXT before launching the native worker; product code has no test mode.

The initial exploratory native run timed out while attempting a rebase of a no-edit obligation; automatic approval review rejected rebase commands under their command policy. Its known native turn was stopped and observed before fixture cleanup. That failed run is not acceptance evidence. Instructions now explicitly reuse no-edit inspection/proof, while code submissions retain full commit-by-commit semantic rebase. Observation timeouts cause the harness to read and continue observing the same active turn. No approval rejection was bypassed.

Eight native-suite cases and 73 focused cases pass with no failures, skips or cancellations. Strict build, unchanged TSTS, structural/metadata and generated-runtime checks pass. Native sessions are archived before isolated checkout/database cleanup. This discharges instruction delivery; worker suspension/resumption, recovery, code execution/rebase, corrections, publication, interfaces and final campaign acceptance remain pending.

```text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (4216.051459ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3188.7165ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3274.172084ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1198.580459ms)
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (43069.516292ms)
ℹ {"timestamp":"2026-10-11T13:36:27.496928Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T13:36:27.496961Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T13:36:27.774969Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:36:27.774999Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native review=1300fe9c-0dec-4d98-9c44-7153a2c7cced; thread=01a12b2d-d950-7681-ac75-9d46ceb622a1; session=01a12b2d-d950-7681-ac75-9d46ceb622a1; candidate=37029f701e38e78151c42ba1cb3605e31b3f9c04; terminal=completed; final={"schemaVersion":1,"reviewId":"1300fe9c-0dec-4d98-9c44-7153a2c7cced","revision":"37029f701e38e78151c42ba1cb3605e31b3f9c04","reviewerSessionId":"01a12b2d-d950-7681-ac75-9d46ceb622a1","completedAt":"2026-10-11T06:37:00.788457-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. The retained node --check proof passes syntax validation but cannot establish the required value. Restore the exported value to exactly 1 and retain proof establishing that condition against the corrected revision."]}
ℹ native review=1300fe9c-0dec-4d98-9c44-7153a2c7cced; thread=01a12b2d-d950-7681-ac75-9d46ceb622a1; session=01a12b2d-d950-7681-ac75-9d46ceb622a1; candidate=37029f701e38e78151c42ba1cb3605e31b3f9c04; decision=rejected; findings=["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. The retained node --check proof passes syntax validation but cannot establish the required value. Restore the exported value to exactly 1 and retain proof establishing that condition against the corrected revision."]; recovered after App Server restart
✔ native App Server starts and resumes the same session in the designated existing checkout (20027.112125ms)
ℹ {"timestamp":"2026-10-11T13:37:08.444539Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:37:08.444579Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T13:37:08.729132Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T13:37:08.729161Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12b2e-7945-7311-8eb9-53f0de582eba; session=01a12b2e-7945-7311-8eb9-53f0de582eba; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-jjCrfz; resumed after App Server restart; model=gpt-6.1-sol
✔ live worker provisioning binds the reserved checkout and persists its actual native session after restart (10785.5805ms)
ℹ {"timestamp":"2026-10-11T13:37:29.109892Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:37:29.109933Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker native thread=01a12b2e-c9f5-70f0-8593-ae5456d8d385; session=01a12b2e-c9f5-70f0-8593-ae5456d8d385; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-pAPGIE/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live attached worker receives exact obligation, traceability, frozen lease and QA instructions (58836.396083ms)
ℹ {"timestamp":"2026-10-11T13:37:39.921608Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:37:39.921648Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b2f-2c60-7683-ab24-b9cee36a0ce4; thread=01a12b2e-f42f-7b50-8313-872bde995e84; final=Proposed discharge of **OBL-2** (`T2`, `rolling-inventory-T2`, group `ROLL-INVENTORY-T2`): inspection confirms `fixture.ts` exports `const value: number = 1`. Configured QA `node --test fixture.test.ts` passed **2/2**, with no failures or skips.

| Assigned reference | Evidence |
|---|---|
| Implementation/source | `IMPL-FIXTURE` — `fixture.ts` |
| Acceptance/Arc/step | `ACCEPT-FIXTURE` / `ARC-FIXTURE` / `STEP-FIXTURE` |
| Unit | `UNIT-FIXTURE` — `fixture.test.ts`, selection `fixture unit`: passed |
| Integration | `INTEGRATION-FIXTURE` — `fixture.test.ts`, selection `fixture integration`: passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Operations/target | `inspect`, `test`; identity `local`, profile `fixture` |
| Lease | generation `aea28a45-e212-4e36-bff8-0cdb46b68a22`; scope `worker-fixture`; baseline `BASELINE-1`; binding `BIND-1` |

Assigned requirements: `REQ-ROLLING-CONFIGURATION`, `REQ-ROLLING-GRAPH`, `REQ-ROLLING-SCHEDULING`, `REQ-ROLLING-STATE`, `REQ-ROLLING-WORKERS`, `REQ-ROLLING-REVIEW`, `REQ-ROLLING-PUBLICATION`, `REQ-ROLLING-INTERFACES`. All reference `pm/requirements/rolling-campaigns.md`; its SHA-256 matches the assigned digest.

Evidence revision: `7d31b5eb743336d321159697ed791458c5172a7c`. Files remained unchanged and Git status remained clean. No new prerequisites discovered. No edits, build, rebase, or publication performed; acceptance remains with the coordinator.

2026-10-11T06:38:24-07:00
ℹ worker native thread=01a12b2e-f42f-7b50-8313-872bde995e84; session=01a12b2e-f42f-7b50-8313-872bde995e84; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-Ern8Ba/managed/101; attachment recovered after restart; model=gpt-6.1-sol
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 144704.027625
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (3608.083375ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (1192.700375ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (646.593708ms)
✔ lease use fences graph and generation, operations and exact changed paths (995.399708ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (1135.005167ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (709.16425ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (467.136292ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (399.75875ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (377.638208ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (419.930959ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (443.877875ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (1252.202125ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (693.91275ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (911.32675ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (1291.647125ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (376.943375ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (295.189583ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (336.4075ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (395.566708ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (7.124375ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.97975ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (6.126042ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (8.363459ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (8.296709ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (10.069209ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.318791ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (2.507041ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (5.379125ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (5.336167ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (5.108833ms)
✔ stale proof forces honest disturbance before new productive acceptance (9.928834ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (33.227166ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (909.729958ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.386291ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (35.583292ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.768666ms)
✔ reader cannot hide declared membership from the accepted current observation (5.280125ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (7467.035292ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3209.613167ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3280.422791ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1274.608ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (69.487ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (28.116667ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.431166ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.429208ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (3.229ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (91.672958ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (496.946042ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.537583ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.735125ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.487ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (1.319083ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.209209ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.225458ms)
✔ review completion requires the exact terminal turn and validated final message (0.49625ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.345459ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.123458ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (2862.627833ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (501.308041ms)
✔ submission rejects merge history and reverted out-of-scope commits (772.797875ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (225.056083ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.379792ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (518.612042ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (0.498208ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (319.994875ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1733.412375ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (538.180542ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (475.489834ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (187.853792ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.364792ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (559.975ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.203834ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (294.721334ms)
ℹ tests 73
ℹ suites 0
ℹ pass 73
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 15378.448083

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 994 files: no violations found.
```
