# Worker suspension and existing assessment renewal

Clean revision d9871d9d8756c78566faa4f36e174654ce1e6176. CERT-67 renews the same 67 previously established standalone assessments after shared worker suspension, native harness and binding inputs changed. This renewal adds no obligation discharge. Original conditions, baselines, certificates and checkpoint prefixes remain unchanged. Fresh native proof includes assigned-reviewer rejection, native worker allocation/attachment, same-session restart recovery and populated obligation/traceability/lease/QA delivery. Publication/interface coverage and final campaign acceptance remain unresolved.

Command: node --test dist/tests/rolling-codex.integration.js

```text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (2823.560917ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (2934.529375ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (2895.748916ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1174.031416ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1318.780584ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (44618.106916ms)
ℹ {"timestamp":"2026-10-11T14:22:56.708394Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:22:56.708435Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:22:57.010185Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:22:57.010211Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native review=26672b61-3fc7-4796-a5df-92c5ce0a2820; thread=01a12b58-68ad-7ce0-92b1-b8676183f8dc; session=01a12b58-68ad-7ce0-92b1-b8676183f8dc; candidate=5a844b8dc0b7d649897d4d92d3a70765513677b1; terminal=completed; final={"schemaVersion":1,"reviewId":"26672b61-3fc7-4796-a5df-92c5ce0a2820","revision":"5a844b8dc0b7d649897d4d92d3a70765513677b1","reviewerSessionId":"01a12b58-68ad-7ce0-92b1-b8676183f8dc","completedAt":"2026-10-11T07:23:32-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, directly violating OBL-2's approved condition. The retained syntax check passes but does not verify the required value. Restore the exported value to exactly 1 and verify the corrected candidate against OBL-2."]}
ℹ native review=26672b61-3fc7-4796-a5df-92c5ce0a2820; thread=01a12b58-68ad-7ce0-92b1-b8676183f8dc; session=01a12b58-68ad-7ce0-92b1-b8676183f8dc; candidate=5a844b8dc0b7d649897d4d92d3a70765513677b1; decision=rejected; findings=["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, directly violating OBL-2's approved condition. The retained syntax check passes but does not verify the required value. Restore the exported value to exactly 1 and verify the corrected candidate against OBL-2."]; recovered after App Server restart
✔ native App Server starts and resumes the same session in the designated existing checkout (26158.110083ms)
ℹ {"timestamp":"2026-10-11T14:23:39.162557Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:23:39.162606Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T14:23:39.475726Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:23:39.475753Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12b59-0e7f-7940-add0-5df5bf39ab1d; session=01a12b59-0e7f-7940-add0-5df5bf39ab1d; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-gjnNa2; resumed after App Server restart; model=gpt-6.1-sol
✔ live worker provisioning binds the reserved checkout and persists its actual native session after restart (13693.969625ms)
ℹ {"timestamp":"2026-10-11T14:24:05.995065Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:24:05.995102Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker native thread=01a12b59-7749-7ff1-9d85-370684967d78; session=01a12b59-7749-7ff1-9d85-370684967d78; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-VzMmsG/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live attached worker receives exact obligation, traceability, frozen lease and QA instructions (45982.283125ms)
ℹ {"timestamp":"2026-10-11T14:24:19.686376Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:24:19.686418Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b59-e72c-7b21-a165-929c9150d6aa; thread=01a12b59-acc5-79a2-b1b3-3a3653ad7405; final=Proposed discharge of **OBL-2 / T2**, responsibility `rolling-inventory-T2`, group `ROLL-INVENTORY-T2`.

Inspection confirmed `fixture.ts` exports `value: number = 1`. Configured focused QA, `node --test fixture.test.ts`, passed both selections: 2 passed, 0 failed or skipped.

- Requirements: `REQ-ROLLING-CONFIGURATION`, `REQ-ROLLING-GRAPH`, `REQ-ROLLING-SCHEDULING`, `REQ-ROLLING-STATE`, `REQ-ROLLING-WORKERS`, `REQ-ROLLING-REVIEW`, `REQ-ROLLING-PUBLICATION`, `REQ-ROLLING-INTERFACES`.
- Requirement source: `pm/requirements/rolling-campaigns.md`; SHA-256 matches supplied digest `34ace4778b1cfe7b1d85efa26a127ac9479dca21dd0f9147d177edf8d145964a`.
- Implementation: `IMPL-FIXTURE`; source `fixture.ts`.
- Acceptance: `ACCEPT-FIXTURE`; Arc `ARC-FIXTURE`; step `STEP-FIXTURE`.
- Unit: `UNIT-FIXTURE`, `fixture.test.ts`, selection `fixture unit` — passed.
- Integration: `INTEGRATION-FIXTURE`, `fixture.test.ts`, selection `fixture integration` — passed.
- Permitted paths: `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md`; operations `inspect`, `test`.
- Lease generation: `497ecd8b-336a-4c82-be54-684d879aed93`; scope `worker-fixture`; baseline `BASELINE-1`; binding `BIND-1`; prerequisites none.
- Target: identity `local`, profile `fixture`.
- Inspected revision: `08e2c4417af45ebb86c77106eb2c7d6fa3deb67a`; Node `v24.15.0`; worktree clean before and after proof.

No files modified, commit, rebase, build, or publication QA performed. No new prerequisites discovered. Checkout retained; acceptance remains with the coordinator.

2026-10-11T07:24:52-07:00
ℹ worker native thread=01a12b59-acc5-79a2-b1b3-3a3653ad7405; session=01a12b59-acc5-79a2-b1b3-3a3653ad7405; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-OzSycX/managed/101; attachment recovered after restart; model=gpt-6.1-sol
✔ live worker suspension observes idle native activity and retains its dirty checkout while freeing capacity (51912.76175ms)
ℹ {"timestamp":"2026-10-11T14:25:05.691703Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T14:25:05.691740Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker instruction turn=01a12b5a-93dd-7c60-963e-702b17676591; thread=01a12b5a-607a-7ce1-91e3-8b3d656bef60; final=Proposed discharge of **OBL-2 (T2)**, responsibility `rolling-inventory-T2`, acceptance group `ROLL-INVENTORY-T2`. Coordinator acceptance remains pending.

Inspection confirmed `fixture.ts` exports `value: number = 1`. Configured QA `node --test fixture.test.ts` passed both tests: 2 passed, 0 failed or skipped. No files changed; no commit, rebase, build, or publication performed. No new prerequisites discovered.

| Assigned reference | Evidence |
|---|---|
| Requirements | REQ-ROLLING-CONFIGURATION, REQ-ROLLING-GRAPH, REQ-ROLLING-SCHEDULING, REQ-ROLLING-STATE, REQ-ROLLING-WORKERS, REQ-ROLLING-REVIEW, REQ-ROLLING-PUBLICATION, REQ-ROLLING-INTERFACES |
| Requirement source | `pm/requirements/rolling-campaigns.md`; digest matches assignment |
| Acceptance / Arc / Step | `ACCEPT-FIXTURE` / `ARC-FIXTURE` / `STEP-FIXTURE` |
| Implementation / source | `IMPL-FIXTURE` / `fixture.ts` |
| Unit | `UNIT-FIXTURE`; `fixture.test.ts`; selection `fixture unit` — passed |
| Integration | `INTEGRATION-FIXTURE`; `fixture.test.ts`; selection `fixture integration` — passed |
| Permitted paths | `fixture.ts`, `fixture.test.ts`, `pm/requirements/rolling-campaigns.md` |
| Operations / prerequisites | `inspect`, `test` / none |
| Lease generation | `3dfcaff8-d013-4b81-868c-446451ad1d1d` |
| Scope / baseline / binding | `worker-fixture` / `BASELINE-1` / `BIND-1` |
| Target | identity `local`, profile `fixture` |
| Inspected revision | `1623f8201341aa5485d541fbafee2575e0c80652`; clean tracked tree |

2026-10-11T07:25:43-07:00
ℹ worker suspension thread=01a12b5a-607a-7ce1-91e3-8b3d656bef60; session=01a12b5a-607a-7ce1-91e3-8b3d656bef60; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
ℹ worker native thread=01a12b5a-607a-7ce1-91e3-8b3d656bef60; session=01a12b5a-607a-7ce1-91e3-8b3d656bef60; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-RJLjRG/managed/101; attachment recovered after restart; model=gpt-6.1-sol
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 193592.910084
```

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-worker.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/rolling-review.test.js

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (2042.197542ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (852.203ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (446.107917ms)
✔ lease use fences graph and generation, operations and exact changed paths (418.468833ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (470.196708ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (425.153916ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (408.566875ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (426.892958ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (422.327541ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (383.336833ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (429.94725ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (841.252ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (477.301292ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (429.581334ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (465.237292ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (202.978542ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (163.889166ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (177.919958ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (301.023417ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.118375ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.938791ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (7.037916ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (4.303792ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (5.593375ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (6.387541ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.27325ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.858542ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (9.447875ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (11.819833ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (5.794041ms)
✔ stale proof forces honest disturbance before new productive acceptance (9.908416ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (4.684375ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (415.913791ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.184833ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (34.939041ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.312084ms)
✔ reader cannot hide declared membership from the accepted current observation (1.6675ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (4350.379208ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (2887.011292ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3035.529083ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1218.079584ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1341.740292ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (90.93875ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (23.091958ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.338583ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.406166ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.463542ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (103.049291ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (222.045833ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.935333ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.712042ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.467833ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.270542ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.235875ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.241083ms)
✔ review completion requires the exact terminal turn and validated final message (0.520125ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.312542ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.105708ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (1559.621709ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (297.660541ms)
✔ submission rejects merge history and reverted out-of-scope commits (446.446875ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (91.444417ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.326583ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (258.943583ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (0.511833ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.558667ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (204.524583ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1586.324541ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (259.231333ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (266.667458ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (106.389ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.339166ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (250.719958ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.155375ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (217.520042ms)
ℹ tests 75
ℹ suites 0
ℹ pass 75
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12932.409292
```

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (87.297583ms)
✔ activation write failure restores the directory and every original Markdown byte (62.573125ms)
✔ activation destination and status guards reject before changing source bytes (55.891875ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.856291ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.208292ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (104.99275ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.21925ms)
✔ empty valid inventory presentation retains its summary and final newline (0.08525ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.999708ms)
✔ typed validation selection retains all/json ordering and plan selection (0.119416ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.128125ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.377041ms)
✔ generated portable launch path preserves scalar selection and exact completion output (97.70425ms)
✔ adopted owning plans require their configured obligation document (108.355958ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (3311.082208ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (2926.227083ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (2920.892667ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1146.536875ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (1374.55025ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ configuration boundary uses the designated Git checkout and effective defaults (193.021083ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (698.4275ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.3285ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.403916ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.514541ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (50.545083ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (123.277041ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.229959ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.014667ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.451708ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.271459ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (71.708584ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (177.335667ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (51.082167ms)
  ✔ malformed (45.100791ms)
✔ lost or malformed responses reject all affected pending operations (96.757709ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (50.91625ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1006.611334ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.874292ms)
✔ heading parser retains the exact pending, done and error statuses (1.164166ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.297958ms)
✔ human report aligns census columns after long identifiers (0.692583ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (34.90275ms)
✔ campaign graph exposes detailed planning review without an execution lease (18.972833ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (263.659917ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (141.66025ms)
✔ campaign report and graph accept an initial planning-only sprint (123.689625ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (93.322708ms)
✔ lists plan sources without parsing and exposes canonical source parsing (15.168167ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (16.244833ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.827042ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (85.714291ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (475.003709ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (143.454541ms)
✔ omitted report input requires exactly one campaign containing active plans (89.79525ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.421292ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (54.608875ms)
✔ selected campaign validates direct dependency membership and cycles (27.715958ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (28.857625ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (80.991458ms)
✔ V1 report reader rejects unknown output fields (67.692875ms)
✔ production module uses exact exit and stream contracts without mutation (606.810458ms)
✔ ponytail dispatches campaign reporting through the production module (2188.943292ms)
ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11775.892791
```

Command: node --test tests/openclaw-skills.test.js

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.344583ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.172708ms)
✔ api-service-boundaries: description is one line under 160 chars (0.051209ms)
✔ api-service-boundaries: referenced resources are packaged (0.13175ms)
✔ architecture: committed OpenClaw skill matches the generator (0.149459ms)
✔ architecture: body contains the canonical skills/architecture body (0.093ms)
✔ architecture: description is one line under 160 chars (0.0335ms)
✔ architecture: referenced resources are packaged (0.067625ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.142042ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.132083ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.045834ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.078ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.119042ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.10675ms)
✔ build-impact: description is one line under 160 chars (0.032167ms)
✔ build-impact: referenced resources are packaged (0.086291ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.112041ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.079167ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.024666ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.047666ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.087958ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.075875ms)
✔ codex-execpolicy: description is one line under 160 chars (0.020334ms)
✔ codex-execpolicy: referenced resources are packaged (0.043791ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.31025ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.099666ms)
✔ cross-session-effects: description is one line under 160 chars (0.030875ms)
✔ cross-session-effects: referenced resources are packaged (0.078208ms)
✔ debugging: committed OpenClaw skill matches the generator (0.124167ms)
✔ debugging: body contains the canonical skills/debugging body (0.082791ms)
✔ debugging: description is one line under 160 chars (0.017833ms)
✔ debugging: referenced resources are packaged (0.080958ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.085875ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.063ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.016625ms)
✔ diagnostic-assertions: referenced resources are packaged (0.044584ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.09775ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.07075ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.018042ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.04825ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.116792ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.433708ms)
✔ issue-tracking: description is one line under 160 chars (0.015583ms)
✔ issue-tracking: referenced resources are packaged (0.062417ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.095084ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.06175ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.01675ms)
✔ lossless-json-contracts: referenced resources are packaged (0.041208ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.083917ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.067666ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.014167ms)
✔ monetary-contract-safety: referenced resources are packaged (0.041209ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.235417ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.218584ms)
✔ plan-execution: description is one line under 160 chars (0.016417ms)
✔ plan-execution: referenced resources are packaged (0.183959ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.203375ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.195709ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.017291ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.149125ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.122792ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.111541ms)
✔ ponytail: description is one line under 160 chars (0.014833ms)
✔ ponytail: referenced resources are packaged (0.0835ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (1.105417ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.092417ms)
✔ ponytail-audit: description is one line under 160 chars (0.020584ms)
✔ ponytail-audit: referenced resources are packaged (0.048292ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.096ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.07125ms)
✔ ponytail-debt: description is one line under 160 chars (0.0175ms)
✔ ponytail-debt: referenced resources are packaged (0.040291ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.307ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.2815ms)
✔ ponytail-review: description is one line under 160 chars (0.014417ms)
✔ ponytail-review: referenced resources are packaged (0.042417ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.113833ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.095042ms)
✔ project-structure: description is one line under 160 chars (0.014458ms)
✔ project-structure: referenced resources are packaged (0.065583ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.091042ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.069875ms)
✔ production-test-boundaries: description is one line under 160 chars (0.013667ms)
✔ production-test-boundaries: referenced resources are packaged (0.045583ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.092416ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.076541ms)
✔ react-error-containment: description is one line under 160 chars (0.013417ms)
✔ react-error-containment: referenced resources are packaged (0.049375ms)
✔ requirements: committed OpenClaw skill matches the generator (0.110333ms)
✔ requirements: body contains the canonical skills/requirements body (0.095041ms)
✔ requirements: description is one line under 160 chars (0.013666ms)
✔ requirements: referenced resources are packaged (0.068292ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.117792ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.095125ms)
✔ requirements-traceability: description is one line under 160 chars (0.0135ms)
✔ requirements-traceability: referenced resources are packaged (0.069875ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.0985ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.065334ms)
✔ semantic-rebase: description is one line under 160 chars (0.01725ms)
✔ semantic-rebase: referenced resources are packaged (0.04525ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.087167ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.062917ms)
✔ static-type-safety: description is one line under 160 chars (0.01425ms)
✔ static-type-safety: referenced resources are packaged (0.040125ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.093167ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.071917ms)
✔ test-credentials: description is one line under 160 chars (0.013917ms)
✔ test-credentials: referenced resources are packaged (0.048334ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.093083ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.070625ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.013833ms)
✔ typescript-unit-testing: referenced resources are packaged (0.045333ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.089667ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.068625ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.013458ms)
✔ user-acceptance-testing: referenced resources are packaged (0.045625ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.084125ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.061958ms)
✔ ux-testing: description is one line under 160 chars (0.013458ms)
✔ ux-testing: referenced resources are packaged (0.041958ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.084417ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.066625ms)
✔ variant-neutrality: description is one line under 160 chars (0.013875ms)
✔ variant-neutrality: referenced resources are packaged (0.264084ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.123917ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.101042ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.013083ms)
✔ versioned-data-contracts: referenced resources are packaged (0.096333ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.100625ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.070959ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.014666ms)
✔ worktree-lifecycle: referenced resources are packaged (0.043417ms)
✔ generated resources omit canonical relationship annotations (0.91975ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 75.2505
```

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

```text
✔ retains strict physical V1 parsing and scalar selection (45.369166ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (5.405792ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (7.135208ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (4.945792ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (5.274584ms)
✔ selects the highest-ranked V2 tasklet (8.980666ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.134542ms)
✔ blocks tasklets until dependency-feature validation is complete (3.585791ms)
✔ uses prior affinity and graph criteria deterministically (1.254875ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (41.361667ms)
✔ V3 returns one complete ordered batch (1.555708ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.182042ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (7.242083ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.29925ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.380584ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.697ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (21.3815ms)
✔ campaign graph exposes detailed planning review without an execution lease (17.333583ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (230.698375ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (138.062958ms)
✔ campaign report and graph accept an initial planning-only sprint (126.525791ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (94.328459ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.049125ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.054375ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.109208ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (85.473666ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (458.533958ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (276.34225ms)
✔ omitted report input requires exactly one campaign containing active plans (155.552291ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.781333ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (56.116833ms)
✔ selected campaign validates direct dependency membership and cycles (25.537292ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (26.560084ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (76.603333ms)
✔ V1 report reader rejects unknown output fields (63.285875ms)
✔ production module uses exact exit and stream contracts without mutation (584.753ms)
✔ ponytail dispatches campaign reporting through the production module (1769.925125ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4334.708167
```

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (102.428083ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (83.263083ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (76.606667ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (198.105291ms)
✔ retains strict physical V1 parsing and scalar selection (40.968625ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (5.754791ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (6.989208ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (5.51625ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (6.927333ms)
✔ selects the highest-ranked V2 tasklet (8.596125ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (4.155167ms)
✔ blocks tasklets until dependency-feature validation is complete (3.475042ms)
✔ uses prior affinity and graph criteria deterministically (1.050833ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (39.586541ms)
✔ V3 returns one complete ordered batch (1.364333ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.462291ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (8.126125ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.787833ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (1.9465ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (8.682666ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.2825ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (21.842916ms)
✔ campaign graph exposes detailed planning review without an execution lease (16.906916ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (241.798584ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (140.574292ms)
✔ campaign report and graph accept an initial planning-only sprint (127.892417ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (92.785917ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.149ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (13.835875ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.575416ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (81.897792ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (442.472166ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (165.277666ms)
✔ omitted report input requires exactly one campaign containing active plans (97.505333ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.799708ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (55.919667ms)
✔ selected campaign validates direct dependency membership and cycles (26.563416ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (26.772625ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (90.892334ms)
✔ V1 report reader rejects unknown output fields (70.46ms)
✔ production module uses exact exit and stream contracts without mutation (639.806791ms)
✔ ponytail dispatches campaign reporting through the production module (1857.720917ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (103.308416ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1520.827084ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (246.362541ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (247.839958ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (99.392917ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.339875ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (255.584666ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.302167ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (217.760083ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4326.224167
```

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (95.875167ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (75.047917ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (74.2325ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (191.517458ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (2.745666ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.661083ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (4.188375ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (3.4085ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.218958ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (6.590292ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.239458ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.44625ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (4.399167ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (3.327458ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (2.233542ms)
✔ stale proof forces honest disturbance before new productive acceptance (3.618084ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.16475ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (221.176916ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.157625ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (20.234083ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (1.807917ms)
✔ reader cannot hide declared membership from the accepted current observation (1.559125ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (94.906834ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1519.064958ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (222.9735ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (213.670791ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (89.355042ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.260875ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (216.41075ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (2.790416ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (182.037917ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2601.966167
```

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 998 files: no violations found.
```
