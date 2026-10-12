# Frozen portable execution lease component

Starting revision a872e7f, dirty approved BASELINE-11 source and management inputs.

OBL-109 establishes one independently testable portable lease contract. Its
exact V1 reader and lossless textual parser retain scope, accepted baseline,
graph identity, generation, assessor and authority, and the complete effective
binding. Version number spellings other than the exact integer are rejected.
Issuance derives the current binding from accepted coordinator history and
rejects foreign authority, unaccepted proposed authority and out-of-baseline IDs.
Returned snapshots retain earlier revision, prerequisites, target, proof
selection and permissions across subsequent amendments.

Operation enforcement uses the trusted frozen lease with exact generation and
graph identity; unsupported operations, edits without a named changed path,
path traversal, duplicate changed paths, sibling-prefix escapes and changes
outside its permitted file/directory scopes are rejected. The caller must load
the authoritative persisted lease; accepting worker-supplied permissions is
not authorized by this component. No source conditions or historical obligation
records are rewritten. The canonical path validator is shared with the original
obligation reader. No independent path grammar or host plugin was introduced.

Database allocation, worker delivery and candidate acceptance do not yet consume
this lease contract. This proof does not authorize amended live worker edits;
those integrations remain necessary before the started fixture migrations can
receive widened execution bindings.

## Focused verification

Command: node --test dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js tests/obligations.test.js tests/obligation-execution.test.js

Exit 0: 40 passes, zero failures/skips/cancellations; four new lease cases, six
existing binding component cases, shared Git/CLI selector workflow and historical
V1/legacy execution compatibility. Historical JavaScript proof supplies backward
compatibility; its own migration obligations remain unresolved.

```text
✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (1066.343375ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (67.181625ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (63.054042ms)
✔ lease use fences graph and generation, operations and exact changed paths (42.604542ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (38.562083ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (41.631208ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (40.515708ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (44.548666ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (35.914167ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (38.711166ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (43.231791ms)
✔ adopted plan binds explicit scope and selects only subordinate tasklets within its paths (103.357458ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (95.67825ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1347.289459ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (248.368042ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (243.990333ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (100.771959ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.31725ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (224.025833ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (2.85025ms)
✔ canonical tasklet CLI honors adopted metadata and DONE edits leave acceptance unresolved (184.184625ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (223.144083ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (77.555833ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles (2.86ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (1.720167ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (5.057958ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (4.087667ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (3.694ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.1605ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.293167ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (5.744833ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (3.718208ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (2.7265ms)
✔ stale proof forces honest disturbance before new productive acceptance (4.137ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.813375ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (151.322458ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.415125ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (26.700542ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.592583ms)
✔ reader cannot hide declared membership from the accepted current observation (1.919541ms)
ℹ tests 40
ℹ suites 0
ℹ pass 40
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2913.224834
```

Generated resource proof: node --test tests/openclaw-skills.test.js; exit 0.

```text
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.670584ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.3015ms)
✔ api-service-boundaries: description is one line under 160 chars (0.058292ms)
✔ api-service-boundaries: referenced resources are packaged (0.139792ms)
✔ architecture: committed OpenClaw skill matches the generator (0.133125ms)
✔ architecture: body contains the canonical skills/architecture body (0.089541ms)
✔ architecture: description is one line under 160 chars (0.038667ms)
✔ architecture: referenced resources are packaged (0.066459ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.128375ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.128375ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.044167ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.06625ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.124583ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.110334ms)
✔ build-impact: description is one line under 160 chars (0.037625ms)
✔ build-impact: referenced resources are packaged (0.089041ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.101875ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.076666ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.02325ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.050834ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.085417ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.07525ms)
✔ codex-execpolicy: description is one line under 160 chars (0.018125ms)
✔ codex-execpolicy: referenced resources are packaged (0.042625ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.32975ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.097875ms)
✔ cross-session-effects: description is one line under 160 chars (0.036ms)
✔ cross-session-effects: referenced resources are packaged (0.075583ms)
✔ debugging: committed OpenClaw skill matches the generator (0.139041ms)
✔ debugging: body contains the canonical skills/debugging body (0.098541ms)
✔ debugging: description is one line under 160 chars (0.018041ms)
✔ debugging: referenced resources are packaged (0.086959ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.108166ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.062292ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.01675ms)
✔ diagnostic-assertions: referenced resources are packaged (0.047167ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.100167ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.073625ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.018167ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.044459ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.124459ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.593458ms)
✔ issue-tracking: description is one line under 160 chars (0.031417ms)
✔ issue-tracking: referenced resources are packaged (0.165625ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.198084ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.089875ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.02025ms)
✔ lossless-json-contracts: referenced resources are packaged (0.059542ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.099375ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.070375ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.016375ms)
✔ monetary-contract-safety: referenced resources are packaged (0.047333ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.255209ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.22175ms)
✔ plan-execution: description is one line under 160 chars (0.017458ms)
✔ plan-execution: referenced resources are packaged (0.189917ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.2035ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.196833ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.019625ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.154208ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.120709ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.123875ms)
✔ ponytail: description is one line under 160 chars (0.01575ms)
✔ ponytail: referenced resources are packaged (0.101334ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.08175ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.072458ms)
✔ ponytail-audit: description is one line under 160 chars (0.016417ms)
✔ ponytail-audit: referenced resources are packaged (0.041667ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.088125ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.066959ms)
✔ ponytail-debt: description is one line under 160 chars (0.016417ms)
✔ ponytail-debt: referenced resources are packaged (0.03775ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.086166ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.351084ms)
✔ ponytail-review: description is one line under 160 chars (0.015041ms)
✔ ponytail-review: referenced resources are packaged (0.04275ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.110083ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.090709ms)
✔ project-structure: description is one line under 160 chars (0.013917ms)
✔ project-structure: referenced resources are packaged (0.064125ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.087208ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.065666ms)
✔ production-test-boundaries: description is one line under 160 chars (0.013542ms)
✔ production-test-boundaries: referenced resources are packaged (0.044458ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.088209ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.070833ms)
✔ react-error-containment: description is one line under 160 chars (0.013333ms)
✔ react-error-containment: referenced resources are packaged (0.047917ms)
✔ requirements: committed OpenClaw skill matches the generator (0.108ms)
✔ requirements: body contains the canonical skills/requirements body (0.094917ms)
✔ requirements: description is one line under 160 chars (0.013666ms)
✔ requirements: referenced resources are packaged (0.068959ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.111875ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.095084ms)
✔ requirements-traceability: description is one line under 160 chars (0.013083ms)
✔ requirements-traceability: referenced resources are packaged (0.066833ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.097584ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.059625ms)
✔ semantic-rebase: description is one line under 160 chars (0.014917ms)
✔ semantic-rebase: referenced resources are packaged (0.047166ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.082333ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.058208ms)
✔ static-type-safety: description is one line under 160 chars (0.013625ms)
✔ static-type-safety: referenced resources are packaged (0.038958ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.091625ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.071ms)
✔ test-credentials: description is one line under 160 chars (0.013708ms)
✔ test-credentials: referenced resources are packaged (0.048417ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.095291ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.073542ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.013042ms)
✔ typescript-unit-testing: referenced resources are packaged (0.047542ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.084792ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.074541ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.013166ms)
✔ user-acceptance-testing: referenced resources are packaged (0.047291ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.081ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.062417ms)
✔ ux-testing: description is one line under 160 chars (0.013209ms)
✔ ux-testing: referenced resources are packaged (0.039708ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.079167ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.062708ms)
✔ variant-neutrality: description is one line under 160 chars (0.013958ms)
✔ variant-neutrality: referenced resources are packaged (0.266917ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.120458ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.099625ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.013ms)
✔ versioned-data-contracts: referenced resources are packaged (0.098834ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.08525ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.062208ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.013916ms)
✔ worktree-lifecycle: referenced resources are packaged (0.044916ms)
✔ generated resources omit canonical relationship annotations (1.658ms)
ℹ tests 133
ℹ suites 0
ℹ pass 133
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 80.58
```

Strict configured build after final source edits:

```text

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js

```

Unchanged TSTS and complete canonical source coverage:

```text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 899 files: no violations found.
tsconfig.json: 66 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
tsts/tsconfig.json: 17 root files; all required strict flags enabled; allowJs/skipLibCheck/noCheck disabled
83 owned TypeScript files covered (66 Ponytail, 17 existing TSTS); zero root-owned type bypasses; checker source/tests unchanged from campaign start
Fresh npm run build passed on these final source inputs; runtime materialization check passed. Remaining handwritten executable owners and global language/runtime completeness stay unresolved
```

## Existing atomic delivery renewal

The same 31 outcomes in CERT-13 and CERT-14 retain their original full
conditions. Their earlier per-outcome observations remain authoritative; the
current input manifests and executions renew evidence affected by the shared
reader and requirement relationship changes. No additional language migration
is inferred.

Command: node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js

Exit 0, 57 passes, zero failures/skips/cancellations on final relevant inputs.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (119.982208ms)
✔ activation write failure restores the directory and every original Markdown byte (55.61425ms)
✔ activation destination and status guards reject before changing source bytes (52.29775ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (1.032083ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.205917ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (141.206667ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.22275ms)
✔ empty valid inventory presentation retains its summary and final newline (0.089667ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (1.462333ms)
✔ typed validation selection retains all/json ordering and plan selection (0.118708ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.136083ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.382958ms)
✔ generated portable launch path preserves scalar selection and exact completion output (118.645208ms)
✔ adopted owning plans require their configured obligation document (93.026458ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (737.387791ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (207.972625ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (273.199333ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.384167ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.41425ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.447834ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (78.778125ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (132.326792ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.815792ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.681833ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.487875ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.298084ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (61.192958ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (165.531833ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (34.073042ms)
  ✔ malformed (37.799125ms)
✔ lost or malformed responses reject all affected pending operations (72.256459ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (978.705708ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.529958ms)
✔ heading parser retains the exact pending, done and error statuses (0.986542ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.269584ms)
✔ human report aligns census columns after long identifiers (0.677042ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (26.691042ms)
✔ campaign graph exposes detailed planning review without an execution lease (16.543167ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (227.084083ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (135.0065ms)
✔ campaign report and graph accept an initial planning-only sprint (126.845416ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (94.364708ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.59275ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.332458ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.219958ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (81.347458ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (421.872042ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (162.393209ms)
✔ omitted report input requires exactly one campaign containing active plans (133.231541ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.911458ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (54.806375ms)
✔ selected campaign validates direct dependency membership and cycles (25.815708ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (25.15475ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (79.609958ms)
✔ V1 report reader rejects unknown output fields (68.145792ms)
✔ production module uses exact exit and stream contracts without mutation (615.404459ms)
✔ ponytail dispatches campaign reporting through the production module (1868.767084ms)
ℹ tests 57
ℹ suites 0
ℹ pass 57
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4507.983875
```

Command: node --test dist/tests/rolling-codex.integration.js; exit 0, actual
same-session start/resume across native server restart and archive cleanup.
Native runtime/protocol/fixture inputs did not change after this execution,
so its evidence is reused across the independent lease-parser refactor.

```text
✔ native App Server starts and resumes the same session in the designated existing checkout (21047.223584ms)
ℹ {"timestamp":"2026-10-11T08:07:02.323196Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T08:07:02.323244Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T08:07:02.593685Z","level":"WARN","fields":{"message":"ignoring interface.icon_small: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
{"timestamp":"2026-10-11T08:07:02.593712Z","level":"WARN","fields":{"message":"ignoring interface.icon_large: icon path with '..' must resolve under plugin assets/"},"target":"codex_skills::interface"}
ℹ {"timestamp":"2026-10-11T08:07:02.966920Z","level":"WARN","fields":{"message":"state db discrepancy during find_thread_path_by_id_str_in_subdir: falling_back"},"target":"codex_rollout::list"}
ℹ native thread=01a12a00-418e-7d83-8b8d-21345341d02d; session=01a12a00-418e-7d83-8b8d-21345341d02d; cwd=/private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-native-6eypvv; resumed after App Server restart; model=gpt-6.1-sol
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 21094.154334
```

Runtime materialization, eight rule copies, seven pinned versions and diff checks
pass. Traceability reverse view is synchronized, with the same nine unresolved
review/publication/interface coverage gaps. Full campaign acceptance is open.
No mutable obligation document self-hash is included.
