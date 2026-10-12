# Bound certificate acceptance

Starting revision f4f95d6; registered OBL-112 and BASELINE-14.

The independently versioned binding artifact ties each amended certificate to
the actual retained submission lease, candidate revision and proof references.
The portable acceptance boundary validates accepted baseline and authority,
current effective binding and prerequisites, exact operation permissions,
complete finalized passing evidence and fresh artifact/input hashes. It then
delegates to the unchanged historical V1 acceptance boundary. No original
condition, execution adequacy requirement or accepted prefix is weakened.

Typed rejection tests cover forged identities, stale authority and bindings,
unmet dependencies, malformed physical records, altered revisions, missing or
unmapped proof, unauthorized operations and stale artifacts. The real PostgreSQL
and Git Arc reads the retained submission, reconciles the coordinator checkout,
accepts its exact proof, retains REVIEW ownership, and rejects changed inputs.
External worker acknowledgments are synthetic fixture inputs; the actual Node
syntax check proves metadata validation, not host-product QA. This component
does not establish adversarial review, full semantic rebase, production branch
publication or live CLI/MCP orchestration.

## Focused proof

Command: node --test dist/tests/obligation-certificate-bindings.test.js dist/tests/rolling-worker-submission.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js tests/obligations.test.js tests/obligation-execution.test.js

Exit 0; 60 passes, zero failures/skips/cancellations.

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (1381.847917ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (317.375375ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (145.09075ms)
✔ lease use fences graph and generation, operations and exact changed paths (102.44525ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (115.991333ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (111.7645ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (103.93125ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (114.030708ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (104.878792ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (108.487375ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (109.526875ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (332.908292ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (146.661959ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (111.013917ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (126.384791ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (2798.774917ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (76.982167ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (59.634084ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.3665ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.422375ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (2.573292ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (142.431ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (188.415125ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (1.846292ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (3.601416ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.466708ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.260875ms)
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (1283.0855ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (197.142ms)
✔ submission rejects merge history and reverted out-of-scope commits (342.513917ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (88.08525ms)
✔ adopted plan binds explicit scope and selects only subordinate tasklets within its paths (216.652084ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (127.334542ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1516.755458ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (234.691ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (232.807333ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (108.749792ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.2975ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (267.5955ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.414541ms)
✔ canonical tasklet CLI honors adopted metadata and DONE edits leave acceptance unresolved (203.751917ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (220.140083ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (78.400125ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles (4.370542ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.01575ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (10.515958ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (10.129459ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (9.377291ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.186458ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (3.87825ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (16.743792ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (16.156ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (11.123916ms)
✔ stale proof forces honest disturbance before new productive acceptance (11.104292ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (3.850917ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (253.012583ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.429917ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (44.468792ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (3.195416ms)
✔ reader cannot hide declared membership from the accepted current observation (2.058541ms)
ℹ tests 60
ℹ suites 0
ℹ pass 60
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3296.66925
```

## Renewal of the same 34 prior atomic outcomes

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

Exit 0; 57 passes, zero failures/skips/cancellations.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (93.050417ms)
✔ activation write failure restores the directory and every original Markdown byte (57.139458ms)
✔ activation destination and status guards reject before changing source bytes (60.515125ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.828209ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.198666ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (125.995875ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.235541ms)
✔ empty valid inventory presentation retains its summary and final newline (0.098875ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.874167ms)
✔ typed validation selection retains all/json ordering and plan selection (0.119625ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.125792ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.361875ms)
✔ generated portable launch path preserves scalar selection and exact completion output (122.320209ms)
✔ adopted owning plans require their configured obligation document (96.138833ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (2347.563959ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (203.609709ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (357.084834ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.3225ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.635875ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (4.248ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (44.393084ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (134.078625ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.961709ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.830792ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.675875ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.309042ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (65.608334ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (171.689333ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (35.9985ms)
  ✔ malformed (38.444417ms)
✔ lost or malformed responses reject all affected pending operations (74.816333ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (945.889792ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.587333ms)
✔ heading parser retains the exact pending, done and error statuses (0.905208ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.266292ms)
✔ human report aligns census columns after long identifiers (0.695208ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (27.7835ms)
✔ campaign graph exposes detailed planning review without an execution lease (15.875708ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (226.957583ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (137.281083ms)
✔ campaign report and graph accept an initial planning-only sprint (121.012041ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (87.889667ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.816584ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.097583ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.32025ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (82.177709ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (420.858292ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (150.640042ms)
✔ omitted report input requires exactly one campaign containing active plans (92.026583ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.618667ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (54.935417ms)
✔ selected campaign validates direct dependency membership and cycles (25.896792ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (26.502833ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (78.928375ms)
✔ V1 report reader rejects unknown output fields (73.2855ms)
✔ production module uses exact exit and stream contracts without mutation (602.624208ms)
✔ ponytail dispatches campaign reporting through the production module (2022.541125ms)
ℹ tests 57
ℹ suites 0
ℹ pass 57
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4571.75725
```

## Generated resources and static proof

Command: node --test tests/openclaw-skills.test.js

Exit 0; 133 passes, zero failures/skips/cancellations.

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.527291ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.237583ms)
✔ api-service-boundaries: description is one line under 160 chars (0.0555ms)
✔ api-service-boundaries: referenced resources are packaged (0.145666ms)
✔ architecture: committed OpenClaw skill matches the generator (0.13225ms)
✔ architecture: body contains the canonical skills/architecture body (0.093ms)
✔ architecture: description is one line under 160 chars (0.040625ms)
✔ architecture: referenced resources are packaged (0.070834ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.129333ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.144709ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.049208ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.072875ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.135ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.109792ms)
✔ build-impact: description is one line under 160 chars (0.041584ms)
✔ build-impact: referenced resources are packaged (0.105875ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.095084ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.086167ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.023334ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.060875ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.094458ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.07425ms)
✔ codex-execpolicy: description is one line under 160 chars (0.024541ms)
✔ codex-execpolicy: referenced resources are packaged (0.04925ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.361333ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.120125ms)
✔ cross-session-effects: description is one line under 160 chars (0.037875ms)
✔ cross-session-effects: referenced resources are packaged (0.090916ms)
✔ debugging: committed OpenClaw skill matches the generator (0.133625ms)
✔ debugging: body contains the canonical skills/debugging body (0.096667ms)
✔ debugging: description is one line under 160 chars (0.018666ms)
✔ debugging: referenced resources are packaged (0.093458ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.085708ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.066709ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.02275ms)
✔ diagnostic-assertions: referenced resources are packaged (0.050833ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.09425ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.080666ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.021417ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.049542ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.109375ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.101333ms)
✔ issue-tracking: description is one line under 160 chars (0.345875ms)
✔ issue-tracking: referenced resources are packaged (0.077708ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.08725ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.073125ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.0155ms)
✔ lossless-json-contracts: referenced resources are packaged (0.044ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.089916ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.064ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.015167ms)
✔ monetary-contract-safety: referenced resources are packaged (0.042542ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.240083ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.222ms)
✔ plan-execution: description is one line under 160 chars (0.02025ms)
✔ plan-execution: referenced resources are packaged (0.198792ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.19825ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.208625ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.016209ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.169666ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.118042ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.12225ms)
✔ ponytail: description is one line under 160 chars (0.023ms)
✔ ponytail: referenced resources are packaged (0.106ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.091042ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.080625ms)
✔ ponytail-audit: description is one line under 160 chars (0.018083ms)
✔ ponytail-audit: referenced resources are packaged (0.045167ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.107625ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.071459ms)
✔ ponytail-debt: description is one line under 160 chars (0.018459ms)
✔ ponytail-debt: referenced resources are packaged (0.041416ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.094875ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.075542ms)
✔ ponytail-review: description is one line under 160 chars (0.017083ms)
✔ ponytail-review: referenced resources are packaged (0.396209ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.142ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.099834ms)
✔ project-structure: description is one line under 160 chars (0.014458ms)
✔ project-structure: referenced resources are packaged (0.067209ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.095625ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.079458ms)
✔ production-test-boundaries: description is one line under 160 chars (0.014875ms)
✔ production-test-boundaries: referenced resources are packaged (0.047459ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.107916ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.078ms)
✔ react-error-containment: description is one line under 160 chars (0.0155ms)
✔ react-error-containment: referenced resources are packaged (0.054625ms)
✔ requirements: committed OpenClaw skill matches the generator (0.110667ms)
✔ requirements: body contains the canonical skills/requirements body (0.106375ms)
✔ requirements: description is one line under 160 chars (0.021209ms)
✔ requirements: referenced resources are packaged (0.084042ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.134292ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.108666ms)
✔ requirements-traceability: description is one line under 160 chars (0.016083ms)
✔ requirements-traceability: referenced resources are packaged (0.078875ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.072917ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.073875ms)
✔ semantic-rebase: description is one line under 160 chars (0.017459ms)
✔ semantic-rebase: referenced resources are packaged (0.050042ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.088541ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.093833ms)
✔ static-type-safety: description is one line under 160 chars (0.015458ms)
✔ static-type-safety: referenced resources are packaged (0.042625ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.104125ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.077875ms)
✔ test-credentials: description is one line under 160 chars (0.015416ms)
✔ test-credentials: referenced resources are packaged (0.055125ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.103459ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.07825ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.018334ms)
✔ typescript-unit-testing: referenced resources are packaged (0.048792ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.083291ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.074167ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.015458ms)
✔ user-acceptance-testing: referenced resources are packaged (0.059375ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.082541ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.067959ms)
✔ ux-testing: description is one line under 160 chars (0.021334ms)
✔ ux-testing: referenced resources are packaged (0.044042ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.085583ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.068083ms)
✔ variant-neutrality: description is one line under 160 chars (0.014625ms)
✔ variant-neutrality: referenced resources are packaged (0.065583ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.481708ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.11325ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.014917ms)
✔ versioned-data-contracts: referenced resources are packaged (0.125958ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.095333ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.069375ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.0245ms)
✔ worktree-lifecycle: referenced resources are packaged (0.052833ms)
✔ generated resources omit canonical relationship annotations (1.063625ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 83.249125

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 917 files: no violations found.
tsconfig.json: 70 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
tsts/tsconfig.json: 17 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
87 owned TypeScript files covered (70 Ponytail, 17 existing TSTS); zero root-owned type bypasses; checker source/tests unchanged from campaign start
Fresh npm run build passed on these final source inputs; runtime materialization check passed. Remaining handwritten executable owners and global language/runtime completeness stay unresolved
```

Actual native start/resume/archive proof remains reusable because all six
relevant inputs are unchanged; no redundant native worker was started.

```text
Native proof reused: all six runtime/fixture/dependency inputs unchanged from CERT-15; installed codex-cli 0.159.2. Original finalized one-test native start/resume and cleanup evidence is tmp/binding-selectors/lease-native.txt.
```

Runtime materialization, eight client rule copies and seven pinned versions
pass. Affected graph traceability and generated mappings are synchronized.
Global traceability retains exactly nine review/publication/interface gaps;
no global pass or whole-campaign acceptance is claimed.
