# Native uncertain-creation recovery acceptance

Clean revision f41324b089e92d2f6ab7d19cd4cd3634868bcdfd. OBL-48 retains its original condition and full restart/recovery Arc criterion. The coordinator's original START_WORKER intent and native creation receipt remain the only identity authority. Recovery receives durable campaign/action/generation selectors, resumes the original native session, reads exactly one initialization turn from native history, verifies completed and idle activity and validates the original ignored marker before recording attachment. No native creation or initialization turn is issued by recovery.

The installed Codex Arc loses the final attachment acknowledgment, restarts the coordinator store and App Server connection, then recovers the original completed initialization and same session/checkout. Recovery is idempotent after attachment. A missing native receipt remains explicitly unknown; it preserves the original intent, capacity and checkout. The actual original external receipt can be reconciled without a substitute session. Controlled active native activity retains the reservation and prevents close; absent or ambiguous initialization history is rejected. Known creation is never replaced merely because observation is uncertain. The resumed responsibility turn and same session survive another restart.

All fourteen native-suite cases and 78 focused renewal cases pass without failures, skips or cancellations. Strict build, unchanged TSTS and generated/structural checks pass. Native sessions are archived before isolated fixture cleanup. Recovery uses the installed native protocol directly without a plugin API or model/permission override. This discharges creation recovery only; code execution/rebase, review corrections, integration/publication, interfaces and final campaign acceptance remain unresolved.

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

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1006 files: no violations found.
```
