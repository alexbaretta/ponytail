# Native retained-worker resumption acceptance

Clean revision ad12e922387e4d38388df1e1721739bd8ef54f23. OBL-47 retains its original condition and full application resumption Arc criterion. Once the fixture blocker is discharged, the coordinator adopts the amended lease, reserves its retained assignment before a new independent obligation, and identifies the refreshed campaign increment base. The application claims exactly one resumption action, resolves the original immutable native creation receipt, resumes that session in checkout 101, observes idle native activity and records a V1 resumption receipt against the refreshed base. No marker reinitialization, new native session or checkout reset occurs.

The same worker completes fresh instructions with its renewed lease generation. The unfinished file retains its exact bytes. Existing active capacity blocks a new allocation. Old-generation operations, duplicate resumption claims, altered session/base receipts and unknown external outcomes are rejected. After App Server restart, the original session, current instruction turn and durable generation are recovered. The harness archives native sessions before isolated fixture cleanup. Host model and permissions remain configured; no plugin API is required.

The failing-first PostgreSQL regression demonstrated that the former generation-bound creation lookup lost the original identity after reactivation. It passes through the implemented application flow. All twelve native-suite cases and 77 focused renewal cases pass without failures, skips or cancellations. Strict build, unchanged TSTS and generated/structural checks pass. This discharges resumption only; recovery, code execution/rebase, corrections, publication, interfaces and final campaign acceptance remain unresolved.

```text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (3244.325416ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3510.296ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3385.624167ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1454.152917ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1646.313583ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (2452.12575ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=d92b828cae079cb00bc77fd81cba3aec87d0e56f; generation=5b1b9585-9638-43b8-b4ad-af77cd0b4c00; fresh instructions completed before new allocation
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (35564.196125ms)
ℹ {"timestamp":"2026-10-11T14:37:22.255210Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:37:22.255248Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:37:22.619462Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:37:22.619491Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native review=346dc319-06cf-4f6b-a99c-697f16229163; thread=01a12b65-9db4-7ba1-9eb4-7aa438814057; session=01a12b65-9db4-7ba1-9eb4-7aa438814057; candidate=6e8934391b5eceb165e768ec8fd41474bfb8faec; terminal=completed; final={"schemaVersion":1,"reviewId":"346dc319-06cf-4f6b-a99c-697f16229163","revision":"6e8934391b5eceb165e768ec8fd41474bfb8faec","reviewerSessionId":"01a12b65-9db4-7ba1-9eb4-7aa438814057","completedAt":"2026-10-11T07:37:48.389-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. The retained syntax-check proof matches the candidate inputs and passes, but does not establish the required value. Restore the exported value to exactly 1 and retain proof that verifies that condition."]}
ℹ native review=346dc319-06cf-4f6b-a99c-697f16229163; thread=01a12b65-9db4-7ba1-9eb4-7aa438814057; session=01a12b65-9db4-7ba1-9eb4-7aa438814057; candidate=6e8934391b5eceb165e768ec8fd41474bfb8faec; decision=rejected; findings=["fixture/current.ts:1: The candidate changes exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. The retained syntax-check proof matches the candidate inputs and passes, but does not establish the required value. Restore the exported value to exactly 1 and retain proof that verifies that condition."]; recovered after App Server restart
✔ native App Server starts and resumes the same session in the designated existing checkout (17398.633125ms)
ℹ {"timestamp":"2026-10-11T14:37:55.354803Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:37:55.354859Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:37:55.787183Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:37:55.787212Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12b66-1f03-7840-bbce-33e90a8e2407; session=01a12b66-1f03-7840-bbce-33e90a8e2407; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-tuzuG3; resumed after App Server restart; model=gpt-6.1-sol
✔ live worker provisioning binds the reserved checkout and persists its actual native session after restart (15740.4945ms)
ℹ {"timestamp":"2026-10-11T14:38:13.489980Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:38:13.490019Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker native thread=01a12b66-65ce-7753-8e87-bec0936a54e0; session=01a12b66-65ce-7753-8e87-bec0936a54e0; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-YJXn07/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live attached worker receives exact obligation, traceability, frozen lease and QA instructions (60939.446083ms)
ℹ {"timestamp":"2026-10-11T14:38:29.229710Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:38:29.229756Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b66-ddd1-7971-a2c7-e864f9f34ce6; thread=01a12b66-a34d-7713-97c9-b49ffff61e74; final=Proposed discharge of **OBL-2 (T2)**, responsibility `rolling-inventory-T2`, acceptance group `ROLL-INVENTORY-T2`.

Inspection confirmed `fixture.ts` exports `value: number = 1`. Configured focused QA, `node --test fixture.test.ts`, passed **2/2**, with zero failures or skips, using Node `v24.15.0`.

| Reference | Assigned value |
|---|---|
| Acceptance / Arc / Step | `ACCEPT-FIXTURE` / `ARC-FIXTURE` / `STEP-FIXTURE` |
| Implementation / source | `IMPL-FIXTURE` / `fixture.ts` |
| Unit | `UNIT-FIXTURE`, `fixture.test.ts`, selection `fixture unit` — passed |
| Integration | `INTEGRATION-FIXTURE`, `fixture.test.ts`, selection `fixture integration` — passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Operations / target | `inspect`, `test` / identity `local`, profile `fixture` |
| Lease generation | `c1cb14ff-9c55-47e7-8c98-520330f2fe47` |
| Scope / baseline / binding | `worker-fixture` / `BASELINE-1` / `BIND-1` |
| Inspected revision / base | `15b7e93cfd8a8263d1992a3e69fc858fc4a9d2be` |

Assigned requirements: `REQ-ROLLING-CONFIGURATION`, `REQ-ROLLING-GRAPH`, `REQ-ROLLING-SCHEDULING`, `REQ-ROLLING-STATE`, `REQ-ROLLING-WORKERS`, `REQ-ROLLING-REVIEW`, `REQ-ROLLING-PUBLICATION`, `REQ-ROLLING-INTERFACES`. Their source, `pm/requirements/rolling-campaigns.md`, matches the supplied SHA-256 digest.

No files modified; Git status and staged/unstaged diffs remain clean. No new prerequisites discovered. No build, commit, rebase, or publication QA was performed for this no-edit obligation. Checkout retained; activity stopped pending coordinator review and acceptance.

2026-10-11T07:39:15-07:00
ℹ worker native thread=01a12b66-a34d-7713-97c9-b49ffff61e74; session=01a12b66-a34d-7713-97c9-b49ffff61e74; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-TKeCbw/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live worker suspension observes idle native activity and retains its dirty checkout while freeing capacity (59142.691042ms)
ℹ {"timestamp":"2026-10-11T14:39:30.186305Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:39:30.186339Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:40:04.760638Z","level":"WARN","fields":{"message":"stream disconnected - retrying sampling request (1/5 in 206ms)...","turn_id":"01a12b67-d12d-7653-9664-c7f8854a7d8c","retries":1,"max_retries":5,"sampling_error":"stream disconnected before completion: Unable to verify model access right now. Please retry."},"target":"codex_core::responses_retry"}
ℹ worker instruction turn=01a12b67-d12d-7653-9664-c7f8854a7d8c; thread=01a12b67-9168-71d3-bac5-4c562d5b4a9d; final=Proposed discharge of **OBL-2** (`T2`, responsibility `rolling-inventory-T2`, group `ROLL-INVENTORY-T2`), pending coordinator review.

Inspection confirmed `fixture.ts` exports `const value: number = 1`. Configured focused QA, `node --test fixture.test.ts`, passed both selections: 2 passed, 0 failed, 0 skipped.

| Assigned reference | Evidence |
|---|---|
| Implementation | `IMPL-FIXTURE` — `fixture.ts` |
| Acceptance | `ACCEPT-FIXTURE` |
| Arc / step | `ARC-FIXTURE` / `STEP-FIXTURE` |
| Unit | `UNIT-FIXTURE` — `fixture.test.ts`, selection `fixture unit`: passed |
| Integration | `INTEGRATION-FIXTURE` — `fixture.test.ts`, selection `fixture integration`: passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Operations / prerequisites | `inspect`, `test` / none |
| Lease generation | `95b17e0e-b8bd-4e80-bbec-be3c1ef9cf22` |
| Scope / baseline / binding | `worker-fixture` / `BASELINE-1` / `BIND-1` |
| Target | identity `local`, profile `fixture` |
| Inspected revision / base | `1b0dcfbba0adc986a5fbb23a8e00d18d801feaea` |

Assigned requirements: `REQ-ROLLING-CONFIGURATION`, `REQ-ROLLING-GRAPH`, `REQ-ROLLING-SCHEDULING`, `REQ-ROLLING-STATE`, `REQ-ROLLING-WORKERS`, `REQ-ROLLING-REVIEW`, `REQ-ROLLING-PUBLICATION`, `REQ-ROLLING-INTERFACES`. All reference `pm/requirements/rolling-campaigns.md`; its SHA-256 matches the assigned digest.

No files modified; tracked worktree remains clean. No new prerequisites, commit, rebase, build-input changes, or publication QA. Checkout retained; activity stopped.

2026-10-11T07:40:15-07:00
ℹ worker suspension thread=01a12b67-9168-71d3-bac5-4c562d5b4a9d; session=01a12b67-9168-71d3-bac5-4c562d5b4a9d; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
ℹ worker native thread=01a12b67-9168-71d3-bac5-4c562d5b4a9d; session=01a12b67-9168-71d3-bac5-4c562d5b4a9d; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-BRBraw/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live worker resumption restores its original native session with refreshed scope and campaign base (73110.629125ms)
ℹ {"timestamp":"2026-10-11T14:40:29.326097Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:40:29.326137Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b68-a9cf-7613-bb25-29c3a6553881; thread=01a12b68-786b-7ff1-a4e2-1809189e8780; final=OBL-2 (`T2`, responsibility `rolling-inventory-T2`) is proposed for discharge, pending coordinator review.

Inspection confirmed `fixture.ts` exports `value: number = 1`. Configured focused QA, `node --test fixture.test.ts`, passed both selections: 2 passed, 0 failed or skipped. No files changed; no commit, fetch, rebase, build, or publication QA was performed.

| Reference | Assigned value |
|---|---|
| Requirements | REQ-ROLLING-CONFIGURATION, REQ-ROLLING-GRAPH, REQ-ROLLING-SCHEDULING, REQ-ROLLING-STATE, REQ-ROLLING-WORKERS, REQ-ROLLING-REVIEW, REQ-ROLLING-PUBLICATION, REQ-ROLLING-INTERFACES |
| Requirement source | `pm/requirements/rolling-campaigns.md`; SHA-256 matches assigned digest |
| Acceptance group / acceptance | ROLL-INVENTORY-T2 / ACCEPT-FIXTURE |
| Arc / step | ARC-FIXTURE / STEP-FIXTURE |
| Implementation / source | IMPL-FIXTURE / `fixture.ts` |
| Unit proof | UNIT-FIXTURE; `fixture.test.ts`; selection `fixture unit` — passed |
| Integration proof | INTEGRATION-FIXTURE; `fixture.test.ts`; selection `fixture integration` — passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Permitted operations | `inspect`, `test` |
| Lease | scope `worker-fixture`; baseline BASELINE-1; binding BIND-1; generation `0896059b-4e5f-4114-8721-8f9f88d38491` |
| Target | identity `local`; profile `fixture` |
| Evidence revision / base | `2b0e9483ed683b1ccb1f6f0f693b3621833bb156`; tracked worktree clean |
| Prerequisites / blockers | None discovered |

Checkout retained; activity stopped.

2026-10-11T07:41:05-07:00
ℹ worker suspension thread=01a12b68-786b-7ff1-a4e2-1809189e8780; session=01a12b68-786b-7ff1-a4e2-1809189e8780; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=01a12b68-786b-7ff1-a4e2-1809189e8780; session=01a12b68-786b-7ff1-a4e2-1809189e8780; checkout=101; base=dd6986c361fffbeb3b4a1db37448d32485ab5468; generation=c02c84f1-d294-4c57-878f-04c6ba61af7e; fresh instructions completed before new allocation
ℹ worker native thread=01a12b68-786b-7ff1-a4e2-1809189e8780; session=01a12b68-786b-7ff1-a4e2-1809189e8780; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-oVMh1O/managed/101; attachment recovered after restart; model=gpt-6.1-sol
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 277681.333
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (2014.107084ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (816.592542ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (494.130916ms)
✔ lease use fences graph and generation, operations and exact changed paths (507.039583ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (541.766083ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (435.178416ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (437.322417ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (481.630125ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (405.777084ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (413.591834ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (479.320083ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (831.603ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (565.313958ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (530.567125ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (490.847209ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (189.5755ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (191.957291ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (163.351708ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (310.282ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.135375ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.910209ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (9.05525ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (5.141792ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (5.908292ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (10.502ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.28925ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (3.23175ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (5.556041ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (2.961458ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (3.054666ms)
✔ stale proof forces honest disturbance before new productive acceptance (5.43925ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (5.246167ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (425.711875ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.20125ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (40.753667ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.325084ms)
✔ reader cannot hide declared membership from the accepted current observation (2.92575ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (4348.272791ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3055.368625ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3227.792375ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1331.65325ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1714.827875ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (2263.942ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=ab8aaaeb2ff9bff1f4352985059951ed4762e31e; generation=0a3e5834-f0ba-4606-991d-53cc7e1a4b3e; fresh instructions completed before new allocation
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (57.757ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (31.907334ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.398375ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.432166ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.543875ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (81.669ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (262.963291ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (2.254208ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.992084ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.471833ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.301541ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.255ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.232417ms)
✔ review completion requires the exact terminal turn and validated final message (0.479041ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.304334ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.095333ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (1676.27625ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (252.503292ms)
✔ submission rejects merge history and reverted out-of-scope commits (484.550667ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (99.223833ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.351667ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (285.259458ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (0.497084ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (1.645584ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.248083ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (169.036084ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1418.493583ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (278.716708ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (289.821584ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (106.825333ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.312542ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (270.254084ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (5.765209ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (213.003875ms)
ℹ tests 77
ℹ suites 0
ℹ pass 77
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16081.960417

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1002 files: no violations found.
```
