# Exact candidate adversarial review acceptance

Clean revision 6a182a22f889ce0fddb8311ad328f9bb697fb385. OBL-50 retains its original condition and criterion. The assigned native reviewer inspected a synthetic candidate that changed value 1 to 2, identified both the obligation violation and inadequate syntax-only proof, and returned a valid V1 rejection. The application recovered that exact decision after App Server restart and persisted the original reviewer, revision and review identities. The assignment returned to REWORK and the rejected obligation remained unresolved. Native sessions were archived and isolated checkouts/database project records cleaned up.

Protocol and PostgreSQL proofs cover accepted/rejected transitions, concurrent immutable requests and outcomes, actor/candidate mismatches, dirty inputs, single dispatch claims, immutable attachments and unknown-dispatch containment. Fresh native threads receive their first turn directly; persisted collection resumes the existing thread. Unsupported physical readers retain their meanings; no checker extension or handwritten JavaScript was introduced.

Five live-suite cases and 69 focused renewal cases pass with no failures, skips or cancellations. Strict build, unchanged TSTS and generated-runtime checks pass. This discharges exact-candidate review only; corrections, reviewer replacement, publication, CLI and overall campaign acceptance remain unresolved.

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

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 981 files: no violations found.
```
