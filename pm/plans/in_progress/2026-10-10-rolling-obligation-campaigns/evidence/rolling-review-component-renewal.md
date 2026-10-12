# Review component and existing assessment renewal

Exact clean revision 52730dbf50fab7e30119fbe58fc8b7e018159f83. Durable requests bind the reviewer to the exact validated candidate. Concurrent requests and accepted or rejected outcomes retain one immutable record, validate actor identity and reject dirty checkouts. Accepted review transitions to INTEGRATING; rejection transitions to REWORK.

This is component proof, not native adversarial dispatch or campaign publication. OBL-50 remains unresolved. CERT-60 renews the same 64 previously established standalone assessments after their shared inputs changed. Historical conditions, baselines, certificates and checkpoints remain unchanged. Six publication/interface structural traceability gaps remain. Final campaign acceptance remains pending. Native start/resume evidence is reused only for unchanged relevant inputs.

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js dist/tests/rolling-review.test.js

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (2385.898542ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (891.074417ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (475.051042ms)
✔ lease use fences graph and generation, operations and exact changed paths (361.421334ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (491.131584ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (360.508ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (353.98125ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (322.951583ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (339.337041ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (299.585375ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (345.692625ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (898.452292ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (493.629625ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (390.129042ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (479.997625ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (357.776666ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (262.498208ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (172.306084ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (312.276458ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (6.786958ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.1015ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (9.6365ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (6.363375ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (6.330083ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (16.920917ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.283208ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (2.427917ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (24.611709ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (7.954042ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (5.315792ms)
✔ stale proof forces honest disturbance before new productive acceptance (9.857666ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.092833ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (707.565875ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.424291ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (35.998458ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (4.623459ms)
✔ reader cannot hide declared membership from the accepted current observation (1.717125ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (4828.175416ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (2620.476542ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (77.091125ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (63.032875ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (2.223334ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.450334ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (2.298084ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (140.639542ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (479.485958ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.916167ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.74425ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.463667ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.290208ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (1.491875ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.404542ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (2.807291ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (2157.514917ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (288.077292ms)
✔ submission rejects merge history and reverted out-of-scope commits (536.13525ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (122.039334ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (330.812125ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1620.359917ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (282.550958ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (351.241792ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (166.663708ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.659667ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (334.249167ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.327291ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (256.998375ms)
ℹ tests 66
ℹ suites 0
ℹ pass 66
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7596.44025
```

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (108.26925ms)
✔ activation write failure restores the directory and every original Markdown byte (62.546917ms)
✔ activation destination and status guards reject before changing source bytes (89.804708ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.872125ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.234083ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (143.694125ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.237084ms)
✔ empty valid inventory presentation retains its summary and final newline (0.087417ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.878791ms)
✔ typed validation selection retains all/json ordering and plan selection (0.11375ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.124042ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.369625ms)
✔ generated portable launch path preserves scalar selection and exact completion output (136.440792ms)
✔ adopted owning plans require their configured obligation document (117.86475ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (5990.100083ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (2722.708334ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (254.726792ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (908.039333ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.342125ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.395667ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (3.410875ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (73.402583ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (170.379ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.204125ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.775125ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.481834ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.281541ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (62.423708ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (175.261042ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (55.537083ms)
  ✔ malformed (49.593667ms)
✔ lost or malformed responses reject all affected pending operations (105.572166ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1619.544542ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.490833ms)
✔ heading parser retains the exact pending, done and error statuses (0.984459ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.297666ms)
✔ human report aligns census columns after long identifiers (0.743291ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (49.478875ms)
✔ campaign graph exposes detailed planning review without an execution lease (34.527375ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (512.349541ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (205.638041ms)
✔ campaign report and graph accept an initial planning-only sprint (203.475959ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (156.106625ms)
✔ lists plan sources without parsing and exposes canonical source parsing (23.857792ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (28.967292ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (20.201208ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (107.115208ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (1161.295292ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (251.762375ms)
✔ omitted report input requires exactly one campaign containing active plans (159.081042ms)
✔ bare plan names fail explicitly when missing or ambiguous (76.691333ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (147.816ms)
✔ selected campaign validates direct dependency membership and cycles (40.305041ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (48.53875ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (162.745917ms)
✔ V1 report reader rejects unknown output fields (110.168791ms)
✔ production module uses exact exit and stream contracts without mutation (871.512ms)
✔ ponytail dispatches campaign reporting through the production module (2212.8085ms)
ℹ tests 58
ℹ suites 0
ℹ pass 58
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8846.035625
```

Command: node --test tests/openclaw-skills.test.js

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (3.293125ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.350709ms)
✔ api-service-boundaries: description is one line under 160 chars (0.075416ms)
✔ api-service-boundaries: referenced resources are packaged (0.185208ms)
✔ architecture: committed OpenClaw skill matches the generator (0.153625ms)
✔ architecture: body contains the canonical skills/architecture body (0.100375ms)
✔ architecture: description is one line under 160 chars (0.040958ms)
✔ architecture: referenced resources are packaged (0.068417ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.147208ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.145292ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.046791ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.072625ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.141625ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.096416ms)
✔ build-impact: description is one line under 160 chars (0.029834ms)
✔ build-impact: referenced resources are packaged (0.095ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.22775ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.155625ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.036167ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.066875ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.113708ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.085542ms)
✔ codex-execpolicy: description is one line under 160 chars (0.026334ms)
✔ codex-execpolicy: referenced resources are packaged (0.053083ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.360667ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.116ms)
✔ cross-session-effects: description is one line under 160 chars (0.038083ms)
✔ cross-session-effects: referenced resources are packaged (0.086083ms)
✔ debugging: committed OpenClaw skill matches the generator (0.134542ms)
✔ debugging: body contains the canonical skills/debugging body (0.098583ms)
✔ debugging: description is one line under 160 chars (0.02775ms)
✔ debugging: referenced resources are packaged (0.119125ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.149875ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.114375ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.027875ms)
✔ diagnostic-assertions: referenced resources are packaged (0.065583ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.114166ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.08375ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.022542ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.056584ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.150459ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.646042ms)
✔ issue-tracking: description is one line under 160 chars (0.022292ms)
✔ issue-tracking: referenced resources are packaged (0.08875ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (2.246834ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.15125ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.021958ms)
✔ lossless-json-contracts: referenced resources are packaged (0.164625ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.216292ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.136042ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.0265ms)
✔ monetary-contract-safety: referenced resources are packaged (0.070375ms)
✔ plan-execution: committed OpenClaw skill matches the generator (3.076833ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.31175ms)
✔ plan-execution: description is one line under 160 chars (0.023542ms)
✔ plan-execution: referenced resources are packaged (0.226292ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.441291ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.253375ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.0285ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.182875ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.144916ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.131625ms)
✔ ponytail: description is one line under 160 chars (0.018708ms)
✔ ponytail: referenced resources are packaged (0.202833ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.334ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.096917ms)
✔ ponytail-audit: description is one line under 160 chars (0.018ms)
✔ ponytail-audit: referenced resources are packaged (0.060209ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.115333ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.0655ms)
✔ ponytail-debt: description is one line under 160 chars (0.020667ms)
✔ ponytail-debt: referenced resources are packaged (0.048792ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (2.987458ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.928208ms)
✔ ponytail-review: description is one line under 160 chars (0.0585ms)
✔ ponytail-review: referenced resources are packaged (0.087583ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.142458ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.122042ms)
✔ project-structure: description is one line under 160 chars (0.017458ms)
✔ project-structure: referenced resources are packaged (0.078083ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.111792ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.115417ms)
✔ production-test-boundaries: description is one line under 160 chars (0.016209ms)
✔ production-test-boundaries: referenced resources are packaged (0.406ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.192584ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (1.110458ms)
✔ react-error-containment: description is one line under 160 chars (0.031458ms)
✔ react-error-containment: referenced resources are packaged (3.85825ms)
✔ requirements: committed OpenClaw skill matches the generator (0.181708ms)
✔ requirements: body contains the canonical skills/requirements body (0.130291ms)
✔ requirements: description is one line under 160 chars (0.020875ms)
✔ requirements: referenced resources are packaged (0.080084ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.142334ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.113916ms)
✔ requirements-traceability: description is one line under 160 chars (0.017083ms)
✔ requirements-traceability: referenced resources are packaged (0.087125ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.115208ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.077625ms)
✔ semantic-rebase: description is one line under 160 chars (0.017ms)
✔ semantic-rebase: referenced resources are packaged (0.051709ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.110875ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.0865ms)
✔ static-type-safety: description is one line under 160 chars (0.015667ms)
✔ static-type-safety: referenced resources are packaged (0.054833ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.118333ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.0845ms)
✔ test-credentials: description is one line under 160 chars (0.017541ms)
✔ test-credentials: referenced resources are packaged (0.055084ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.102708ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.07825ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.01725ms)
✔ typescript-unit-testing: referenced resources are packaged (0.056583ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.099333ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.079583ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.017083ms)
✔ user-acceptance-testing: referenced resources are packaged (0.055ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.097292ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.07525ms)
✔ ux-testing: description is one line under 160 chars (0.018125ms)
✔ ux-testing: referenced resources are packaged (0.053875ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.094417ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.071625ms)
✔ variant-neutrality: description is one line under 160 chars (0.017583ms)
✔ variant-neutrality: referenced resources are packaged (0.057916ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.431917ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.108917ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.015ms)
✔ versioned-data-contracts: referenced resources are packaged (0.116042ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.102417ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.073208ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.015292ms)
✔ worktree-lifecycle: referenced resources are packaged (0.055083ms)
✔ generated resources omit canonical relationship annotations (1.097083ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 153.86675
```

Command: node --test dist/tests/tasklet-metadata.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js

```text
✔ retains strict physical V1 parsing and scalar selection (110.252375ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (7.447708ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (17.496625ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (12.156208ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (8.891917ms)
✔ selects the highest-ranked V2 tasklet (9.791792ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (11.182541ms)
✔ blocks tasklets until dependency-feature validation is complete (11.611375ms)
✔ uses prior affinity and graph criteria deterministically (3.927417ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (61.229708ms)
✔ V3 returns one complete ordered batch (2.83575ms)
✔ V3 bounds a batch while V2 selects one tasklet (8.7725ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (20.727875ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.488583ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.421959ms)
✔ file dispatch validates unknown JSON and each supported physical version (7.307625ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (68.998167ms)
✔ campaign graph exposes detailed planning review without an execution lease (29.076084ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (393.154875ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (162.233167ms)
✔ campaign report and graph accept an initial planning-only sprint (142.198583ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (104.373042ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.96025ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (18.290416ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (16.894167ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (92.13125ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (540.236875ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (330.633333ms)
✔ omitted report input requires exactly one campaign containing active plans (326.268708ms)
✔ bare plan names fail explicitly when missing or ambiguous (52.465375ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (88.248542ms)
✔ selected campaign validates direct dependency membership and cycles (50.403042ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (39.209417ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (128.436375ms)
✔ V1 report reader rejects unknown output fields (177.356541ms)
✔ production module uses exact exit and stream contracts without mutation (1433.058875ms)
✔ ponytail dispatches campaign reporting through the production module (2880.857583ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7192.6425
```

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (259.294417ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (140.529584ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (96.371042ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (219.234ms)
✔ retains strict physical V1 parsing and scalar selection (91.67025ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (10.2555ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (15.253542ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (21.229583ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (14.20925ms)
✔ selects the highest-ranked V2 tasklet (13.208917ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (12.431459ms)
✔ blocks tasklets until dependency-feature validation is complete (7.347459ms)
✔ uses prior affinity and graph criteria deterministically (3.252584ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (50.476083ms)
✔ V3 returns one complete ordered batch (4.871ms)
✔ V3 bounds a batch while V2 selects one tasklet (6.542458ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (31.999666ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.8365ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (2.060625ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (10.580041ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.302041ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (58.941292ms)
✔ campaign graph exposes detailed planning review without an execution lease (44.981167ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (362.222542ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (162.242584ms)
✔ campaign report and graph accept an initial planning-only sprint (142.239833ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (104.354292ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.962083ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (18.373875ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (16.814667ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (92.128084ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (537.566ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (334.638584ms)
✔ omitted report input requires exactly one campaign containing active plans (326.002542ms)
✔ bare plan names fail explicitly when missing or ambiguous (65.910959ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (94.98725ms)
✔ selected campaign validates direct dependency membership and cycles (47.264917ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (41.40175ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (124.361542ms)
✔ V1 report reader rejects unknown output fields (173.408792ms)
✔ production module uses exact exit and stream contracts without mutation (1415.26575ms)
✔ ponytail dispatches campaign reporting through the production module (2900.935375ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (237.474542ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1519.439416ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (511.233041ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (361.998333ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (241.941ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.35475ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (355.163625ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.115583ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (810.987583ms)
ℹ tests 51
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7202.2335
```

Command: node --test dist/tests/obligations.test.js tests/obligation-execution.test.js dist/tests/obligation-tasklet-execution.test.js

```text
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (204.711458ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (149.695542ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (94.922208ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (213.877709ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.701333ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.172917ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (16.379958ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (10.065208ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (6.417666ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (11.496125ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.279125ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (4.168ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (6.139083ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (5.526667ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (3.110375ms)
✔ stale proof forces honest disturbance before new productive acceptance (5.754709ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.916167ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (323.038958ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.195208ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (25.997709ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.644542ms)
✔ reader cannot hide declared membership from the accepted current observation (2.887542ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (229.213083ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1510.099166ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (517.562125ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (381.333292ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (215.069083ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.35275ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (365.071334ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (4.747042ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (841.906417ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4185.535667
```

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 979 files: no violations found.
(node:69272) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/alex/git/ctosclub/ponytail/tmp/binding-selectors/native-reuse.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/alex/git/ctosclub/ponytail/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted (os error 1)
Native proof reused: all six runtime/fixture/dependency inputs unchanged from CERT-15; installed codex-cli 0.159.2. Original finalized one-test native start/resume and cleanup evidence is tmp/binding-selectors/lease-native.txt.
```
