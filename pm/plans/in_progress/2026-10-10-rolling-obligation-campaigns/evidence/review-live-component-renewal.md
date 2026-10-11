# Review component and existing assessment renewal

Exact clean revision 6a182a22f889ce0fddb8311ad328f9bb697fb385. Durable requests bind the reviewer to the exact validated candidate. Concurrent requests and accepted or rejected outcomes retain one immutable record, validate actor identity and reject dirty checkouts. Accepted review transitions to INTEGRATING; rejection transitions to REWORK.

This record renews only previously established component assessments; the independent OBL-50 live review acceptance is recorded separately. CERT-61 renews the same 64 previously established standalone assessments after their shared inputs changed. Historical conditions, baselines, certificates and checkpoints remain unchanged. Six publication/interface structural traceability gaps remain. Final campaign acceptance remains pending. Fresh native review and start/resume acceptance passed against the installed App Server, including persisted decision recovery after restart.

Command: node --test dist/tests/rolling-codex.integration.js

```text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (2839.887875ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (2786.718292ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (2892.203041ms)
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (35769.868417ms)
ℹ {"timestamp":"2026-10-11T12:42:08.156250Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:08.156308Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:08.422902Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:08.422934Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native review=f82e4058-b250-4439-a87e-01553a6edc65; thread=01a12afc-1d78-75b0-9192-cef9c4d2fb39; session=01a12afc-1d78-75b0-9192-cef9c4d2fb39; candidate=bbe5e0a4d0b31a5770b245368eda90fa57e7ccae; terminal=completed; final={"schemaVersion":1,"reviewId":"f82e4058-b250-4439-a87e-01553a6edc65","revision":"bbe5e0a4d0b31a5770b245368eda90fa57e7ccae","reviewerSessionId":"01a12afc-1d78-75b0-9192-cef9c4d2fb39","completedAt":"2026-10-11T05:42:35.345-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2; restore the initializer to exactly 1. The retained node --check proof verifies syntax only and cannot establish this acceptance condition; retain evidence inspecting the corrected candidate's exported value."]}
ℹ native review=f82e4058-b250-4439-a87e-01553a6edc65; thread=01a12afc-1d78-75b0-9192-cef9c4d2fb39; session=01a12afc-1d78-75b0-9192-cef9c4d2fb39; candidate=bbe5e0a4d0b31a5770b245368eda90fa57e7ccae; decision=rejected; findings=["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2; restore the initializer to exactly 1. The retained node --check proof verifies syntax only and cannot establish this acceptance condition; retain evidence inspecting the corrected candidate's exported value."]; recovered after App Server restart
✔ native App Server starts and resumes the same session in the designated existing checkout (18807.085334ms)
ℹ {"timestamp":"2026-10-11T12:42:41.794408Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T12:42:41.794461Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:42.076999Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:42.077020Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12afc-a0ec-7212-9c07-8836f2eacd3d; session=01a12afc-a0ec-7212-9c07-8836f2eacd3d; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-oTuRlN; resumed after App Server restart; model=gpt-6.1-sol
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 63167.049542
```

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/rolling-review.test.js

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (1738.570417ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (605.762625ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (421.038333ms)
✔ lease use fences graph and generation, operations and exact changed paths (312.353ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (349.019083ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (306.9055ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (353.545166ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (309.619417ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (325.658791ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (400.014916ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (410.025958ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (623.12025ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (416.135917ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (330.105792ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (371.205292ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (166.06325ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (174.177125ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (145.062375ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (266.375208ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.372917ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.30475ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (6.229542ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (5.068042ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (6.942083ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (7.476334ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.284291ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (2.153792ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (5.73625ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (5.447792ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (1.994958ms)
✔ stale proof forces honest disturbance before new productive acceptance (4.618875ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (1.983417ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (406.715292ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.163167ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (30.752458ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.334167ms)
✔ reader cannot hide declared membership from the accepted current observation (4.259042ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (4376.103167ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3755.008208ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3669.405542ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (41.15475ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (26.354791ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.586625ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.431916ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.555375ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (65.891666ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (268.745292ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.798916ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.715542ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.471042ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.453042ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.941ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.614792ms)
✔ review completion requires the exact terminal turn and validated final message (0.537292ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.368042ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.104083ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (1494.222459ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (221.376375ms)
✔ submission rejects merge history and reverted out-of-scope commits (370.16975ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (100.950084ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (203.844333ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1504.657833ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (242.757084ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (253.822625ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (107.309042ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.318625ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (270.800917ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (7.01475ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (224.931083ms)
ℹ tests 69
ℹ suites 0
ℹ pass 69
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11961.5705
```

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (134.3405ms)
✔ activation write failure restores the directory and every original Markdown byte (71.343708ms)
✔ activation destination and status guards reject before changing source bytes (59.440417ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.866ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.207875ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (168.441125ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.349125ms)
✔ empty valid inventory presentation retains its summary and final newline (0.103625ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.868375ms)
✔ typed validation selection retains all/json ordering and plan selection (0.117375ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.159542ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.60625ms)
✔ generated portable launch path preserves scalar selection and exact completion output (122.553708ms)
✔ adopted owning plans require their configured obligation document (118.4385ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (3672.680958ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3887.139375ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3018.21625ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (229.30175ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (662.547208ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.367625ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (6.403292ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (0.975041ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (80.280333ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (148.485417ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.4365ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.022833ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.478917ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.294709ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (76.016292ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (179.953625ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (43.302375ms)
  ✔ malformed (46.85ms)
✔ lost or malformed responses reject all affected pending operations (90.592916ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (60.582ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1163.525875ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (9.348334ms)
✔ heading parser retains the exact pending, done and error statuses (0.972125ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.265042ms)
✔ human report aligns census columns after long identifiers (0.684792ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (24.566042ms)
✔ campaign graph exposes detailed planning review without an execution lease (21.398875ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (302.142ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (156.467625ms)
✔ campaign report and graph accept an initial planning-only sprint (130.585667ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (102.531166ms)
✔ lists plan sources without parsing and exposes canonical source parsing (15.707666ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (15.532916ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (28.191ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (94.104042ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (491.428625ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (172.196833ms)
✔ omitted report input requires exactly one campaign containing active plans (103.234875ms)
✔ bare plan names fail explicitly when missing or ambiguous (30.860334ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (82.398083ms)
✔ selected campaign validates direct dependency membership and cycles (30.01ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (32.179542ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (83.732958ms)
✔ V1 report reader rejects unknown output fields (79.002625ms)
✔ production module uses exact exit and stream contracts without mutation (644.764333ms)
✔ ponytail dispatches campaign reporting through the production module (2654.189166ms)
ℹ tests 60
ℹ suites 0
ℹ pass 60
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10687.564333
```

Command: node --test tests/openclaw-skills.test.js

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.883583ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.211875ms)
✔ api-service-boundaries: description is one line under 160 chars (0.055541ms)
✔ api-service-boundaries: referenced resources are packaged (0.161042ms)
✔ architecture: committed OpenClaw skill matches the generator (0.463333ms)
✔ architecture: body contains the canonical skills/architecture body (0.107042ms)
✔ architecture: description is one line under 160 chars (0.039584ms)
✔ architecture: referenced resources are packaged (0.102208ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.444917ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.163458ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.043375ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.078833ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.41375ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.109291ms)
✔ build-impact: description is one line under 160 chars (0.033792ms)
✔ build-impact: referenced resources are packaged (0.10675ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.382084ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.086875ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.022375ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.051791ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.352708ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.08025ms)
✔ codex-execpolicy: description is one line under 160 chars (0.021459ms)
✔ codex-execpolicy: referenced resources are packaged (0.04825ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.672209ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.147042ms)
✔ cross-session-effects: description is one line under 160 chars (0.041ms)
✔ cross-session-effects: referenced resources are packaged (0.101458ms)
✔ debugging: committed OpenClaw skill matches the generator (0.554375ms)
✔ debugging: body contains the canonical skills/debugging body (0.124ms)
✔ debugging: description is one line under 160 chars (0.024666ms)
✔ debugging: referenced resources are packaged (0.112375ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.447834ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.104625ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.024958ms)
✔ diagnostic-assertions: referenced resources are packaged (0.063209ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.393625ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.092875ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.021458ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.056708ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.313375ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.475542ms)
✔ issue-tracking: description is one line under 160 chars (0.019333ms)
✔ issue-tracking: referenced resources are packaged (0.083959ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.454833ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.10125ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.018959ms)
✔ lossless-json-contracts: referenced resources are packaged (0.0575ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.369125ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.081042ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.0165ms)
✔ monetary-contract-safety: referenced resources are packaged (0.051417ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.862542ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.257833ms)
✔ plan-execution: description is one line under 160 chars (0.020583ms)
✔ plan-execution: referenced resources are packaged (0.275625ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (1.215083ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.243125ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.024334ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.180333ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.33225ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.131083ms)
✔ ponytail: description is one line under 160 chars (0.018708ms)
✔ ponytail: referenced resources are packaged (0.099708ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.442375ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.0975ms)
✔ ponytail-audit: description is one line under 160 chars (0.022167ms)
✔ ponytail-audit: referenced resources are packaged (0.056833ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.401542ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.099125ms)
✔ ponytail-debt: description is one line under 160 chars (0.019584ms)
✔ ponytail-debt: referenced resources are packaged (0.047083ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.374208ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.075625ms)
✔ ponytail-review: description is one line under 160 chars (0.281375ms)
✔ ponytail-review: referenced resources are packaged (0.05075ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.452417ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.103459ms)
✔ project-structure: description is one line under 160 chars (0.015ms)
✔ project-structure: referenced resources are packaged (0.078209ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.369667ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.087084ms)
✔ production-test-boundaries: description is one line under 160 chars (0.014875ms)
✔ production-test-boundaries: referenced resources are packaged (0.061125ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.435208ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.102959ms)
✔ react-error-containment: description is one line under 160 chars (0.018958ms)
✔ react-error-containment: referenced resources are packaged (0.052542ms)
✔ requirements: committed OpenClaw skill matches the generator (0.357ms)
✔ requirements: body contains the canonical skills/requirements body (0.121375ms)
✔ requirements: description is one line under 160 chars (0.015334ms)
✔ requirements: referenced resources are packaged (0.079459ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.311875ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.105625ms)
✔ requirements-traceability: description is one line under 160 chars (0.0155ms)
✔ requirements-traceability: referenced resources are packaged (0.081792ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.466959ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.079166ms)
✔ semantic-rebase: description is one line under 160 chars (0.015875ms)
✔ semantic-rebase: referenced resources are packaged (0.045333ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.364542ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.078625ms)
✔ static-type-safety: description is one line under 160 chars (0.01525ms)
✔ static-type-safety: referenced resources are packaged (0.13625ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.537959ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.119083ms)
✔ test-credentials: description is one line under 160 chars (0.019042ms)
✔ test-credentials: referenced resources are packaged (0.062083ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.355708ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.097292ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.015458ms)
✔ typescript-unit-testing: referenced resources are packaged (0.064166ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.373166ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.105125ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.018875ms)
✔ user-acceptance-testing: referenced resources are packaged (0.061959ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.4125ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.074458ms)
✔ ux-testing: description is one line under 160 chars (0.015583ms)
✔ ux-testing: referenced resources are packaged (0.045ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.384917ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.073916ms)
✔ variant-neutrality: description is one line under 160 chars (0.016875ms)
✔ variant-neutrality: referenced resources are packaged (0.061083ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.507875ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.124334ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.015334ms)
✔ versioned-data-contracts: referenced resources are packaged (0.117041ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.42475ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.091541ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.02375ms)
✔ worktree-lifecycle: referenced resources are packaged (0.051792ms)
✔ generated resources omit canonical relationship annotations (1.43425ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 92.546666
```

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

```text
✔ retains strict physical V1 parsing and scalar selection (43.015667ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (6.366167ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (8.707291ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (6.107833ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (7.520334ms)
✔ selects the highest-ranked V2 tasklet (12.989083ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (14.392333ms)
✔ blocks tasklets until dependency-feature validation is complete (4.2265ms)
✔ uses prior affinity and graph criteria deterministically (1.72ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (39.283125ms)
✔ V3 returns one complete ordered batch (1.486458ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.612334ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (9.121417ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.401542ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.405375ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.86775ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (21.793167ms)
✔ campaign graph exposes detailed planning review without an execution lease (19.291917ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (234.050834ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (150.871833ms)
✔ campaign report and graph accept an initial planning-only sprint (128.010917ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (95.846667ms)
✔ lists plan sources without parsing and exposes canonical source parsing (15.360667ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (15.99875ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (16.234583ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (89.573416ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (527.847625ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (201.714459ms)
✔ omitted report input requires exactly one campaign containing active plans (115.920292ms)
✔ bare plan names fail explicitly when missing or ambiguous (32.966458ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (71.531084ms)
✔ selected campaign validates direct dependency membership and cycles (35.880208ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (32.49425ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (114.467833ms)
✔ V1 report reader rejects unknown output fields (81.493083ms)
✔ production module uses exact exit and stream contracts without mutation (731.722708ms)
✔ ponytail dispatches campaign reporting through the production module (2325.723375ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5124.592417
```

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (133.818375ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (101.456625ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (88.20525ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (214.463667ms)
✔ retains strict physical V1 parsing and scalar selection (46.950541ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (6.6225ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (10.054708ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (6.966625ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (8.870333ms)
✔ selects the highest-ranked V2 tasklet (10.33625ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (5.030459ms)
✔ blocks tasklets until dependency-feature validation is complete (8.054958ms)
✔ uses prior affinity and graph criteria deterministically (1.315792ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (43.726541ms)
✔ V3 returns one complete ordered batch (2.0735ms)
✔ V3 bounds a batch while V2 selects one tasklet (4.607708ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (13.133125ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.837875ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (1.99425ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (9.586875ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.278292ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (25.848333ms)
✔ campaign graph exposes detailed planning review without an execution lease (21.992125ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (276.076125ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (151.226583ms)
✔ campaign report and graph accept an initial planning-only sprint (138.113542ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (129.17325ms)
✔ lists plan sources without parsing and exposes canonical source parsing (15.142167ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (20.246667ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (22.486167ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (100.284167ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (519.5105ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (245.241083ms)
✔ omitted report input requires exactly one campaign containing active plans (148.593083ms)
✔ bare plan names fail explicitly when missing or ambiguous (33.026333ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (92.119708ms)
✔ selected campaign validates direct dependency membership and cycles (34.434625ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (34.749542ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (112.799208ms)
✔ V1 report reader rejects unknown output fields (84.432125ms)
✔ production module uses exact exit and stream contracts without mutation (688.418292ms)
✔ ponytail dispatches campaign reporting through the production module (2156.439916ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (128.040625ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1452.683291ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (295.541875ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (323.020667ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (118.131375ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.343958ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (273.718541ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.07675ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (264.019333ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5119.894375
```

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (152.56325ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (103.25775ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (116.12125ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (241.25875ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.155875ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.025667ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (16.226125ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (5.683792ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (8.828542ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (10.396292ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.264667ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.7395ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (5.423ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (4.912958ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (2.728375ms)
✔ stale proof forces honest disturbance before new productive acceptance (4.409292ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (3.828ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (269.396417ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.188041ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (32.22725ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.351417ms)
✔ reader cannot hide declared membership from the accepted current observation (3.01675ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (150.743416ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1458.0125ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (269.644916ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (307.419417ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (117.5055ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.31425ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (297.99275ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.272125ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (227.302ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2899.253166
```

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 981 files: no violations found.
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (2839.887875ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (2786.718292ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (2892.203041ms)
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (35769.868417ms)
ℹ {"timestamp":"2026-10-11T12:42:08.156250Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:08.156308Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:08.422902Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:08.422934Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native review=f82e4058-b250-4439-a87e-01553a6edc65; thread=01a12afc-1d78-75b0-9192-cef9c4d2fb39; session=01a12afc-1d78-75b0-9192-cef9c4d2fb39; candidate=bbe5e0a4d0b31a5770b245368eda90fa57e7ccae; terminal=completed; final={"schemaVersion":1,"reviewId":"f82e4058-b250-4439-a87e-01553a6edc65","revision":"bbe5e0a4d0b31a5770b245368eda90fa57e7ccae","reviewerSessionId":"01a12afc-1d78-75b0-9192-cef9c4d2fb39","completedAt":"2026-10-11T05:42:35.345-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2; restore the initializer to exactly 1. The retained node --check proof verifies syntax only and cannot establish this acceptance condition; retain evidence inspecting the corrected candidate's exported value."]}
ℹ native review=f82e4058-b250-4439-a87e-01553a6edc65; thread=01a12afc-1d78-75b0-9192-cef9c4d2fb39; session=01a12afc-1d78-75b0-9192-cef9c4d2fb39; candidate=bbe5e0a4d0b31a5770b245368eda90fa57e7ccae; decision=rejected; findings=["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2; restore the initializer to exactly 1. The retained node --check proof verifies syntax only and cannot establish this acceptance condition; retain evidence inspecting the corrected candidate's exported value."]; recovered after App Server restart
✔ native App Server starts and resumes the same session in the designated existing checkout (18807.085334ms)
ℹ {"timestamp":"2026-10-11T12:42:41.794408Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T12:42:41.794461Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:42.076999Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T12:42:42.077020Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12afc-a0ec-7212-9c07-8836f2eacd3d; session=01a12afc-a0ec-7212-9c07-8836f2eacd3d; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-oTuRlN; resumed after App Server restart; model=gpt-6.1-sol
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 63167.049542
```
