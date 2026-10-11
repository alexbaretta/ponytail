# Worker attachment and existing assessment renewal

Clean revision 110298719e9390732f1a038ea5bf553f9c96bb95. CERT-63 renews the same 65 previously established standalone assessments after shared worker source, native proof harness and binding inputs changed. It introduces no new obligation discharge. Existing original conditions, baselines, certificates and checkpoints remain unchanged. The native suite reestablishes assigned reviewer rejection and same-session restart recovery alongside real worker allocation and attachment. Publication/interface coverage and final campaign acceptance remain unresolved.

Command: node --test dist/tests/rolling-codex.integration.js

```text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (4406.517958ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3070.894041ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3271.969667ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (844.1455ms)
✔ live adversarial reviewer rejects the exact bad candidate and persists its decision after restart (38722.150209ms)
ℹ {"timestamp":"2026-10-11T13:12:31.880053Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T13:12:31.880098Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T13:12:32.147076Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:12:32.147095Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native review=0a6e3b1b-0b37-4458-9efc-799f2ed6a3b3; thread=01a12b17-f16b-7d53-b1ee-798c425acac7; session=01a12b17-f16b-7d53-b1ee-798c425acac7; candidate=7183c39784e2846eaf0bab9a56d677423786ebf1; terminal=completed; final={"schemaVersion":1,"reviewId":"0a6e3b1b-0b37-4458-9efc-799f2ed6a3b3","revision":"7183c39784e2846eaf0bab9a56d677423786ebf1","reviewerSessionId":"01a12b17-f16b-7d53-b1ee-798c425acac7","completedAt":"2026-10-11T06:13:02-07:00","decision":"rejected","findings":["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. The retained syntax check passes but does not establish the required value. Restore the exported value to exactly 1 and retain focused proof that verifies that condition."]}
ℹ native review=0a6e3b1b-0b37-4458-9efc-799f2ed6a3b3; thread=01a12b17-f16b-7d53-b1ee-798c425acac7; session=01a12b17-f16b-7d53-b1ee-798c425acac7; candidate=7183c39784e2846eaf0bab9a56d677423786ebf1; decision=rejected; findings=["fixture/current.ts:1: The candidate changes the exported value from 1 to 2, violating OBL-2 and ROLL-INVENTORY-T2. The retained syntax check passes but does not establish the required value. Restore the exported value to exactly 1 and retain focused proof that verifies that condition."]; recovered after App Server restart
✔ native App Server starts and resumes the same session in the designated existing checkout (15952.8295ms)
ℹ {"timestamp":"2026-10-11T13:13:08.527566Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:13:08.527609Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T13:13:08.772276Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:13:08.772304Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ native thread=01a12b18-8098-7480-b5bc-cfcb4a829418; session=01a12b18-8098-7480-b5bc-cfcb4a829418; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-oBWf4U; resumed after App Server restart; model=gpt-6.1-sol
✔ live worker provisioning binds the reserved checkout and persists its actual native session after restart (14365.218875ms)
ℹ {"timestamp":"2026-10-11T13:13:25.204688Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T13:13:25.204731Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ worker native thread=01a12b18-c1af-7622-9787-c3f315be468b; session=01a12b18-c1af-7622-9787-c3f315be468b; checkout=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-worker-store-ks8m3x/managed/101; attachment recovered after restart; model=gpt-6.1-sol
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 80855.21975
```

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-worker.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/rolling-review.test.js

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (3886.75775ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (1025.102458ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (681.863833ms)
✔ lease use fences graph and generation, operations and exact changed paths (1653.421458ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (859.886709ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (521.743542ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (370.47875ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (430.160584ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (362.011875ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (370.453ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (477.259416ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (968.536916ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (718.206333ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (1611.425459ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (826.526292ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (194.205875ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (356.686208ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (219.253416ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (434.894208ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (4.096ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (4.102334ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (4.535042ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (4.875459ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (8.037458ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (10.435458ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.287667ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (2.394916ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (5.708209ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (5.1915ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (3.132709ms)
✔ stale proof forces honest disturbance before new productive acceptance (18.545333ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (5.126959ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (585.015416ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.218792ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (48.965167ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (10.430875ms)
✔ reader cannot hide declared membership from the accepted current observation (1.927041ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (7505.7135ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3122.617625ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3225.569625ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (869.690958ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (57.372334ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (35.94925ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.362542ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.407375ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.605ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (108.436792ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (445.760125ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.985458ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (4.189792ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.465291ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.303625ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.257708ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.217792ms)
✔ review completion requires the exact terminal turn and validated final message (0.494458ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.318791ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.102459ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (3076.60325ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (535.83325ms)
✔ submission rejects merge history and reverted out-of-scope commits (732.881375ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (137.747ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.329875ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (443.62175ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (230.114459ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1690.655667ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (661.227375ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (623.924584ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (232.146625ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.578917ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (475.71875ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.925833ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (286.684584ms)
ℹ tests 72
ℹ suites 0
ℹ pass 72
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14848.32475
```

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (395.322458ms)
✔ activation write failure restores the directory and every original Markdown byte (138.107167ms)
✔ activation destination and status guards reject before changing source bytes (219.917292ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (1.448167ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.25675ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (457.8055ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.242708ms)
✔ empty valid inventory presentation retains its summary and final newline (0.089958ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (2.287208ms)
✔ typed validation selection retains all/json ordering and plan selection (0.145334ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.13875ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.463375ms)
✔ generated portable launch path preserves scalar selection and exact completion output (284.488125ms)
✔ adopted owning plans require their configured obligation document (286.367958ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (5866.454958ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (3114.953042ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (3271.382209ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (817.103792ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (638.2805ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (1795.9455ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.431666ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.431042ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (5.92425ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (259.07125ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (388.127833ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (4.651667ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.900916ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.516958ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.290791ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (274.136083ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (268.694042ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (68.544417ms)
  ✔ malformed (91.602083ms)
✔ lost or malformed responses reject all affected pending operations (160.597542ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (99.521417ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (2592.239125ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (31.430667ms)
✔ heading parser retains the exact pending, done and error statuses (1.028542ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.262ms)
✔ human report aligns census columns after long identifiers (1.316667ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (32.243417ms)
✔ campaign graph exposes detailed planning review without an execution lease (51.262417ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (797.686292ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (410.439792ms)
✔ campaign report and graph accept an initial planning-only sprint (313.678417ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (201.622667ms)
✔ lists plan sources without parsing and exposes canonical source parsing (39.283083ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (27.332541ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (23.742417ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (156.854083ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (626.40625ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (185.278292ms)
✔ omitted report input requires exactly one campaign containing active plans (119.910333ms)
✔ bare plan names fail explicitly when missing or ambiguous (47.98425ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (65.651666ms)
✔ selected campaign validates direct dependency membership and cycles (29.637958ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (31.614208ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (92.101291ms)
✔ V1 report reader rejects unknown output fields (85.135833ms)
✔ production module uses exact exit and stream contracts without mutation (754.614625ms)
✔ ponytail dispatches campaign reporting through the production module (2152.624541ms)
ℹ tests 61
ℹ suites 0
ℹ pass 61
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13313.753791
```

Command: node --test tests/openclaw-skills.test.js

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.401417ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.244459ms)
✔ api-service-boundaries: description is one line under 160 chars (0.057666ms)
✔ api-service-boundaries: referenced resources are packaged (0.152959ms)
✔ architecture: committed OpenClaw skill matches the generator (0.141708ms)
✔ architecture: body contains the canonical skills/architecture body (0.099ms)
✔ architecture: description is one line under 160 chars (0.037375ms)
✔ architecture: referenced resources are packaged (0.089083ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.127416ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.146875ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.050209ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.083584ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.12825ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.108416ms)
✔ build-impact: description is one line under 160 chars (0.029666ms)
✔ build-impact: referenced resources are packaged (0.272208ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.160708ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.091708ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.027125ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.0565ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.096625ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.081292ms)
✔ codex-execpolicy: description is one line under 160 chars (0.029542ms)
✔ codex-execpolicy: referenced resources are packaged (0.052833ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.348542ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.118042ms)
✔ cross-session-effects: description is one line under 160 chars (0.036208ms)
✔ cross-session-effects: referenced resources are packaged (0.089584ms)
✔ debugging: committed OpenClaw skill matches the generator (0.115208ms)
✔ debugging: body contains the canonical skills/debugging body (0.106167ms)
✔ debugging: description is one line under 160 chars (0.025125ms)
✔ debugging: referenced resources are packaged (0.1025ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.09475ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.085416ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.026458ms)
✔ diagnostic-assertions: referenced resources are packaged (0.064459ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.100917ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.096375ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.025958ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.067333ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.13325ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.633292ms)
✔ issue-tracking: description is one line under 160 chars (0.025ms)
✔ issue-tracking: referenced resources are packaged (0.100917ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.106209ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.085667ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.02125ms)
✔ lossless-json-contracts: referenced resources are packaged (0.063917ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.089958ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.077667ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.021291ms)
✔ monetary-contract-safety: referenced resources are packaged (0.073292ms)
✔ plan-execution: committed OpenClaw skill matches the generator (1.57975ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.318834ms)
✔ plan-execution: description is one line under 160 chars (0.024209ms)
✔ plan-execution: referenced resources are packaged (0.221833ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.25025ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.225625ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.0215ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.176166ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.144292ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.122125ms)
✔ ponytail: description is one line under 160 chars (0.017792ms)
✔ ponytail: referenced resources are packaged (0.098959ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.360375ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.1255ms)
✔ ponytail-audit: description is one line under 160 chars (0.024959ms)
✔ ponytail-audit: referenced resources are packaged (0.063417ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.118458ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.079959ms)
✔ ponytail-debt: description is one line under 160 chars (0.020459ms)
✔ ponytail-debt: referenced resources are packaged (0.048166ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.35475ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.109292ms)
✔ ponytail-review: description is one line under 160 chars (0.028041ms)
✔ ponytail-review: referenced resources are packaged (0.058166ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.153584ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.11125ms)
✔ project-structure: description is one line under 160 chars (0.016875ms)
✔ project-structure: referenced resources are packaged (0.077083ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.11675ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.076208ms)
✔ production-test-boundaries: description is one line under 160 chars (0.017ms)
✔ production-test-boundaries: referenced resources are packaged (0.050917ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.105833ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.086792ms)
✔ react-error-containment: description is one line under 160 chars (0.01575ms)
✔ react-error-containment: referenced resources are packaged (0.057375ms)
✔ requirements: committed OpenClaw skill matches the generator (0.1245ms)
✔ requirements: body contains the canonical skills/requirements body (0.105791ms)
✔ requirements: description is one line under 160 chars (0.030292ms)
✔ requirements: referenced resources are packaged (0.080875ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.235333ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.13825ms)
✔ requirements-traceability: description is one line under 160 chars (0.020167ms)
✔ requirements-traceability: referenced resources are packaged (0.088ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (1.038542ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.460792ms)
✔ semantic-rebase: description is one line under 160 chars (0.070042ms)
✔ semantic-rebase: referenced resources are packaged (0.128333ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.202666ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.092416ms)
✔ static-type-safety: description is one line under 160 chars (0.019ms)
✔ static-type-safety: referenced resources are packaged (0.050625ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.116542ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.087833ms)
✔ test-credentials: description is one line under 160 chars (0.018583ms)
✔ test-credentials: referenced resources are packaged (0.059125ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.116375ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.104375ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.017958ms)
✔ typescript-unit-testing: referenced resources are packaged (0.067583ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.110834ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.082334ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.017ms)
✔ user-acceptance-testing: referenced resources are packaged (0.061583ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.11175ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.074708ms)
✔ ux-testing: description is one line under 160 chars (0.017459ms)
✔ ux-testing: referenced resources are packaged (0.048583ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.098958ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.081125ms)
✔ variant-neutrality: description is one line under 160 chars (0.016584ms)
✔ variant-neutrality: referenced resources are packaged (0.068041ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.423792ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.112708ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.014708ms)
✔ versioned-data-contracts: referenced resources are packaged (0.118791ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.099958ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (2.925625ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.026208ms)
✔ worktree-lifecycle: referenced resources are packaged (0.066917ms)
✔ generated resources omit canonical relationship annotations (0.966416ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 118.509709
```

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

```text
✔ retains strict physical V1 parsing and scalar selection (68.641583ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (6.273875ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (7.710083ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (6.77525ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (10.128542ms)
✔ selects the highest-ranked V2 tasklet (15.630208ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (6.65ms)
✔ blocks tasklets until dependency-feature validation is complete (7.430791ms)
✔ uses prior affinity and graph criteria deterministically (1.122667ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (55.622958ms)
✔ V3 returns one complete ordered batch (1.342834ms)
✔ V3 bounds a batch while V2 selects one tasklet (4.893833ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (9.200958ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.455416ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.411292ms)
✔ file dispatch validates unknown JSON and each supported physical version (3.728708ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (53.525209ms)
✔ campaign graph exposes detailed planning review without an execution lease (35.9125ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (335.48575ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (176.200417ms)
✔ campaign report and graph accept an initial planning-only sprint (141.269875ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (102.168ms)
✔ lists plan sources without parsing and exposes canonical source parsing (15.947708ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (17.509542ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (16.001542ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (92.722042ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (529.691458ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (646.088ms)
✔ omitted report input requires exactly one campaign containing active plans (271.416584ms)
✔ bare plan names fail explicitly when missing or ambiguous (65.598667ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (150.346792ms)
✔ selected campaign validates direct dependency membership and cycles (63.2025ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (57.315333ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (140.408833ms)
✔ V1 report reader rejects unknown output fields (125.266458ms)
✔ production module uses exact exit and stream contracts without mutation (2100.683709ms)
✔ ponytail dispatches campaign reporting through the production module (2816.288166ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8046.267041
```

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (205.525459ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (118.368209ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (102.833458ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (209.729042ms)
✔ retains strict physical V1 parsing and scalar selection (86.071084ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (9.083708ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (15.381ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (10.009833ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (13.57575ms)
✔ selects the highest-ranked V2 tasklet (10.110792ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.725291ms)
✔ blocks tasklets until dependency-feature validation is complete (2.634125ms)
✔ uses prior affinity and graph criteria deterministically (1.198667ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (50.693958ms)
✔ V3 returns one complete ordered batch (3.348834ms)
✔ V3 bounds a batch while V2 selects one tasklet (5.362583ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (13.363875ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.863875ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (1.947417ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (11.183417ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.32625ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (51.041ms)
✔ campaign graph exposes detailed planning review without an execution lease (35.639333ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (324.4865ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (174.55275ms)
✔ campaign report and graph accept an initial planning-only sprint (141.26975ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (102.157792ms)
✔ lists plan sources without parsing and exposes canonical source parsing (16.027583ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (17.438958ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.988792ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (93.452167ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (517.646333ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (619.53925ms)
✔ omitted report input requires exactly one campaign containing active plans (282.014583ms)
✔ bare plan names fail explicitly when missing or ambiguous (89.803084ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (168.080583ms)
✔ selected campaign validates direct dependency membership and cycles (67.133333ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (45.782333ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (191.985583ms)
✔ V1 report reader rejects unknown output fields (135.807375ms)
✔ production module uses exact exit and stream contracts without mutation (2127.516292ms)
✔ ponytail dispatches campaign reporting through the production module (2835.144208ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (193.866458ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1544.505416ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (660.284166ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (495.955834ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (200.883042ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (4.125167ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (1167.125125ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (5.445334ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (760.688125ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8157.275083
```

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (180.950125ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (132.742208ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (98.409791ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (219.950208ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (7.736958ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.57375ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (4.66275ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (4.260833ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (10.910708ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (15.213625ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.344375ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (2.786583ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (6.501958ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (17.887ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (4.224083ms)
✔ stale proof forces honest disturbance before new productive acceptance (6.081458ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (4.659625ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (263.14625ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.179125ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (26.018666ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.295125ms)
✔ reader cannot hide declared membership from the accepted current observation (1.7725ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (201.75175ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1515.765041ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (664.172542ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (558.369167ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (219.639958ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.34275ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (1155.544625ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (5.061166ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (675.483209ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5127.764834
```

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 990 files: no violations found.
```
