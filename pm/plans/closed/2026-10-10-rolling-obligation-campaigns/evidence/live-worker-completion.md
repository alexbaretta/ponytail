# Actual native worker attachment acceptance

Clean revision 110298719e9390732f1a038ea5bf553f9c96bb95. OBL-44 retains its original condition and full application provisioning criterion. The application allocated checkout 101 from the project pool, fenced its creation intent, provisioned the real Git checkout through project setup, started the installed native Codex thread there, and retained the actual returned thread and session identities before the first turn. That worker wrote session_id.txt. Completed native initialization and matching regular, ignored, untracked marker allowed atomic action completion and session attachment.

After App Server restart the application resumed the original native thread and verified the same checkout, session identity, completed initialization turn and database attachment. Duplicate creation claims and altered receipts are rejected. The checkout is clean. The native session was archived before removal of isolated fixture checkout/database records. Unknown native creation remains fenced; broader recovery remains a separate unfinished obligation.

Seven native-suite cases and 72 focused cases pass with no failures, cancellations or skips. Strict build, unchanged TSTS, generated runtime and structural/metadata checks pass. No plugin or handwritten JavaScript is needed for this worker operation. Worker obligation instructions, suspension/resumption, recovery, publication, CLI and final campaign acceptance remain pending.

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

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 990 files: no violations found.
```
