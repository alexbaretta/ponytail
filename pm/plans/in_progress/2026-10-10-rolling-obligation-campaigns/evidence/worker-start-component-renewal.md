# Worker instruction and existing assessment renewal

Clean revision c9c8b7aeb66230534f5ba24f41ecfa133ffe3215. CERT-65 renews the same 66 previously established standalone assessments after shared worker instruction, native harness and binding inputs changed. This renewal adds no obligation discharge. Original conditions, baselines, certificates and checkpoint prefixes remain unchanged. Fresh native proof includes assigned-reviewer rejection, native worker allocation/attachment, same-session restart recovery and populated obligation/traceability/lease/QA delivery. Publication/interface coverage and final campaign acceptance remain unresolved.

Command: node --test dist/tests/rolling-codex.integration.js

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
```

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-worker.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/rolling-review.test.js

```text
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
```

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (238.987417ms)
✔ activation write failure restores the directory and every original Markdown byte (139.49325ms)
✔ activation destination and status guards reject before changing source bytes (151.431834ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.918167ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.7125ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (245.197833ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.2355ms)
✔ empty valid inventory presentation retains its summary and final newline (0.090917ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.888708ms)
✔ typed validation selection retains all/json ordering and plan selection (0.12125ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.128625ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.371625ms)
✔ generated portable launch path preserves scalar selection and exact completion output (183.17225ms)
✔ adopted owning plans require their configured obligation document (153.148292ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (5320.265333ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3149.644916ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3278.715916ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (1260.642792ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (371.521709ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (1463.589833ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.365ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.41175ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.527334ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (190.077875ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (316.184333ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (16.54925ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.900666ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.481416ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.275958ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (172.289458ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (210.808167ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (76.756ms)
  ✔ malformed (142.471875ms)
✔ lost or malformed responses reject all affected pending operations (219.707791ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (108.573625ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (2039.668292ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (4.423792ms)
✔ heading parser retains the exact pending, done and error statuses (0.902625ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.273333ms)
✔ human report aligns census columns after long identifiers (17.296125ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (52.876458ms)
✔ campaign graph exposes detailed planning review without an execution lease (44.523ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (537.548625ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (272.274625ms)
✔ campaign report and graph accept an initial planning-only sprint (219.708375ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (200.223292ms)
✔ lists plan sources without parsing and exposes canonical source parsing (29.985041ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (43.574625ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (50.093666ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (156.351459ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (597.313708ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (202.336417ms)
✔ omitted report input requires exactly one campaign containing active plans (114.342792ms)
✔ bare plan names fail explicitly when missing or ambiguous (30.569291ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (62.624083ms)
✔ selected campaign validates direct dependency membership and cycles (31.490083ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (34.865542ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (110.983834ms)
✔ V1 report reader rejects unknown output fields (84.572041ms)
✔ production module uses exact exit and stream contracts without mutation (753.114875ms)
✔ ponytail dispatches campaign reporting through the production module (2083.668458ms)
ℹ tests 61
ℹ suites 0
ℹ pass 61
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13127.907584
```

Command: node --test tests/openclaw-skills.test.js

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.419542ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.210375ms)
✔ api-service-boundaries: description is one line under 160 chars (0.060042ms)
✔ api-service-boundaries: referenced resources are packaged (4.713625ms)
✔ architecture: committed OpenClaw skill matches the generator (0.211083ms)
✔ architecture: body contains the canonical skills/architecture body (0.121083ms)
✔ architecture: description is one line under 160 chars (0.049375ms)
✔ architecture: referenced resources are packaged (0.079667ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.156167ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.155375ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.048292ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.0835ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.139708ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.096917ms)
✔ build-impact: description is one line under 160 chars (0.027916ms)
✔ build-impact: referenced resources are packaged (0.103458ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.16525ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.0975ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.028792ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.059709ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.112542ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (7.027042ms)
✔ codex-execpolicy: description is one line under 160 chars (0.093167ms)
✔ codex-execpolicy: referenced resources are packaged (0.150708ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.992542ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.170958ms)
✔ cross-session-effects: description is one line under 160 chars (0.045333ms)
✔ cross-session-effects: referenced resources are packaged (0.11425ms)
✔ debugging: committed OpenClaw skill matches the generator (0.170583ms)
✔ debugging: body contains the canonical skills/debugging body (0.117916ms)
✔ debugging: description is one line under 160 chars (0.020917ms)
✔ debugging: referenced resources are packaged (0.112667ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.116083ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.128375ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.024375ms)
✔ diagnostic-assertions: referenced resources are packaged (0.062ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.139ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.091917ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.018625ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.060959ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.137333ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (3.712333ms)
✔ issue-tracking: description is one line under 160 chars (0.040458ms)
✔ issue-tracking: referenced resources are packaged (0.126333ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.130791ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.082708ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.018125ms)
✔ lossless-json-contracts: referenced resources are packaged (0.056542ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.098791ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.072458ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.016333ms)
✔ monetary-contract-safety: referenced resources are packaged (0.057417ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.290875ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.331958ms)
✔ plan-execution: description is one line under 160 chars (0.019708ms)
✔ plan-execution: referenced resources are packaged (0.22325ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.242875ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.245333ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.021958ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.518792ms)
✔ ponytail: committed OpenClaw skill matches the generator (1.711416ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.707291ms)
✔ ponytail: description is one line under 160 chars (0.035959ms)
✔ ponytail: referenced resources are packaged (2.268792ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.346041ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.097458ms)
✔ ponytail-audit: description is one line under 160 chars (0.02375ms)
✔ ponytail-audit: referenced resources are packaged (1.24075ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.538458ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.288375ms)
✔ ponytail-debt: description is one line under 160 chars (0.071208ms)
✔ ponytail-debt: referenced resources are packaged (0.15875ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.50975ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.137ms)
✔ ponytail-review: description is one line under 160 chars (0.122458ms)
✔ ponytail-review: referenced resources are packaged (0.264333ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.498166ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.147333ms)
✔ project-structure: description is one line under 160 chars (0.019625ms)
✔ project-structure: referenced resources are packaged (0.08825ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.115167ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.562875ms)
✔ production-test-boundaries: description is one line under 160 chars (0.066334ms)
✔ production-test-boundaries: referenced resources are packaged (0.116666ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.432958ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.117584ms)
✔ react-error-containment: description is one line under 160 chars (0.021916ms)
✔ react-error-containment: referenced resources are packaged (0.063083ms)
✔ requirements: committed OpenClaw skill matches the generator (0.186458ms)
✔ requirements: body contains the canonical skills/requirements body (0.1115ms)
✔ requirements: description is one line under 160 chars (0.016917ms)
✔ requirements: referenced resources are packaged (0.091792ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.149875ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.115334ms)
✔ requirements-traceability: description is one line under 160 chars (0.018375ms)
✔ requirements-traceability: referenced resources are packaged (0.088792ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.100167ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.095875ms)
✔ semantic-rebase: description is one line under 160 chars (0.017917ms)
✔ semantic-rebase: referenced resources are packaged (0.055291ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.1385ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.09025ms)
✔ static-type-safety: description is one line under 160 chars (0.016125ms)
✔ static-type-safety: referenced resources are packaged (0.053542ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.131667ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (1.016167ms)
✔ test-credentials: description is one line under 160 chars (0.030209ms)
✔ test-credentials: referenced resources are packaged (0.075917ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.160459ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.100458ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.019667ms)
✔ typescript-unit-testing: referenced resources are packaged (0.072208ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.173875ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.125542ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.021041ms)
✔ user-acceptance-testing: referenced resources are packaged (0.067375ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.174083ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.08275ms)
✔ ux-testing: description is one line under 160 chars (0.016292ms)
✔ ux-testing: referenced resources are packaged (0.056ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.140625ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.082334ms)
✔ variant-neutrality: description is one line under 160 chars (0.015958ms)
✔ variant-neutrality: referenced resources are packaged (0.069875ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.475625ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.137833ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.01625ms)
✔ versioned-data-contracts: referenced resources are packaged (0.1245ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.143625ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.099917ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.014875ms)
✔ worktree-lifecycle: referenced resources are packaged (0.052417ms)
✔ generated resources omit canonical relationship annotations (6.127ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 152.710375
```

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

```text
✔ retains strict physical V1 parsing and scalar selection (56.517333ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (12.866333ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (20.345833ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (12.854583ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (11.899375ms)
✔ selects the highest-ranked V2 tasklet (13.721167ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (6.792667ms)
✔ blocks tasklets until dependency-feature validation is complete (5.877209ms)
✔ uses prior affinity and graph criteria deterministically (2.560667ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (49.757917ms)
✔ V3 returns one complete ordered batch (1.827834ms)
✔ V3 bounds a batch while V2 selects one tasklet (5.090208ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (26.804875ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.423458ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.403167ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.950166ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (51.960167ms)
✔ campaign graph exposes detailed planning review without an execution lease (36.9395ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (323.342792ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (149.601209ms)
✔ campaign report and graph accept an initial planning-only sprint (134.466875ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (92.386125ms)
✔ lists plan sources without parsing and exposes canonical source parsing (16.51575ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (16.722333ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.640458ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (90.638417ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (975.249958ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (546.047417ms)
✔ omitted report input requires exactly one campaign containing active plans (286.985959ms)
✔ bare plan names fail explicitly when missing or ambiguous (48.520459ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (138.859666ms)
✔ selected campaign validates direct dependency membership and cycles (81.214125ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (66.140833ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (312.423708ms)
✔ V1 report reader rejects unknown output fields (143.345333ms)
✔ production module uses exact exit and stream contracts without mutation (1428.18425ms)
✔ ponytail dispatches campaign reporting through the production module (2951.550958ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8005.593167
```

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (189.495583ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (126.821416ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (97.808125ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (218.85475ms)
✔ retains strict physical V1 parsing and scalar selection (57.244083ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (11.383125ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (15.0615ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (12.541375ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (12.566209ms)
✔ selects the highest-ranked V2 tasklet (10.120333ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (10.915083ms)
✔ blocks tasklets until dependency-feature validation is complete (7.207042ms)
✔ uses prior affinity and graph criteria deterministically (2.917792ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (54.280792ms)
✔ V3 returns one complete ordered batch (2.056959ms)
✔ V3 bounds a batch while V2 selects one tasklet (4.432458ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (25.656417ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.887917ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (2.311583ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (9.521875ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.277917ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (42.6885ms)
✔ campaign graph exposes detailed planning review without an execution lease (39.425375ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (337.168583ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (152.51275ms)
✔ campaign report and graph accept an initial planning-only sprint (131.663375ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (95.920583ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.601375ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.832416ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (16.466167ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (88.582ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (982.985375ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (593.979584ms)
✔ omitted report input requires exactly one campaign containing active plans (259.474959ms)
✔ bare plan names fail explicitly when missing or ambiguous (50.908292ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (137.206833ms)
✔ selected campaign validates direct dependency membership and cycles (74.593625ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (59.528ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (275.559584ms)
✔ V1 report reader rejects unknown output fields (198.67375ms)
✔ production module uses exact exit and stream contracts without mutation (1423.76ms)
✔ ponytail dispatches campaign reporting through the production module (2817.959583ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (214.416166ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1501.785ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (712.143167ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (577.572875ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (313.596584ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.510708ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (715.54725ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (13.516875ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (540.876875ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7895.839084
```

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (192.1635ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (139.220625ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (92.695208ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (210.499958ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.380625ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.951084ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (5.5635ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (5.429375ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (8.063208ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (10.109833ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.274208ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (3.776334ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (7.174917ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (4.473792ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (5.030291ms)
✔ stale proof forces honest disturbance before new productive acceptance (5.19825ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (6.013833ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (273.147ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.164875ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (26.613916ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.362791ms)
✔ reader cannot hide declared membership from the accepted current observation (2.499167ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (200.310417ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1505.231625ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (730.192541ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (545.570417ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (302.888833ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.369084ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (677.491834ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.38075ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (634.805209ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4737.654292
```

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 994 files: no violations found.
```
