# Interface batch: OBL-66

Source revision: 67aef1f5daf057608e905cad82cb04e0e5a972fa. Baseline: BASELINE-16. Binding: BIND-114.

Condition: Expose chapter/command usage with argument, precondition, mutation and result descriptions from one registry.

Criterion: CLI help contract proof demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

One typed command registry owns campaign command names, argument kinds, requiredness, preconditions, mutations and result descriptions. The shipped CLI exposes every registered command contract, and installed root help lists the new chapter. Unknown, duplicate and missing options fail before project state is opened.

Seventeen focused component tests, two real PostgreSQL/CLI/MCP scenarios and five installed/historical CLI checks pass with no failures, skips or cancellations. Full clean-tree npm acceptance passes all 881 Node tests across its five reported families and the configured installer/structural checks. TSTS, traceability, runtime synchronization, rules, versions, manifests, adapters and registry pass. Strict root compilation is reused after its final relevant input edit. The four reopened delivery assessments are renewed here. The direct CLI now preserves quiet exit 130 when a pending connection fails after Ctrl-C; the regression failed with exit 1 before the one-line repair and passes afterward. Final whole-campaign freshness renewal and rollup acceptance remain separate; no historical assessment is silently renewed. Historical assessments are retained without a freshness-renewal claim.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configured connection.

## node --test dist/tests/rolling-cli-registry.test.js dist/tests/rolling-operations.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-cli.integration.test.js

2026-10-12T04:20:47.696Z – 2026-10-12T04:20:49.615Z

~~~text
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.45725ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.947917ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (0.77025ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (62.570083ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (119.509708ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.520833ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.666917ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.455541ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.279041ms)
✔ V2 cleanup declaration preserves V1 physical meanings and normalizes unknown retirement safely (0.378625ms)
✔ every registered command exposes its complete contract through the shipped CLI (1594.921417ms)
✔ retired campaign commands and malformed options fail before opening project state (240.097459ms)
✔ direct campaign CLI preserves quiet exit 130 when cancellation precedes a connection error (116.795083ms)
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (13.308916ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.256625ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.130792ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.125875ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1882.254417

~~~

## node --test dist/tests/rolling-operations.integration.test.js

2026-10-12T04:20:49.634Z – 2026-10-12T04:20:55.055Z

~~~text
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (3426.396708ms)
✔ closure requires fresh evidence, persists an immutable receipt and fences later mutations (1713.898458ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5381.734083

~~~

## node --test --test-name-pattern=ponytail dispatches campaign reporting|ponytail help publishes|QA omits campaign census|project index contract|CLI installer links tests/campaign-census.test.js tests/cli-tools.test.js tests/ponytail-cli.test.js

2026-10-12T04:20:55.083Z – 2026-10-12T04:20:58.045Z

~~~text
✔ ponytail dispatches campaign reporting through the production module (2813.226125ms)
✔ ponytail help publishes campaign, plan-input, index, and plan command families (402.0135ms)
✔ QA omits campaign census and the CLI dispatches it through campaign (0.346125ms)
✔ project index contract retains a stable relational and search core (1.298625ms)
✔ CLI installer links the checkout and the installed command updates skills (2040.706833ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2916.372417

~~~

## npm run check:traceability

2026-10-12T04:20:58.063Z – 2026-10-12T04:20:58.962Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json

Traceability checked 820 relationships: no violations found.

~~~

## npm run check:tsts

2026-10-12T04:20:58.978Z – 2026-10-12T04:21:01.288Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1245 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T04:21:01.303Z – 2026-10-12T04:21:01.337Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-12T04:21:01.353Z – 2026-10-12T04:21:01.387Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-12T04:21:01.403Z – 2026-10-12T04:21:01.434Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-12T04:21:01.449Z – 2026-10-12T04:21:01.483Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-12T04:21:01.498Z – 2026-10-12T04:21:01.532Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-12T04:21:01.547Z – 2026-10-12T04:21:01.577Z

~~~text
Validated 39 registry entries.

~~~

## npm test

2026-10-12T04:16:05.719224+00:00 – 2026-10-12T04:20:59.787313+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 test
> npm run test:core


> @alexbaretta/ponytail@4.8.4 test:core
> node scripts/registry.js && node scripts/build-registry-data.js && node scripts/build-command-adapters.js && node scripts/build-manifests.js && node scripts/check-rule-copies.js && npm run check:traceability && node --test tests/*.test.js && npm run build && npm run test:typed && ./scripts/test-install-to-codex.sh && npm test --prefix pi-extension && npm test --prefix ponytail-mcp && npm run test:tsts && npm run check:tsts

Validated 39 registry entries.
Validated generated/registry.json.
Validated 5 OpenCode commands.
Validated repeated manifest metadata.
8 rule copies match skills/ponytail/SKILL.md.

> @alexbaretta/ponytail@4.8.4 check:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json

Traceability checked 820 relationships: no violations found.
✔ Ponytail forbids meaningless approval requests for agent-caused repairs (0.707125ms)
✔ Ponytail keeps mechanical blockers agent-owned (0.457542ms)
✔ plan execution applies the same guard before returning control (0.397709ms)
✔ license and attribution retain both contributors (0.583292ms)
✔ modified canonical policy and runtime sources carry combined notices (0.354959ms)
✔ configuration requires exact versioned adapter and target ownership (1.133791ms)
✔ durable build-impact contracts have exact reader owners (1.967084ms)
✔ TypeScript adapter reports compiler and configured inputs only (85.497708ms)
✔ V2 glob inputs select non-TypeScript build inputs without selecting tests (42.619167ms)
✔ TypeScript adapter requires a pre-deletion query for unmatched missing paths (74.607167ms)
✔ global inputs affect every configured target (3.484458ms)
✔ build-impact configuration does not affect product build targets implicitly (42.391791ms)
✔ dispatcher composes TypeScript and multiple custom adapters (116.605583ms)
✔ one failed adapter preserves successful target results (71.082042ms)
✔ custom adapters cannot report unowned targets (37.229875ms)
✔ custom adapters cannot expand the intended changed path set (36.026084ms)
✔ CLI handles spaces and emits no compiler input inventory (79.817833ms)
✔ configuration and compiler failures are indeterminate (39.431584ms)
✔ non-compiler paths skip TypeScript resolution (0.556875ms)
✔ changed paths cannot escape the project root (1.820584ms)
✔ human report aligns census columns after long identifiers (0.666458ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (31.344625ms)
✔ campaign graph exposes detailed planning review without an execution lease (26.002125ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (326.610125ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (198.797583ms)
✔ campaign report and graph accept an initial planning-only sprint (161.390791ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (147.913667ms)
✔ lists plan sources without parsing and exposes canonical source parsing (22.318375ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (23.270584ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (20.364125ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (123.879458ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (639.505333ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (201.719708ms)
✔ omitted report input requires exactly one campaign containing active plans (113.641792ms)
✔ bare plan names fail explicitly when missing or ambiguous (32.07425ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (67.631334ms)
✔ selected campaign validates direct dependency membership and cycles (31.82575ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (36.731041ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (96.628667ms)
✔ V1 report reader rejects unknown output fields (93.60525ms)
✔ production module uses exact exit and stream contracts without mutation (861.921334ms)
✔ ponytail dispatches campaign reporting through the production module (3168.139ms)
✔ coordinator handoff preserves unfinished assignments and started host operations (100.175209ms)
✔ reservation audit distinguishes retained workers, provisioned sessions, and unresolved starts (400.593917ms)
✔ reservation audit CLI reports a scoped versioned inventory without mutating the ledger (195.786542ms)
✔ unfinished assignment continuation requires the original idle session and live checkout (543.063791ms)
✔ retirement fences the original archived session and reclaims only its authenticated worktree (1926.011666ms)
✔ historical ledgers normalize recovery and cleanup actions and the current writer emits V9 (111.085375ms)
✔ historical cleanup actions gain the original session required for retirement (100.515583ms)
✔ reconciliation reserves existing active plans without fabricating workers and is idempotent (206.646166ms)
✔ reconciliation refuses unauthenticated and contradictory ledgers without partial adoption (138.280084ms)
✔ reconciliation retains dependency waits and an existing pending action (152.700167ms)
✔ campaign reconcile CLI reserves an active leaf once before normal dispatch (500.623875ms)
✔ status reports active plan, session, and worktree conflicts while mutations fail closed (104.379208ms)
✔ V11 status exposes session, worktree, activity, assignment, action, and conflict views (121.886583ms)
✔ stale host observations are diagnosed and block mutation (118.163417ms)
✔ campaign observe persists a normalized host snapshot and returns V11 status (222.544291ms)
✔ worker delivery accepts only an exact clean revision with committed evidence (454.024334ms)
✔ reconciler derives dependency-ready plans and only truly idle workers (96.450208ms)
✔ runnable-plans joins satisfied plan dependencies with nonempty canonical tasklet readiness (943.532208ms)
✔ runnable execution diagnostics persist scoped host refusals without changing action identity (150.743208ms)
✔ historical runnable summaries normalize unknown execution evidence without inventing counts (0.162542ms)
✔ tasklet exhaustion suppresses new, queued, and unstarted dispatch without changing started identity (148.179625ms)
✔ schedule-ready deterministically reserves every runnable plan once within project capacity (274.373209ms)
✔ schedule-ready reuses every safe idle pair despite grandfathered excess reservations (295.563458ms)
✔ review-only scheduling reuses one original idle pair without making unreviewed tasklets executable (249.101458ms)
✔ initial planning uses an idle campaign pair while independent implementation retains its own pair (492.888458ms)
✔ planning worker can refresh its pending attachment after a clean integrated fast-forward (571.773375ms)
✔ retry-dispatch persists one fenced successor across CLI restarts and retains unknown capacity (1078.7475ms)
✔ fenced retry reuses an original idle pair for review when implementation readiness became review-only (188.312875ms)
✔ retry-dispatch rejects unavailable authority, observation, readiness and owned identities (815.680875ms)
✔ retry revocation fences an attachment that resolved its capability before acquiring the binding lock (162.040833ms)
✔ runnable-plan output rejects empty tasklet sets and unsupported or ambiguous records (0.388917ms)
✔ advance durably selects one ready plan and returns the same pending action on retry (78.485042ms)
✔ independent dispatch continues while the integration lane has one outstanding rebase (101.303708ms)
✔ an outstanding rebase pins the integration revision until its named result (140.304416ms)
✔ a proven unstarted stale dispatch is postponed while a started dispatch retains its identity (141.091458ms)
✔ never-started reservation releases after coordinator closure without claiming worker retirement (117.330333ms)
✔ closed reservation release refuses started or provisioned worker identities without mutation (507.639791ms)
✔ ready actions exclude blocked and started dispatch without mutating durable state (76.814208ms)
✔ ready actions expose only a fresh, idle original provisioned bootstrap as resume-only (176.493667ms)
✔ advance reuses a clean idle worker before requesting a new worker (74.323166ms)
✔ reuse attachment rejects a different session in the reserved worktree (204.425834ms)
✔ schedule-ready does not enroll an unrelated idle host chat for reuse (111.0905ms)
✔ integrated completed workers become reusable when another plan is ready (146.456125ms)
✔ integrated waiting workers become reusable when another plan is ready (142.801334ms)
✔ advance retains every completed pair even without ready dispatch (311.646458ms)
✔ foreign campaign sessions do not consume the current campaign capacity (94.63225ms)
✔ one working campaign session leaves independent ready plans dispatchable (147.49275ms)
✔ a historical imported worker without current-campaign creation cannot be reused or counted (75.22425ms)
✔ a historical foreign reuse reservation is not executable (115.424542ms)
✔ historical automatic cleanup is superseded without deleting or fabricating success (61.915625ms)
✔ completed work is classified by Git ancestry and fast-forward merged exactly once (282.265959ms)
✔ ready fast-forward join outranks unrelated assignment-state reconciliation (240.221958ms)
✔ verified worker delivery integrates before plan closure and cleanup waits for closure (296.958541ms)
✔ an open merged plan accepts a second delivery from its original assignment (843.378209ms)
✔ worker delivery resolves a closed plan by stable identity before its lifecycle move is integrated (912.13225ms)
✔ authenticated dispatch stays valid while its worker activates an open plan and integrates activation (1029.828458ms)
✔ working workers retry optimistic deliveries after a competing fast-forward join (1493.730917ms)
✔ waiting worker delivery remains integrable before and after its checkout disappears (841.049917ms)
✔ missing undelivered checkout can be re-provisioned in the same session without an archived artifact (464.790458ms)
✔ delivered waiting worker with a missing checkout recovers before rebase and preserves delivery (939.80425ms)
✔ missing worker checkout without verified delivery remains blocking (101.325459ms)
✔ completed divergent work requires rebase and cannot merge (181.995959ms)
✔ campaign status and advance CLI expose stable JSON and do not duplicate dispatch (393.269125ms)
✔ implicit campaign selection reports every active candidate while explicit selection succeeds (264.650583ms)
✔ action results require an explicit campaign and advance holds the worktree lock (45.378542ms)
✔ CLI shell scripts are parse-safe (185.56525ms)
✔ ponytail help publishes campaign, plan-input, index, and plan command families (289.206291ms)
✔ QA omits campaign census and the CLI dispatches it through campaign (0.254ms)
✔ combined installer installs Codex skills and CLI tools only (983.8535ms)
✔ plan_pdf renders the manifest and optionally ordered sprints (455.91825ms)
✔ plan_pdf validates its plan, output, and renderer (39.611208ms)
✔ audit_pm accepts the mandated PM structure (116.802167ms)
✔ audit_pm requires valid project journal configuration (142.892375ms)
✔ audit_pm reports non-fixable structural deviations without mutation (145.441792ms)
✔ audit_pm --fix date-prefixes tracked plans and bugs from oldest Git history (318.536458ms)
✔ audit_pm --fix leaves untracked records and collisions unchanged (229.297958ms)
✔ audit_pm --dryrun previews fixes with or without --fix (800.640541ms)
✔ plan_stats counts open and done task lines from the exact plan (113.609042ms)
✔ plan_stats rejects missing and non-basename plan names (73.193ms)
✔ bug_stats counts lifecycle files on or after an inclusive date (194.538542ms)
✔ bug_stats validates its date argument (75.28325ms)
✔ project journal rejects missing configuration and split commands (143.450042ms)
✔ project journal detaches heartbeats and recovers stale locks (6225.488584ms)
✔ project journal initializes a stable V1 project configuration (665.196334ms)
✔ project database setup provisions journal and project-index contracts (381.807417ms)
✔ project journal initialization accepts explicit non-secret connection settings (874.407791ms)
✔ journal contracts retain a stable relational core and versioned JSON payload (0.253584ms)
✔ project index contract retains a stable relational and search core (0.308959ms)
✔ CLI installer installs all tools and verifies owned updates (234.741ms)
✔ CLI installer supports selection and refuses unowned collisions (78.890834ms)
✔ CLI installer prompts for or explicitly updates Bash PATH (205.870416ms)
✔ CLI installer dry-run does not modify the target home (47.109875ms)
✔ cloud CLI recovery uses only the configured identity and command (0.482708ms)
✔ cloud CLI recovery distinguishes authentication from other failures (0.112291ms)
✔ registry contains the base command (0.452917ms)
✔ every registered command ships a Claude commands/*.toml (0.131375ms)
✔ every OpenCode command matches its generated adapter (0.569041ms)
✔ declined and noninteractive proposals leave user state unchanged (214.054167ms)
✔ accepts imported, baseline, and project rules into reconstructible state (186.621625ms)
✔ changed project policy requires its exact new proposal digest (574.57775ms)
✔ restores Codex rules from accepted Ponytail state (189.011875ms)
✔ upgrades V1 accepted state without reading foreign project worktrees (101.001ms)
✔ V2 migration ignores malformed foreign accepted project data (104.138625ms)
✔ keeps project policies in separate project-local projections (279.35075ms)
✔ rejects symlinked policy outputs and malformed project directives (262.764917ms)
✔ is installable as a selected Ponytail CLI tool (951.065333ms)
✔ copilot plugin command directory includes ponytail-debt (0.666209ms)
✔ debt surfaces use the project-neutral marker and canonical document (0.806416ms)
✔ debugging applies beyond user-facing and planned bugs (0.484666ms)
✔ debugging requires differential diagnosis before repair (0.178625ms)
✔ debugging prevents expensive and repeated guess-and-check runs (0.107208ms)
✔ debugging defines safe stateful restart and outcome metrics (0.07825ms)
✔ debugging harvests only confirmed independent pattern observations (0.83625ms)
✔ pattern observations preserve evidence without premature categories (0.15075ms)
✔ specialized workflows delegate diagnosis to debugging (0.081584ms)
✔ diagnostic observations cannot become product failures (0.460541ms)
✔ hard assertions require an invalid continuation path and proof (0.084708ms)
✔ distribution contains the live-development harness only (826.065833ms)
✔ Hermes plugin manifest matches runtime skills, hooks, commands, and package version (1.189625ms)
✔ Hermes plugin registers every shipped skill under the ponytail namespace (82.737792ms)
✔ Hermes plugin builds mode-aware injected context from the canonical skill (47.350416ms)
✔ Hermes mode config respects env, config file, off, and invalid command behavior (43.804958ms)
✔ Hermes plugin review mode injects the real review skill body (36.259083ms)
✔ Hermes /ponytail command changes mode and pre_llm_call injects current context (40.700167ms)
✔ Hermes gateway rewrite respects slash access denial (40.01825ms)
✔ Hermes gateway rewrite preserves every skill command and ignores unrelated text (39.282917ms)
✔ every commandWindows uses PowerShell $env: syntax, not cmd.exe %VAR% (0.727333ms)
✔ shared hook commands avoid POSIX-only guard syntax (0.253375ms)
✔ shared hook commands are shell-agnostic (no bash-only exec prefix) (0.248458ms)
✔ every hook command points at a script that ships in hooks/ (0.2885ms)
✔ ponytail-mode-tracker self-exits when stdin never closes (no freeze) (1049.894917ms)
✔ Claude points at the hook config and Codex uses auto-discovery (0.301458ms)
hook compatibility checks passed
✔ tests/hooks.test.js (1079.018958ms)
✔ imported skills have valid metadata and attribution (10.789583ms)
✔ versioned contract schema is valid JSON with a portable identifier (0.235375ms)
✔ indeterminate lists require bounded infinite scrolling (0.4585ms)
✔ indeterminate lists prohibit request fanout (0.098333ms)
✔ issue intake uses configured type ownership without promoting requirements (0.773666ms)
✔ requirements activate only for standalone authorization or begun planned implementation (0.2625ms)
✔ JSON manifests match canonical repeated metadata (1.027709ms)
✔ Codex marketplace installs Ponytail from this checkout (0.46075ms)
✔ Hermes manifest is generated from package and registry metadata (0.969125ms)
▶ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI
  ✔ Step 1: canonical glossary and unresolved legacy DONE (141.818292ms)
  ✔ Step 2: frozen assignment and candidate delivery never discharge (240.791625ms)
  ✔ Step 3: bounded neutral preparation and honest productive downstream growth (441.102875ms)
  ✔ Step 4: complete inventories and no-edit assessments reach zero (1050.222084ms)
  ✔ Step 5: stale inputs reopen original identities and require disturbance (388.377042ms)
  ✔ Step 6: activated successor preserves IDs and old unresolved history (333.643625ms)
✔ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI (2756.292541ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (148.363666ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1489.383417ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (280.343666ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (338.155417ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (161.113833ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.349667ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (534.668792ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (3.236084ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (439.809375ms)
✔ shared vocabulary resolves from each owner and generated resource (3.162708ms)
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.655667ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.211292ms)
✔ api-service-boundaries: description is one line under 160 chars (0.059041ms)
✔ api-service-boundaries: referenced resources are packaged (0.146084ms)
✔ architecture: committed OpenClaw skill matches the generator (0.143583ms)
✔ architecture: body contains the canonical skills/architecture body (0.103917ms)
✔ architecture: description is one line under 160 chars (0.037708ms)
✔ architecture: referenced resources are packaged (0.069458ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.140291ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.155541ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.049916ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.080083ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.139834ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.110541ms)
✔ build-impact: description is one line under 160 chars (0.03575ms)
✔ build-impact: referenced resources are packaged (0.099708ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.12075ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.121084ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.032792ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.05975ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.111167ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.085333ms)
✔ codex-execpolicy: description is one line under 160 chars (0.026041ms)
✔ codex-execpolicy: referenced resources are packaged (0.055833ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.38425ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.149083ms)
✔ cross-session-effects: description is one line under 160 chars (0.037416ms)
✔ cross-session-effects: referenced resources are packaged (0.106292ms)
✔ debugging: committed OpenClaw skill matches the generator (0.149583ms)
✔ debugging: body contains the canonical skills/debugging body (0.1025ms)
✔ debugging: description is one line under 160 chars (0.020958ms)
✔ debugging: referenced resources are packaged (0.088834ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.098333ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.071417ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.021459ms)
✔ diagnostic-assertions: referenced resources are packaged (0.054458ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.109291ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.100625ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.019708ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.0535ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.120875ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.100583ms)
✔ issue-tracking: description is one line under 160 chars (0.529292ms)
✔ issue-tracking: referenced resources are packaged (0.094ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.116125ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.090959ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.017416ms)
✔ lossless-json-contracts: referenced resources are packaged (0.060333ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.103ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.079541ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.02075ms)
✔ monetary-contract-safety: referenced resources are packaged (0.050292ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.269333ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.265708ms)
✔ plan-execution: description is one line under 160 chars (0.020708ms)
✔ plan-execution: referenced resources are packaged (0.205166ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.240542ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.224083ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.016833ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.172375ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.14725ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.1275ms)
✔ ponytail: description is one line under 160 chars (0.018334ms)
✔ ponytail: referenced resources are packaged (0.118542ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.118625ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.069416ms)
✔ ponytail-audit: description is one line under 160 chars (0.017916ms)
✔ ponytail-audit: referenced resources are packaged (0.056625ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.125917ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.089333ms)
✔ ponytail-debt: description is one line under 160 chars (0.015583ms)
✔ ponytail-debt: referenced resources are packaged (0.0585ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.122833ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.077458ms)
✔ ponytail-review: description is one line under 160 chars (0.0155ms)
✔ ponytail-review: referenced resources are packaged (0.049875ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.492042ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.108333ms)
✔ project-structure: description is one line under 160 chars (0.015334ms)
✔ project-structure: referenced resources are packaged (0.079958ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.119583ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.078375ms)
✔ production-test-boundaries: description is one line under 160 chars (0.014917ms)
✔ production-test-boundaries: referenced resources are packaged (0.049625ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.111041ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.08425ms)
✔ react-error-containment: description is one line under 160 chars (0.014916ms)
✔ react-error-containment: referenced resources are packaged (0.059333ms)
✔ requirements: committed OpenClaw skill matches the generator (0.125709ms)
✔ requirements: body contains the canonical skills/requirements body (0.112208ms)
✔ requirements: description is one line under 160 chars (0.015209ms)
✔ requirements: referenced resources are packaged (0.080375ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.138375ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.110292ms)
✔ requirements-traceability: description is one line under 160 chars (0.014333ms)
✔ requirements-traceability: referenced resources are packaged (0.078458ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.100167ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.071375ms)
✔ semantic-rebase: description is one line under 160 chars (0.014666ms)
✔ semantic-rebase: referenced resources are packaged (0.047417ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.131083ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.0815ms)
✔ static-type-safety: description is one line under 160 chars (0.015708ms)
✔ static-type-safety: referenced resources are packaged (0.054875ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.120125ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.1045ms)
✔ test-credentials: description is one line under 160 chars (0.022125ms)
✔ test-credentials: referenced resources are packaged (0.062917ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.132041ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.101458ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.014792ms)
✔ typescript-unit-testing: referenced resources are packaged (0.066208ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.103417ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.082ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.015208ms)
✔ user-acceptance-testing: referenced resources are packaged (0.058125ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.101541ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.088666ms)
✔ ux-testing: description is one line under 160 chars (0.014625ms)
✔ ux-testing: referenced resources are packaged (0.050417ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.097458ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.078375ms)
✔ variant-neutrality: description is one line under 160 chars (0.016917ms)
✔ variant-neutrality: referenced resources are packaged (0.060542ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.660125ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.15175ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.0195ms)
✔ versioned-data-contracts: referenced resources are packaged (0.134125ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.125208ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.115041ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.016042ms)
✔ worktree-lifecycle: referenced resources are packaged (0.059791ms)
✔ generated resources omit canonical relationship annotations (1.025916ms)
✔ system.transform injects the ruleset at the default mode (full) (2.400417ms)
✔ command.execute.before persists /ponytail ultra, transform follows it (1.084416ms)
✔ /ponytail off disables compaction but preserves core policy (1.097875ms)
✔ system.transform merges into existing system entry (Qwen compat, #296) (0.453042ms)
✔ unsupported /ponytail arguments do not reset the current mode (0.331125ms)
✔ unrelated commands do not touch the flag (0.272583ms)
✔ parseCommandFile reads frontmatter description + body, LF and CRLF (1.191541ms)
✔ parseCommandFile returns null when there is no frontmatter (0.968083ms)
✔ root npm test delegates only to the core suite (0.890584ms)
✔ CI installs MCP dependencies before root npm test (0.21375ms)
✔ npm package ships the advertised cleanup script (0.531291ms)
✔ Codex campaign workers establish and retain native assignment Goals before work (0.645084ms)
✔ plan execution serializes fast input before selector-based resumption (0.737375ms)
✔ campaign policy requires repository inventory and V2 direct dependencies (0.924916ms)
✔ serial plan execution does not require the deprecated scheduler (0.481292ms)
✔ deprecated scheduler preserves durable actions and worker-owned recovery (1.157959ms)
✔ planning and issue policy records prospective traceability without claiming coverage (0.973666ms)
✔ standalone and planned issue execution share the implementation activation gate (0.436917ms)
✔ starting policy admits only expressly owned reproduced failures and preserves final gates (0.248291ms)
✔ coordinator binding lets composer enqueue derive the campaign (222.98775ms)
✔ blocker reporting authenticates the native coordinator across separate hook and command environments (420.91275ms)
✔ worker attach is one-time, status re-roots, and worker mutations fail closed (1553.771417ms)
✔ coordinator bindings are exclusive, releasable, and fail closed (467.655834ms)
✔ one coordinator session binds several campaigns while unscoped enqueue stays unambiguous (669.171708ms)
✔ producer hook ignores unrelated boundaries and never consumes a queue (415.665208ms)
✔ code-mode coordinator command establishes the same binding (245.941667ms)
✔ free-form code-mode input binds and releases only the authenticated coordinator (496.098042ms)
✔ ponytail pm pdf handles Ctrl-C without a Python traceback (959.740125ms)
✔ ponytail pm pdf renders configured collections in index order (877.245209ms)
✔ ponytail pm pdf all renders every configured collection (745.229417ms)
✔ ponytail pm pdf rejects unlisted pages and invalid configuration paths (768.200208ms)
✔ ponytail pm pdf reports missing render dependencies (776.863541ms)
✔ deprecated campaign scheduler owns observation and diagnostic priority (0.671041ms)
✔ portable policy loads only safe developer-private project instructions (1.032041ms)
✔ every compaction level preserves all always-on rules (2.204334ms)
✔ compaction level changes only its selected table row (0.632709ms)
✔ runtime policy comes from the canonical skill, not root AGENTS.md (0.192917ms)
✔ Ctrl-C is quiet in the wrapper and waits for delegated cleanup (1795.113334ms)
✔ register initializes and registers the enclosing Git root idempotently (1460.248875ms)
✔ V1 user configuration remains readable and upgrades through the V2 writer (1176.034792ms)
✔ pre-commit composes with an existing shell hook idempotently (2381.076458ms)
✔ concurrent register calls retain both registrations (711.790334ms)
✔ register rejects a symlinked policy and malformed user configuration (550.959334ms)
✔ update-permissions isolates every project policy from every other project (2087.479458ms)
✔ update-permissions reads policy from the invoking worktree instead of the blessed worktree (813.597083ms)
✔ CLI installer links the checkout and the installed command updates skills (1588.442166ms)
✔ update refreshes Codex skills and permissions without installing the CLI (1318.574625ms)
✔ test mechanisms stay outside production artifacts (0.544291ms)
✔ integration tests prove the real isolated product path (0.089416ms)
✔ execution profiles preserve one Arc and test-owned state (0.088083ms)
✔ integration terminology has one canonical hierarchy (0.202791ms)
✔ integration failure policy stops one Arc and continues the run (1.200375ms)
✔ incremental commit preparation never rereads already indexed Git blobs (234.285291ms)
✔ parses exact repository grep selectors and paths (0.504834ms)
✔ parses exact repository index worker and transaction options (0.212167ms)
✔ index progress emits cumulative markers, throughput ETA, and final publication phase (0.282875ms)
✔ index progress extends one durable total for a late history snapshot (0.086958ms)
✔ index progress ends interrupted lines and handles a zero-commit update (0.084416ms)
✔ TTY index progress renders the installed open-source bar with percent and explicit ETA (12.150541ms)
✔ collects exact Git state and only normalized traceability content (372.487917ms)
✔ replaces renamed configured paths without retaining deleted inputs (239.967292ms)
✔ projects explicit inventories and stable prospective planning entities (256.097208ms)
✔ does not parse files already present in the immutable cache (194.466792ms)
✔ publishes a complete generation with parameterized statements (175.814792ms)
✔ rolls back failed and contended publications (198.103708ms)
✔ rejects malformed durable cache payloads before publication (179.000292ms)
✔ parses exact search filters and rejects ambiguous options (0.562ms)
✔ parses mutually exclusive validation scopes (0.355791ms)
✔ reports every directional cardinality gap without counting prospective roles (8.641917ms)
✔ validates only the exact fresh indexed graph and emits typed gaps (349.707417ms)
✔ derives exact plan and campaign entity closure through canonical membership and issue links (94.871417ms)
✔ searches only the exact fresh generation with bound filters (327.084458ms)
✔ refuses stale search without rebuilding (456.377625ms)
✔ indexes canonical plan hierarchy and separates legacy, invalid, and stranded plans (458.594166ms)
✔ indexes planning-only sprints while enforcing executable and tasklet-graph headings (2664.143125ms)
✔ reuses immutable cached plan parses without opening the source parser (347.829ms)
✔ classifies missing-parent and cyclic plan records as invalid rather than stranded (0.2075ms)
✔ strands a member whose campaign does not reference it (0.158792ms)
✔ parses exact plan search and graph query arguments (0.315084ms)
✔ searches the exact fresh plan generation with bound filters (528.960583ms)
✔ refuses stale plan queries without rebuilding (492.344584ms)
✔ queries plan descendants, roots, and stranded records from the fresh generation (1121.699125ms)
✔ project-configurable skills define their AGENTS.md keys and defaults (1.296542ms)
✔ every command distinguishes missing Git from absent registration (3046.59575ms)
✔ local QA ignores a removed project while global validation identifies it (2184.247708ms)
✔ local QA is independent of invalid campaign configuration (841.11525ms)
✔ blessing selects one clean tracked worktree and both command spellings report it (850.652792ms)
✔ register resolves linked worktrees to the main checkout and validate checks local setup (691.828167ms)
✔ registration and validation protect developer-private agent instructions (865.0465ms)
✔ project metadata retains exact V1 reads and upgrades through V2 writers (534.390708ms)
✔ project metadata versions retain their exact required fields (325.5455ms)
✔ project metadata V2 requires unique explicit dependencies (425.548459ms)
✔ validation requires both project configuration files to be tracked (314.387208ms)
✔ manual component registration is idempotent and unregistration is explicit (1267.765208ms)
✔ concurrent component registrations preserve both names (320.166ms)
✔ component detection registers every named tracked JavaScript package (765.105667ms)
✔ component detection populates newly registered configuration before its first commit (271.343791ms)
✔ component detection parses every manifest before changing metadata (419.712625ms)
✔ validate and qa ignore identities owned only by another registered project (3156.142958ms)
✔ pre-commit does not acquire foreign identities from registration (1384.076708ms)
✔ pre-commit ignores dirty foreign configuration while global validation reports it (1630.288292ms)
✔ pre-commit remains independent of a foreign Ponytail registration (4583.987584ms)
✔ installed skill state does not introduce foreign project identities into QA (7772.764209ms)
✔ commit -am keeps its temporary index out of foreign repository checks (1277.412208ms)
✔ registration and validation leave pre-commit installation optional (461.891125ms)
✔ foreign-reference exceptions remain unused when QA has no foreign catalog (2383.081666ms)
✔ local dependency manifests are validated without loading foreign package identities (2576.818209ms)
✔ explicit dependency commands manage local metadata without making QA read the foreign project (3191.121583ms)
✔ reference QA does not derive identities from another registered project (977.123458ms)
✔ reference QA remains independent of components registered to another project (1897.418084ms)
✔ reference QA always permits Ponytail and its components (656.230334ms)
✔ blessing a foreign worktree does not change local QA (1522.109125ms)
✔ local QA ignores foreign snapshot refresh while explicit global validation reports staleness (1947.510708ms)
✔ canonical foreign component mutation does not affect local QA (914.953583ms)
✔ local QA uses a snapshot when blessing is absent and global validation fails (1508.192ms)
✔ legacy registrations warn locally and fail explicit global validation (1021.674917ms)
✔ gitlink validation remains local and independent of foreign project identity (1387.817167ms)
✔ manifest readers identify direct dependencies across supported managers (268.960875ms)
✔ malformed metadata and untracked dependency declarations fail explicitly (735.258875ms)
✔ reference scope and diagnostic format ignore Git grep user preferences (3129.285292ms)
✔ qoder plugin manifest exists and has required fields (0.581542ms)
✔ qoder hooks config exists and registers UserPromptSubmit (0.152083ms)
✔ qoder rules file exists and is non-empty (0.154583ms)
✔ qoder manifest points at skills that actually ship (0.162167ms)
✔ qoder runtime detects QODER_SESSION_ID and writes hookSpecificOutput JSON (0.754917ms)
✔ canonical registry matches all live-development sources (2.747792ms)
✔ registry rejects duplicate entries (0.253083ms)
✔ registry rejects bundled and multiply owned project skill names (0.257583ms)
✔ published surfaces must be registered for their host (0.435458ms)
✔ worktree indexing tolerates peer commits while fencing caller HEAD and content (5747.035ms)
✔ configured checker validates structural and semantic locators together (969.26675ms)
✔ traceability has one canonical forward mapping and three roles (0.559959ms)
✔ traceability requires implementation, unit, integration, and UAT coverage (0.100375ms)
✔ TSTS owns only semantic TypeScript traceability (0.0795ms)
✔ retains exact V1 reads and validates latest V2 search policy (6.510667ms)
✔ reads an exact V4 directional validation matrix (2.168042ms)
✔ reads exact V3 entity declarations and prospective planning roles (2.791625ms)
✔ rejects malformed V3 entities and never counts prospective work as actual coverage (8.716667ms)
✔ generates one reverse view and validates complete structural coverage (4.094375ms)
✔ reports unknown IDs, missing classes, unresolved locators, and stale reverse views (1.760917ms)
✔ accepts a justified no-unit-test disposition only for unit coverage (1.479292ms)
✔ recognizes only canonical Markdown requirement declarations (14.191209ms)
✔ allows one path to carry disjoint class-valid role filters (11.538875ms)
✔ rejects generated relationship copies and unsafe or unknown configuration (1.770916ms)
✔ generated runtime registry matches its canonical source (5.044875ms)
✔ Hermes registers skills from generated registry data (0.25775ms)
✔ Pi registers auxiliary commands from generated registry data (0.165375ms)
✔ planned work classifies QA eligibility by configured consumers (0.917875ms)
✔ planned work assigns the smallest sufficient proof to each gate (1.601958ms)
✔ bug implementation requests authorize the complete workflow by default (1.254583ms)
✔ plan and issue identities survive lifecycle moves (0.82675ms)
✔ long-lived plan execution journals actions without blocking work (0.725292ms)
✔ portable unit-test cadence names no project tool (2.872875ms)
✔ host configuration supports named unit-test families (0.232167ms)
✔ planned work builds only targets reported by build impact (0.196875ms)
✔ source-proven configuration drift is repaired without an approval stop (0.231166ms)
✔ material configuration decisions still stop without halting other ready work (0.349916ms)
✔ specialized skills leave broad gates to their owning milestones (0.298041ms)
✔ installed TSTS validates registration and checks real TypeScript contracts (2631.1625ms)
✔ TypeScript test metadata is owned by project configuration (0.4855ms)
✔ focused tests do not fall back to the full suite (0.080583ms)
✔ valid and invalid test values preserve their real contracts (0.070542ms)
✔ behavioral doubles use exact production boundary types (0.060833ms)
uninstall script checks passed
✔ tests/uninstall.test.js (232.374416ms)
✔ UX interaction comes from explicit host configuration (0.454791ms)
✔ UX validation covers the real path at complementary layers (0.097583ms)
✔ variant-specific facts come only from project configuration (0.471333ms)
✔ shared contracts isolate variant-specific structure (0.085917ms)
✔ shared operations dispatch exhaustively without fallback (0.134625ms)
✔ fifteen creation reservations bound one campaign, not another campaign or top-level project (410.066708ms)
✔ independent coordinator processes cannot both reserve the fifteenth slot (330.563417ms)
✔ an old but live project critical section cannot be stolen to overbook the pool (1384.674958ms)
▶ legacy replacement recovery returns the branch to the proven native checkout without losing merged state
  ✔ attached (783.510584ms)
  ✔ interrupted (631.135125ms)
  ✔ switched (602.119584ms)
  ✔ rebased (693.177916ms)
  ✔ dirty (401.663833ms)
  ✔ unproven (308.280208ms)
  ✔ ignored (478.817625ms)
✔ legacy replacement recovery returns the branch to the proven native checkout without losing merged state (3899.507125ms)
✔ provisioned original worker upgrades integrated adoption tooling and retains exact-path recovery (2537.234166ms)
✔ bootstrap upgrade resumes every durable prefix without changing dispatch identity (3406.641209ms)
✔ bootstrap upgrade uses its owning top-level integration rather than another project sharing Git objects (466.912875ms)
✔ bootstrap upgrade rejects dirty content and unintegrated targets and authenticates the original host session (756.975375ms)
✔ bootstrap upgrade preserves an ignored collision and resumes the recorded intent after its removal (559.636042ms)
✔ bootstrap V1 is immutable and normalizes without inventing upgrade intent (335.51875ms)
✔ provisioned original worker recovers before adoption and attachment without replacing its started creation (1623.033375ms)
✔ original worker recovers its exact checkout from a neutral cwd without coordinator action (966.708875ms)
✔ recovery hook authenticates the exact worker before consulting its absent cwd (414.078125ms)
▶ recovery refuses a symlink, occupied branch, locked registration, or unavailable source
  ✔ symlink (437.462875ms)
  ✔ occupied (474.652625ms)
  ✔ locked (462.03525ms)
  ✔ source (409.269333ms)
  ✔ branch (449.707291ms)
✔ recovery refuses a symlink, occupied branch, locked registration, or unavailable source (2233.637541ms)
✔ legacy bindings explicitly enroll recovery provenance without changing the V1 reader (501.631958ms)
✔ retained pair reattachment rotates its capability without replacing session or checkout (249.563333ms)
▶ recovery rebuilds a removed slot directory with or without a surviving Git registration
  ✔ registered=true (487.585167ms)
  ✔ registered=false (734.824542ms)
✔ recovery rebuilds a removed slot directory with or without a surviving Git registration (1222.626209ms)
✔ worker-owned recovery acknowledges the original pending action without a new coordinator observation (484.346458ms)
✔ reclaims only adapter-proven abandoned worktrees and project resources across independent sessions (1573.071292ms)
✔ serializes independent maintenance sessions per project (2545.191959ms)
✔ does not couple reclamation locks for distinct projects (2698.886417ms)
✔ rejects a reclaimed result when the claim ID is concurrently reused (760.135ms)
✔ stops before later claims when reclaim output is malformed (707.521583ms)
✔ fails closed on every untrusted lifecycle adapter form (4181.393834ms)
✔ reads exact lifecycle configuration and adapter requests (1.113291ms)
✔ normalizes exact inventory and rejects ambiguous claims (8.291ms)
✔ reads and renders the exact command result (0.618792ms)
ℹ tests 544
ℹ suites 0
ℹ pass 544
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 61161.229209

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 test:typed
> node --test dist/tests/*.test.js

✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (8671.648625ms)
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (169.05225ms)
✔ activation write failure restores the directory and every original Markdown byte (82.78375ms)
✔ activation destination and status guards reject before changing source bytes (114.324333ms)
✔ management configuration reader requires one exact safe V1 contract (1.232416ms)
✔ project-local management files preserve configuration, unsafe-file and data-error distinctions (2.439583ms)
✔ plan dependency validation accepts DAGs and rejects missing members and cycles (0.723792ms)
✔ cross-plan gates require DONE in both current contents and committed HEAD (261.193917ms)
✔ cross-plan validation rejects missing targets, completed dependents and cycles (79.9665ms)
✔ typed campaign graph retains a planning-only scope and explicit legacy obligation absence (151.033959ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.858334ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.303708ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (201.4015ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.248625ms)
✔ empty valid inventory presentation retains its summary and final newline (0.088792ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.954666ms)
✔ typed validation selection retains all/json ordering and plan selection (0.113625ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.122167ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.368792ms)
✔ planning-only contents retain zero execution counts without requiring tasklet metadata (5.648792ms)
✔ execution contents retain normalized statuses, feature paths and exact ready tasklet scope (16.756917ms)
✔ physical metadata readers retain versions, normalize dependencies and expose V3 obligation identity (1.077416ms)
✔ metadata rejects malformed dependencies, inconsistent prose and unsafe obligation paths (0.441166ms)
✔ selected files dispatch physical versions while text parsing uses the supplied source and preserves parse failures (4.338166ms)
✔ source listing is lexical while parsed candidates follow configured lifecycle order (24.934042ms)
✔ candidate discovery rejects absent, symlinked and physically escaping roots and unsafe lifecycle directories (2.267125ms)
✔ linked plans resolve existing directories, file fragments and physical paths while omitting missing links (2.737083ms)
✔ V1 report reader preserves input identity and historical sprint status strings (0.724208ms)
✔ V1 report reader validates count maps and nested unknown records (0.565167ms)
✔ V1 report reader retains the explicit null percentage for empty execution (0.097083ms)
✔ typed presentation retains exact header output and independently selected tables (0.402167ms)
✔ active selection and explicit child selection resolve the same complete campaign scope (20.874292ms)
✔ selection preserves missing and ambiguous active campaign and plan-name diagnostics (12.408916ms)
✔ ancestry enforces parent existence, links, cycles and shared obligation scope (4.795625ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (6676.400833ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (3785.7215ms)
✔ lease use fences graph and generation, operations and exact changed paths (2984.345167ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (2756.154875ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (2612.39275ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (2667.935958ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (2865.27775ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (2756.745167ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (2835.840042ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (2619.226167ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (6732.761542ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (3800.602875ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (2911.249125ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (2684.6325ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (192.713541ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (286.311833ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (206.006458ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (534.947ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (5.969125ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.363167ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (5.9115ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (5.319291ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (5.533ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (8.062583ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.277959ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.522125ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (4.542042ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (3.558666ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (3.044792ms)
✔ stale proof forces honest disturbance before new productive acceptance (5.960167ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (2.063708ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (366.6355ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.194333ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (40.388667ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (4.203541ms)
✔ reader cannot hide declared membership from the accepted current observation (1.462958ms)
✔ serial policy preserves atomic batch and convergence boundaries (1.604792ms)
✔ campaign census policy preserves scoped reports and adds repository inventory (0.736334ms)
✔ sandbox-blocked journaling requires explicit persistent-rule authorization (0.23ms)
✔ orchestration metadata retains every immutable reader (0.579791ms)
✔ CLI grammar preserves multiword prompts and validates lifecycle commands (1.062667ms)
✔ both producers share the exact durable V2 queue contract (17.971042ms)
✔ physical V1 remains exact but is retired from queue consumption (2.401333ms)
✔ one claim is a critical section and completion requires durable PM evidence (14.231291ms)
✔ coordinator lifecycle commands validate campaign membership (19.1915ms)
✔ CLI producer resolves a member plan to the campaign root (6.561583ms)
✔ empty campaign claim returns successful explicit JSON exhaustion (104.254625ms)
✔ CLI lists and claims pending inputs and omits completed inputs (10.426083ms)
✔ native CLI reports grammar errors without a stack trace (60.939875ms)
✔ project-local database options preserve pg defaults and password environment semantics (3.698583ms)
✔ database options reject malformed consumed configuration fields (2.939709ms)
✔ generated sprint CLI preserves planning, execution and completion JSON (228.534875ms)
✔ native sprint CLI preserves grammar error output and exit status (77.979041ms)
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (6.648209ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.812208ms)
✔ selects one V1 sprint and retains unordered-path validation (0.687833ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.416958ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (3.915ms)
✔ planning starts only after approved prerequisites and preserves blocked and eligible inputs (0.146333ms)
✔ all sprint selectors preserve canonical readonly fixture values (0.10975ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.122834ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (129.893666ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (58.629292ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.467ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.123833ms)
✔ generated portable launch path preserves scalar selection and exact completion output (149.911167ms)
✔ adopted owning plans require their configured obligation document (126.517917ms)
✔ retains strict physical V1 parsing and scalar selection (80.960875ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (8.912334ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (6.983709ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (3.655167ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (4.626041ms)
✔ selects the highest-ranked V2 tasklet (10.200334ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.181542ms)
✔ blocks tasklets until dependency-feature validation is complete (3.581708ms)
✔ uses prior affinity and graph criteria deterministically (3.038875ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (71.814875ms)
✔ V3 returns one complete ordered batch (1.183958ms)
✔ V3 bounds a batch while V2 selects one tasklet (7.292875ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (8.748792ms)
✔ native code fixture approvals permit exact shell-wrapped commands only for the assigned checkout and turn (0.662125ms)
✔ real PostgreSQL records lost reviewer replacement and fences the old actor while retaining fresh review after restart (17929.725167ms)
ℹ Lost review 0fe46506-877e-46cb-b83b-202520bd0845 retained unchanged; recorded replacement 50869a5e-d050-494e-bece-47e304462142; old dispatch and decisions fenced after restart; fresh review pending.
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (10594.123916ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (6103.802125ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (6031.699167ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (3681.451333ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (4104.184959ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (4836.196625ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=bab79168c13eb47ba087471a6312208579c28bd6; generation=d8e4bd8b-313c-4291-afb0-acf7a8b5f0c7; fresh instructions completed before new allocation
✔ worker creation recovery retains uncertain ownership and attaches original initialization after restart (3982.762208ms)
ℹ worker recovery thread=thread-fixture; session=session-fixture; initialization=turn-1; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
✔ submission collection binds terminal idle actor and exact passing candidate before review (5916.254834ms)
ℹ component submission revision=6982c3e58a1b98f23fe8c0c48cd12abe539b5cfc; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ real PostgreSQL automatically publishes the reviewed increment through one coordinator operation (7431.33175ms)
✔ real PostgreSQL retains inspected conflict continuation across restart without duplicate replay (7385.334208ms)
✔ real PostgreSQL routes substantive integration conflicts to retained worker without changing accepted review (6762.69525ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/50b7911a-bd0c-4621-906c-fe8c653e2c44.
✔ substantive integration repair retains worker and reviewer through fresh proof and publication (7227.626417ms)
ℹ component submission revision=dab6eb212af8366758a88cdf7d1fd86ef29b5c3c; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ integrated certificate assessment uses retained published proof and serializes accepted record publication (9952.313333ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/6ceb7abd-5d5a-404d-9265-cef6fddf2bf2.
✔ worker retirement revokes native ownership and fences checkout release through restartable cleanup (7757.237083ms)
ℹ component submission revision=2486c8b0dd746f99dc8f3d9f7e2d64a30d448147; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ publication batch freezes one shared partial claim across concurrent requests and restart (11226.830292ms)
✔ publication partial flush follows verified completion state (10135.786958ms)
✔ publication partial flush follows verified quiescence state (9754.441083ms)
✔ publication threshold uses configured M and persists one claim without counting acknowledgement retries (9358.9205ms)
✔ mainline normal publication retains one observation and synchronizes the campaign after restart (12198.625042ms)
✔ mainline lost_ack publication retains one observation and synchronizes the campaign after restart (12121.181209ms)
Switched to a new branch 'main'
To /private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-store-07Le4A/managed/increment-remote.git
   6464263..1f3b0fb  main -> main
✔ mainline race publication retains one observation and synchronizes the campaign after restart (14252.042208ms)
✔ mainline unavailable publication retains one observation and synchronizes the campaign after restart (13644.477042ms)
✔ mainline rejected publication retains one observation and synchronizes the campaign after restart (14182.409792ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (127.458334ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (61.374083ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (693.106708ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (6881.233042ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.74375ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.439ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.401084ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (218.451167ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (497.302291ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.55575ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.59025ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (2.656208ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.373833ms)
✔ V2 cleanup declaration preserves V1 physical meanings and normalizes unknown retirement safely (0.426166ms)
✔ every registered command exposes its complete contract through the shipped CLI (3652.432333ms)
✔ retired campaign commands and malformed options fail before opening project state (564.76875ms)
✔ direct campaign CLI preserves quiet exit 130 when cancellation precedes a connection error (169.257041ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (129.810083ms)
✔ terminal notifications supersede an earlier in-progress history response (60.795542ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (177.934208ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (61.758959ms)
  ✔ malformed (62.589167ms)
✔ lost or malformed responses reject all affected pending operations (124.808792ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (58.03225ms)
✔ initialization recovery reads exactly one original turn and rejects absent or ambiguous history (64.8185ms)
✔ archive recovery uses paginated exact-checkout inventory and rejects an escaped physical root (95.01725ms)
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (2742.7705ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (2256.076084ms)
✔ fast integration refuses a changed checkout before fetching or replaying (1150.973917ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (1962.254209ms)
✔ upstream divergence requests another rebase and preserves both revisions (965.285458ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1918.017125ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (1178.518208ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (1057.114333ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.525416ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (751.18775ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.467291ms)
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (10900.615167ms)
✔ closure requires fresh evidence, persists an immutable receipt and fences later mutations (1736.157625ms)
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (106.320791ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.24625ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.120208ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.123583ms)
✔ mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree (7391.96275ms)
✔ conflicting mainline preserves the publication branch, merge state and published campaign refs (960.266ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (1.454792ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.637334ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (552.825125ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (0.989416ms)
✔ reviewer replacement records loss and fresh identities without changing historical review contracts (1.809542ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (3.222916ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (0.580292ms)
✔ review completion requires the exact terminal turn and validated final message (0.50425ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.324917ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.0995ms)
Rebasing (1/1)
Stopped at fceb034...  # candidate
You can amend the commit now, with

  git commit --amend 

Once you are satisfied with your changes, run

  git rebase --continue
Successfully rebased and updated refs/heads/master.
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (3405.390791ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (362.726584ms)
✔ submission rejects a clean interactive rebase edit stop until the rebase completes (432.580458ms)
✔ submission rejects merge history and reverted out-of-scope commits (703.925208ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (168.874208ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.39625ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (176.298792ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (1.714ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.479417ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.258208ms)
✔ retirement contract distinguishes original resource allocation from the revoked assignment generation (0.30675ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1545.679667ms)
✔ retirement cleanup verifies owner, preserves caches and user work, and retains failed cleanup (1166.8ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.183458ms)
✔ both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs (1.122666ms)
✔ legacy path ownership recognizes transitive execution ordering and rejects unordered sharing (0.392042ms)
✔ V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file (3.127792ms)
✔ physical sprint readers preserve planning, version-specific execution and null execution (1.50575ms)
✔ physical V1 sprint metadata retains null execution and rejects malformed inputs without mutation (1.989125ms)
✔ physical V2 sprint metadata preserves reviewed and null execution without mutating valid or malformed inputs (0.374625ms)
✔ physical V3 sprint metadata preserves its complete value and leaves rejected input unchanged (0.182208ms)
✔ unknown sprint metadata rejects invalid reviewed flags, paths, identity and block count (0.274791ms)
✔ discovery retains numeric ordering and rejects duplicate ordinals and mixed physical versions (5.13375ms)
✔ discovery preserves homogeneous physical collections and files and rejects absent or empty collections (2.209625ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (2.325708ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.554167ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.4445ms)
✔ file dispatch validates unknown JSON and each supported physical version (5.308375ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (2.099ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (10.281292ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.304833ms)
✔ heading parser retains the exact pending, done and error statuses (1.017125ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.273167ms)
✔ requirements preserve provenance and stakeholder conflict resolution (0.53175ms)
✔ UAT derives release evidence from approved requirements (0.2795ms)
✔ UAT defers every concrete operation to the host project (0.096708ms)
ℹ tests 230
ℹ suites 0
ℹ pass 230
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 217476.132333
codex plugin marketplace add /Users/alex/git/ctosclub/ponytail --json
codex plugin add ponytail@ponytail --json
{}
{}
copy /Users/alex/git/ctosclub/ponytail/skills/api-service-boundaries -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/api-service-boundaries
copy /Users/alex/git/ctosclub/ponytail/skills/architecture -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/architecture
copy /Users/alex/git/ctosclub/ponytail/skills/bash-parse-safe-scripts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/bash-parse-safe-scripts
copy /Users/alex/git/ctosclub/ponytail/skills/build-impact -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/build-impact
copy /Users/alex/git/ctosclub/ponytail/skills/cloud-cli-reauth -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/cloud-cli-reauth
copy /Users/alex/git/ctosclub/ponytail/skills/codex-execpolicy -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/codex-execpolicy
copy /Users/alex/git/ctosclub/ponytail/skills/cross-session-effects -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/cross-session-effects
copy /Users/alex/git/ctosclub/ponytail/skills/debugging -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/debugging
copy /Users/alex/git/ctosclub/ponytail/skills/diagnostic-assertions -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/diagnostic-assertions
copy /Users/alex/git/ctosclub/ponytail/skills/indeterminate-list-ux -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/indeterminate-list-ux
copy /Users/alex/git/ctosclub/ponytail/skills/issue-tracking -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/issue-tracking
copy /Users/alex/git/ctosclub/ponytail/skills/lossless-json-contracts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/lossless-json-contracts
copy /Users/alex/git/ctosclub/ponytail/skills/monetary-contract-safety -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/monetary-contract-safety
copy /Users/alex/git/ctosclub/ponytail/skills/plan-execution -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/plan-execution
copy /Users/alex/git/ctosclub/ponytail/skills/parallel-plan-scheduler -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/parallel-plan-scheduler
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/ponytail
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-audit -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/ponytail-audit
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-debt -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/ponytail-debt
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-review -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/ponytail-review
copy /Users/alex/git/ctosclub/ponytail/skills/project-structure -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/project-structure
copy /Users/alex/git/ctosclub/ponytail/skills/production-test-boundaries -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/production-test-boundaries
copy /Users/alex/git/ctosclub/ponytail/skills/react-error-containment -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/react-error-containment
copy /Users/alex/git/ctosclub/ponytail/skills/requirements -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/requirements
copy /Users/alex/git/ctosclub/ponytail/skills/requirements-traceability -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/requirements-traceability
copy /Users/alex/git/ctosclub/ponytail/skills/semantic-rebase -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/semantic-rebase
copy /Users/alex/git/ctosclub/ponytail/skills/static-type-safety -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/static-type-safety
copy /Users/alex/git/ctosclub/ponytail/skills/test-credentials -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/test-credentials
copy /Users/alex/git/ctosclub/ponytail/skills/typescript-unit-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/typescript-unit-testing
copy /Users/alex/git/ctosclub/ponytail/skills/user-acceptance-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/user-acceptance-testing
copy /Users/alex/git/ctosclub/ponytail/skills/ux-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/ux-testing
copy /Users/alex/git/ctosclub/ponytail/skills/variant-neutrality -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/variant-neutrality
copy /Users/alex/git/ctosclub/ponytail/skills/versioned-data-contracts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/versioned-data-contracts
copy /Users/alex/git/ctosclub/ponytail/skills/worktree-lifecycle -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/worktree-lifecycle
remove /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/git-write-escalation
remove /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/skills/typed-contract-safety
remove empty /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/AGENTS.md
link /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.HTc7SI/codex/AGENTS.md -> /Users/alex/git/ctosclub/ponytail/config/AGENTS.md
installer tests passed

> test
> node --test ./test/*.test.js

✔ extension registers Ponytail commands (1.014625ms)
✔ /ponytail updates session mode and injects instructions (1.225291ms)
✔ before_agent_start guards missing event and missing systemPrompt (#439, #440) (1.46375ms)
✔ session_start restores latest persisted mode (0.613041ms)
✔ skill commands delegate and help displays directly (0.332167ms)
✔ normal mode disables compaction but preserves core policy (0.610792ms)
✔ a request mentioning normal mode stays active (0.515708ms)
✔ status bar renders the mode and flips active on agent_start (0.469916ms)
✔ status bar stays silent when ui lacks a theme (0.429417ms)
✔ PONYTAIL_HIDE_STATUS hides the indicator but keeps ponytail active (#324) (0.752792ms)
✔ config.hideStatus hides the indicator but keeps ponytail active (#324) (1.250584ms)
✔ PONYTAIL_HIDE_STATUS=0 does not hide the indicator (0.469125ms)
✔ parsePonytailCommand falls back to full when invoked bare and default is off (0.806209ms)
✔ parsePonytailCommand parses modes, status, and default subcommand (0.130917ms)
✔ parsePonytailCommand rejects review as a default (session-only mode, #377) (0.060084ms)
✔ resolveSessionMode still honors review as a session mode (not a default) (0.094916ms)
✔ resolveSessionMode prefers latest persisted session mode (0.067584ms)
✔ resolveSessionMode returns fallback when entries is not an array (0.056584ms)
✔ readDefaultMode and writeDefaultMode use XDG config path (1.106833ms)
✔ readQuietStartup resolves env var, config file, and default in that order (0.927542ms)
✔ filterSkillBodyForMode keeps only requested intensity examples and rows (0.309084ms)
✔ filterSkillBodyForMode does not drop a rule bullet whose label matches a mode name (0.156875ms)
✔ filterSkillBodyForMode keeps rule bullets that contain a colon (0.23725ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 62.62775

> ponytail-mcp@4.8.4 test
> node --test ./test/*.test.js

✔ resolveMode keeps valid intensities (0.457ms)
✔ resolveMode preserves off and falls back for unknown or empty values (0.659ms)
✔ buildInstructions returns the ruleset tagged with the resolved mode (0.478875ms)
✔ buildInstructions preserves core policy when compaction is off (0.192417ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 50.856875

> @alexbaretta/ponytail@4.8.4 test:tsts
> node --test tsts/dist/test/*.test.js

▶ parseTstsCliArguments
  ✔ defaults to tsconfig.json (0.896625ms)
  ✔ parses an explicit unused-code config path (0.096917ms)
  ✔ parses an explicit project path (0.067417ms)
  ✔ parses a directory-structure manifest with a project (0.099125ms)
  ✔ runs directory-structure analysis without an implicit TypeScript project (0.077292ms)
  ✔ parses semantic traceability with an explicit project (0.064709ms)
  ✔ parses help requests (0.051584ms)
✔ parseTstsCliArguments (1.953708ms)
▶ formatTextReport
  ✔ formats an empty result (0.104833ms)
✔ formatTextReport (0.179542ms)
▶ usage
  ✔ describes the project option (0.131042ms)
✔ usage (0.183417ms)
▶ TSTS configuration v2
  ✔ accepts an exact graph-only configuration (573.551375ms)
  ✔ rejects missing and unsupported schema versions with upgrade guidance (132.309167ms)
  ✔ rejects unknown keys at every configuration object level (125.479208ms)
  ✔ rejects malformed required fields and severities (242.257875ms)
✔ TSTS configuration v2 (1074.481875ms)
▶ directory-structure manifest
  ✔ accepts declared tracked and ignored content (152.775625ms)
  ✔ accepts V1 by normalizing it without exact file rules (166.924958ms)
  ✔ lets one exact file override its containing directory policy (243.258542ms)
  ✔ reports misplaced and untracked content together (127.344834ms)
  ✔ uses the most specific content pattern and directory owner (168.498791ms)
  ✔ accepts data and compiled artifacts only under their declared owners (126.715ms)
  ✔ reports equal-specificity content kinds as ambiguous (166.269292ms)
  ✔ does not follow configured opaque directory symlinks (197.809ms)
  ✔ rejects unknown keys and escaping paths (386.427125ms)
  ✔ rejects duplicate JSON keys and directory owners (149.554417ms)
✔ directory-structure manifest (1886.58675ms)
▶ TSTS lossless JSON codec
  ✔ round-trips exact numbers (0.822708ms)
  ✔ rejects malformed and unsupported values (0.209417ms)
✔ TSTS lossless JSON codec (1.51525ms)
▶ no-aliasing
  ✔ reports import and export aliases when configured (556.444625ms)
✔ no-aliasing (556.981125ms)
▶ public union discriminator rule
  ✔ accepts a valid discriminated public union (579.585916ms)
  ✔ accepts const-backed string literal discriminants (283.912583ms)
  ✔ rejects a public union with duplicate discriminator values (342.258042ms)
  ✔ rejects an ambiguous four-variant shape (263.246292ms)
  ✔ accepts synthetic row result variants (235.615125ms)
  ✔ rejects ambiguous synthetic channel variants (175.2645ms)
  ✔ rejects a public union with no shared required literal field (136.199417ms)
  ✔ explains shared required fields that are not literal in every variant (147.024375ms)
  ✔ rejects optional discriminator fields (117.0525ms)
  ✔ ignores non-object unions outside the rule scope (124.840041ms)
  ✔ reports every non-fatal violation (134.542ms)
✔ public union discriminator rule (2544.315084ms)
▶ public union dispatch rule
  ✔ accepts exhaustive switch dispatch (559.355334ms)
  ✔ accepts const-backed exhaustive switch dispatch (287.866ms)
  ✔ rejects non-exhaustive switch dispatch (430.032458ms)
  ✔ rejects non-exhaustive dispatch over a non-exported union (234.346708ms)
  ✔ does not allow default clauses to hide missing cases (193.419666ms)
  ✔ rejects a catch-all branch that throws (132.962292ms)
  ✔ checks discriminated union dispatch in configured workspaces (141.431417ms)
  ✔ rejects if dispatch over public union discriminators (140.021375ms)
✔ public union dispatch rule (2120.391916ms)
▶ TypeScript traceability locators
  ✔ accepts a leading annotation on a named declaration (432.1975ms)
  ✔ rejects annotations inside a declaration body (231.125042ms)
  ✔ rejects configured files outside the TypeScript project (53.651166ms)
  ✔ checks a shared configured TypeScript path once (206.055417ms)
  ✔ accepts an exact V2 configuration with safe search fields (279.675375ms)
  ✔ accepts an exact V3 inventory and an attached explicit entity marker (192.62875ms)
  ✔ accepts an exact V4 directional validation matrix (211.175375ms)
✔ TypeScript traceability locators (1607.441958ms)
▶ type-safe persisted serdes rule
  ✔ accepts canonical persisted envelope types and schemas (499.746666ms)
  ✔ rejects unknown persisted envelope types (409.973833ms)
  ✔ rejects untyped JSON persisted envelope types (258.1195ms)
  ✔ rejects private narrower reader envelope types (288.122583ms)
  ✔ rejects private reader schemas for persisted envelope parsing (245.396083ms)
  ✔ rejects non-canonical Zod schemas for persisted envelope fields (151.882917ms)
  ✔ accepts canonical contract variant helpers only inside canonical declarations (168.087458ms)
  ✔ ignores ordinary object literals with matching envelope property names (155.646666ms)
✔ type-safe persisted serdes rule (2177.930333ms)
▶ unique exported type names
  ✔ rejects independently declared exported AppState contracts (912.558541ms)
  ✔ accepts a re-export of the canonical AppState declaration (507.257209ms)
✔ unique exported type names (1420.516584ms)
▶ unused code rule
  ✔ treats exported declarations from public package entrypoints as roots (591.089542ms)
  ✔ reports declarations not reachable from configured entrypoints (620.883292ms)
  ✔ does not report unused declarations when the rule is omitted (316.889708ms)
  ✔ follows exported variables through cross-workspace re-exports (406.457709ms)
  ✔ treats class extends expressions as value references (111.969167ms)
  ✔ follows value and type declarations through local star re-exports (106.243417ms)
  ✔ follows imported module initialization (124.656625ms)
  ✔ follows dynamically imported exports and module initialization (108.634917ms)
  ✔ follows shorthand property value references (97.773834ms)
  ✔ treats global augmentation contracts as type roots (96.342083ms)
✔ unused code rule (2582.058333ms)
▶ versioned data contracts rule
  ✔ accepts exact readers and no adapters when none are required (635.491458ms)
  ✔ reports missing readers and downgrade adapters (244.49875ms)
  ✔ checks a selected valid family without checking an unrelated invalid family (152.30525ms)
  ✔ checks selected families in configuration order (170.2295ms)
  ✔ reports every selected family missing from the manifest (123.611292ms)
  ✔ rejects empty and duplicate family selections at the configuration boundary (10.2295ms)
  ✔ validates duplicate manifest IDs before applying selection (105.596791ms)
  ✔ checks every manifest family when selection is omitted (135.836833ms)
✔ versioned data contracts rule (1578.8295ms)
ℹ tests 80
ℹ suites 14
ℹ pass 80
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3268.188167

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1245 files: no violations found.

~~~

## Native evidence context

The explicit native suite recorded 35 passing cases and one failure caused by an incorrect directory echo in the final model reply. The unchanged exact checkout case passed on isolated rerun. Those historical logs are retained in tmp/interface-native-acceptance.log and tmp/interface-native-cwd-revalidation.log; they are not represented as an all-green native-suite invocation by this assessment.
