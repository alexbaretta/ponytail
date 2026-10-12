# Interface batch: OBL-110

Source revision: ff5bb07fa70e982208ec52975108b6638e2a6fa0. Baseline: BASELINE-16. Binding: BIND-121.

Condition: Explicit binding-aware rolling campaigns persist frozen coordinator-authorized execution leases in PostgreSQL allocation state, fence changed scope and stale generations, and require a stopped retained owner before adopting a revised binding and resuming its original session.

Criterion: Typed physical V2 configuration/scope readers preserve historical V1 meaning. Real PostgreSQL/Git proof establishes explicit coordinator history identity, serialized allocation, frozen complete permissions, rejection of stale graph/generation or changed binding use, stopped-owner-only revision adoption, resume-first retained session/generation behavior and rejected unresolved external actions. Strict build, unchanged TSTS, runtime maps and traceability pass. This store boundary does not establish worker delivery or candidate acceptance integration; those remain required before amended edits are assigned through the application workflow.

New leased and unleased allocation scopes emit exact V3 with an execution.kind discriminator. Leased execution keeps one complete frozen lease; unleased execution keeps declared paths. Historical V1/V2 scopes normalize at the boundary while database bytes stay unchanged. Real PostgreSQL exercises contention, stale-generation fencing, stopped-owner rebind, original-session resumption, current certificate acceptance and normal publication with the new representation.

Eighteen focused component tests, five real PostgreSQL storage/lifecycle/publication scenarios and two real CLI/MCP parity/closure scenarios pass with no failures, skips or cancellations. Full clean-tree npm acceptance passes all 883 Node tests across its five reported families and the configured installer/structural checks. TSTS, traceability, runtime synchronization, rules, versions, manifests, adapters and registry pass. Strict root compilation is reused after its final relevant input edit. The clean source proof revision is retained; intervening commits change only plan records, not product or QA inputs. Prerequisite CERT-137–139 were freshly accepted before this renewal. The two configuration/scope assessments are renewed under the normative latest-only writer constraint, preserving exact historical readers and their evidence. Final whole-campaign freshness renewal and rollup acceptance remain separate; no historical assessment is silently renewed. Historical assessments are retained without a freshness-renewal claim.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configured connection.

## node --test dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-operations.test.js

2026-10-12T04:48:59.450Z – 2026-10-12T04:48:59.720Z

~~~text
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (27.296834ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (13.690583ms)
✔ V3 configuration normalizes historical inputs without changing their bytes (60.437583ms)
✔ V3 assignment execution is explicit and historical scopes normalize without widening authority (1.035291ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.299375ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.848666ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (0.727208ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (57.220833ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (113.792458ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.539958ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.614708ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.429416ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.277791ms)
✔ V2 cleanup declaration preserves V1 physical meanings and normalizes unknown retirement safely (0.376959ms)
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (8.728917ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.230375ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.128959ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.130958ms)
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 233.158083

~~~

## node --test --test-name-pattern=serializes allocation|mainline normal publication|integrated certificate dist/tests/rolling-campaign-store.integration.test.js

2026-10-12T04:48:59.740Z – 2026-10-12T04:49:43.731Z

~~~text
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (9085.783333ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (6171.379ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (6726.996333ms)
✔ integrated certificate assessment uses retained published proof and serializes accepted record publication (9844.87925ms)
✔ mainline normal publication retains one observation and synchronizes the campaign after restart (11842.870875ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 43834.108208

~~~

## node --test dist/tests/rolling-operations.integration.test.js

2026-10-12T04:49:43.749Z – 2026-10-12T04:49:48.424Z

~~~text
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (3453.129375ms)
✔ closure requires fresh evidence, persists an immutable receipt and fences later mutations (1116.518375ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4640.253458

~~~

## npm run check:traceability

2026-10-12T04:49:48.442Z – 2026-10-12T04:49:49.387Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json

Traceability checked 827 relationships: no violations found.

~~~

## npm run check:tsts

2026-10-12T04:49:49.407Z – 2026-10-12T04:49:51.802Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1253 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T04:49:51.818Z – 2026-10-12T04:49:51.852Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-12T04:49:51.867Z – 2026-10-12T04:49:51.900Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-12T04:49:51.916Z – 2026-10-12T04:49:51.948Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-12T04:49:51.964Z – 2026-10-12T04:49:51.997Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-12T04:49:52.012Z – 2026-10-12T04:49:52.046Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-12T04:49:52.061Z – 2026-10-12T04:49:52.094Z

~~~text
Validated 39 registry entries.

~~~

## npm test

2026-10-12T04:47:14.278962+00:00 – 2026-10-12T04:52:20.940598+00:00

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

Traceability checked 827 relationships: no violations found.
✔ Ponytail forbids meaningless approval requests for agent-caused repairs (0.872833ms)
✔ Ponytail keeps mechanical blockers agent-owned (0.478667ms)
✔ plan execution applies the same guard before returning control (0.434ms)
✔ license and attribution retain both contributors (1.203833ms)
✔ modified canonical policy and runtime sources carry combined notices (0.4865ms)
✔ configuration requires exact versioned adapter and target ownership (1.169333ms)
✔ durable build-impact contracts have exact reader owners (1.281ms)
✔ TypeScript adapter reports compiler and configured inputs only (106.722875ms)
✔ V2 glob inputs select non-TypeScript build inputs without selecting tests (50.957375ms)
✔ TypeScript adapter requires a pre-deletion query for unmatched missing paths (82.070792ms)
✔ global inputs affect every configured target (3.154875ms)
✔ build-impact configuration does not affect product build targets implicitly (40.843792ms)
✔ dispatcher composes TypeScript and multiple custom adapters (115.706459ms)
✔ one failed adapter preserves successful target results (74.11125ms)
✔ custom adapters cannot report unowned targets (39.590917ms)
✔ custom adapters cannot expand the intended changed path set (40.373083ms)
✔ CLI handles spaces and emits no compiler input inventory (83.7565ms)
✔ configuration and compiler failures are indeterminate (39.152208ms)
✔ non-compiler paths skip TypeScript resolution (1.067875ms)
✔ changed paths cannot escape the project root (1.693375ms)
✔ human report aligns census columns after long identifiers (0.705083ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (35.968125ms)
✔ campaign graph exposes detailed planning review without an execution lease (23.674791ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (333.55725ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (206.584542ms)
✔ campaign report and graph accept an initial planning-only sprint (174.827958ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (156.848167ms)
✔ lists plan sources without parsing and exposes canonical source parsing (25.801042ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (28.405875ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (21.971792ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (140.977708ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (637.817166ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (201.322959ms)
✔ omitted report input requires exactly one campaign containing active plans (117.713833ms)
✔ bare plan names fail explicitly when missing or ambiguous (53.322334ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (70.236625ms)
✔ selected campaign validates direct dependency membership and cycles (35.196125ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (33.472916ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (121.75975ms)
✔ V1 report reader rejects unknown output fields (96.513042ms)
✔ production module uses exact exit and stream contracts without mutation (879.571208ms)
✔ ponytail dispatches campaign reporting through the production module (3161.866292ms)
✔ coordinator handoff preserves unfinished assignments and started host operations (129.127417ms)
✔ reservation audit distinguishes retained workers, provisioned sessions, and unresolved starts (411.916833ms)
✔ reservation audit CLI reports a scoped versioned inventory without mutating the ledger (197.6345ms)
✔ unfinished assignment continuation requires the original idle session and live checkout (600.498375ms)
✔ retirement fences the original archived session and reclaims only its authenticated worktree (1829.431958ms)
✔ historical ledgers normalize recovery and cleanup actions and the current writer emits V9 (102.259708ms)
✔ historical cleanup actions gain the original session required for retirement (106.917125ms)
✔ reconciliation reserves existing active plans without fabricating workers and is idempotent (210.713542ms)
✔ reconciliation refuses unauthenticated and contradictory ledgers without partial adoption (153.832291ms)
✔ reconciliation retains dependency waits and an existing pending action (141.567958ms)
✔ campaign reconcile CLI reserves an active leaf once before normal dispatch (489.121958ms)
✔ status reports active plan, session, and worktree conflicts while mutations fail closed (107.836917ms)
✔ V11 status exposes session, worktree, activity, assignment, action, and conflict views (119.446458ms)
✔ stale host observations are diagnosed and block mutation (96.097834ms)
✔ campaign observe persists a normalized host snapshot and returns V11 status (229.074625ms)
✔ worker delivery accepts only an exact clean revision with committed evidence (468.998167ms)
✔ reconciler derives dependency-ready plans and only truly idle workers (109.450708ms)
✔ runnable-plans joins satisfied plan dependencies with nonempty canonical tasklet readiness (919.043209ms)
✔ runnable execution diagnostics persist scoped host refusals without changing action identity (182.171542ms)
✔ historical runnable summaries normalize unknown execution evidence without inventing counts (0.158625ms)
✔ tasklet exhaustion suppresses new, queued, and unstarted dispatch without changing started identity (152.591959ms)
✔ schedule-ready deterministically reserves every runnable plan once within project capacity (259.081042ms)
✔ schedule-ready reuses every safe idle pair despite grandfathered excess reservations (290.006708ms)
✔ review-only scheduling reuses one original idle pair without making unreviewed tasklets executable (223.509083ms)
✔ initial planning uses an idle campaign pair while independent implementation retains its own pair (439.88125ms)
✔ planning worker can refresh its pending attachment after a clean integrated fast-forward (643.873292ms)
✔ retry-dispatch persists one fenced successor across CLI restarts and retains unknown capacity (1149.961417ms)
✔ fenced retry reuses an original idle pair for review when implementation readiness became review-only (181.39125ms)
✔ retry-dispatch rejects unavailable authority, observation, readiness and owned identities (845.82625ms)
✔ retry revocation fences an attachment that resolved its capability before acquiring the binding lock (163.77275ms)
✔ runnable-plan output rejects empty tasklet sets and unsupported or ambiguous records (0.219833ms)
✔ advance durably selects one ready plan and returns the same pending action on retry (83.293084ms)
✔ independent dispatch continues while the integration lane has one outstanding rebase (98.671292ms)
✔ an outstanding rebase pins the integration revision until its named result (110.2375ms)
✔ a proven unstarted stale dispatch is postponed while a started dispatch retains its identity (132.37775ms)
✔ never-started reservation releases after coordinator closure without claiming worker retirement (126.690958ms)
✔ closed reservation release refuses started or provisioned worker identities without mutation (562.351667ms)
✔ ready actions exclude blocked and started dispatch without mutating durable state (69.237209ms)
✔ ready actions expose only a fresh, idle original provisioned bootstrap as resume-only (164.619958ms)
✔ advance reuses a clean idle worker before requesting a new worker (82.528833ms)
✔ reuse attachment rejects a different session in the reserved worktree (235.03675ms)
✔ schedule-ready does not enroll an unrelated idle host chat for reuse (126.529583ms)
✔ integrated completed workers become reusable when another plan is ready (139.069667ms)
✔ integrated waiting workers become reusable when another plan is ready (143.845709ms)
✔ advance retains every completed pair even without ready dispatch (303.496083ms)
✔ foreign campaign sessions do not consume the current campaign capacity (97.256834ms)
✔ one working campaign session leaves independent ready plans dispatchable (153.753584ms)
✔ a historical imported worker without current-campaign creation cannot be reused or counted (79.196458ms)
✔ a historical foreign reuse reservation is not executable (115.17275ms)
✔ historical automatic cleanup is superseded without deleting or fabricating success (64.249959ms)
✔ completed work is classified by Git ancestry and fast-forward merged exactly once (271.193041ms)
✔ ready fast-forward join outranks unrelated assignment-state reconciliation (234.874291ms)
✔ verified worker delivery integrates before plan closure and cleanup waits for closure (309.693333ms)
✔ an open merged plan accepts a second delivery from its original assignment (848.765041ms)
✔ worker delivery resolves a closed plan by stable identity before its lifecycle move is integrated (885.549959ms)
✔ authenticated dispatch stays valid while its worker activates an open plan and integrates activation (1111.812333ms)
✔ working workers retry optimistic deliveries after a competing fast-forward join (1553.119375ms)
✔ waiting worker delivery remains integrable before and after its checkout disappears (856.961791ms)
✔ missing undelivered checkout can be re-provisioned in the same session without an archived artifact (447.544584ms)
✔ delivered waiting worker with a missing checkout recovers before rebase and preserves delivery (933.464416ms)
✔ missing worker checkout without verified delivery remains blocking (87.816334ms)
✔ completed divergent work requires rebase and cannot merge (179.915125ms)
✔ campaign status and advance CLI expose stable JSON and do not duplicate dispatch (404.114125ms)
✔ implicit campaign selection reports every active candidate while explicit selection succeeds (258.025333ms)
✔ action results require an explicit campaign and advance holds the worktree lock (42.907542ms)
✔ CLI shell scripts are parse-safe (203.992792ms)
✔ ponytail help publishes campaign, plan-input, index, and plan command families (298.394208ms)
✔ QA omits campaign census and the CLI dispatches it through campaign (0.261167ms)
✔ combined installer installs Codex skills and CLI tools only (1097.86775ms)
✔ plan_pdf renders the manifest and optionally ordered sprints (420.948375ms)
✔ plan_pdf validates its plan, output, and renderer (42.644084ms)
✔ audit_pm accepts the mandated PM structure (119.515208ms)
✔ audit_pm requires valid project journal configuration (138.897375ms)
✔ audit_pm reports non-fixable structural deviations without mutation (168.464375ms)
✔ audit_pm --fix date-prefixes tracked plans and bugs from oldest Git history (286.569209ms)
✔ audit_pm --fix leaves untracked records and collisions unchanged (297.409583ms)
✔ audit_pm --dryrun previews fixes with or without --fix (816.034834ms)
✔ plan_stats counts open and done task lines from the exact plan (113.831167ms)
✔ plan_stats rejects missing and non-basename plan names (65.031916ms)
✔ bug_stats counts lifecycle files on or after an inclusive date (176.036375ms)
✔ bug_stats validates its date argument (71.842459ms)
✔ project journal rejects missing configuration and split commands (153.181042ms)
✔ project journal detaches heartbeats and recovers stale locks (6277.053625ms)
✔ project journal initializes a stable V1 project configuration (686.304666ms)
✔ project database setup provisions journal and project-index contracts (486.430167ms)
✔ project journal initialization accepts explicit non-secret connection settings (1017.60975ms)
✔ journal contracts retain a stable relational core and versioned JSON payload (0.242416ms)
✔ project index contract retains a stable relational and search core (0.318042ms)
✔ CLI installer installs all tools and verifies owned updates (212.756833ms)
✔ CLI installer supports selection and refuses unowned collisions (81.428792ms)
✔ CLI installer prompts for or explicitly updates Bash PATH (204.955958ms)
✔ CLI installer dry-run does not modify the target home (40.969542ms)
✔ cloud CLI recovery uses only the configured identity and command (0.514541ms)
✔ cloud CLI recovery distinguishes authentication from other failures (0.124333ms)
✔ registry contains the base command (0.437167ms)
✔ every registered command ships a Claude commands/*.toml (0.140708ms)
✔ every OpenCode command matches its generated adapter (0.588541ms)
✔ declined and noninteractive proposals leave user state unchanged (212.38175ms)
✔ accepts imported, baseline, and project rules into reconstructible state (206.5295ms)
✔ changed project policy requires its exact new proposal digest (597.003125ms)
✔ restores Codex rules from accepted Ponytail state (216.489584ms)
✔ upgrades V1 accepted state without reading foreign project worktrees (101.550083ms)
✔ V2 migration ignores malformed foreign accepted project data (105.867ms)
✔ keeps project policies in separate project-local projections (288.526667ms)
✔ rejects symlinked policy outputs and malformed project directives (261.23325ms)
✔ is installable as a selected Ponytail CLI tool (873.844125ms)
✔ copilot plugin command directory includes ponytail-debt (0.860292ms)
✔ debt surfaces use the project-neutral marker and canonical document (0.843958ms)
✔ debugging applies beyond user-facing and planned bugs (0.488917ms)
✔ debugging requires differential diagnosis before repair (0.14325ms)
✔ debugging prevents expensive and repeated guess-and-check runs (0.106ms)
✔ debugging defines safe stateful restart and outcome metrics (0.075ms)
✔ debugging harvests only confirmed independent pattern observations (0.73625ms)
✔ pattern observations preserve evidence without premature categories (0.11525ms)
✔ specialized workflows delegate diagnosis to debugging (0.071209ms)
✔ diagnostic observations cannot become product failures (0.997833ms)
✔ hard assertions require an invalid continuation path and proof (0.10275ms)
✔ distribution contains the live-development harness only (875.857333ms)
✔ Hermes plugin manifest matches runtime skills, hooks, commands, and package version (1.253666ms)
✔ Hermes plugin registers every shipped skill under the ponytail namespace (91.421916ms)
✔ Hermes plugin builds mode-aware injected context from the canonical skill (43.561333ms)
✔ Hermes mode config respects env, config file, off, and invalid command behavior (43.131167ms)
✔ Hermes plugin review mode injects the real review skill body (42.872417ms)
✔ Hermes /ponytail command changes mode and pre_llm_call injects current context (48.440541ms)
✔ Hermes gateway rewrite respects slash access denial (41.443458ms)
✔ Hermes gateway rewrite preserves every skill command and ignores unrelated text (39.497833ms)
✔ every commandWindows uses PowerShell $env: syntax, not cmd.exe %VAR% (3.132792ms)
✔ shared hook commands avoid POSIX-only guard syntax (0.269375ms)
✔ shared hook commands are shell-agnostic (no bash-only exec prefix) (0.267917ms)
✔ every hook command points at a script that ships in hooks/ (0.302958ms)
✔ ponytail-mode-tracker self-exits when stdin never closes (no freeze) (1046.345416ms)
✔ Claude points at the hook config and Codex uses auto-discovery (0.314667ms)
hook compatibility checks passed
✔ tests/hooks.test.js (1121.26825ms)
✔ imported skills have valid metadata and attribution (8.932958ms)
✔ versioned contract schema is valid JSON with a portable identifier (0.1765ms)
✔ indeterminate lists require bounded infinite scrolling (0.435709ms)
✔ indeterminate lists prohibit request fanout (0.09075ms)
✔ issue intake uses configured type ownership without promoting requirements (0.818708ms)
✔ requirements activate only for standalone authorization or begun planned implementation (0.25525ms)
✔ JSON manifests match canonical repeated metadata (1.0275ms)
✔ Codex marketplace installs Ponytail from this checkout (0.44625ms)
✔ Hermes manifest is generated from package and registry metadata (0.916958ms)
▶ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI
  ✔ Step 1: canonical glossary and unresolved legacy DONE (135.930875ms)
  ✔ Step 2: frozen assignment and candidate delivery never discharge (274.937208ms)
  ✔ Step 3: bounded neutral preparation and honest productive downstream growth (438.022792ms)
  ✔ Step 4: complete inventories and no-edit assessments reach zero (1029.5365ms)
  ✔ Step 5: stale inputs reopen original identities and require disturbance (423.507958ms)
  ✔ Step 6: activated successor preserves IDs and old unresolved history (335.597125ms)
✔ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI (2761.287292ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (145.796625ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1457.954583ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (277.2695ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (332.364375ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (185.715708ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.328625ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (558.034542ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (4.624167ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (395.793042ms)
✔ shared vocabulary resolves from each owner and generated resource (2.982917ms)
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.559541ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.239125ms)
✔ api-service-boundaries: description is one line under 160 chars (0.056708ms)
✔ api-service-boundaries: referenced resources are packaged (0.146792ms)
✔ architecture: committed OpenClaw skill matches the generator (0.287125ms)
✔ architecture: body contains the canonical skills/architecture body (0.115084ms)
✔ architecture: description is one line under 160 chars (0.040375ms)
✔ architecture: referenced resources are packaged (0.074417ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.150708ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.147375ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.045916ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.077291ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.142ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.139041ms)
✔ build-impact: description is one line under 160 chars (0.039042ms)
✔ build-impact: referenced resources are packaged (0.104875ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.118791ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.0785ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.025541ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.052041ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.097375ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.074416ms)
✔ codex-execpolicy: description is one line under 160 chars (0.023916ms)
✔ codex-execpolicy: referenced resources are packaged (0.064417ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.360916ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.117083ms)
✔ cross-session-effects: description is one line under 160 chars (0.036625ms)
✔ cross-session-effects: referenced resources are packaged (0.089791ms)
✔ debugging: committed OpenClaw skill matches the generator (0.137542ms)
✔ debugging: body contains the canonical skills/debugging body (0.107ms)
✔ debugging: description is one line under 160 chars (0.019125ms)
✔ debugging: referenced resources are packaged (0.107583ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.111083ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.086667ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.021167ms)
✔ diagnostic-assertions: referenced resources are packaged (0.062291ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.121416ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.082875ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.025958ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.058042ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.135542ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.756916ms)
✔ issue-tracking: description is one line under 160 chars (0.04025ms)
✔ issue-tracking: referenced resources are packaged (0.129209ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.130792ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.088375ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.018625ms)
✔ lossless-json-contracts: referenced resources are packaged (0.064416ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.146792ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.085917ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.016459ms)
✔ monetary-contract-safety: referenced resources are packaged (0.05075ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.298708ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.26325ms)
✔ plan-execution: description is one line under 160 chars (0.032ms)
✔ plan-execution: referenced resources are packaged (0.231959ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.229084ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.224083ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.020959ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.18225ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.154709ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.642459ms)
✔ ponytail: description is one line under 160 chars (0.093333ms)
✔ ponytail: referenced resources are packaged (0.183708ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.135916ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.097625ms)
✔ ponytail-audit: description is one line under 160 chars (0.020375ms)
✔ ponytail-audit: referenced resources are packaged (0.056416ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.151125ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.086541ms)
✔ ponytail-debt: description is one line under 160 chars (0.019166ms)
✔ ponytail-debt: referenced resources are packaged (0.045625ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.12375ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.085208ms)
✔ ponytail-review: description is one line under 160 chars (0.767542ms)
✔ ponytail-review: referenced resources are packaged (0.0755ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.158167ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.124833ms)
✔ project-structure: description is one line under 160 chars (0.017042ms)
✔ project-structure: referenced resources are packaged (0.094916ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.120708ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.08825ms)
✔ production-test-boundaries: description is one line under 160 chars (0.015417ms)
✔ production-test-boundaries: referenced resources are packaged (0.052875ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.113208ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.123083ms)
✔ react-error-containment: description is one line under 160 chars (0.014959ms)
✔ react-error-containment: referenced resources are packaged (0.059583ms)
✔ requirements: committed OpenClaw skill matches the generator (0.162667ms)
✔ requirements: body contains the canonical skills/requirements body (0.123083ms)
✔ requirements: description is one line under 160 chars (0.017208ms)
✔ requirements: referenced resources are packaged (0.086959ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.152708ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.12525ms)
✔ requirements-traceability: description is one line under 160 chars (0.015375ms)
✔ requirements-traceability: referenced resources are packaged (0.085958ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.09825ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.090334ms)
✔ semantic-rebase: description is one line under 160 chars (0.016083ms)
✔ semantic-rebase: referenced resources are packaged (0.0515ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.110208ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.084084ms)
✔ static-type-safety: description is one line under 160 chars (0.016792ms)
✔ static-type-safety: referenced resources are packaged (0.05675ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.177291ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.112958ms)
✔ test-credentials: description is one line under 160 chars (0.015625ms)
✔ test-credentials: referenced resources are packaged (0.068125ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.121333ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.091542ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.016084ms)
✔ typescript-unit-testing: referenced resources are packaged (0.058709ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.104458ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.094708ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.015666ms)
✔ user-acceptance-testing: referenced resources are packaged (0.067584ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.104834ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.086083ms)
✔ ux-testing: description is one line under 160 chars (0.015333ms)
✔ ux-testing: referenced resources are packaged (0.058542ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.098833ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.073167ms)
✔ variant-neutrality: description is one line under 160 chars (0.016375ms)
✔ variant-neutrality: referenced resources are packaged (0.064625ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.809041ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.145ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.020542ms)
✔ versioned-data-contracts: referenced resources are packaged (0.136292ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.117084ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.084625ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.016125ms)
✔ worktree-lifecycle: referenced resources are packaged (0.066917ms)
✔ generated resources omit canonical relationship annotations (1.060959ms)
✔ system.transform injects the ruleset at the default mode (full) (2.841ms)
✔ command.execute.before persists /ponytail ultra, transform follows it (0.770834ms)
✔ /ponytail off disables compaction but preserves core policy (1.039375ms)
✔ system.transform merges into existing system entry (Qwen compat, #296) (0.418625ms)
✔ unsupported /ponytail arguments do not reset the current mode (0.830333ms)
✔ unrelated commands do not touch the flag (0.288208ms)
✔ parseCommandFile reads frontmatter description + body, LF and CRLF (1.300458ms)
✔ parseCommandFile returns null when there is no frontmatter (0.296542ms)
✔ root npm test delegates only to the core suite (0.9235ms)
✔ CI installs MCP dependencies before root npm test (0.228625ms)
✔ npm package ships the advertised cleanup script (0.588125ms)
✔ Codex campaign workers establish and retain native assignment Goals before work (0.711292ms)
✔ plan execution serializes fast input before selector-based resumption (0.7945ms)
✔ campaign policy requires repository inventory and V2 direct dependencies (1.022292ms)
✔ serial plan execution does not require the deprecated scheduler (0.455291ms)
✔ deprecated scheduler preserves durable actions and worker-owned recovery (1.089375ms)
✔ planning and issue policy records prospective traceability without claiming coverage (0.42175ms)
✔ standalone and planned issue execution share the implementation activation gate (0.956625ms)
✔ starting policy admits only expressly owned reproduced failures and preserves final gates (0.286084ms)
✔ coordinator binding lets composer enqueue derive the campaign (241.693209ms)
✔ blocker reporting authenticates the native coordinator across separate hook and command environments (427.655166ms)
✔ worker attach is one-time, status re-roots, and worker mutations fail closed (1586.139083ms)
✔ coordinator bindings are exclusive, releasable, and fail closed (450.341583ms)
✔ one coordinator session binds several campaigns while unscoped enqueue stays unambiguous (605.560166ms)
✔ producer hook ignores unrelated boundaries and never consumes a queue (411.247083ms)
✔ code-mode coordinator command establishes the same binding (256.645583ms)
✔ free-form code-mode input binds and releases only the authenticated coordinator (547.758792ms)
✔ ponytail pm pdf handles Ctrl-C without a Python traceback (915.629958ms)
✔ ponytail pm pdf renders configured collections in index order (886.516ms)
✔ ponytail pm pdf all renders every configured collection (756.070542ms)
✔ ponytail pm pdf rejects unlisted pages and invalid configuration paths (740.364375ms)
✔ ponytail pm pdf reports missing render dependencies (679.74125ms)
✔ deprecated campaign scheduler owns observation and diagnostic priority (0.657916ms)
✔ portable policy loads only safe developer-private project instructions (0.809417ms)
✔ every compaction level preserves all always-on rules (1.904708ms)
✔ compaction level changes only its selected table row (0.604667ms)
✔ runtime policy comes from the canonical skill, not root AGENTS.md (0.171875ms)
✔ Ctrl-C is quiet in the wrapper and waits for delegated cleanup (1748.058541ms)
✔ register initializes and registers the enclosing Git root idempotently (1308.378792ms)
✔ V1 user configuration remains readable and upgrades through the V2 writer (1273.936208ms)
✔ pre-commit composes with an existing shell hook idempotently (2209.227ms)
✔ concurrent register calls retain both registrations (777.987917ms)
✔ register rejects a symlinked policy and malformed user configuration (559.104ms)
✔ update-permissions isolates every project policy from every other project (2094.168458ms)
✔ update-permissions reads policy from the invoking worktree instead of the blessed worktree (869.463916ms)
✔ CLI installer links the checkout and the installed command updates skills (1597.705167ms)
✔ update refreshes Codex skills and permissions without installing the CLI (1287.064209ms)
✔ test mechanisms stay outside production artifacts (0.675334ms)
✔ integration tests prove the real isolated product path (0.10925ms)
✔ execution profiles preserve one Arc and test-owned state (0.094667ms)
✔ integration terminology has one canonical hierarchy (0.345375ms)
✔ integration failure policy stops one Arc and continues the run (1.298458ms)
✔ incremental commit preparation never rereads already indexed Git blobs (247.714125ms)
✔ parses exact repository grep selectors and paths (0.546042ms)
✔ parses exact repository index worker and transaction options (0.2355ms)
✔ index progress emits cumulative markers, throughput ETA, and final publication phase (0.287541ms)
✔ index progress extends one durable total for a late history snapshot (0.09ms)
✔ index progress ends interrupted lines and handles a zero-commit update (0.086125ms)
✔ TTY index progress renders the installed open-source bar with percent and explicit ETA (15.30075ms)
✔ collects exact Git state and only normalized traceability content (358.806916ms)
✔ replaces renamed configured paths without retaining deleted inputs (212.200625ms)
✔ projects explicit inventories and stable prospective planning entities (243.983542ms)
✔ does not parse files already present in the immutable cache (200.921375ms)
✔ publishes a complete generation with parameterized statements (177.66925ms)
✔ rolls back failed and contended publications (188.603833ms)
✔ rejects malformed durable cache payloads before publication (192.568958ms)
✔ parses exact search filters and rejects ambiguous options (0.219459ms)
✔ parses mutually exclusive validation scopes (0.123833ms)
✔ reports every directional cardinality gap without counting prospective roles (8.007875ms)
✔ validates only the exact fresh indexed graph and emits typed gaps (315.887958ms)
✔ derives exact plan and campaign entity closure through canonical membership and issue links (112.984542ms)
✔ searches only the exact fresh generation with bound filters (398.931291ms)
✔ refuses stale search without rebuilding (403.336125ms)
✔ indexes canonical plan hierarchy and separates legacy, invalid, and stranded plans (486.610334ms)
✔ indexes planning-only sprints while enforcing executable and tasklet-graph headings (2630.025875ms)
✔ reuses immutable cached plan parses without opening the source parser (375.50325ms)
✔ classifies missing-parent and cyclic plan records as invalid rather than stranded (0.20775ms)
✔ strands a member whose campaign does not reference it (0.108833ms)
✔ parses exact plan search and graph query arguments (0.202541ms)
✔ searches the exact fresh plan generation with bound filters (506.590541ms)
✔ refuses stale plan queries without rebuilding (472.627375ms)
✔ queries plan descendants, roots, and stranded records from the fresh generation (1153.479125ms)
✔ project-configurable skills define their AGENTS.md keys and defaults (1.240416ms)
✔ every command distinguishes missing Git from absent registration (3031.5ms)
✔ local QA ignores a removed project while global validation identifies it (2192.2425ms)
✔ local QA is independent of invalid campaign configuration (871.475625ms)
✔ blessing selects one clean tracked worktree and both command spellings report it (854.03225ms)
✔ register resolves linked worktrees to the main checkout and validate checks local setup (725.042792ms)
✔ registration and validation protect developer-private agent instructions (875.056709ms)
✔ project metadata retains exact V1 reads and upgrades through V2 writers (556.140292ms)
✔ project metadata versions retain their exact required fields (312.527ms)
✔ project metadata V2 requires unique explicit dependencies (418.092584ms)
✔ validation requires both project configuration files to be tracked (331.543875ms)
✔ manual component registration is idempotent and unregistration is explicit (1270.700375ms)
✔ concurrent component registrations preserve both names (344.109667ms)
✔ component detection registers every named tracked JavaScript package (743.2375ms)
✔ component detection populates newly registered configuration before its first commit (276.238792ms)
✔ component detection parses every manifest before changing metadata (397.955875ms)
✔ validate and qa ignore identities owned only by another registered project (3195.911125ms)
✔ pre-commit does not acquire foreign identities from registration (1396.64475ms)
✔ pre-commit ignores dirty foreign configuration while global validation reports it (1575.039667ms)
✔ pre-commit remains independent of a foreign Ponytail registration (4627.11075ms)
✔ installed skill state does not introduce foreign project identities into QA (7759.843416ms)
✔ commit -am keeps its temporary index out of foreign repository checks (1289.757292ms)
✔ registration and validation leave pre-commit installation optional (472.558833ms)
✔ foreign-reference exceptions remain unused when QA has no foreign catalog (2383.873209ms)
✔ local dependency manifests are validated without loading foreign package identities (2625.7535ms)
✔ explicit dependency commands manage local metadata without making QA read the foreign project (3261.866375ms)
✔ reference QA does not derive identities from another registered project (968.891459ms)
✔ reference QA remains independent of components registered to another project (1976.866583ms)
✔ reference QA always permits Ponytail and its components (652.812584ms)
✔ blessing a foreign worktree does not change local QA (1570.63ms)
✔ local QA ignores foreign snapshot refresh while explicit global validation reports staleness (1795.346834ms)
✔ canonical foreign component mutation does not affect local QA (932.317917ms)
✔ local QA uses a snapshot when blessing is absent and global validation fails (1470.156209ms)
✔ legacy registrations warn locally and fail explicit global validation (1059.806041ms)
✔ gitlink validation remains local and independent of foreign project identity (1377.213083ms)
✔ manifest readers identify direct dependencies across supported managers (286.934833ms)
✔ malformed metadata and untracked dependency declarations fail explicitly (746.888416ms)
✔ reference scope and diagnostic format ignore Git grep user preferences (3265.86925ms)
✔ qoder plugin manifest exists and has required fields (0.599792ms)
✔ qoder hooks config exists and registers UserPromptSubmit (0.179125ms)
✔ qoder rules file exists and is non-empty (0.182916ms)
✔ qoder manifest points at skills that actually ship (0.172125ms)
✔ qoder runtime detects QODER_SESSION_ID and writes hookSpecificOutput JSON (0.806167ms)
✔ canonical registry matches all live-development sources (3.587792ms)
✔ registry rejects duplicate entries (0.309375ms)
✔ registry rejects bundled and multiply owned project skill names (0.266083ms)
✔ published surfaces must be registered for their host (0.36225ms)
✔ worktree indexing tolerates peer commits while fencing caller HEAD and content (5789.173709ms)
✔ configured checker validates structural and semantic locators together (929.058333ms)
✔ traceability has one canonical forward mapping and three roles (0.564125ms)
✔ traceability requires implementation, unit, integration, and UAT coverage (0.09525ms)
✔ TSTS owns only semantic TypeScript traceability (0.072667ms)
✔ retains exact V1 reads and validates latest V2 search policy (10.522375ms)
✔ reads an exact V4 directional validation matrix (4.396833ms)
✔ reads exact V3 entity declarations and prospective planning roles (4.298666ms)
✔ rejects malformed V3 entities and never counts prospective work as actual coverage (11.45725ms)
✔ generates one reverse view and validates complete structural coverage (2.37425ms)
✔ reports unknown IDs, missing classes, unresolved locators, and stale reverse views (2.726416ms)
✔ accepts a justified no-unit-test disposition only for unit coverage (2.070625ms)
✔ recognizes only canonical Markdown requirement declarations (8.761875ms)
✔ allows one path to carry disjoint class-valid role filters (10.348875ms)
✔ rejects generated relationship copies and unsafe or unknown configuration (2.576333ms)
✔ generated runtime registry matches its canonical source (2.49925ms)
✔ Hermes registers skills from generated registry data (0.252625ms)
✔ Pi registers auxiliary commands from generated registry data (2.994166ms)
✔ planned work classifies QA eligibility by configured consumers (1.035709ms)
✔ planned work assigns the smallest sufficient proof to each gate (2.017917ms)
✔ bug implementation requests authorize the complete workflow by default (0.812625ms)
✔ plan and issue identities survive lifecycle moves (0.615459ms)
✔ long-lived plan execution journals actions without blocking work (0.478875ms)
✔ portable unit-test cadence names no project tool (1.483625ms)
✔ host configuration supports named unit-test families (1.623375ms)
✔ planned work builds only targets reported by build impact (0.385ms)
✔ source-proven configuration drift is repaired without an approval stop (0.231084ms)
✔ material configuration decisions still stop without halting other ready work (0.422375ms)
✔ specialized skills leave broad gates to their owning milestones (0.473083ms)
✔ installed TSTS validates registration and checks real TypeScript contracts (2543.069708ms)
✔ TypeScript test metadata is owned by project configuration (0.500416ms)
✔ focused tests do not fall back to the full suite (0.083375ms)
✔ valid and invalid test values preserve their real contracts (0.06825ms)
✔ behavioral doubles use exact production boundary types (0.066083ms)
uninstall script checks passed
✔ tests/uninstall.test.js (263.51475ms)
✔ UX interaction comes from explicit host configuration (1.753917ms)
✔ UX validation covers the real path at complementary layers (0.119875ms)
✔ variant-specific facts come only from project configuration (0.490334ms)
✔ shared contracts isolate variant-specific structure (0.088959ms)
✔ shared operations dispatch exhaustively without fallback (0.128208ms)
✔ fifteen creation reservations bound one campaign, not another campaign or top-level project (405.405375ms)
✔ independent coordinator processes cannot both reserve the fifteenth slot (352.344208ms)
✔ an old but live project critical section cannot be stolen to overbook the pool (1390.846541ms)
▶ legacy replacement recovery returns the branch to the proven native checkout without losing merged state
  ✔ attached (791.259125ms)
  ✔ interrupted (623.791958ms)
  ✔ switched (611.347958ms)
  ✔ rebased (677.36ms)
  ✔ dirty (435.303125ms)
  ✔ unproven (310.302333ms)
  ✔ ignored (517.911333ms)
✔ legacy replacement recovery returns the branch to the proven native checkout without losing merged state (3968.108625ms)
✔ provisioned original worker upgrades integrated adoption tooling and retains exact-path recovery (2247.358875ms)
✔ bootstrap upgrade resumes every durable prefix without changing dispatch identity (3468.805833ms)
✔ bootstrap upgrade uses its owning top-level integration rather than another project sharing Git objects (515.55ms)
✔ bootstrap upgrade rejects dirty content and unintegrated targets and authenticates the original host session (769.23925ms)
✔ bootstrap upgrade preserves an ignored collision and resumes the recorded intent after its removal (555.19875ms)
✔ bootstrap V1 is immutable and normalizes without inventing upgrade intent (349.731875ms)
✔ provisioned original worker recovers before adoption and attachment without replacing its started creation (760.033417ms)
✔ original worker recovers its exact checkout from a neutral cwd without coordinator action (886.826459ms)
✔ recovery hook authenticates the exact worker before consulting its absent cwd (412.963ms)
▶ recovery refuses a symlink, occupied branch, locked registration, or unavailable source
  ✔ symlink (783.808375ms)
  ✔ occupied (498.819542ms)
  ✔ locked (450.829166ms)
  ✔ source (416.538083ms)
  ✔ branch (459.554791ms)
✔ recovery refuses a symlink, occupied branch, locked registration, or unavailable source (2610.083042ms)
✔ legacy bindings explicitly enroll recovery provenance without changing the V1 reader (499.296584ms)
✔ retained pair reattachment rotates its capability without replacing session or checkout (254.521958ms)
▶ recovery rebuilds a removed slot directory with or without a surviving Git registration
  ✔ registered=true (492.48125ms)
  ✔ registered=false (517.013042ms)
✔ recovery rebuilds a removed slot directory with or without a surviving Git registration (1009.718208ms)
✔ worker-owned recovery acknowledges the original pending action without a new coordinator observation (528.882ms)
✔ reclaims only adapter-proven abandoned worktrees and project resources across independent sessions (1488.675166ms)
✔ serializes independent maintenance sessions per project (2590.49775ms)
✔ does not couple reclamation locks for distinct projects (2750.791375ms)
✔ rejects a reclaimed result when the claim ID is concurrently reused (762.480708ms)
✔ stops before later claims when reclaim output is malformed (698.95525ms)
✔ fails closed on every untrusted lifecycle adapter form (4082.844041ms)
✔ reads exact lifecycle configuration and adapter requests (1.116042ms)
✔ normalizes exact inventory and rejects ambiguous claims (13.461666ms)
✔ reads and renders the exact command result (1.687375ms)
ℹ tests 544
ℹ suites 0
ℹ pass 544
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 61604.788042

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 test:typed
> node --test dist/tests/*.test.js

✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (9391.7175ms)
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (147.716083ms)
✔ activation write failure restores the directory and every original Markdown byte (84.08425ms)
✔ activation destination and status guards reject before changing source bytes (81.567875ms)
✔ management configuration reader requires one exact safe V1 contract (1.203ms)
✔ project-local management files preserve configuration, unsafe-file and data-error distinctions (3.505875ms)
✔ plan dependency validation accepts DAGs and rejects missing members and cycles (0.708292ms)
✔ cross-plan gates require DONE in both current contents and committed HEAD (258.106709ms)
✔ cross-plan validation rejects missing targets, completed dependents and cycles (44.303542ms)
✔ typed campaign graph retains a planning-only scope and explicit legacy obligation absence (123.123959ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.91075ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.212291ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (172.667917ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.23ms)
✔ empty valid inventory presentation retains its summary and final newline (0.087042ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.863291ms)
✔ typed validation selection retains all/json ordering and plan selection (0.111667ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.126375ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.412708ms)
✔ planning-only contents retain zero execution counts without requiring tasklet metadata (4.244833ms)
✔ execution contents retain normalized statuses, feature paths and exact ready tasklet scope (13.28325ms)
✔ physical metadata readers retain versions, normalize dependencies and expose V3 obligation identity (1.165ms)
✔ metadata rejects malformed dependencies, inconsistent prose and unsafe obligation paths (0.45825ms)
✔ selected files dispatch physical versions while text parsing uses the supplied source and preserves parse failures (3.886125ms)
✔ source listing is lexical while parsed candidates follow configured lifecycle order (17.450208ms)
✔ candidate discovery rejects absent, symlinked and physically escaping roots and unsafe lifecycle directories (3.18525ms)
✔ linked plans resolve existing directories, file fragments and physical paths while omitting missing links (3.660625ms)
✔ V1 report reader preserves input identity and historical sprint status strings (0.702041ms)
✔ V1 report reader validates count maps and nested unknown records (1.059291ms)
✔ V1 report reader retains the explicit null percentage for empty execution (0.306292ms)
✔ typed presentation retains exact header output and independently selected tables (1.06525ms)
✔ active selection and explicit child selection resolve the same complete campaign scope (14.689ms)
✔ selection preserves missing and ambiguous active campaign and plan-name diagnostics (16.22375ms)
✔ ancestry enforces parent existence, links, cycles and shared obligation scope (5.095458ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (6930.093958ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (4497.642458ms)
✔ lease use fences graph and generation, operations and exact changed paths (3542.450417ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (3075.863709ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (2890.787666ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (3221.732541ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (3190.855166ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (2878.826584ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (3396.321333ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (2916.672917ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (7459.447792ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (4320.560125ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (3496.780667ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (3097.825958ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (189.011875ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (239.168875ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (270.775333ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (554.940708ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.146833ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.537708ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (8.624208ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (5.308875ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (7.831666ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (8.749375ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.392208ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.748833ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (6.457042ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (4.215542ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (4.510167ms)
✔ stale proof forces honest disturbance before new productive acceptance (5.685041ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (1.916083ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (395.787417ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.181708ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (31.786042ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (1.888916ms)
✔ reader cannot hide declared membership from the accepted current observation (1.392208ms)
✔ serial policy preserves atomic batch and convergence boundaries (1.568667ms)
✔ campaign census policy preserves scoped reports and adds repository inventory (0.7385ms)
✔ sandbox-blocked journaling requires explicit persistent-rule authorization (0.225542ms)
✔ orchestration metadata retains every immutable reader (0.561041ms)
✔ CLI grammar preserves multiword prompts and validates lifecycle commands (1.602042ms)
✔ both producers share the exact durable V2 queue contract (15.253333ms)
✔ physical V1 remains exact but is retired from queue consumption (2.067667ms)
✔ one claim is a critical section and completion requires durable PM evidence (14.858542ms)
✔ coordinator lifecycle commands validate campaign membership (26.135583ms)
✔ CLI producer resolves a member plan to the campaign root (15.034542ms)
✔ empty campaign claim returns successful explicit JSON exhaustion (85.628667ms)
✔ CLI lists and claims pending inputs and omits completed inputs (29.954417ms)
✔ native CLI reports grammar errors without a stack trace (71.99575ms)
✔ project-local database options preserve pg defaults and password environment semantics (3.770292ms)
✔ database options reject malformed consumed configuration fields (2.124167ms)
✔ generated sprint CLI preserves planning, execution and completion JSON (187.246625ms)
✔ native sprint CLI preserves grammar error output and exit status (82.850334ms)
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (3.588583ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.222042ms)
✔ selects one V1 sprint and retains unordered-path validation (0.265583ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.167709ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (2.554ms)
✔ planning starts only after approved prerequisites and preserves blocked and eligible inputs (0.143833ms)
✔ all sprint selectors preserve canonical readonly fixture values (0.104667ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.126375ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (156.827333ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (73.505792ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.528208ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.119333ms)
✔ generated portable launch path preserves scalar selection and exact completion output (174.8245ms)
✔ adopted owning plans require their configured obligation document (115.770167ms)
✔ retains strict physical V1 parsing and scalar selection (86.622ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (5.859834ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (4.661ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (2.882917ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (3.203ms)
✔ selects the highest-ranked V2 tasklet (10.377166ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (6.983083ms)
✔ blocks tasklets until dependency-feature validation is complete (2.793ms)
✔ uses prior affinity and graph criteria deterministically (0.897ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (70.665166ms)
✔ V3 returns one complete ordered batch (3.272042ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.564167ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (8.121083ms)
✔ native code fixture approvals permit exact shell-wrapped commands only for the assigned checkout and turn (0.696791ms)
✔ real PostgreSQL records lost reviewer replacement and fences the old actor while retaining fresh review after restart (19293.623125ms)
ℹ Lost review 012a39a7-5dad-464a-aee0-43a5ce35adb3 retained unchanged; recorded replacement e2c983c4-7044-444e-bfee-5f2b67628626; old dispatch and decisions fenced after restart; fresh review pending.
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (10910.68375ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (7229.042084ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (6883.017625ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (4677.149417ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (4552.218542ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (5421.764792ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=3b21a58e658c247cd5cdc9e45831a50892214ba3; generation=8ddecd8f-005f-4558-8f37-9065acfbc960; fresh instructions completed before new allocation
✔ worker creation recovery retains uncertain ownership and attaches original initialization after restart (4469.068666ms)
ℹ worker recovery thread=thread-fixture; session=session-fixture; initialization=turn-1; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
✔ submission collection binds terminal idle actor and exact passing candidate before review (6453.15325ms)
ℹ component submission revision=9165f8cd957be918c0fd191841795b64d107a8a3; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ real PostgreSQL automatically publishes the reviewed increment through one coordinator operation (8288.226458ms)
✔ real PostgreSQL retains inspected conflict continuation across restart without duplicate replay (8200.898917ms)
✔ real PostgreSQL routes substantive integration conflicts to retained worker without changing accepted review (7279.202ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/3f58c68b-68bc-414d-b6f4-57063a30881f.
✔ substantive integration repair retains worker and reviewer through fresh proof and publication (7742.594167ms)
ℹ component submission revision=c0483e840a8dfaec7d33f15e94a190e4f66df956; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ integrated certificate assessment uses retained published proof and serializes accepted record publication (10388.075875ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/2ef7659e-8568-490d-bcbf-def43c73cd40.
✔ worker retirement revokes native ownership and fences checkout release through restartable cleanup (8022.365792ms)
ℹ component submission revision=af050be02506b99d8abe237b72ee10d1a8ddb93d; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ publication batch freezes one shared partial claim across concurrent requests and restart (11706.614542ms)
✔ publication partial flush follows verified completion state (10195.62525ms)
✔ publication partial flush follows verified quiescence state (10100.017042ms)
✔ publication threshold uses configured M and persists one claim without counting acknowledgement retries (9810.901458ms)
✔ mainline normal publication retains one observation and synchronizes the campaign after restart (12298.572916ms)
✔ mainline lost_ack publication retains one observation and synchronizes the campaign after restart (12523.316291ms)
Switched to a new branch 'main'
To /private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-store-wdVkLD/managed/increment-remote.git
   53674db..bfe76ce  main -> main
✔ mainline race publication retains one observation and synchronizes the campaign after restart (14141.78725ms)
✔ mainline unavailable publication retains one observation and synchronizes the campaign after restart (14061.029958ms)
✔ mainline rejected publication retains one observation and synchronizes the campaign after restart (14341.988417ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (133.049416ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (63.583166ms)
✔ V3 configuration normalizes historical inputs without changing their bytes (307.667584ms)
✔ V3 assignment execution is explicit and historical scopes normalize without widening authority (0.858792ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (633.76625ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (8276.88075ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.573917ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.454959ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.805417ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (309.347167ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (507.459583ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.545042ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.617917ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.4615ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.285334ms)
✔ V2 cleanup declaration preserves V1 physical meanings and normalizes unknown retirement safely (0.40225ms)
✔ every registered command exposes its complete contract through the shipped CLI (3066.55875ms)
✔ retired campaign commands and malformed options fail before opening project state (676.277292ms)
✔ direct campaign CLI preserves quiet exit 130 when cancellation precedes a connection error (203.934042ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (107.08375ms)
✔ terminal notifications supersede an earlier in-progress history response (62.328166ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (176.061916ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (50.651917ms)
  ✔ malformed (50.996292ms)
✔ lost or malformed responses reject all affected pending operations (102.182791ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (62.164166ms)
✔ initialization recovery reads exactly one original turn and rejects absent or ambiguous history (56.279875ms)
✔ archive recovery uses paginated exact-checkout inventory and rejects an escaped physical root (54.926916ms)
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (1868.3665ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (2453.727417ms)
✔ fast integration refuses a changed checkout before fetching or replaying (1533.176541ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (2633.428833ms)
✔ upstream divergence requests another rebase and preserves both revisions (1007.130042ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1910.2865ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (1374.057125ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (906.872334ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.596667ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (848.481916ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.4515ms)
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (11505.269709ms)
✔ closure requires fresh evidence, persists an immutable receipt and fences later mutations (1778.470333ms)
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (41.168ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.549584ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.145625ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.133541ms)
✔ mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree (7824.002416ms)
✔ conflicting mainline preserves the publication branch, merge state and published campaign refs (972.03475ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (2.633ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.180834ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (506.254042ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (2.279334ms)
✔ reviewer replacement records loss and fresh identities without changing historical review contracts (1.532ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (3.568041ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (0.624417ms)
✔ review completion requires the exact terminal turn and validated final message (0.576292ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (1.972042ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.149083ms)
Rebasing (1/1)
Stopped at ad28133...  # candidate
You can amend the commit now, with

  git commit --amend 

Once you are satisfied with your changes, run

  git rebase --continue
Successfully rebased and updated refs/heads/master.
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (4494.87925ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (473.705042ms)
✔ submission rejects a clean interactive rebase edit stop until the rebase completes (451.121083ms)
✔ submission rejects merge history and reverted out-of-scope commits (668.311125ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (138.059292ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.453625ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (196.297625ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (3.547042ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (0.601834ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.25575ms)
✔ retirement contract distinguishes original resource allocation from the revoked assignment generation (0.327541ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1538.319875ms)
✔ retirement cleanup verifies owner, preserves caches and user work, and retains failed cleanup (990.12675ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.413375ms)
✔ both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs (1.119625ms)
✔ legacy path ownership recognizes transitive execution ordering and rejects unordered sharing (0.391417ms)
✔ V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file (2.939791ms)
✔ physical sprint readers preserve planning, version-specific execution and null execution (1.441875ms)
✔ physical V1 sprint metadata retains null execution and rejects malformed inputs without mutation (0.92425ms)
✔ physical V2 sprint metadata preserves reviewed and null execution without mutating valid or malformed inputs (0.373708ms)
✔ physical V3 sprint metadata preserves its complete value and leaves rejected input unchanged (0.226958ms)
✔ unknown sprint metadata rejects invalid reviewed flags, paths, identity and block count (0.291333ms)
✔ discovery retains numeric ordering and rejects duplicate ordinals and mixed physical versions (2.5775ms)
✔ discovery preserves homogeneous physical collections and files and rejects absent or empty collections (2.57025ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (2.008ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.513916ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.418667ms)
✔ file dispatch validates unknown JSON and each supported physical version (3.93ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (2.106292ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (12.414958ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.335791ms)
✔ heading parser retains the exact pending, done and error statuses (1.021ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.304875ms)
✔ requirements preserve provenance and stakeholder conflict resolution (0.4715ms)
✔ UAT derives release evidence from approved requirements (0.123541ms)
✔ UAT defers every concrete operation to the host project (0.070625ms)
ℹ tests 232
ℹ suites 0
ℹ pass 232
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 229899.365541
codex plugin marketplace add /Users/alex/git/ctosclub/ponytail --json
codex plugin add ponytail@ponytail --json
{}
{}
copy /Users/alex/git/ctosclub/ponytail/skills/api-service-boundaries -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/api-service-boundaries
copy /Users/alex/git/ctosclub/ponytail/skills/architecture -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/architecture
copy /Users/alex/git/ctosclub/ponytail/skills/bash-parse-safe-scripts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/bash-parse-safe-scripts
copy /Users/alex/git/ctosclub/ponytail/skills/build-impact -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/build-impact
copy /Users/alex/git/ctosclub/ponytail/skills/cloud-cli-reauth -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/cloud-cli-reauth
copy /Users/alex/git/ctosclub/ponytail/skills/codex-execpolicy -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/codex-execpolicy
copy /Users/alex/git/ctosclub/ponytail/skills/cross-session-effects -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/cross-session-effects
copy /Users/alex/git/ctosclub/ponytail/skills/debugging -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/debugging
copy /Users/alex/git/ctosclub/ponytail/skills/diagnostic-assertions -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/diagnostic-assertions
copy /Users/alex/git/ctosclub/ponytail/skills/indeterminate-list-ux -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/indeterminate-list-ux
copy /Users/alex/git/ctosclub/ponytail/skills/issue-tracking -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/issue-tracking
copy /Users/alex/git/ctosclub/ponytail/skills/lossless-json-contracts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/lossless-json-contracts
copy /Users/alex/git/ctosclub/ponytail/skills/monetary-contract-safety -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/monetary-contract-safety
copy /Users/alex/git/ctosclub/ponytail/skills/plan-execution -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/plan-execution
copy /Users/alex/git/ctosclub/ponytail/skills/parallel-plan-scheduler -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/parallel-plan-scheduler
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/ponytail
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-audit -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/ponytail-audit
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-debt -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/ponytail-debt
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-review -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/ponytail-review
copy /Users/alex/git/ctosclub/ponytail/skills/project-structure -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/project-structure
copy /Users/alex/git/ctosclub/ponytail/skills/production-test-boundaries -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/production-test-boundaries
copy /Users/alex/git/ctosclub/ponytail/skills/react-error-containment -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/react-error-containment
copy /Users/alex/git/ctosclub/ponytail/skills/requirements -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/requirements
copy /Users/alex/git/ctosclub/ponytail/skills/requirements-traceability -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/requirements-traceability
copy /Users/alex/git/ctosclub/ponytail/skills/semantic-rebase -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/semantic-rebase
copy /Users/alex/git/ctosclub/ponytail/skills/static-type-safety -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/static-type-safety
copy /Users/alex/git/ctosclub/ponytail/skills/test-credentials -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/test-credentials
copy /Users/alex/git/ctosclub/ponytail/skills/typescript-unit-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/typescript-unit-testing
copy /Users/alex/git/ctosclub/ponytail/skills/user-acceptance-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/user-acceptance-testing
copy /Users/alex/git/ctosclub/ponytail/skills/ux-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/ux-testing
copy /Users/alex/git/ctosclub/ponytail/skills/variant-neutrality -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/variant-neutrality
copy /Users/alex/git/ctosclub/ponytail/skills/versioned-data-contracts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/versioned-data-contracts
copy /Users/alex/git/ctosclub/ponytail/skills/worktree-lifecycle -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/worktree-lifecycle
remove /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/git-write-escalation
remove /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/skills/typed-contract-safety
remove empty /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/AGENTS.md
link /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.R6b9hr/codex/AGENTS.md -> /Users/alex/git/ctosclub/ponytail/config/AGENTS.md
installer tests passed

> test
> node --test ./test/*.test.js

✔ extension registers Ponytail commands (1.071667ms)
✔ /ponytail updates session mode and injects instructions (1.25525ms)
✔ before_agent_start guards missing event and missing systemPrompt (#439, #440) (1.418791ms)
✔ session_start restores latest persisted mode (0.5665ms)
✔ skill commands delegate and help displays directly (0.320083ms)
✔ normal mode disables compaction but preserves core policy (0.544584ms)
✔ a request mentioning normal mode stays active (0.501417ms)
✔ status bar renders the mode and flips active on agent_start (0.459ms)
✔ status bar stays silent when ui lacks a theme (0.447625ms)
✔ PONYTAIL_HIDE_STATUS hides the indicator but keeps ponytail active (#324) (0.541ms)
✔ config.hideStatus hides the indicator but keeps ponytail active (#324) (1.253583ms)
✔ PONYTAIL_HIDE_STATUS=0 does not hide the indicator (0.517917ms)
✔ parsePonytailCommand falls back to full when invoked bare and default is off (0.805292ms)
✔ parsePonytailCommand parses modes, status, and default subcommand (0.151083ms)
✔ parsePonytailCommand rejects review as a default (session-only mode, #377) (0.063458ms)
✔ resolveSessionMode still honors review as a session mode (not a default) (0.106708ms)
✔ resolveSessionMode prefers latest persisted session mode (0.06475ms)
✔ resolveSessionMode returns fallback when entries is not an array (0.0555ms)
✔ readDefaultMode and writeDefaultMode use XDG config path (1.037333ms)
✔ readQuietStartup resolves env var, config file, and default in that order (0.760583ms)
✔ filterSkillBodyForMode keeps only requested intensity examples and rows (0.245333ms)
✔ filterSkillBodyForMode does not drop a rule bullet whose label matches a mode name (0.13175ms)
✔ filterSkillBodyForMode keeps rule bullets that contain a colon (0.704041ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 60.579209

> ponytail-mcp@4.8.4 test
> node --test ./test/*.test.js

✔ resolveMode keeps valid intensities (0.406834ms)
✔ resolveMode preserves off and falls back for unknown or empty values (0.613875ms)
✔ buildInstructions returns the ruleset tagged with the resolved mode (0.441708ms)
✔ buildInstructions preserves core policy when compaction is off (0.1625ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 51.093917

> @alexbaretta/ponytail@4.8.4 test:tsts
> node --test tsts/dist/test/*.test.js

▶ parseTstsCliArguments
  ✔ defaults to tsconfig.json (0.757958ms)
  ✔ parses an explicit unused-code config path (0.095875ms)
  ✔ parses an explicit project path (0.069166ms)
  ✔ parses a directory-structure manifest with a project (0.071791ms)
  ✔ runs directory-structure analysis without an implicit TypeScript project (0.072375ms)
  ✔ parses semantic traceability with an explicit project (0.070666ms)
  ✔ parses help requests (0.053959ms)
✔ parseTstsCliArguments (1.761417ms)
▶ formatTextReport
  ✔ formats an empty result (0.111791ms)
✔ formatTextReport (0.191584ms)
▶ usage
  ✔ describes the project option (0.132292ms)
✔ usage (0.191583ms)
▶ TSTS configuration v2
  ✔ accepts an exact graph-only configuration (511.727791ms)
  ✔ rejects missing and unsupported schema versions with upgrade guidance (117.3225ms)
  ✔ rejects unknown keys at every configuration object level (168.574042ms)
  ✔ rejects malformed required fields and severities (75.576667ms)
✔ TSTS configuration v2 (874.026209ms)
▶ directory-structure manifest
  ✔ accepts declared tracked and ignored content (156.553167ms)
  ✔ accepts V1 by normalizing it without exact file rules (201.023083ms)
  ✔ lets one exact file override its containing directory policy (213.212833ms)
  ✔ reports misplaced and untracked content together (168.357375ms)
  ✔ uses the most specific content pattern and directory owner (233.68725ms)
  ✔ accepts data and compiled artifacts only under their declared owners (254.166ms)
  ✔ reports equal-specificity content kinds as ambiguous (238.446834ms)
  ✔ does not follow configured opaque directory symlinks (181.374458ms)
  ✔ rejects unknown keys and escaping paths (257.028291ms)
  ✔ rejects duplicate JSON keys and directory owners (94.853792ms)
✔ directory-structure manifest (1999.833042ms)
▶ TSTS lossless JSON codec
  ✔ round-trips exact numbers (0.83775ms)
  ✔ rejects malformed and unsupported values (0.176292ms)
✔ TSTS lossless JSON codec (1.497792ms)
▶ no-aliasing
  ✔ reports import and export aliases when configured (467.140375ms)
✔ no-aliasing (467.671041ms)
▶ public union discriminator rule
  ✔ accepts a valid discriminated public union (499.777459ms)
  ✔ accepts const-backed string literal discriminants (262.282417ms)
  ✔ rejects a public union with duplicate discriminator values (248.535459ms)
  ✔ rejects an ambiguous four-variant shape (142.892917ms)
  ✔ accepts synthetic row result variants (169.749292ms)
  ✔ rejects ambiguous synthetic channel variants (138.822791ms)
  ✔ rejects a public union with no shared required literal field (152.768292ms)
  ✔ explains shared required fields that are not literal in every variant (132.7865ms)
  ✔ rejects optional discriminator fields (106.59475ms)
  ✔ ignores non-object unions outside the rule scope (101.053417ms)
  ✔ reports every non-fatal violation (99.465ms)
✔ public union discriminator rule (2055.947ms)
▶ public union dispatch rule
  ✔ accepts exhaustive switch dispatch (521.683875ms)
  ✔ accepts const-backed exhaustive switch dispatch (247.195541ms)
  ✔ rejects non-exhaustive switch dispatch (247.126791ms)
  ✔ rejects non-exhaustive dispatch over a non-exported union (210.314834ms)
  ✔ does not allow default clauses to hide missing cases (181.06075ms)
  ✔ rejects a catch-all branch that throws (127.055542ms)
  ✔ checks discriminated union dispatch in configured workspaces (142.430667ms)
  ✔ rejects if dispatch over public union discriminators (154.599875ms)
✔ public union dispatch rule (1832.364542ms)
▶ TypeScript traceability locators
  ✔ accepts a leading annotation on a named declaration (319.144917ms)
  ✔ rejects annotations inside a declaration body (267.151333ms)
  ✔ rejects configured files outside the TypeScript project (10.838167ms)
  ✔ checks a shared configured TypeScript path once (219.345542ms)
  ✔ accepts an exact V2 configuration with safe search fields (170.162459ms)
  ✔ accepts an exact V3 inventory and an attached explicit entity marker (175.793834ms)
  ✔ accepts an exact V4 directional validation matrix (152.133583ms)
✔ TypeScript traceability locators (1315.492625ms)
▶ type-safe persisted serdes rule
  ✔ accepts canonical persisted envelope types and schemas (506.21075ms)
  ✔ rejects unknown persisted envelope types (269.025875ms)
  ✔ rejects untyped JSON persisted envelope types (223.642625ms)
  ✔ rejects private narrower reader envelope types (229.198ms)
  ✔ rejects private reader schemas for persisted envelope parsing (176.101291ms)
  ✔ rejects non-canonical Zod schemas for persisted envelope fields (142.090834ms)
  ✔ accepts canonical contract variant helpers only inside canonical declarations (121.266667ms)
  ✔ ignores ordinary object literals with matching envelope property names (142.464333ms)
✔ type-safe persisted serdes rule (1810.936916ms)
▶ unique exported type names
  ✔ rejects independently declared exported AppState contracts (735.449792ms)
  ✔ accepts a re-export of the canonical AppState declaration (422.089083ms)
✔ unique exported type names (1158.180792ms)
▶ unused code rule
  ✔ treats exported declarations from public package entrypoints as roots (490.029834ms)
  ✔ reports declarations not reachable from configured entrypoints (403.1805ms)
  ✔ does not report unused declarations when the rule is omitted (312.016208ms)
  ✔ follows exported variables through cross-workspace re-exports (371.641333ms)
  ✔ treats class extends expressions as value references (99.597958ms)
  ✔ follows value and type declarations through local star re-exports (108.227042ms)
  ✔ follows imported module initialization (101.669ms)
  ✔ follows dynamically imported exports and module initialization (102.320291ms)
  ✔ follows shorthand property value references (95.853292ms)
  ✔ treats global augmentation contracts as type roots (92.866875ms)
✔ unused code rule (2178.455416ms)
▶ versioned data contracts rule
  ✔ accepts exact readers and no adapters when none are required (484.562875ms)
  ✔ reports missing readers and downgrade adapters (172.342291ms)
  ✔ checks a selected valid family without checking an unrelated invalid family (123.563333ms)
  ✔ checks selected families in configuration order (143.096292ms)
  ✔ reports every selected family missing from the manifest (124.8735ms)
  ✔ rejects empty and duplicate family selections at the configuration boundary (7.787875ms)
  ✔ validates duplicate manifest IDs before applying selection (122.922167ms)
  ✔ checks every manifest family when selection is omitted (123.819333ms)
✔ versioned data contracts rule (1303.952583ms)
ℹ tests 80
ℹ suites 14
ℹ pass 80
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2827.537959

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1253 files: no violations found.

~~~

## Native evidence context

The explicit native suite recorded 35 passing cases and one failure caused by an incorrect directory echo in the final model reply. The unchanged exact checkout case passed on isolated rerun. Those historical logs are retained in tmp/interface-native-acceptance.log and tmp/interface-native-cwd-revalidation.log; they are not represented as an all-green native-suite invocation by this assessment.
