# Worker recovery and existing assessment renewal

Clean revision f41324b089e92d2f6ab7d19cd4cd3634868bcdfd. CERT-71 renews the same 69 previously established standalone assessments after shared worker recovery, native harness and binding inputs changed. This renewal adds no obligation discharge. Original conditions, baselines, certificates and checkpoint prefixes remain unchanged. Fresh native proof includes assigned-reviewer rejection, native worker allocation/attachment, same-session restart recovery and populated obligation/traceability/lease/QA delivery. Publication/interface coverage and final campaign acceptance remain unresolved.

Command: node --test dist/tests/rolling-codex.integration.js

```text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (3154.527458ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (4875.895917ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3540.148625ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1476.33ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1644.07675ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (2416.90775ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=8a2f456735663a31cbe7010fa93cec18dad75f71; generation=72c032ba-2b13-42fa-8488-9f77160c9c28; fresh instructions completed before new allocation
✔ worker creation recovery retains uncertain ownership and attaches original initialization after restart (1556.228917ms)
ℹ worker recovery thread=thread-fixture; session=session-fixture; initialization=turn-1; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (39029.803625ms)
ℹ {"timestamp":"2026-10-11T14:54:16.475775Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:54:16.475827Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:54:16.786005Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:54:16.786036Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native review=f55db305-172c-4bc7-8914-efc1a770c152; thread=01a12b75-177e-7761-ad37-8a0f17ecc62d; session=01a12b75-177e-7761-ad37-8a0f17ecc62d; candidate=0fafb0e99044417e0bcb353eb35655c70d38c863; terminal=completed; final={"schemaVersion":1,"reviewId":"f55db305-172c-4bc7-8914-efc1a770c152","revision":"0fafb0e99044417e0bcb353eb35655c70d38c863","reviewerSessionId":"01a12b75-177e-7761-ad37-8a0f17ecc62d","completedAt":"2026-10-11T07:54:43-07:00","decision":"rejected","findings":["fixture/current.ts:1: The complete candidate diff changes the exported value from 1 to 2, directly violating OBL-2 and acceptance group ROLL-INVENTORY-T2. The retained syntax-check evidence matches the candidate hashes but does not establish the required value. Restore the initializer to exactly 1 and retain evidence verifying that condition against the corrected candidate."]}
ℹ native review=f55db305-172c-4bc7-8914-efc1a770c152; thread=01a12b75-177e-7761-ad37-8a0f17ecc62d; session=01a12b75-177e-7761-ad37-8a0f17ecc62d; candidate=0fafb0e99044417e0bcb353eb35655c70d38c863; decision=rejected; findings=["fixture/current.ts:1: The complete candidate diff changes the exported value from 1 to 2, directly violating OBL-2 and acceptance group ROLL-INVENTORY-T2. The retained syntax-check evidence matches the candidate hashes but does not establish the required value. Restore the initializer to exactly 1 and retain evidence verifying that condition against the corrected candidate."]; recovered after App Server restart
✔ native App Server starts and resumes the same session in the designated existing checkout (30231.894375ms)
ℹ {"timestamp":"2026-10-11T14:54:53.022194Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:54:53.022245Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:54:53.294324Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:54:53.294357Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12b75-a645-7901-8c23-7d6e1a35fe4e; session=01a12b75-a645-7901-8c23-7d6e1a35fe4e; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-hO3OzK; resumed after App Server restart; model=gpt-6.1-sol
✔ live worker provisioning binds the reserved checkout and persists its actual native session after restart (11830.934542ms)
ℹ {"timestamp":"2026-10-11T14:55:23.989344Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:55:23.989392Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker native thread=01a12b76-1f33-7381-b649-3630cb8ef9bc; session=01a12b76-1f33-7381-b649-3630cb8ef9bc; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-9wu0Cv/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live attached worker receives exact obligation, traceability, frozen lease and QA instructions (48147.625ms)
ℹ {"timestamp":"2026-10-11T14:55:35.862591Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:55:35.862632Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b76-8428-7592-8acb-e294c60be412; thread=01a12b76-4d94-72b2-97e9-c159c01aa749; final=Proposed discharge of `OBL-2` (`T2`, responsibility `rolling-inventory-T2`, group `ROLL-INVENTORY-T2`): inspected `fixture.ts`; its typed exported `value` remains `1`.

`node --test fixture.test.ts` passed both tests: 2 passed, 0 failed or skipped. No files modified; worktree clean. No rebase, build, or publication QA performed for this no-edit obligation.

| Reference | Assigned value |
|---|---|
| Requirements | `REQ-ROLLING-CONFIGURATION`, `REQ-ROLLING-GRAPH`, `REQ-ROLLING-SCHEDULING`, `REQ-ROLLING-STATE`, `REQ-ROLLING-WORKERS`, `REQ-ROLLING-REVIEW`, `REQ-ROLLING-PUBLICATION`, `REQ-ROLLING-INTERFACES` |
| Requirement source | `pm/requirements/rolling-campaigns.md`; supplied SHA-256 verified |
| Acceptance / Arc / Step | `ACCEPT-FIXTURE` / `ARC-FIXTURE` / `STEP-FIXTURE` |
| Implementation / source | `IMPL-FIXTURE` / `fixture.ts` |
| Unit | `UNIT-FIXTURE`; `fixture.test.ts`; selection `fixture unit` — passed |
| Integration | `INTEGRATION-FIXTURE`; `fixture.test.ts`; selection `fixture integration` — passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Operations / target | `inspect`, `test` / identity `local`, profile `fixture` |
| Lease generation | `d392799c-a68e-41c0-bf70-1b3eb1861a2f` |
| Scope / baseline / binding | `worker-fixture` / `BASELINE-1` / `BIND-1` |
| Candidate / unchanged base | `8f8b3a13037d447993f4e0f3cd2cd02f2ac388d2` |

No new prerequisites discovered. Checkout retained; activity stopped for coordinator review. Acceptance remains coordinator-owned.

2026-10-11T07:56:08-07:00
ℹ worker native thread=01a12b76-4d94-72b2-97e9-c159c01aa749; session=01a12b76-4d94-72b2-97e9-c159c01aa749; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-q6pKvR/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live worker suspension observes idle native activity and retains its dirty checkout while freeing capacity (47302.116667ms)
ℹ {"timestamp":"2026-10-11T14:56:23.996925Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:56:23.996957Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b77-3206-7522-9f77-6a6a594f4ff8; thread=01a12b77-099a-7b72-ae63-158790c6d9aa; final=Proposed discharge of **OBL-2** (`rolling-inventory-T2`, category `T2`, group `ROLL-INVENTORY-T2`) for coordinator review.

Fresh inspection confirmed `fixture.ts` exports `value: number = 1`. Configured QA, `node --test fixture.test.ts`, passed both tests: 2 passed, 0 failed, 0 skipped.

| Reference | Assigned value |
|---|---|
| Requirements | `REQ-ROLLING-CONFIGURATION`, `REQ-ROLLING-GRAPH`, `REQ-ROLLING-SCHEDULING`, `REQ-ROLLING-STATE`, `REQ-ROLLING-WORKERS`, `REQ-ROLLING-REVIEW`, `REQ-ROLLING-PUBLICATION`, `REQ-ROLLING-INTERFACES` |
| Requirement source | `pm/requirements/rolling-campaigns.md`; SHA-256 matches the assigned digest |
| Acceptance / Arc / Step | `ACCEPT-FIXTURE` / `ARC-FIXTURE` / `STEP-FIXTURE` |
| Implementation / source | `IMPL-FIXTURE` / `fixture.ts` |
| Unit proof | `UNIT-FIXTURE`; `fixture.test.ts`; selection `fixture unit` — passed |
| Integration proof | `INTEGRATION-FIXTURE`; `fixture.test.ts`; selection `fixture integration` — passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Operations / prerequisites | `inspect`, `test` / none |
| Lease generation | `2e5507fc-6bdb-4070-b174-e2073f136c98` |
| Scope / baseline / binding | `worker-fixture` / `BASELINE-1` / `BIND-1` |
| Target | identity `local`, profile `fixture` |
| Inspected HEAD / base | `faf0f7ac279ad758d8075cacd373eeedfcaf1c10` |

No files changed; Git status remained clean. No build inputs changed. No new prerequisites discovered. No commit, rebase, or publication QA performed. Checkout retained; activity stopped pending coordinator assessment.

2026-10-11T07:56:56-07:00
ℹ worker suspension thread=01a12b77-099a-7b72-ae63-158790c6d9aa; session=01a12b77-099a-7b72-ae63-158790c6d9aa; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
ℹ worker native thread=01a12b77-099a-7b72-ae63-158790c6d9aa; session=01a12b77-099a-7b72-ae63-158790c6d9aa; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-rdH4DI/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live worker resumption restores its original native session with refreshed scope and campaign base (89047.672584ms)
ℹ {"timestamp":"2026-10-11T14:57:11.293996Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:57:11.294040Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b77-ec82-70c1-b7eb-b402923d7787; thread=01a12b77-c25c-7d52-8ef9-3d529ba204c3; final=OBL-2 is proposed for discharge: `fixture.ts` exports `value: number = 1`. Fresh configured QA, `node --test fixture.test.ts`, passed both tests: 2 passed, 0 failed, 0 skipped. No files modified; no commit, rebase, build, or publication QA performed. Checkout retained; activity stopped.

- **Responsibility:** `rolling-inventory-T2`; acceptance group `ROLL-INVENTORY-T2`.
- **Requirements:** REQ-ROLLING-CONFIGURATION, REQ-ROLLING-GRAPH, REQ-ROLLING-SCHEDULING, REQ-ROLLING-STATE, REQ-ROLLING-WORKERS, REQ-ROLLING-REVIEW, REQ-ROLLING-PUBLICATION, REQ-ROLLING-INTERFACES. Reference: `pm/requirements/rolling-campaigns.md`; supplied digest verified.
- **Acceptance:** ACCEPT-FIXTURE → ARC-FIXTURE → STEP-FIXTURE.
- **Implementation:** IMPL-FIXTURE; source `fixture.ts`.
- **Unit:** UNIT-FIXTURE, `fixture.test.ts`, selection `fixture unit` — passed.
- **Integration:** INTEGRATION-FIXTURE, `fixture.test.ts`, selection `fixture integration` — passed.
- **Lease:** scope `worker-fixture`, baseline `BASELINE-1`, binding revision `BIND-1`, generation `0cbc52d7-59ae-4d4e-8d7f-58ba26f0f579`; prerequisites none.
- **Permitted paths:** `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md`; operations `inspect`, `test`.
- **Target:** identity `local`, profile `fixture`.
- **Inspected revision/base:** `811b9ea07f827c10579338294fd46d4c30ce139e`; clean Git status before and after. No new prerequisites discovered.

Coordinator acceptance remains pending.

2026-10-11T07:57:49-07:00
ℹ worker suspension thread=01a12b77-c25c-7d52-8ef9-3d529ba204c3; session=01a12b77-c25c-7d52-8ef9-3d529ba204c3; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=01a12b77-c25c-7d52-8ef9-3d529ba204c3; session=01a12b77-c25c-7d52-8ef9-3d529ba204c3; checkout=101; base=8e5ecc7cff804852bdb79ed03b03a38630d2c8c5; generation=13081af4-42f0-4916-ab36-4b9c2a8d38d6; fresh instructions completed before new allocation
ℹ worker native thread=01a12b77-c25c-7d52-8ef9-3d529ba204c3; session=01a12b77-c25c-7d52-8ef9-3d529ba204c3; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-Y0CJRp/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live worker creation recovery attaches original initialization after coordinator and native connection restart (45970.304084ms)
ℹ {"timestamp":"2026-10-11T14:58:40.350034Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:58:40.350080Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker recovery thread=01a12b79-1e3b-7bd1-b287-7575a983dba7; session=01a12b79-1e3b-7bd1-b287-7575a983dba7; initialization=01a12b79-1edd-7293-913c-4c07f1478d85; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
ℹ worker instruction turn=01a12b79-46df-7612-8e42-51e1ba698441; thread=01a12b79-1e3b-7bd1-b287-7575a983dba7; final=Proposed discharge for **OBL-2**, responsibility `rolling-inventory-T2`, category `T2`, acceptance group `ROLL-INVENTORY-T2`.

Fresh inspection confirmed `fixture.ts` exports `value: number = 1`. Configured focused QA, `node --test fixture.test.ts`, passed both tests: 2 passed, 0 failed, 0 skipped.

| Reference | Assigned value |
|---|---|
| Requirements | REQ-ROLLING-CONFIGURATION, REQ-ROLLING-GRAPH, REQ-ROLLING-SCHEDULING, REQ-ROLLING-STATE, REQ-ROLLING-WORKERS, REQ-ROLLING-REVIEW, REQ-ROLLING-PUBLICATION, REQ-ROLLING-INTERFACES |
| Requirement source | `pm/requirements/rolling-campaigns.md`; SHA-256 matches supplied digest |
| Acceptance / Arc / Step | ACCEPT-FIXTURE / ARC-FIXTURE / STEP-FIXTURE |
| Implementation / source | IMPL-FIXTURE / `fixture.ts` |
| Unit proof | UNIT-FIXTURE; `fixture.test.ts`; selection `fixture unit` — passed |
| Integration proof | INTEGRATION-FIXTURE; `fixture.test.ts`; selection `fixture integration` — passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Operations / prerequisites | `inspect`, `test` / none |
| Lease generation | `f339d785-90d6-4f97-84a7-89ac6d7ae679` |
| Scope / baseline / binding | worker-fixture / BASELINE-1 / BIND-1 |
| Target | identity `local`, profile `fixture` |
| Inspected revision / base | `9eb013e61fd010e2b5b4f1fa5defb5371ef3db9e` |

No files modified; Git status and diff remain clean. No build inputs changed, rebase performed, or publication QA run. No new prerequisites discovered. Evidence returned for coordinator review; acceptance remains coordinator-owned. Activity stopped.

2026-10-11T07:59:12-07:00
ℹ worker native thread=01a12b79-1e3b-7bd1-b287-7575a983dba7; session=01a12b79-1e3b-7bd1-b287-7575a983dba7; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-CC9QNU/managed/101; attachment recovered after restart; model=gpt-6.1-sol
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 330316.582417
```

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-worker.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/rolling-review.test.js

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (2433.387167ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (1113.690833ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (495.602834ms)
✔ lease use fences graph and generation, operations and exact changed paths (627.442292ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (569.330542ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (475.952042ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (542.343ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (473.047333ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (451.7445ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (542.315416ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (487.855666ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (1070.68175ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (531.215417ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (682.198209ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (581.964333ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (177.71975ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (327.221583ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (252.355958ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (253.193917ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (4.590917ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.36125ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (5.041792ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (7.502167ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.56425ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (7.053917ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.285666ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (3.663875ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (4.91ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (5.669166ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (6.373958ms)
✔ stale proof forces honest disturbance before new productive acceptance (5.274417ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (3.109541ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (612.351875ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.228167ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (50.122375ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.994875ms)
✔ reader cannot hide declared membership from the accepted current observation (3.161666ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (4750.184666ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3359.640667ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3395.599083ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1420.981166ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1679.294708ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (2313.6695ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=95040062969b3a5a15c1ce891c2d608363a02e42; generation=fd357d29-8b93-4a0d-a6ae-52c9d335702a; fresh instructions completed before new allocation
✔ worker creation recovery retains uncertain ownership and attaches original initialization after restart (1635.241375ms)
ℹ worker recovery thread=thread-fixture; session=session-fixture; initialization=turn-1; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (50.066291ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (33.340792ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.32975ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.406125ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (2.602208ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (71.225292ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (288.469625ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.96425ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (3.400792ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.515209ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.33025ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.31725ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.246167ms)
✔ review completion requires the exact terminal turn and validated final message (0.530708ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.32075ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.101875ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (1868.803959ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (277.527833ms)
✔ submission rejects merge history and reverted out-of-scope commits (546.499875ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (103.688333ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.389917ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (384.168834ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (0.542417ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.564ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.219416ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (264.497125ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1484.77475ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (348.863333ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (289.69275ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (112.06825ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.386584ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (258.192875ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (6.460459ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (223.389459ms)
ℹ tests 78
ℹ suites 0
ℹ pass 78
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 18668.275084
```

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (98.85175ms)
✔ activation write failure restores the directory and every original Markdown byte (68.156125ms)
✔ activation destination and status guards reject before changing source bytes (59.102208ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.853459ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.203583ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (111.001542ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.222ms)
✔ empty valid inventory presentation retains its summary and final newline (0.085125ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.892833ms)
✔ typed validation selection retains all/json ordering and plan selection (0.110417ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.124625ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.3905ms)
✔ generated portable launch path preserves scalar selection and exact completion output (107.271667ms)
✔ adopted owning plans require their configured obligation document (125.356083ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (3625.689375ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3107.93875ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3270.601417ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1390.2045ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1646.302417ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (2228.4935ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=37f34387a197ea84c8c074d07a6e859c2508c58e; generation=19f676a6-d60b-44cc-9192-dadc9d90195e; fresh instructions completed before new allocation
✔ worker creation recovery retains uncertain ownership and attaches original initialization after restart (1542.646292ms)
ℹ worker recovery thread=thread-fixture; session=session-fixture; initialization=turn-1; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
✔ configuration boundary uses the designated Git checkout and effective defaults (211.569667ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (851.022ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.426458ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.435166ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.576417ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (58.910416ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (141.353417ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.49325ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.894458ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.464666ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.280834ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (68.767208ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (199.057792ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (49.094334ms)
  ✔ malformed (56.785208ms)
✔ lost or malformed responses reject all affected pending operations (106.333458ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (47.580917ms)
✔ initialization recovery reads exactly one original turn and rejects absent or ambiguous history (46.995208ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1081.296417ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.332208ms)
✔ heading parser retains the exact pending, done and error statuses (1.373208ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.287042ms)
✔ human report aligns census columns after long identifiers (1.079833ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (27.456083ms)
✔ campaign graph exposes detailed planning review without an execution lease (27.18375ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (300.8385ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (151.470958ms)
✔ campaign report and graph accept an initial planning-only sprint (127.124583ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (91.335709ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.339709ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.966292ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.473583ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (92.2555ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (454.442167ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (157.819375ms)
✔ omitted report input requires exactly one campaign containing active plans (94.295042ms)
✔ bare plan names fail explicitly when missing or ambiguous (25.235917ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (58.2015ms)
✔ selected campaign validates direct dependency membership and cycles (25.924208ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (27.542708ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (78.9275ms)
✔ V1 report reader rejects unknown output fields (68.319959ms)
✔ production module uses exact exit and stream contracts without mutation (648.471583ms)
✔ ponytail dispatches campaign reporting through the production module (2151.889417ms)
ℹ tests 65
ℹ suites 0
ℹ pass 65
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16915.0505
```

Command: node --test tests/openclaw-skills.test.js

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.700125ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.173542ms)
✔ api-service-boundaries: description is one line under 160 chars (0.051584ms)
✔ api-service-boundaries: referenced resources are packaged (0.129ms)
✔ architecture: committed OpenClaw skill matches the generator (0.425166ms)
✔ architecture: body contains the canonical skills/architecture body (0.096042ms)
✔ architecture: description is one line under 160 chars (0.034625ms)
✔ architecture: referenced resources are packaged (0.063375ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.441042ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.140708ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.04275ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.069959ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.430292ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.111875ms)
✔ build-impact: description is one line under 160 chars (0.03125ms)
✔ build-impact: referenced resources are packaged (0.102875ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.3735ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.097083ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.027125ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.049208ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.344792ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.084167ms)
✔ codex-execpolicy: description is one line under 160 chars (0.022875ms)
✔ codex-execpolicy: referenced resources are packaged (0.056625ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.625459ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.109167ms)
✔ cross-session-effects: description is one line under 160 chars (0.033542ms)
✔ cross-session-effects: referenced resources are packaged (0.090209ms)
✔ debugging: committed OpenClaw skill matches the generator (0.444833ms)
✔ debugging: body contains the canonical skills/debugging body (0.090708ms)
✔ debugging: description is one line under 160 chars (0.022167ms)
✔ debugging: referenced resources are packaged (0.087541ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.358792ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.066458ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.019875ms)
✔ diagnostic-assertions: referenced resources are packaged (0.048791ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.349333ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.075042ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.018709ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.049834ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.2985ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.111459ms)
✔ issue-tracking: description is one line under 160 chars (0.042958ms)
✔ issue-tracking: referenced resources are packaged (0.072583ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.396166ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.096042ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.018041ms)
✔ lossless-json-contracts: referenced resources are packaged (0.050083ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.3445ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.072667ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.014833ms)
✔ monetary-contract-safety: referenced resources are packaged (0.042875ms)
✔ plan-execution: committed OpenClaw skill matches the generator (2.319042ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.222875ms)
✔ plan-execution: description is one line under 160 chars (0.019416ms)
✔ plan-execution: referenced resources are packaged (0.193333ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (1.186375ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.256417ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.020666ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.17825ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.371458ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.132416ms)
✔ ponytail: description is one line under 160 chars (0.01975ms)
✔ ponytail: referenced resources are packaged (0.106625ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.353416ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.068083ms)
✔ ponytail-audit: description is one line under 160 chars (0.017917ms)
✔ ponytail-audit: referenced resources are packaged (0.047042ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.32675ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.070375ms)
✔ ponytail-debt: description is one line under 160 chars (0.017667ms)
✔ ponytail-debt: referenced resources are packaged (0.043875ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.309541ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.073167ms)
✔ ponytail-review: description is one line under 160 chars (0.015625ms)
✔ ponytail-review: referenced resources are packaged (0.04575ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.602666ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.104334ms)
✔ project-structure: description is one line under 160 chars (0.016167ms)
✔ project-structure: referenced resources are packaged (0.076041ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.464625ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.082125ms)
✔ production-test-boundaries: description is one line under 160 chars (0.01575ms)
✔ production-test-boundaries: referenced resources are packaged (0.048208ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.383417ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.087959ms)
✔ react-error-containment: description is one line under 160 chars (0.015792ms)
✔ react-error-containment: referenced resources are packaged (0.059791ms)
✔ requirements: committed OpenClaw skill matches the generator (0.35125ms)
✔ requirements: body contains the canonical skills/requirements body (0.132416ms)
✔ requirements: description is one line under 160 chars (0.019208ms)
✔ requirements: referenced resources are packaged (0.079167ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.303708ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.113041ms)
✔ requirements-traceability: description is one line under 160 chars (0.016ms)
✔ requirements-traceability: referenced resources are packaged (0.082667ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.4275ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.076667ms)
✔ semantic-rebase: description is one line under 160 chars (0.01625ms)
✔ semantic-rebase: referenced resources are packaged (0.046333ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.318416ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.069ms)
✔ static-type-safety: description is one line under 160 chars (0.014708ms)
✔ static-type-safety: referenced resources are packaged (0.044042ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.370792ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.0755ms)
✔ test-credentials: description is one line under 160 chars (0.013959ms)
✔ test-credentials: referenced resources are packaged (0.051834ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.318709ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.076458ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.01475ms)
✔ typescript-unit-testing: referenced resources are packaged (0.0535ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.384375ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.079833ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.0145ms)
✔ user-acceptance-testing: referenced resources are packaged (0.054125ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.343708ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.063833ms)
✔ ux-testing: description is one line under 160 chars (0.013875ms)
✔ ux-testing: referenced resources are packaged (0.045084ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.3895ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.064708ms)
✔ variant-neutrality: description is one line under 160 chars (0.014416ms)
✔ variant-neutrality: referenced resources are packaged (0.055625ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.64925ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.104084ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.014333ms)
✔ versioned-data-contracts: referenced resources are packaged (0.104ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.409583ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.068417ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.014042ms)
✔ worktree-lifecycle: referenced resources are packaged (0.045083ms)
✔ generated resources omit canonical relationship annotations (1.183333ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 89.189208
```

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

```text
✔ retains strict physical V1 parsing and scalar selection (43.162666ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (3.652542ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (5.671416ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (3.412334ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (3.539375ms)
✔ selects the highest-ranked V2 tasklet (8.096792ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (1.961333ms)
✔ blocks tasklets until dependency-feature validation is complete (2.500792ms)
✔ uses prior affinity and graph criteria deterministically (0.683917ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (40.871291ms)
✔ V3 returns one complete ordered batch (0.906167ms)
✔ V3 bounds a batch while V2 selects one tasklet (1.674958ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (4.930542ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.296667ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.377292ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.338208ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (19.80525ms)
✔ campaign graph exposes detailed planning review without an execution lease (15.411958ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (221.415792ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (136.964292ms)
✔ campaign report and graph accept an initial planning-only sprint (123.4145ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (90.949084ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.072959ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (13.511ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (13.216959ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (81.466667ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (441.527125ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (160.703584ms)
✔ omitted report input requires exactly one campaign containing active plans (96.930625ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.381792ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (54.890125ms)
✔ selected campaign validates direct dependency membership and cycles (28.089166ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (27.946792ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (84.351833ms)
✔ V1 report reader rejects unknown output fields (69.642625ms)
✔ production module uses exact exit and stream contracts without mutation (659.541875ms)
✔ ponytail dispatches campaign reporting through the production module (1898.041209ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4338.893958
```

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (104.444833ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (82.876334ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (75.491ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (198.1775ms)
✔ retains strict physical V1 parsing and scalar selection (44.916ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (4.331ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (6.520416ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (5.390125ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (5.8475ms)
✔ selects the highest-ranked V2 tasklet (8.47625ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.420875ms)
✔ blocks tasklets until dependency-feature validation is complete (3.345458ms)
✔ uses prior affinity and graph criteria deterministically (1.093708ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (41.083542ms)
✔ V3 returns one complete ordered batch (1.691541ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.641125ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (7.650084ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.809833ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (1.943125ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (9.058709ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.302416ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (22.026833ms)
✔ campaign graph exposes detailed planning review without an execution lease (16.0205ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (240.372958ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (133.207916ms)
✔ campaign report and graph accept an initial planning-only sprint (121.209042ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (90.736875ms)
✔ lists plan sources without parsing and exposes canonical source parsing (12.943916ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.332875ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.252709ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (81.030709ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (445.301083ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (153.789291ms)
✔ omitted report input requires exactly one campaign containing active plans (97.9155ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.268083ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (56.744ms)
✔ selected campaign validates direct dependency membership and cycles (26.709541ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (30.261416ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (82.445375ms)
✔ V1 report reader rejects unknown output fields (71.385083ms)
✔ production module uses exact exit and stream contracts without mutation (662.100166ms)
✔ ponytail dispatches campaign reporting through the production module (1878.206375ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (103.8675ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1467.91325ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (239.464541ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (256.729417ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (106.786334ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.323041ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (254.237458ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.093083ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (212.879167ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4342.03025
```

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (97.122958ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (76.622875ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (76.05925ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (204.991917ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (2.930666ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.575958ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (4.027292ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (3.540208ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.095875ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (6.301333ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.333583ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.43875ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (4.626709ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (3.166084ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (2.08475ms)
✔ stale proof forces honest disturbance before new productive acceptance (3.76675ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (1.603125ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (224.025209ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.155875ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (20.507541ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.048292ms)
✔ reader cannot hide declared membership from the accepted current observation (1.406041ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (96.025459ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1506.417583ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (236.710958ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (224.832167ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (95.791959ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.278ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (235.060792ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (2.853125ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (196.440042ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2657.11025
```

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1006 files: no violations found.
```
