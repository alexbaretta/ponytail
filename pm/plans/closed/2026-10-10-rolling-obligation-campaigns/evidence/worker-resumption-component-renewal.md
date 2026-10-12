# Worker resumption and existing assessment renewal

Clean revision ad12e922387e4d38388df1e1721739bd8ef54f23. CERT-69 renews the same 68 previously established standalone assessments after shared worker resumption, native harness and binding inputs changed. This renewal adds no obligation discharge. Original conditions, baselines, certificates and checkpoint prefixes remain unchanged. Fresh native proof includes assigned-reviewer rejection, native worker allocation/attachment, same-session restart recovery and populated obligation/traceability/lease/QA delivery. Publication/interface coverage and final campaign acceptance remain unresolved.

Command: node --test dist/tests/rolling-codex.integration.js

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
```

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-worker.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/rolling-review.test.js

```text
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
```

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (122.504584ms)
✔ activation write failure restores the directory and every original Markdown byte (74.733333ms)
✔ activation destination and status guards reject before changing source bytes (75.550791ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.943333ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.218375ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (164.947334ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.251625ms)
✔ empty valid inventory presentation retains its summary and final newline (0.097958ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.927375ms)
✔ typed validation selection retains all/json ordering and plan selection (0.115959ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.124542ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.454875ms)
✔ generated portable launch path preserves scalar selection and exact completion output (111.431209ms)
✔ adopted owning plans require their configured obligation document (117.417625ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (3573.904541ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3243.189667ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3461.715417ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1420.018875ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1729.798375ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (2358.811ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=b14bee704058579cf28816c994f1eb6c574c51ac; generation=9af2b868-6b10-4bb2-8d0a-a8275adf2c8a; fresh instructions completed before new allocation
✔ configuration boundary uses the designated Git checkout and effective defaults (243.377667ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (839.569333ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.567083ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.419083ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (4.236208ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (66.995875ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (196.69375ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.973ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.909125ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.451125ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.272708ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (91.716542ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (193.017416ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (51.888334ms)
  ✔ malformed (48.329ms)
✔ lost or malformed responses reject all affected pending operations (101.131583ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (84.766333ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1170.9435ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.482625ms)
✔ heading parser retains the exact pending, done and error statuses (0.994334ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.731541ms)
✔ human report aligns census columns after long identifiers (0.729ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (31.17525ms)
✔ campaign graph exposes detailed planning review without an execution lease (22.709916ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (320.648125ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (142.464042ms)
✔ campaign report and graph accept an initial planning-only sprint (128.27575ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (95.078542ms)
✔ lists plan sources without parsing and exposes canonical source parsing (16.804ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (15.776292ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (26.134959ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (90.731333ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (450.098958ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (158.987291ms)
✔ omitted report input requires exactly one campaign containing active plans (97.07225ms)
✔ bare plan names fail explicitly when missing or ambiguous (27.280625ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (58.282167ms)
✔ selected campaign validates direct dependency membership and cycles (28.501208ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (27.644166ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (80.41925ms)
✔ V1 report reader rejects unknown output fields (68.995458ms)
✔ production module uses exact exit and stream contracts without mutation (656.917709ms)
✔ ponytail dispatches campaign reporting through the production module (2214.682375ms)
ℹ tests 63
ℹ suites 0
ℹ pass 63
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 15912.121833
```

Command: node --test tests/openclaw-skills.test.js

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.719708ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.187833ms)
✔ api-service-boundaries: description is one line under 160 chars (0.05625ms)
✔ api-service-boundaries: referenced resources are packaged (0.13375ms)
✔ architecture: committed OpenClaw skill matches the generator (0.449291ms)
✔ architecture: body contains the canonical skills/architecture body (0.121458ms)
✔ architecture: description is one line under 160 chars (0.042209ms)
✔ architecture: referenced resources are packaged (0.071292ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.398292ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.139709ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.044ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.069708ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.377292ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.100083ms)
✔ build-impact: description is one line under 160 chars (0.027292ms)
✔ build-impact: referenced resources are packaged (0.087333ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.347292ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.088959ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.022959ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.0465ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.370417ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.077542ms)
✔ codex-execpolicy: description is one line under 160 chars (0.021291ms)
✔ codex-execpolicy: referenced resources are packaged (0.052209ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.626917ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.16975ms)
✔ cross-session-effects: description is one line under 160 chars (0.037542ms)
✔ cross-session-effects: referenced resources are packaged (0.091875ms)
✔ debugging: committed OpenClaw skill matches the generator (0.425416ms)
✔ debugging: body contains the canonical skills/debugging body (0.0935ms)
✔ debugging: description is one line under 160 chars (0.021875ms)
✔ debugging: referenced resources are packaged (0.086ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.349542ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.075334ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.01975ms)
✔ diagnostic-assertions: referenced resources are packaged (0.049167ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.323709ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.074542ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.018875ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.045916ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.295958ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.108167ms)
✔ issue-tracking: description is one line under 160 chars (0.018208ms)
✔ issue-tracking: referenced resources are packaged (0.07275ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.365166ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.073292ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.014792ms)
✔ lossless-json-contracts: referenced resources are packaged (0.042167ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.294792ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.069208ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.015ms)
✔ monetary-contract-safety: referenced resources are packaged (0.04425ms)
✔ plan-execution: committed OpenClaw skill matches the generator (2.022125ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.23225ms)
✔ plan-execution: description is one line under 160 chars (0.016041ms)
✔ plan-execution: referenced resources are packaged (0.185459ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (1.239958ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.313041ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.032875ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.185791ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.466833ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.149125ms)
✔ ponytail: description is one line under 160 chars (0.021792ms)
✔ ponytail: referenced resources are packaged (0.113833ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.390792ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.0725ms)
✔ ponytail-audit: description is one line under 160 chars (0.028792ms)
✔ ponytail-audit: referenced resources are packaged (0.047417ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.309125ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.074291ms)
✔ ponytail-debt: description is one line under 160 chars (0.019584ms)
✔ ponytail-debt: referenced resources are packaged (0.040792ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.301167ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.071333ms)
✔ ponytail-review: description is one line under 160 chars (0.01725ms)
✔ ponytail-review: referenced resources are packaged (0.29325ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.4205ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.105125ms)
✔ project-structure: description is one line under 160 chars (0.013959ms)
✔ project-structure: referenced resources are packaged (0.067959ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.394208ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.074292ms)
✔ production-test-boundaries: description is one line under 160 chars (0.014291ms)
✔ production-test-boundaries: referenced resources are packaged (0.050666ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.308042ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.07775ms)
✔ react-error-containment: description is one line under 160 chars (0.013833ms)
✔ react-error-containment: referenced resources are packaged (0.04775ms)
✔ requirements: committed OpenClaw skill matches the generator (0.238667ms)
✔ requirements: body contains the canonical skills/requirements body (0.10875ms)
✔ requirements: description is one line under 160 chars (0.014459ms)
✔ requirements: referenced resources are packaged (0.072875ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.272542ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.10175ms)
✔ requirements-traceability: description is one line under 160 chars (0.013958ms)
✔ requirements-traceability: referenced resources are packaged (0.073417ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.3385ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.059209ms)
✔ semantic-rebase: description is one line under 160 chars (0.017416ms)
✔ semantic-rebase: referenced resources are packaged (0.043833ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.324958ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.069041ms)
✔ static-type-safety: description is one line under 160 chars (0.013542ms)
✔ static-type-safety: referenced resources are packaged (0.042875ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.378041ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.076ms)
✔ test-credentials: description is one line under 160 chars (0.014417ms)
✔ test-credentials: referenced resources are packaged (0.055958ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.325417ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.074333ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.01375ms)
✔ typescript-unit-testing: referenced resources are packaged (0.051542ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.350958ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.079625ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.014459ms)
✔ user-acceptance-testing: referenced resources are packaged (0.055875ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.379584ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.119292ms)
✔ ux-testing: description is one line under 160 chars (0.020833ms)
✔ ux-testing: referenced resources are packaged (0.058583ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.45675ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.070792ms)
✔ variant-neutrality: description is one line under 160 chars (0.01475ms)
✔ variant-neutrality: referenced resources are packaged (0.057916ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.645959ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.109292ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.013458ms)
✔ versioned-data-contracts: referenced resources are packaged (0.101917ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.410375ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.071625ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.013167ms)
✔ worktree-lifecycle: referenced resources are packaged (0.046125ms)
✔ generated resources omit canonical relationship annotations (1.194041ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 86.936917
```

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

```text
✔ retains strict physical V1 parsing and scalar selection (42.195792ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (5.199542ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (6.420875ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (3.750208ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (4.177833ms)
✔ selects the highest-ranked V2 tasklet (8.542458ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.157542ms)
✔ blocks tasklets until dependency-feature validation is complete (3.319875ms)
✔ uses prior affinity and graph criteria deterministically (1.157291ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (43.138709ms)
✔ V3 returns one complete ordered batch (1.480417ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.249708ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (7.736833ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.34325ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.391209ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.284167ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (19.584417ms)
✔ campaign graph exposes detailed planning review without an execution lease (16.248125ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (248.499041ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (135.071875ms)
✔ campaign report and graph accept an initial planning-only sprint (127.255375ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (90.5965ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.051459ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (13.833834ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.030667ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (80.196333ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (456.212208ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (171.55875ms)
✔ omitted report input requires exactly one campaign containing active plans (101.270458ms)
✔ bare plan names fail explicitly when missing or ambiguous (28.698375ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (59.437125ms)
✔ selected campaign validates direct dependency membership and cycles (29.487542ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (29.620958ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (79.707541ms)
✔ V1 report reader rejects unknown output fields (75.049917ms)
✔ production module uses exact exit and stream contracts without mutation (629.064292ms)
✔ ponytail dispatches campaign reporting through the production module (1873.957584ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4353.95675
```

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (102.714209ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (82.701334ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (77.738209ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (202.513125ms)
✔ retains strict physical V1 parsing and scalar selection (42.942458ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (5.208667ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (7.442375ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (5.966ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (6.940583ms)
✔ selects the highest-ranked V2 tasklet (9.046959ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.455834ms)
✔ blocks tasklets until dependency-feature validation is complete (2.915625ms)
✔ uses prior affinity and graph criteria deterministically (0.894375ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (38.602208ms)
✔ V3 returns one complete ordered batch (1.317125ms)
✔ V3 bounds a batch while V2 selects one tasklet (3.389125ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (9.228333ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.843083ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (1.89ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (8.659666ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.294375ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (20.853166ms)
✔ campaign graph exposes detailed planning review without an execution lease (19.200375ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (242.855833ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (137.483917ms)
✔ campaign report and graph accept an initial planning-only sprint (131.379ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (93.74625ms)
✔ lists plan sources without parsing and exposes canonical source parsing (15.193416ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (15.663375ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.654083ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (85.213875ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (461.005875ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (167.783375ms)
✔ omitted report input requires exactly one campaign containing active plans (106.35375ms)
✔ bare plan names fail explicitly when missing or ambiguous (30.059041ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (62.544125ms)
✔ selected campaign validates direct dependency membership and cycles (30.09575ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (32.446167ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (87.943542ms)
✔ V1 report reader rejects unknown output fields (85.268666ms)
✔ production module uses exact exit and stream contracts without mutation (646.850542ms)
✔ ponytail dispatches campaign reporting through the production module (1874.652125ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (104.289792ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1320.949833ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (230.483209ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (264.119166ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (102.656625ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.270917ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (254.632833ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.253917ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (217.168667ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4425.129625
```

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (108.450875ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (87.132292ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (73.794542ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (201.987875ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (2.852209ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.563834ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (4.466584ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (4.800958ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.294666ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (6.691583ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.268041ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.980375ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (4.337667ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (3.198542ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (2.64175ms)
✔ stale proof forces honest disturbance before new productive acceptance (3.834875ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (1.908583ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (222.300541ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.167791ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (22.6355ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.046083ms)
✔ reader cannot hide declared membership from the accepted current observation (1.875833ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (102.309792ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1350.638541ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (238.048666ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (223.350459ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (103.807417ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.290417ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (228.58075ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (2.90225ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (198.000375ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2509.581541
```

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1002 files: no violations found.
```
