# Interface batch: OBL-69

Source revision: 38585428a875d41196b7d57c8903c5714b191db5. Baseline: BASELINE-16. Binding: BIND-113.

Condition: Refuse campaign closure until all owned delivery obligations and final acceptance gates have fresh adequate evidence.

Criterion: Campaign closure Arc demonstrates the complete declared outcome on identified inputs, with applicable strict compilation, unchanged TSTS, focused QA, structural checks and generated-source synchronization. Partial, stale, skipped or substitute proof is unresolved.

Closure refuses missing or stale accepted evidence. Sequential canonical fixture acceptance permits closure only with clean observed campaign/mainline state and no retained actors, actions or unpublished increments. One immutable versioned receipt survives repeated closure, appears in status, suppresses next actions and refuses later scheduling mutations. The receipt uses a separate versioned table rather than altering the campaign row contract.

Sixteen focused component tests, two real PostgreSQL/CLI/MCP scenarios and five installed/historical CLI checks pass with no failures, skips or cancellations. Full clean-tree npm acceptance passes all 880 Node tests across its five reported families and the configured installer/structural checks. TSTS, traceability, runtime synchronization, rules, versions, manifests, adapters and registry pass. Strict root compilation is reused after its final relevant input edit. The final four delivery obligations are individually assessed here. Final whole-campaign freshness renewal and rollup acceptance remain separate; no historical assessment is silently renewed. Historical assessments are retained without a freshness-renewal claim.

Node v24.15.0; git version 2.54.0. Existing local PostgreSQL uses the invoking project's configured connection.

## node --test dist/tests/rolling-cli-registry.test.js dist/tests/rolling-operations.test.js dist/tests/rolling-campaign.test.js

2026-10-12T03:44:49.164Z – 2026-10-12T03:44:50.984Z

~~~text
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.296666ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.913125ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (0.804292ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (53.277ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (100.16475ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.503125ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (1.517917ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.399292ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.268292ms)
✔ V2 cleanup declaration preserves V1 physical meanings and normalizes unknown retirement safely (0.367792ms)
✔ every registered command exposes its complete contract through the shipped CLI (1496.24525ms)
✔ retired campaign commands and malformed options fail before opening project state (236.8145ms)
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (8.618959ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.228833ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.124625ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.127917ms)
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1780.993542

~~~

## node --test dist/tests/rolling-operations.integration.test.js

2026-10-12T03:44:51.000Z – 2026-10-12T03:44:55.381Z

~~~text
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (3245.47825ms)
✔ closure requires fresh evidence, persists an immutable receipt and fences later mutations (1032.702333ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4344.869292

~~~

## node --test --test-name-pattern=ponytail dispatches campaign reporting|ponytail help publishes|QA omits campaign census|project index contract|CLI installer links tests/campaign-census.test.js tests/cli-tools.test.js tests/ponytail-cli.test.js

2026-10-12T03:44:55.398Z – 2026-10-12T03:44:57.807Z

~~~text
✔ ponytail dispatches campaign reporting through the production module (2317.310291ms)
✔ ponytail help publishes campaign, plan-input, index, and plan command families (255.059083ms)
✔ QA omits campaign census and the CLI dispatches it through campaign (0.247875ms)
✔ project index contract retains a stable relational and search core (0.806959ms)
✔ CLI installer links the checkout and the installed command updates skills (1550.7495ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2374.324291

~~~

## npm run check:traceability

2026-10-12T03:44:57.825Z – 2026-10-12T03:44:58.675Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:traceability
> node skills/requirements-traceability/scripts/check-traceability.js --config .agents/config/project/traceability.json

Traceability checked 818 relationships: no violations found.

~~~

## npm run check:tsts

2026-10-12T03:44:58.690Z – 2026-10-12T03:45:00.942Z

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1235 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T03:45:00.959Z – 2026-10-12T03:45:00.993Z

~~~text

~~~

## node scripts/check-rule-copies.js

2026-10-12T03:45:01.008Z – 2026-10-12T03:45:01.042Z

~~~text
8 rule copies match skills/ponytail/SKILL.md.

~~~

## node scripts/check-versions.js

2026-10-12T03:45:01.057Z – 2026-10-12T03:45:01.090Z

~~~text
All 7 version files pinned at 4.8.4.

~~~

## node scripts/build-manifests.js

2026-10-12T03:45:01.104Z – 2026-10-12T03:45:01.137Z

~~~text
Validated repeated manifest metadata.

~~~

## node scripts/build-command-adapters.js

2026-10-12T03:45:01.151Z – 2026-10-12T03:45:01.185Z

~~~text
Validated 5 OpenCode commands.

~~~

## node scripts/registry.js

2026-10-12T03:45:01.200Z – 2026-10-12T03:45:01.232Z

~~~text
Validated 39 registry entries.

~~~

## npm test

2026-10-12T03:38:41.290620+00:00 – 2026-10-12T03:43:28.567968+00:00

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

Traceability checked 818 relationships: no violations found.
✔ Ponytail forbids meaningless approval requests for agent-caused repairs (0.695833ms)
✔ Ponytail keeps mechanical blockers agent-owned (0.413667ms)
✔ plan execution applies the same guard before returning control (0.397209ms)
✔ license and attribution retain both contributors (0.58775ms)
✔ modified canonical policy and runtime sources carry combined notices (0.369083ms)
✔ configuration requires exact versioned adapter and target ownership (2.588041ms)
✔ durable build-impact contracts have exact reader owners (1.347375ms)
✔ TypeScript adapter reports compiler and configured inputs only (99.738042ms)
✔ V2 glob inputs select non-TypeScript build inputs without selecting tests (49.995917ms)
✔ TypeScript adapter requires a pre-deletion query for unmatched missing paths (85.789375ms)
✔ global inputs affect every configured target (3.36225ms)
✔ build-impact configuration does not affect product build targets implicitly (46.846291ms)
✔ dispatcher composes TypeScript and multiple custom adapters (130.781292ms)
✔ one failed adapter preserves successful target results (85.192542ms)
✔ custom adapters cannot report unowned targets (44.052625ms)
✔ custom adapters cannot expand the intended changed path set (36.242042ms)
✔ CLI handles spaces and emits no compiler input inventory (73.1085ms)
✔ configuration and compiler failures are indeterminate (38.362625ms)
✔ non-compiler paths skip TypeScript resolution (0.608375ms)
✔ changed paths cannot escape the project root (1.636708ms)
✔ human report aligns census columns after long identifiers (0.681917ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (52.500375ms)
✔ campaign graph exposes detailed planning review without an execution lease (21.972875ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (393.280375ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (196.799041ms)
✔ campaign report and graph accept an initial planning-only sprint (152.5215ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (168.279ms)
✔ lists plan sources without parsing and exposes canonical source parsing (26.203416ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (26.248458ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (21.408917ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (121.004ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (621.834459ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (201.279416ms)
✔ omitted report input requires exactly one campaign containing active plans (117.633917ms)
✔ bare plan names fail explicitly when missing or ambiguous (31.093541ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (64.804875ms)
✔ selected campaign validates direct dependency membership and cycles (34.214875ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (30.138084ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (96.956667ms)
✔ V1 report reader rejects unknown output fields (97.612875ms)
✔ production module uses exact exit and stream contracts without mutation (874.543042ms)
✔ ponytail dispatches campaign reporting through the production module (3103.953625ms)
✔ coordinator handoff preserves unfinished assignments and started host operations (136.907417ms)
✔ reservation audit distinguishes retained workers, provisioned sessions, and unresolved starts (444.532709ms)
✔ reservation audit CLI reports a scoped versioned inventory without mutating the ledger (194.114334ms)
✔ unfinished assignment continuation requires the original idle session and live checkout (560.286833ms)
✔ retirement fences the original archived session and reclaims only its authenticated worktree (1657.426167ms)
✔ historical ledgers normalize recovery and cleanup actions and the current writer emits V9 (118.149042ms)
✔ historical cleanup actions gain the original session required for retirement (104.620416ms)
✔ reconciliation reserves existing active plans without fabricating workers and is idempotent (182.457458ms)
✔ reconciliation refuses unauthenticated and contradictory ledgers without partial adoption (145.305083ms)
✔ reconciliation retains dependency waits and an existing pending action (142.93875ms)
✔ campaign reconcile CLI reserves an active leaf once before normal dispatch (492.860583ms)
✔ status reports active plan, session, and worktree conflicts while mutations fail closed (118.568708ms)
✔ V11 status exposes session, worktree, activity, assignment, action, and conflict views (103.431542ms)
✔ stale host observations are diagnosed and block mutation (99.864541ms)
✔ campaign observe persists a normalized host snapshot and returns V11 status (214.652125ms)
✔ worker delivery accepts only an exact clean revision with committed evidence (461.445208ms)
✔ reconciler derives dependency-ready plans and only truly idle workers (112.233584ms)
✔ runnable-plans joins satisfied plan dependencies with nonempty canonical tasklet readiness (832.74225ms)
✔ runnable execution diagnostics persist scoped host refusals without changing action identity (182.216458ms)
✔ historical runnable summaries normalize unknown execution evidence without inventing counts (0.1645ms)
✔ tasklet exhaustion suppresses new, queued, and unstarted dispatch without changing started identity (177.645541ms)
✔ schedule-ready deterministically reserves every runnable plan once within project capacity (282.606792ms)
✔ schedule-ready reuses every safe idle pair despite grandfathered excess reservations (303.760875ms)
✔ review-only scheduling reuses one original idle pair without making unreviewed tasklets executable (268.408291ms)
✔ initial planning uses an idle campaign pair while independent implementation retains its own pair (504.382917ms)
✔ planning worker can refresh its pending attachment after a clean integrated fast-forward (636.618208ms)
✔ retry-dispatch persists one fenced successor across CLI restarts and retains unknown capacity (1132.015208ms)
✔ fenced retry reuses an original idle pair for review when implementation readiness became review-only (184.446291ms)
✔ retry-dispatch rejects unavailable authority, observation, readiness and owned identities (874.784916ms)
✔ retry revocation fences an attachment that resolved its capability before acquiring the binding lock (152.853708ms)
✔ runnable-plan output rejects empty tasklet sets and unsupported or ambiguous records (0.226917ms)
✔ advance durably selects one ready plan and returns the same pending action on retry (80.241ms)
✔ independent dispatch continues while the integration lane has one outstanding rebase (93.686375ms)
✔ an outstanding rebase pins the integration revision until its named result (109.349292ms)
✔ a proven unstarted stale dispatch is postponed while a started dispatch retains its identity (124.6975ms)
✔ never-started reservation releases after coordinator closure without claiming worker retirement (122.956875ms)
✔ closed reservation release refuses started or provisioned worker identities without mutation (565.446542ms)
✔ ready actions exclude blocked and started dispatch without mutating durable state (73.929ms)
✔ ready actions expose only a fresh, idle original provisioned bootstrap as resume-only (167.404208ms)
✔ advance reuses a clean idle worker before requesting a new worker (78.548875ms)
✔ reuse attachment rejects a different session in the reserved worktree (187.353959ms)
✔ schedule-ready does not enroll an unrelated idle host chat for reuse (109.2845ms)
✔ integrated completed workers become reusable when another plan is ready (149.859042ms)
✔ integrated waiting workers become reusable when another plan is ready (145.324708ms)
✔ advance retains every completed pair even without ready dispatch (301.106791ms)
✔ foreign campaign sessions do not consume the current campaign capacity (101.991542ms)
✔ one working campaign session leaves independent ready plans dispatchable (166.734333ms)
✔ a historical imported worker without current-campaign creation cannot be reused or counted (74.296875ms)
✔ a historical foreign reuse reservation is not executable (114.683709ms)
✔ historical automatic cleanup is superseded without deleting or fabricating success (64.665834ms)
✔ completed work is classified by Git ancestry and fast-forward merged exactly once (282.123958ms)
✔ ready fast-forward join outranks unrelated assignment-state reconciliation (240.992833ms)
✔ verified worker delivery integrates before plan closure and cleanup waits for closure (310.248834ms)
✔ an open merged plan accepts a second delivery from its original assignment (862.179541ms)
✔ worker delivery resolves a closed plan by stable identity before its lifecycle move is integrated (878.973291ms)
✔ authenticated dispatch stays valid while its worker activates an open plan and integrates activation (1057.271041ms)
✔ working workers retry optimistic deliveries after a competing fast-forward join (1523.614833ms)
✔ waiting worker delivery remains integrable before and after its checkout disappears (857.872375ms)
✔ missing undelivered checkout can be re-provisioned in the same session without an archived artifact (504.821375ms)
✔ delivered waiting worker with a missing checkout recovers before rebase and preserves delivery (898.577625ms)
✔ missing worker checkout without verified delivery remains blocking (93.855542ms)
✔ completed divergent work requires rebase and cannot merge (196.97225ms)
✔ campaign status and advance CLI expose stable JSON and do not duplicate dispatch (397.183417ms)
✔ implicit campaign selection reports every active candidate while explicit selection succeeds (256.980667ms)
✔ action results require an explicit campaign and advance holds the worktree lock (43.961583ms)
✔ CLI shell scripts are parse-safe (254.756084ms)
✔ ponytail help publishes campaign, plan-input, index, and plan command families (300.029459ms)
✔ QA omits campaign census and the CLI dispatches it through campaign (0.2615ms)
✔ combined installer installs Codex skills and CLI tools only (1015.770708ms)
✔ plan_pdf renders the manifest and optionally ordered sprints (353.31875ms)
✔ plan_pdf validates its plan, output, and renderer (39.7605ms)
✔ audit_pm accepts the mandated PM structure (118.177583ms)
✔ audit_pm requires valid project journal configuration (138.735459ms)
✔ audit_pm reports non-fixable structural deviations without mutation (137.369958ms)
✔ audit_pm --fix date-prefixes tracked plans and bugs from oldest Git history (287.334084ms)
✔ audit_pm --fix leaves untracked records and collisions unchanged (225.819125ms)
✔ audit_pm --dryrun previews fixes with or without --fix (787.763375ms)
✔ plan_stats counts open and done task lines from the exact plan (123.878542ms)
✔ plan_stats rejects missing and non-basename plan names (66.911334ms)
✔ bug_stats counts lifecycle files on or after an inclusive date (189.460791ms)
✔ bug_stats validates its date argument (76.164625ms)
✔ project journal rejects missing configuration and split commands (139.515208ms)
✔ project journal detaches heartbeats and recovers stale locks (6306.392292ms)
✔ project journal initializes a stable V1 project configuration (658.204125ms)
✔ project database setup provisions journal and project-index contracts (306.627917ms)
✔ project journal initialization accepts explicit non-secret connection settings (919.877208ms)
✔ journal contracts retain a stable relational core and versioned JSON payload (0.329542ms)
✔ project index contract retains a stable relational and search core (0.322667ms)
✔ CLI installer installs all tools and verifies owned updates (222.902208ms)
✔ CLI installer supports selection and refuses unowned collisions (75.529333ms)
✔ CLI installer prompts for or explicitly updates Bash PATH (207.998417ms)
✔ CLI installer dry-run does not modify the target home (39.808084ms)
✔ cloud CLI recovery uses only the configured identity and command (0.507292ms)
✔ cloud CLI recovery distinguishes authentication from other failures (0.107833ms)
✔ registry contains the base command (0.438792ms)
✔ every registered command ships a Claude commands/*.toml (0.127584ms)
✔ every OpenCode command matches its generated adapter (0.554542ms)
✔ declined and noninteractive proposals leave user state unchanged (245.550375ms)
✔ accepts imported, baseline, and project rules into reconstructible state (209.281041ms)
✔ changed project policy requires its exact new proposal digest (597.814ms)
✔ restores Codex rules from accepted Ponytail state (197.968209ms)
✔ upgrades V1 accepted state without reading foreign project worktrees (105.754375ms)
✔ V2 migration ignores malformed foreign accepted project data (97.357917ms)
✔ keeps project policies in separate project-local projections (291.698167ms)
✔ rejects symlinked policy outputs and malformed project directives (264.118541ms)
✔ is installable as a selected Ponytail CLI tool (848.603584ms)
✔ copilot plugin command directory includes ponytail-debt (0.6145ms)
✔ debt surfaces use the project-neutral marker and canonical document (0.804ms)
✔ debugging applies beyond user-facing and planned bugs (0.455083ms)
✔ debugging requires differential diagnosis before repair (0.143709ms)
✔ debugging prevents expensive and repeated guess-and-check runs (0.103917ms)
✔ debugging defines safe stateful restart and outcome metrics (0.074583ms)
✔ debugging harvests only confirmed independent pattern observations (0.545375ms)
✔ pattern observations preserve evidence without premature categories (0.108958ms)
✔ specialized workflows delegate diagnosis to debugging (0.071667ms)
✔ diagnostic observations cannot become product failures (0.434875ms)
✔ hard assertions require an invalid continuation path and proof (0.078708ms)
✔ distribution contains the live-development harness only (669.438ms)
✔ Hermes plugin manifest matches runtime skills, hooks, commands, and package version (1.545ms)
✔ Hermes plugin registers every shipped skill under the ponytail namespace (85.777ms)
✔ Hermes plugin builds mode-aware injected context from the canonical skill (56.374209ms)
✔ Hermes mode config respects env, config file, off, and invalid command behavior (49.863292ms)
✔ Hermes plugin review mode injects the real review skill body (43.402542ms)
✔ Hermes /ponytail command changes mode and pre_llm_call injects current context (45.07425ms)
✔ Hermes gateway rewrite respects slash access denial (39.083709ms)
✔ Hermes gateway rewrite preserves every skill command and ignores unrelated text (40.791667ms)
✔ every commandWindows uses PowerShell $env: syntax, not cmd.exe %VAR% (0.640125ms)
✔ shared hook commands avoid POSIX-only guard syntax (0.228459ms)
✔ shared hook commands are shell-agnostic (no bash-only exec prefix) (0.266042ms)
✔ every hook command points at a script that ships in hooks/ (0.290417ms)
✔ ponytail-mode-tracker self-exits when stdin never closes (no freeze) (1046.719875ms)
✔ Claude points at the hook config and Codex uses auto-discovery (0.281917ms)
hook compatibility checks passed
✔ tests/hooks.test.js (1162.228709ms)
✔ imported skills have valid metadata and attribution (9.012375ms)
✔ versioned contract schema is valid JSON with a portable identifier (0.169208ms)
✔ indeterminate lists require bounded infinite scrolling (0.433208ms)
✔ indeterminate lists prohibit request fanout (0.088917ms)
✔ issue intake uses configured type ownership without promoting requirements (0.730417ms)
✔ requirements activate only for standalone authorization or begun planned implementation (0.280333ms)
✔ JSON manifests match canonical repeated metadata (1.09825ms)
✔ Codex marketplace installs Ponytail from this checkout (0.440708ms)
✔ Hermes manifest is generated from package and registry metadata (1.03825ms)
▶ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI
  ✔ Step 1: canonical glossary and unresolved legacy DONE (172.650292ms)
  ✔ Step 2: frozen assignment and candidate delivery never discharge (253.0575ms)
  ✔ Step 3: bounded neutral preparation and honest productive downstream growth (424.129791ms)
  ✔ Step 4: complete inventories and no-edit assessments reach zero (1028.645834ms)
  ✔ Step 5: stale inputs reopen original identities and require disturbance (418.763333ms)
  ✔ Step 6: activated successor preserves IDs and old unresolved history (349.718541ms)
✔ Suite obligation execution: Arc coordinated responsibility lifecycle through real CLI (2765.161375ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (137.328583ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1474.038583ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (269.406459ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (330.356875ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (198.565667ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.346792ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (539.147125ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (7.097208ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (412.884833ms)
✔ shared vocabulary resolves from each owner and generated resource (2.8665ms)
✔ api-service-boundaries: committed OpenClaw skill matches the generator (1.990792ms)
✔ api-service-boundaries: body contains the canonical skills/api-service-boundaries body (0.224417ms)
✔ api-service-boundaries: description is one line under 160 chars (0.055875ms)
✔ api-service-boundaries: referenced resources are packaged (0.142ms)
✔ architecture: committed OpenClaw skill matches the generator (0.146125ms)
✔ architecture: body contains the canonical skills/architecture body (0.102708ms)
✔ architecture: description is one line under 160 chars (0.034ms)
✔ architecture: referenced resources are packaged (0.074834ms)
✔ bash-parse-safe-scripts: committed OpenClaw skill matches the generator (0.136208ms)
✔ bash-parse-safe-scripts: body contains the canonical skills/bash-parse-safe-scripts body (0.19825ms)
✔ bash-parse-safe-scripts: description is one line under 160 chars (0.077333ms)
✔ bash-parse-safe-scripts: referenced resources are packaged (0.098334ms)
✔ build-impact: committed OpenClaw skill matches the generator (0.194166ms)
✔ build-impact: body contains the canonical skills/build-impact body (0.108708ms)
✔ build-impact: description is one line under 160 chars (0.029583ms)
✔ build-impact: referenced resources are packaged (0.113708ms)
✔ cloud-cli-reauth: committed OpenClaw skill matches the generator (0.147167ms)
✔ cloud-cli-reauth: body contains the canonical skills/cloud-cli-reauth body (0.097458ms)
✔ cloud-cli-reauth: description is one line under 160 chars (0.026458ms)
✔ cloud-cli-reauth: referenced resources are packaged (0.062166ms)
✔ codex-execpolicy: committed OpenClaw skill matches the generator (0.102417ms)
✔ codex-execpolicy: body contains the canonical skills/codex-execpolicy body (0.078333ms)
✔ codex-execpolicy: description is one line under 160 chars (0.025875ms)
✔ codex-execpolicy: referenced resources are packaged (0.060041ms)
✔ cross-session-effects: committed OpenClaw skill matches the generator (0.365208ms)
✔ cross-session-effects: body contains the canonical skills/cross-session-effects body (0.116458ms)
✔ cross-session-effects: description is one line under 160 chars (0.040583ms)
✔ cross-session-effects: referenced resources are packaged (0.100583ms)
✔ debugging: committed OpenClaw skill matches the generator (0.152666ms)
✔ debugging: body contains the canonical skills/debugging body (0.121208ms)
✔ debugging: description is one line under 160 chars (0.0265ms)
✔ debugging: referenced resources are packaged (0.106167ms)
✔ diagnostic-assertions: committed OpenClaw skill matches the generator (0.1335ms)
✔ diagnostic-assertions: body contains the canonical skills/diagnostic-assertions body (0.499459ms)
✔ diagnostic-assertions: description is one line under 160 chars (0.107709ms)
✔ diagnostic-assertions: referenced resources are packaged (0.218ms)
✔ indeterminate-list-ux: committed OpenClaw skill matches the generator (0.511084ms)
✔ indeterminate-list-ux: body contains the canonical skills/indeterminate-list-ux body (0.298583ms)
✔ indeterminate-list-ux: description is one line under 160 chars (0.143417ms)
✔ indeterminate-list-ux: referenced resources are packaged (0.18775ms)
✔ issue-tracking: committed OpenClaw skill matches the generator (0.164875ms)
✔ issue-tracking: body contains the canonical skills/issue-tracking body (0.70425ms)
✔ issue-tracking: description is one line under 160 chars (0.020834ms)
✔ issue-tracking: referenced resources are packaged (0.087792ms)
✔ lossless-json-contracts: committed OpenClaw skill matches the generator (0.14975ms)
✔ lossless-json-contracts: body contains the canonical skills/lossless-json-contracts body (0.71375ms)
✔ lossless-json-contracts: description is one line under 160 chars (0.036084ms)
✔ lossless-json-contracts: referenced resources are packaged (0.102083ms)
✔ monetary-contract-safety: committed OpenClaw skill matches the generator (0.16975ms)
✔ monetary-contract-safety: body contains the canonical skills/monetary-contract-safety body (0.100584ms)
✔ monetary-contract-safety: description is one line under 160 chars (0.018542ms)
✔ monetary-contract-safety: referenced resources are packaged (0.069542ms)
✔ plan-execution: committed OpenClaw skill matches the generator (0.2775ms)
✔ plan-execution: body contains the canonical skills/plan-execution body (0.407625ms)
✔ plan-execution: description is one line under 160 chars (0.127875ms)
✔ plan-execution: referenced resources are packaged (0.604292ms)
✔ parallel-plan-scheduler: committed OpenClaw skill matches the generator (0.32975ms)
✔ parallel-plan-scheduler: body contains the canonical skills/parallel-plan-scheduler body (0.278625ms)
✔ parallel-plan-scheduler: description is one line under 160 chars (0.024583ms)
✔ parallel-plan-scheduler: referenced resources are packaged (0.195125ms)
✔ ponytail: committed OpenClaw skill matches the generator (0.151083ms)
✔ ponytail: body contains the canonical skills/ponytail body (0.130792ms)
✔ ponytail: description is one line under 160 chars (0.018917ms)
✔ ponytail: referenced resources are packaged (0.110208ms)
✔ ponytail-audit: committed OpenClaw skill matches the generator (0.103792ms)
✔ ponytail-audit: body contains the canonical skills/ponytail-audit body (0.079792ms)
✔ ponytail-audit: description is one line under 160 chars (0.018834ms)
✔ ponytail-audit: referenced resources are packaged (0.076083ms)
✔ ponytail-debt: committed OpenClaw skill matches the generator (0.103459ms)
✔ ponytail-debt: body contains the canonical skills/ponytail-debt body (0.073834ms)
✔ ponytail-debt: description is one line under 160 chars (0.017625ms)
✔ ponytail-debt: referenced resources are packaged (0.054667ms)
✔ ponytail-review: committed OpenClaw skill matches the generator (0.133583ms)
✔ ponytail-review: body contains the canonical skills/ponytail-review body (0.092916ms)
✔ ponytail-review: description is one line under 160 chars (0.021333ms)
✔ ponytail-review: referenced resources are packaged (0.065166ms)
✔ project-structure: committed OpenClaw skill matches the generator (0.178375ms)
✔ project-structure: body contains the canonical skills/project-structure body (0.119208ms)
✔ project-structure: description is one line under 160 chars (0.015459ms)
✔ project-structure: referenced resources are packaged (0.084667ms)
✔ production-test-boundaries: committed OpenClaw skill matches the generator (0.108875ms)
✔ production-test-boundaries: body contains the canonical skills/production-test-boundaries body (0.086375ms)
✔ production-test-boundaries: description is one line under 160 chars (0.015083ms)
✔ production-test-boundaries: referenced resources are packaged (0.155625ms)
✔ react-error-containment: committed OpenClaw skill matches the generator (0.166292ms)
✔ react-error-containment: body contains the canonical skills/react-error-containment body (0.107125ms)
✔ react-error-containment: description is one line under 160 chars (0.018041ms)
✔ react-error-containment: referenced resources are packaged (0.061333ms)
✔ requirements: committed OpenClaw skill matches the generator (0.131625ms)
✔ requirements: body contains the canonical skills/requirements body (0.116209ms)
✔ requirements: description is one line under 160 chars (0.016709ms)
✔ requirements: referenced resources are packaged (0.0825ms)
✔ requirements-traceability: committed OpenClaw skill matches the generator (0.145042ms)
✔ requirements-traceability: body contains the canonical skills/requirements-traceability body (0.117666ms)
✔ requirements-traceability: description is one line under 160 chars (0.016417ms)
✔ requirements-traceability: referenced resources are packaged (0.08375ms)
✔ semantic-rebase: committed OpenClaw skill matches the generator (0.114625ms)
✔ semantic-rebase: body contains the canonical skills/semantic-rebase body (0.094542ms)
✔ semantic-rebase: description is one line under 160 chars (0.016875ms)
✔ semantic-rebase: referenced resources are packaged (0.054375ms)
✔ static-type-safety: committed OpenClaw skill matches the generator (0.132291ms)
✔ static-type-safety: body contains the canonical skills/static-type-safety body (0.103791ms)
✔ static-type-safety: description is one line under 160 chars (0.015958ms)
✔ static-type-safety: referenced resources are packaged (0.04925ms)
✔ test-credentials: committed OpenClaw skill matches the generator (0.171292ms)
✔ test-credentials: body contains the canonical skills/test-credentials body (0.126583ms)
✔ test-credentials: description is one line under 160 chars (0.016166ms)
✔ test-credentials: referenced resources are packaged (0.057375ms)
✔ typescript-unit-testing: committed OpenClaw skill matches the generator (0.112375ms)
✔ typescript-unit-testing: body contains the canonical skills/typescript-unit-testing body (0.089542ms)
✔ typescript-unit-testing: description is one line under 160 chars (0.017291ms)
✔ typescript-unit-testing: referenced resources are packaged (0.057959ms)
✔ user-acceptance-testing: committed OpenClaw skill matches the generator (0.103959ms)
✔ user-acceptance-testing: body contains the canonical skills/user-acceptance-testing body (0.084333ms)
✔ user-acceptance-testing: description is one line under 160 chars (0.020625ms)
✔ user-acceptance-testing: referenced resources are packaged (0.06675ms)
✔ ux-testing: committed OpenClaw skill matches the generator (0.099625ms)
✔ ux-testing: body contains the canonical skills/ux-testing body (0.080375ms)
✔ ux-testing: description is one line under 160 chars (0.015709ms)
✔ ux-testing: referenced resources are packaged (0.054625ms)
✔ variant-neutrality: committed OpenClaw skill matches the generator (0.126ms)
✔ variant-neutrality: body contains the canonical skills/variant-neutrality body (0.075667ms)
✔ variant-neutrality: description is one line under 160 chars (0.129917ms)
✔ variant-neutrality: referenced resources are packaged (0.113708ms)
✔ versioned-data-contracts: committed OpenClaw skill matches the generator (0.989417ms)
✔ versioned-data-contracts: body contains the canonical skills/versioned-data-contracts body (0.20675ms)
✔ versioned-data-contracts: description is one line under 160 chars (0.019417ms)
✔ versioned-data-contracts: referenced resources are packaged (0.13325ms)
✔ worktree-lifecycle: committed OpenClaw skill matches the generator (0.136ms)
✔ worktree-lifecycle: body contains the canonical skills/worktree-lifecycle body (0.128791ms)
✔ worktree-lifecycle: description is one line under 160 chars (0.015625ms)
✔ worktree-lifecycle: referenced resources are packaged (0.070833ms)
✔ generated resources omit canonical relationship annotations (1.500375ms)
✔ system.transform injects the ruleset at the default mode (full) (2.20175ms)
✔ command.execute.before persists /ponytail ultra, transform follows it (0.59125ms)
✔ /ponytail off disables compaction but preserves core policy (1.02375ms)
✔ system.transform merges into existing system entry (Qwen compat, #296) (0.419ms)
✔ unsupported /ponytail arguments do not reset the current mode (0.325125ms)
✔ unrelated commands do not touch the flag (0.151042ms)
✔ parseCommandFile reads frontmatter description + body, LF and CRLF (0.873958ms)
✔ parseCommandFile returns null when there is no frontmatter (0.242083ms)
✔ root npm test delegates only to the core suite (1.178584ms)
✔ CI installs MCP dependencies before root npm test (0.2475ms)
✔ npm package ships the advertised cleanup script (0.559875ms)
✔ Codex campaign workers establish and retain native assignment Goals before work (0.681167ms)
✔ plan execution serializes fast input before selector-based resumption (0.7415ms)
✔ campaign policy requires repository inventory and V2 direct dependencies (1.379042ms)
✔ serial plan execution does not require the deprecated scheduler (0.516708ms)
✔ deprecated scheduler preserves durable actions and worker-owned recovery (1.157916ms)
✔ planning and issue policy records prospective traceability without claiming coverage (0.444416ms)
✔ standalone and planned issue execution share the implementation activation gate (0.777875ms)
✔ starting policy admits only expressly owned reproduced failures and preserves final gates (0.282ms)
✔ coordinator binding lets composer enqueue derive the campaign (233.251209ms)
✔ blocker reporting authenticates the native coordinator across separate hook and command environments (452.396708ms)
✔ worker attach is one-time, status re-roots, and worker mutations fail closed (1551.978208ms)
✔ coordinator bindings are exclusive, releasable, and fail closed (495.527416ms)
✔ one coordinator session binds several campaigns while unscoped enqueue stays unambiguous (629.377042ms)
✔ producer hook ignores unrelated boundaries and never consumes a queue (405.188917ms)
✔ code-mode coordinator command establishes the same binding (230.919625ms)
✔ free-form code-mode input binds and releases only the authenticated coordinator (535.587875ms)
✔ ponytail pm pdf handles Ctrl-C without a Python traceback (915.361459ms)
✔ ponytail pm pdf renders configured collections in index order (941.726375ms)
✔ ponytail pm pdf all renders every configured collection (888.34925ms)
✔ ponytail pm pdf rejects unlisted pages and invalid configuration paths (686.742709ms)
✔ ponytail pm pdf reports missing render dependencies (647.015042ms)
✔ deprecated campaign scheduler owns observation and diagnostic priority (0.867959ms)
✔ portable policy loads only safe developer-private project instructions (1.456084ms)
✔ every compaction level preserves all always-on rules (2.296375ms)
✔ compaction level changes only its selected table row (0.684833ms)
✔ runtime policy comes from the canonical skill, not root AGENTS.md (0.182042ms)
✔ Ctrl-C is quiet in the wrapper and waits for delegated cleanup (1714.33ms)
✔ register initializes and registers the enclosing Git root idempotently (1363.736ms)
✔ V1 user configuration remains readable and upgrades through the V2 writer (1097.205708ms)
✔ pre-commit composes with an existing shell hook idempotently (2393.676417ms)
✔ concurrent register calls retain both registrations (748.809041ms)
✔ register rejects a symlinked policy and malformed user configuration (527.332084ms)
✔ update-permissions isolates every project policy from every other project (2130.673ms)
✔ update-permissions reads policy from the invoking worktree instead of the blessed worktree (836.964167ms)
✔ CLI installer links the checkout and the installed command updates skills (1566.716375ms)
✔ update refreshes Codex skills and permissions without installing the CLI (1374.847125ms)
✔ test mechanisms stay outside production artifacts (0.526042ms)
✔ integration tests prove the real isolated product path (0.085792ms)
✔ execution profiles preserve one Arc and test-owned state (0.083875ms)
✔ integration terminology has one canonical hierarchy (0.214708ms)
✔ integration failure policy stops one Arc and continues the run (0.627292ms)
✔ incremental commit preparation never rereads already indexed Git blobs (260.988459ms)
✔ parses exact repository grep selectors and paths (0.547666ms)
✔ parses exact repository index worker and transaction options (0.218417ms)
✔ index progress emits cumulative markers, throughput ETA, and final publication phase (0.273709ms)
✔ index progress extends one durable total for a late history snapshot (0.091ms)
✔ index progress ends interrupted lines and handles a zero-commit update (0.095667ms)
✔ TTY index progress renders the installed open-source bar with percent and explicit ETA (5.797958ms)
✔ collects exact Git state and only normalized traceability content (346.868375ms)
✔ replaces renamed configured paths without retaining deleted inputs (264.826542ms)
✔ projects explicit inventories and stable prospective planning entities (231.3685ms)
✔ does not parse files already present in the immutable cache (206.127125ms)
✔ publishes a complete generation with parameterized statements (180.04275ms)
✔ rolls back failed and contended publications (174.800625ms)
✔ rejects malformed durable cache payloads before publication (189.231709ms)
✔ parses exact search filters and rejects ambiguous options (0.26625ms)
✔ parses mutually exclusive validation scopes (0.119125ms)
✔ reports every directional cardinality gap without counting prospective roles (8.127417ms)
✔ validates only the exact fresh indexed graph and emits typed gaps (305.79625ms)
✔ derives exact plan and campaign entity closure through canonical membership and issue links (97.578084ms)
✔ searches only the exact fresh generation with bound filters (310.377875ms)
✔ refuses stale search without rebuilding (418.325084ms)
✔ indexes canonical plan hierarchy and separates legacy, invalid, and stranded plans (487.97975ms)
✔ indexes planning-only sprints while enforcing executable and tasklet-graph headings (2765.468333ms)
✔ reuses immutable cached plan parses without opening the source parser (338.854584ms)
✔ classifies missing-parent and cyclic plan records as invalid rather than stranded (0.20625ms)
✔ strands a member whose campaign does not reference it (0.105584ms)
✔ parses exact plan search and graph query arguments (0.204625ms)
✔ searches the exact fresh plan generation with bound filters (536.068792ms)
✔ refuses stale plan queries without rebuilding (486.060375ms)
✔ queries plan descendants, roots, and stranded records from the fresh generation (1160.145ms)
✔ project-configurable skills define their AGENTS.md keys and defaults (1.254125ms)
✔ every command distinguishes missing Git from absent registration (2988.39425ms)
✔ local QA ignores a removed project while global validation identifies it (2266.521583ms)
✔ local QA is independent of invalid campaign configuration (871.65375ms)
✔ blessing selects one clean tracked worktree and both command spellings report it (866.599833ms)
✔ register resolves linked worktrees to the main checkout and validate checks local setup (720.71025ms)
✔ registration and validation protect developer-private agent instructions (922.673667ms)
✔ project metadata retains exact V1 reads and upgrades through V2 writers (516.668833ms)
✔ project metadata versions retain their exact required fields (309.233ms)
✔ project metadata V2 requires unique explicit dependencies (416.138333ms)
✔ validation requires both project configuration files to be tracked (318.841041ms)
✔ manual component registration is idempotent and unregistration is explicit (1268.189ms)
✔ concurrent component registrations preserve both names (310.312083ms)
✔ component detection registers every named tracked JavaScript package (730.572542ms)
✔ component detection populates newly registered configuration before its first commit (272.940125ms)
✔ component detection parses every manifest before changing metadata (413.266417ms)
✔ validate and qa ignore identities owned only by another registered project (3192.962833ms)
✔ pre-commit does not acquire foreign identities from registration (1361.492584ms)
✔ pre-commit ignores dirty foreign configuration while global validation reports it (1627.657542ms)
✔ pre-commit remains independent of a foreign Ponytail registration (4525.026292ms)
✔ installed skill state does not introduce foreign project identities into QA (7729.485459ms)
✔ commit -am keeps its temporary index out of foreign repository checks (1271.899ms)
✔ registration and validation leave pre-commit installation optional (449.5455ms)
✔ foreign-reference exceptions remain unused when QA has no foreign catalog (2396.035375ms)
✔ local dependency manifests are validated without loading foreign package identities (2678.154125ms)
✔ explicit dependency commands manage local metadata without making QA read the foreign project (3215.272ms)
✔ reference QA does not derive identities from another registered project (951.093708ms)
✔ reference QA remains independent of components registered to another project (2002.771541ms)
✔ reference QA always permits Ponytail and its components (652.750958ms)
✔ blessing a foreign worktree does not change local QA (1493.8355ms)
✔ local QA ignores foreign snapshot refresh while explicit global validation reports staleness (1806.849875ms)
✔ canonical foreign component mutation does not affect local QA (967.36725ms)
✔ local QA uses a snapshot when blessing is absent and global validation fails (1484.893959ms)
✔ legacy registrations warn locally and fail explicit global validation (1014.149583ms)
✔ gitlink validation remains local and independent of foreign project identity (1379.699375ms)
✔ manifest readers identify direct dependencies across supported managers (271.903125ms)
✔ malformed metadata and untracked dependency declarations fail explicitly (747.731167ms)
✔ reference scope and diagnostic format ignore Git grep user preferences (3085.589084ms)
✔ qoder plugin manifest exists and has required fields (0.531292ms)
✔ qoder hooks config exists and registers UserPromptSubmit (0.148ms)
✔ qoder rules file exists and is non-empty (0.156792ms)
✔ qoder manifest points at skills that actually ship (0.159875ms)
✔ qoder runtime detects QODER_SESSION_ID and writes hookSpecificOutput JSON (0.758833ms)
✔ canonical registry matches all live-development sources (1.803958ms)
✔ registry rejects duplicate entries (0.243333ms)
✔ registry rejects bundled and multiply owned project skill names (0.522583ms)
✔ published surfaces must be registered for their host (0.289417ms)
✔ worktree indexing tolerates peer commits while fencing caller HEAD and content (5872.450416ms)
✔ configured checker validates structural and semantic locators together (1160.205875ms)
✔ traceability has one canonical forward mapping and three roles (0.536667ms)
✔ traceability requires implementation, unit, integration, and UAT coverage (0.099333ms)
✔ TSTS owns only semantic TypeScript traceability (0.082833ms)
✔ retains exact V1 reads and validates latest V2 search policy (4.269583ms)
✔ reads an exact V4 directional validation matrix (2.388167ms)
✔ reads exact V3 entity declarations and prospective planning roles (3.117833ms)
✔ rejects malformed V3 entities and never counts prospective work as actual coverage (6.326708ms)
✔ generates one reverse view and validates complete structural coverage (2.023167ms)
✔ reports unknown IDs, missing classes, unresolved locators, and stale reverse views (1.517375ms)
✔ accepts a justified no-unit-test disposition only for unit coverage (1.553666ms)
✔ recognizes only canonical Markdown requirement declarations (5.278333ms)
✔ allows one path to carry disjoint class-valid role filters (10.037667ms)
✔ rejects generated relationship copies and unsafe or unknown configuration (2.417083ms)
✔ generated runtime registry matches its canonical source (3.703667ms)
✔ Hermes registers skills from generated registry data (0.327292ms)
✔ Pi registers auxiliary commands from generated registry data (0.208917ms)
✔ planned work classifies QA eligibility by configured consumers (0.919459ms)
✔ planned work assigns the smallest sufficient proof to each gate (1.226833ms)
✔ bug implementation requests authorize the complete workflow by default (0.337334ms)
✔ plan and issue identities survive lifecycle moves (0.193958ms)
✔ long-lived plan execution journals actions without blocking work (0.194ms)
✔ portable unit-test cadence names no project tool (2.531667ms)
✔ host configuration supports named unit-test families (0.258709ms)
✔ planned work builds only targets reported by build impact (0.200583ms)
✔ source-proven configuration drift is repaired without an approval stop (0.229792ms)
✔ material configuration decisions still stop without halting other ready work (0.330875ms)
✔ specialized skills leave broad gates to their owning milestones (0.301ms)
✔ installed TSTS validates registration and checks real TypeScript contracts (2678.680334ms)
✔ TypeScript test metadata is owned by project configuration (0.479208ms)
✔ focused tests do not fall back to the full suite (0.08075ms)
✔ valid and invalid test values preserve their real contracts (0.071459ms)
✔ behavioral doubles use exact production boundary types (0.059458ms)
uninstall script checks passed
✔ tests/uninstall.test.js (225.186375ms)
✔ UX interaction comes from explicit host configuration (0.506708ms)
✔ UX validation covers the real path at complementary layers (0.104334ms)
✔ variant-specific facts come only from project configuration (0.459083ms)
✔ shared contracts isolate variant-specific structure (0.080166ms)
✔ shared operations dispatch exhaustively without fallback (0.120791ms)
✔ fifteen creation reservations bound one campaign, not another campaign or top-level project (389.331875ms)
✔ independent coordinator processes cannot both reserve the fifteenth slot (412.18125ms)
✔ an old but live project critical section cannot be stolen to overbook the pool (1420.220541ms)
▶ legacy replacement recovery returns the branch to the proven native checkout without losing merged state
  ✔ attached (770.749208ms)
  ✔ interrupted (647.71025ms)
  ✔ switched (593.750708ms)
  ✔ rebased (704.513459ms)
  ✔ dirty (418.219333ms)
  ✔ unproven (317.762959ms)
  ✔ ignored (458.72575ms)
✔ legacy replacement recovery returns the branch to the proven native checkout without losing merged state (3912.370709ms)
✔ provisioned original worker upgrades integrated adoption tooling and retains exact-path recovery (2063.232ms)
✔ bootstrap upgrade resumes every durable prefix without changing dispatch identity (3408.700209ms)
✔ bootstrap upgrade uses its owning top-level integration rather than another project sharing Git objects (460.88075ms)
✔ bootstrap upgrade rejects dirty content and unintegrated targets and authenticates the original host session (774.968375ms)
✔ bootstrap upgrade preserves an ignored collision and resumes the recorded intent after its removal (591.11075ms)
✔ bootstrap V1 is immutable and normalizes without inventing upgrade intent (331.909125ms)
✔ provisioned original worker recovers before adoption and attachment without replacing its started creation (757.570834ms)
✔ original worker recovers its exact checkout from a neutral cwd without coordinator action (1325.514625ms)
✔ recovery hook authenticates the exact worker before consulting its absent cwd (405.670791ms)
▶ recovery refuses a symlink, occupied branch, locked registration, or unavailable source
  ✔ symlink (438.440125ms)
  ✔ occupied (494.039875ms)
  ✔ locked (435.757458ms)
  ✔ source (401.974542ms)
  ✔ branch (433.988583ms)
✔ recovery refuses a symlink, occupied branch, locked registration, or unavailable source (2204.73175ms)
✔ legacy bindings explicitly enroll recovery provenance without changing the V1 reader (509.335542ms)
✔ retained pair reattachment rotates its capability without replacing session or checkout (241.377584ms)
▶ recovery rebuilds a removed slot directory with or without a surviving Git registration
  ✔ registered=true (494.941333ms)
  ✔ registered=false (511.900791ms)
✔ recovery rebuilds a removed slot directory with or without a surviving Git registration (1007.0655ms)
✔ worker-owned recovery acknowledges the original pending action without a new coordinator observation (515.180416ms)
✔ reclaims only adapter-proven abandoned worktrees and project resources across independent sessions (1582.277292ms)
✔ serializes independent maintenance sessions per project (2559.014375ms)
✔ does not couple reclamation locks for distinct projects (2873.788459ms)
✔ rejects a reclaimed result when the claim ID is concurrently reused (768.070584ms)
✔ stops before later claims when reclaim output is malformed (754.21125ms)
✔ fails closed on every untrusted lifecycle adapter form (4042.28375ms)
✔ reads exact lifecycle configuration and adapter requests (1.0495ms)
✔ normalizes exact inventory and rejects ambiguous claims (8.024917ms)
✔ reads and renders the exact command result (0.615584ms)
ℹ tests 544
ℹ suites 0
ℹ pass 544
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 61196.359917

> @alexbaretta/ponytail@4.8.4 build
> tsc -p tsconfig.json && node dist/scripts/build-runtime.js


> @alexbaretta/ponytail@4.8.4 test:typed
> node --test dist/tests/*.test.js

✔ portable and rolling queries share explicit coordinator bindings and preserve historical inputs (7872.789ms)
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (147.648041ms)
✔ activation write failure restores the directory and every original Markdown byte (90.087583ms)
✔ activation destination and status guards reject before changing source bytes (130.817625ms)
✔ management configuration reader requires one exact safe V1 contract (1.223667ms)
✔ project-local management files preserve configuration, unsafe-file and data-error distinctions (3.862083ms)
✔ plan dependency validation accepts DAGs and rejects missing members and cycles (0.686541ms)
✔ cross-plan gates require DONE in both current contents and committed HEAD (280.134791ms)
✔ cross-plan validation rejects missing targets, completed dependents and cycles (79.358458ms)
✔ typed campaign graph retains a planning-only scope and explicit legacy obligation absence (132.343584ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.999167ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.220958ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (200.325333ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.252459ms)
✔ empty valid inventory presentation retains its summary and final newline (0.086708ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.856167ms)
✔ typed validation selection retains all/json ordering and plan selection (0.114ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.124791ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.428542ms)
✔ planning-only contents retain zero execution counts without requiring tasklet metadata (4.219625ms)
✔ execution contents retain normalized statuses, feature paths and exact ready tasklet scope (12.955917ms)
✔ physical metadata readers retain versions, normalize dependencies and expose V3 obligation identity (1.135333ms)
✔ metadata rejects malformed dependencies, inconsistent prose and unsafe obligation paths (0.454958ms)
✔ selected files dispatch physical versions while text parsing uses the supplied source and preserves parse failures (3.578542ms)
✔ source listing is lexical while parsed candidates follow configured lifecycle order (17.972375ms)
✔ candidate discovery rejects absent, symlinked and physically escaping roots and unsafe lifecycle directories (4.124416ms)
✔ linked plans resolve existing directories, file fragments and physical paths while omitting missing links (3.277667ms)
✔ V1 report reader preserves input identity and historical sprint status strings (1.465833ms)
✔ V1 report reader validates count maps and nested unknown records (0.57225ms)
✔ V1 report reader retains the explicit null percentage for empty execution (0.090875ms)
✔ typed presentation retains exact header output and independently selected tables (0.372875ms)
✔ active selection and explicit child selection resolve the same complete campaign scope (10.956541ms)
✔ selection preserves missing and ambiguous active campaign and plan-name diagnostics (16.834917ms)
✔ ancestry enforces parent existence, links, cycles and shared obligation scope (4.372959ms)
✔ frozen lease retains its revision, scope and proof binding across coordinator amendments (6001.927542ms)
✔ lease issuance rejects foreign authority and out-of-baseline outcomes without widening defaults (3467.389833ms)
✔ lease use fences graph and generation, operations and exact changed paths (2772.01425ms)
✔ physical lease reader retains exact V1 and rejects malformed identities and unbounded edit permission (2691.975292ms)
✔ binding amendment preserves obligation identities, historical content and earlier projected permissions (2475.150667ms)
✔ amendment fences both global and per-obligation predecessors and the immutable accepted prefix (2533.402667ms)
✔ binding history rejects undeclared authority, foreign scope, unknown members and prerequisite cycles (2498.536333ms)
✔ physical binding reader retains exact paths, proof and target and rejects malformed or unbounded execution (2513.059916ms)
✔ replaying every accepted binding prefix preserves default and historical projections and rejects no-op growth (2476.360709ms)
✔ new amendments require the current accepted baseline and cannot borrow authority from an unaccepted proposal (2514.137917ms)
✔ bound acceptance preserves immutable V1 records and legacy adequacy while requiring retained proof (4744.482458ms)
✔ bound acceptance fences retained generation/revision, current binding and current prerequisites (3937.844333ms)
✔ physical binding V1 rejects unsafe indices, ambiguous proof and unsupported identities (2930.734792ms)
✔ bound proof cannot change its candidate, frozen QA target, outcome or retained execution identity (2701.918875ms)
✔ adopted scope selects only owned tasklets and rejects path escape without mutation (183.386792ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (228.873709ms)
✔ foreign ownership returns no edits and unknown allowed tasklets reject without mutation (236.807416ms)
✔ canonical adopted CLI requires its document and DONE edits leave discharge unresolved (493.46975ms)
✔ V1 boundary rejects unknown fields, broken identities, references and cycles without mutation (3.794708ms)
✔ owned JSON boundary rejects lossy number tokens before normalization (2.061667ms)
✔ freshness requires scoped unchanged assessed inputs and adequate finalized proof (6.66575ms)
✔ execution certificate rejects missing, failing, skipped and unfinalized evidence (3.438292ms)
✔ projection uses accepted certificates, reopens changed inputs and preserves inventory gaps (4.50875ms)
✔ stale prerequisite reopens dependent satisfaction while its own certificate remains fresh (8.902167ms)
✔ lexicographic vectors allow necessary downstream growth and reject invalid counts (0.322167ms)
✔ selection cannot bypass blocked upstream work and uses numeric stable identity (1.452042ms)
✔ acceptance rejects stale predecessor, changed meaning, authority and false productive claims (6.079792ms)
✔ accepted downstream discovery retains historical vectors and newly unresolved obligations (2.814917ms)
✔ neutral preparation is bounded and repeated completed episodes are rejected (1.9205ms)
✔ stale proof forces honest disturbance before new productive acceptance (3.313042ms)
✔ activated baseline retains unchanged IDs and old unresolved history without comparing scopes (1.806375ms)
✔ portable CLI uses explicit scoped document and contains invalid data and IO failures (501.531291ms)
✔ contract manifest registers exactly the independently evolving V1 reader (0.212333ms)
✔ zero requires all six assessed inventories and applicable non-metric authority gates (57.892209ms)
✔ reordering JSON object keys cannot bypass the completed neutral preparation bound (2.127583ms)
✔ reader cannot hide declared membership from the accepted current observation (4.600625ms)
✔ serial policy preserves atomic batch and convergence boundaries (1.54175ms)
✔ campaign census policy preserves scoped reports and adds repository inventory (0.760625ms)
✔ sandbox-blocked journaling requires explicit persistent-rule authorization (0.214708ms)
✔ orchestration metadata retains every immutable reader (0.55275ms)
✔ CLI grammar preserves multiword prompts and validates lifecycle commands (1.071708ms)
✔ both producers share the exact durable V2 queue contract (17.500917ms)
✔ physical V1 remains exact but is retired from queue consumption (1.940834ms)
✔ one claim is a critical section and completion requires durable PM evidence (23.76125ms)
✔ coordinator lifecycle commands validate campaign membership (20.760375ms)
✔ CLI producer resolves a member plan to the campaign root (15.682291ms)
✔ empty campaign claim returns successful explicit JSON exhaustion (106.482875ms)
✔ CLI lists and claims pending inputs and omits completed inputs (10.941416ms)
✔ native CLI reports grammar errors without a stack trace (78.174958ms)
✔ project-local database options preserve pg defaults and password environment semantics (3.887333ms)
✔ database options reject malformed consumed configuration fields (3.60475ms)
✔ generated sprint CLI preserves planning, execution and completion JSON (204.662ms)
✔ native sprint CLI preserves grammar error output and exit status (86.994792ms)
✔ V3 runnable selection resumes the started sprint without relaxing start or review gates (7.42775ms)
✔ reviewable selection finds only an approved unreviewed V3 sprint with completed dependencies (0.264791ms)
✔ selects one V1 sprint and retains unordered-path validation (0.263959ms)
✔ selects one dependency-ready planning sprint and gates detailed planning review (0.159167ms)
✔ V2 execution selects only the earliest reviewed checkpoint and rejects advanced successors (6.113667ms)
✔ planning starts only after approved prerequisites and preserves blocked and eligible inputs (0.174167ms)
✔ all sprint selectors preserve canonical readonly fixture values (0.104375ms)
✔ V3 execution selects the earliest reviewed dependency-ready sprint and rejects advanced dependencies (0.1275ms)
✔ native CLI rejects unordered V3 paths and permits explicitly ordered sharing (172.357792ms)
✔ native V2 CLI returns exact JSON and leaves inputs unchanged (100.672333ms)
✔ preserves literal bracket scope roots and rejects glob and escaping legacy paths (0.44125ms)
✔ physical dispatch rejects an unsupported future version and legacy execution globs (0.115416ms)
✔ generated portable launch path preserves scalar selection and exact completion output (181.735583ms)
✔ adopted owning plans require their configured obligation document (176.717791ms)
✔ retains strict physical V1 parsing and scalar selection (101.175708ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (4.391209ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (25.427959ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (17.347709ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (5.910708ms)
✔ selects the highest-ranked V2 tasklet (9.045334ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.889291ms)
✔ blocks tasklets until dependency-feature validation is complete (2.955667ms)
✔ uses prior affinity and graph criteria deterministically (0.84125ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (67.557625ms)
✔ V3 returns one complete ordered batch (2.236209ms)
✔ V3 bounds a batch while V2 selects one tasklet (3.695916ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (24.434791ms)
✔ native code fixture approvals permit exact shell-wrapped commands only for the assigned checkout and turn (0.654625ms)
✔ real PostgreSQL records lost reviewer replacement and fences the old actor while retaining fresh review after restart (17180.050125ms)
ℹ Lost review d51c0961-9057-41f1-8b11-1dcc0a598d24 retained unchanged; recorded replacement 8d551a45-acca-410e-83d2-040ad0137412; old dispatch and decisions fenced after restart; fresh review pending.
✔ real PostgreSQL serializes allocation, retains ownership and persists accepted review (10192.529291ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists rejected review (5804.348458ms)
✔ real PostgreSQL serializes allocation, retains ownership and persists native application review (5977.677125ms)
✔ worker provisioning fences creation and atomically attaches the native identity and ignored marker (3596.715917ms)
✔ worker suspension observes stopped activity and frees capacity while retaining dirty ownership (3825.660625ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; next obligation=OBL-3; allocated checkout=102
✔ worker resumption restores original native identity and refreshes its scope before new work (4648.942458ms)
ℹ worker suspension thread=thread-fixture; session=session-fixture; native=idle; retained checkout=101 with dirty checkpoint; retained for reactivation
ℹ worker resumption thread=thread-fixture; session=session-fixture; checkout=101; base=55ae7a6b87501a7e8b2bdb5a85c1ea215518a874; generation=83061886-afcb-4be0-a593-610e38151255; fresh instructions completed before new allocation
✔ worker creation recovery retains uncertain ownership and attaches original initialization after restart (3759.286958ms)
ℹ worker recovery thread=thread-fixture; session=session-fixture; initialization=turn-1; original action recovered after restart without duplicate creation; missing receipt and active activity preserve reservation
✔ submission collection binds terminal idle actor and exact passing candidate before review (5673.989875ms)
ℹ component submission revision=d7d5014353bef98c17235e3878c0e4efa1836e19; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ real PostgreSQL automatically publishes the reviewed increment through one coordinator operation (7293.477459ms)
✔ real PostgreSQL retains inspected conflict continuation across restart without duplicate replay (7175.120917ms)
✔ real PostgreSQL routes substantive integration conflicts to retained worker without changing accepted review (6589.33925ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/b8583349-d17e-4146-9d18-6458a2478383.
✔ substantive integration repair retains worker and reviewer through fresh proof and publication (7635.714083ms)
ℹ component submission revision=1374765f598c05adb7f47d6df5360ebf83df498d; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ integrated certificate assessment uses retained published proof and serializes accepted record publication (9615.435375ms)
Successfully rebased and updated refs/heads/ponytail/worker-101/64165a0d-9089-4d90-a701-2f052c246256.
✔ worker retirement revokes native ownership and fences checkout release through restartable cleanup (7591.32225ms)
ℹ component submission revision=6cb335818122c153d764470a6c961f043755ff00; exact original turn=turn-2; session=session-fixture; focused QA=2; REVIEW persisted; native code/rebase Arc remains unverified
✔ publication batch freezes one shared partial claim across concurrent requests and restart (11018.686625ms)
✔ publication partial flush follows verified completion state (9762.521792ms)
✔ publication partial flush follows verified quiescence state (9699.759042ms)
✔ publication threshold uses configured M and persists one claim without counting acknowledgement retries (9115.324833ms)
✔ mainline normal publication retains one observation and synchronizes the campaign after restart (11735.680125ms)
✔ mainline lost_ack publication retains one observation and synchronizes the campaign after restart (11884.082375ms)
Switched to a new branch 'main'
To /private/var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/rolling-store-lkqAVE/managed/increment-remote.git
   b8983cf..df76c6f  main -> main
✔ mainline race publication retains one observation and synchronizes the campaign after restart (13601.827875ms)
✔ mainline unavailable publication retains one observation and synchronizes the campaign after restart (13378.540917ms)
✔ mainline rejected publication retains one observation and synchronizes the campaign after restart (13504.281625ms)
✔ stored execution contracts reject unresolved values, altered scopes and unsupported versions (114.470834ms)
✔ stored V2 contracts retain explicit coordinator history and the complete frozen lease (48.197542ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (599.489667ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (6002.470792ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.767167ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.437209ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (4.543583ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (229.722958ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (595.5315ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.530166ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (2.099208ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.466125ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.29675ms)
✔ V2 cleanup declaration preserves V1 physical meanings and normalizes unknown retirement safely (0.377542ms)
✔ every registered command exposes its complete contract through the shipped CLI (3664.801125ms)
✔ retired campaign commands and malformed options fail before opening project state (477.485792ms)
✔ native protocol binds checkout and session, preserves numbers and observes completed/failed/interrupted turns (125.09875ms)
✔ terminal notifications supersede an earlier in-progress history response (88.08825ms)
✔ timeouts retain unknown outcome and late responses do not trigger a retry (210.253291ms)
▶ lost or malformed responses reject all affected pending operations
  ✔ drop (92.058ms)
  ✔ malformed (91.360916ms)
✔ lost or malformed responses reject all affected pending operations (183.880166ms)
✔ review dispatch resumes the assigned native reviewer and observes its exact final decision (121.555083ms)
✔ initialization recovery reads exactly one original turn and rejects absent or ambiguous history (152.305834ms)
✔ archive recovery uses paginated exact-checkout inventory and rejects an escaped physical root (92.205125ms)
✔ fast integration interactively rebases clean commits and requests fresh proof on the new base (2321.164291ms)
✔ fast integration retains textual conflicts for semantic review and does not reset the worker checkout (2204.908042ms)
✔ fast integration refuses a changed checkout before fetching or replaying (809.539667ms)
✔ normal increment push establishes containment and repeated reconciliation does not push again (2050.401041ms)
✔ upstream divergence requests another rebase and preserves both revisions (1095.550791ms)
✔ rejected push does not claim delivery and can be retried after rejection clears (1996.266041ms)
✔ lost remote observation remains unconfirmed until actual containment can be read (1383.783208ms)
✔ coordinator fast-forwards its configured branch and refuses checkout changes (965.211125ms)
✔ integration claim reader freezes exact V1 fields and rejects malformed persisted identities (0.589875ms)
✔ prepared rebase records exact inputs before replay and refuses changed candidate state (718.205709ms)
✔ publication receipt reader preserves separate confirmed, rejected, divergent and unknown outcomes (0.440542ms)
✔ shared operations initialize defaults and reconcile event/periodic contention without duplicate allocations (10244.07325ms)
✔ closure requires fresh evidence, persists an immutable receipt and fences later mutations (1833.182541ms)
✔ CLI initialization preserves its physical V1 contract and rejects rounded integers or undeclared fields (68.288334ms)
✔ coordinator decisions require reconciliation before suggesting work from a changed authoritative graph (0.264917ms)
✔ next actions retain exact fenced identities and prerequisite explanations before replenishment (0.122208ms)
✔ unknown publication is observed before worker replenishment and never suggested as a push retry (0.123458ms)
✔ mainline candidate preserves published campaign history and requires complete full QA on its exact merged tree (6613.45025ms)
✔ conflicting mainline preserves the publication branch, merge state and published campaign refs (1158.871166ms)
✔ publication freezes exactly M distinct accepted increments without counting repeated acknowledgements (1.232583ms)
✔ explicit flush, completion and quiescence freeze nonempty partial batches but never publish an empty batch (0.158709ms)
✔ stored publication claims preserve the exact frozen prefix and refuse malformed or mutable receipt snapshots (425.09525ms)
✔ full QA receipts retain complete command outcomes and lossless signed failure status (0.993666ms)
✔ reviewer replacement records loss and fresh identities without changing historical review contracts (1.649875ms)
✔ shipped review runtime loads its generated native adapter outside the dist tree (2.892583ms)
✔ physical V1 requests and decisions retain exact immutable candidate and reviewer identities (0.593083ms)
✔ review completion requires the exact terminal turn and validated final message (0.443667ms)
✔ unknown contract fields, malformed identities, revisions and unfounded rejection fail at the boundary (0.308875ms)
✔ candidate, review and reviewer mismatches cannot transfer approval to another request (0.130625ms)
Rebasing (1/1)
Stopped at ef33da2...  # candidate
You can amend the commit now, with

  git commit --amend 

Once you are satisfied with your changes, run

  git rebase --continue
Successfully rebased and updated refs/heads/master.
✔ submission enforces actual renamed and deleted paths and clean finalized candidate proof (2926.369875ms)
✔ submission rejects dirty checkout, another HEAD and a foreign or tracked marker (405.262209ms)
✔ submission rejects a clean interactive rebase edit stop until the rebase completes (512.748083ms)
✔ submission rejects merge history and reverted out-of-scope commits (908.957ms)
✔ physical submission V1 retains exact evidence and rejects unknown keys, unsafe numbers and active claims (156.675833ms)
✔ creation receipt preserves exact native identity and rejects malformed physical contracts (1.488417ms)
✔ initialization uses the returned native thread directly and binds only its ignored marker (180.841125ms)
✔ worker instructions retain exact obligation, requirement, acceptance step, lease and QA selections (1.435125ms)
✔ stop observations retain native idle identity, exact stopped turn and dirty checkout checkpoint (2.414791ms)
✔ resumption receipt retains original native identity and an exact refreshed campaign base (0.385792ms)
✔ retirement contract distinguishes original resource allocation from the revoked assignment generation (0.369125ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (1635.968583ms)
✔ retirement cleanup verifies owner, preserves caches and user work, and retains failed cleanup (1255.497542ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (2.043042ms)
✔ both dependency lifecycles reject unknown identities, self edges and cycles without mutating inputs (1.336708ms)
✔ legacy path ownership recognizes transitive execution ordering and rejects unordered sharing (0.396541ms)
✔ V3 ownership derives tasklet paths while planning-only sprints consume no tasklet file (2.764166ms)
✔ physical sprint readers preserve planning, version-specific execution and null execution (1.43375ms)
✔ physical V1 sprint metadata retains null execution and rejects malformed inputs without mutation (0.869792ms)
✔ physical V2 sprint metadata preserves reviewed and null execution without mutating valid or malformed inputs (0.306708ms)
✔ physical V3 sprint metadata preserves its complete value and leaves rejected input unchanged (0.171042ms)
✔ unknown sprint metadata rejects invalid reviewed flags, paths, identity and block count (0.267917ms)
✔ discovery retains numeric ordering and rejects duplicate ordinals and mixed physical versions (6.503125ms)
✔ discovery preserves homogeneous physical collections and files and rejects absent or empty collections (5.317333ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.933917ms)
✔ physical versions retain normalized maps, risk reasons and external dependency identities (1.472125ms)
✔ unknown metadata rejects invalid risk reasons, paths and external declarations (0.422375ms)
✔ file dispatch validates unknown JSON and each supported physical version (2.571791ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (2.101167ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (10.039542ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.498875ms)
✔ heading parser retains the exact pending, done and error statuses (1.093875ms)
✔ heading parser rejects malformed, duplicate and required empty declarations (0.277292ms)
✔ requirements preserve provenance and stakeholder conflict resolution (0.4855ms)
✔ UAT derives release evidence from approved requirements (0.118958ms)
✔ UAT defers every concrete operation to the host project (0.076583ms)
ℹ tests 229
ℹ suites 0
ℹ pass 229
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 211267.771542
codex plugin marketplace add /Users/alex/git/ctosclub/ponytail --json
codex plugin add ponytail@ponytail --json
{}
{}
copy /Users/alex/git/ctosclub/ponytail/skills/api-service-boundaries -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/api-service-boundaries
copy /Users/alex/git/ctosclub/ponytail/skills/architecture -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/architecture
copy /Users/alex/git/ctosclub/ponytail/skills/bash-parse-safe-scripts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/bash-parse-safe-scripts
copy /Users/alex/git/ctosclub/ponytail/skills/build-impact -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/build-impact
copy /Users/alex/git/ctosclub/ponytail/skills/cloud-cli-reauth -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/cloud-cli-reauth
copy /Users/alex/git/ctosclub/ponytail/skills/codex-execpolicy -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/codex-execpolicy
copy /Users/alex/git/ctosclub/ponytail/skills/cross-session-effects -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/cross-session-effects
copy /Users/alex/git/ctosclub/ponytail/skills/debugging -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/debugging
copy /Users/alex/git/ctosclub/ponytail/skills/diagnostic-assertions -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/diagnostic-assertions
copy /Users/alex/git/ctosclub/ponytail/skills/indeterminate-list-ux -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/indeterminate-list-ux
copy /Users/alex/git/ctosclub/ponytail/skills/issue-tracking -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/issue-tracking
copy /Users/alex/git/ctosclub/ponytail/skills/lossless-json-contracts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/lossless-json-contracts
copy /Users/alex/git/ctosclub/ponytail/skills/monetary-contract-safety -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/monetary-contract-safety
copy /Users/alex/git/ctosclub/ponytail/skills/plan-execution -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/plan-execution
copy /Users/alex/git/ctosclub/ponytail/skills/parallel-plan-scheduler -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/parallel-plan-scheduler
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/ponytail
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-audit -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/ponytail-audit
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-debt -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/ponytail-debt
copy /Users/alex/git/ctosclub/ponytail/skills/ponytail-review -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/ponytail-review
copy /Users/alex/git/ctosclub/ponytail/skills/project-structure -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/project-structure
copy /Users/alex/git/ctosclub/ponytail/skills/production-test-boundaries -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/production-test-boundaries
copy /Users/alex/git/ctosclub/ponytail/skills/react-error-containment -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/react-error-containment
copy /Users/alex/git/ctosclub/ponytail/skills/requirements -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/requirements
copy /Users/alex/git/ctosclub/ponytail/skills/requirements-traceability -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/requirements-traceability
copy /Users/alex/git/ctosclub/ponytail/skills/semantic-rebase -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/semantic-rebase
copy /Users/alex/git/ctosclub/ponytail/skills/static-type-safety -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/static-type-safety
copy /Users/alex/git/ctosclub/ponytail/skills/test-credentials -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/test-credentials
copy /Users/alex/git/ctosclub/ponytail/skills/typescript-unit-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/typescript-unit-testing
copy /Users/alex/git/ctosclub/ponytail/skills/user-acceptance-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/user-acceptance-testing
copy /Users/alex/git/ctosclub/ponytail/skills/ux-testing -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/ux-testing
copy /Users/alex/git/ctosclub/ponytail/skills/variant-neutrality -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/variant-neutrality
copy /Users/alex/git/ctosclub/ponytail/skills/versioned-data-contracts -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/versioned-data-contracts
copy /Users/alex/git/ctosclub/ponytail/skills/worktree-lifecycle -> /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/worktree-lifecycle
remove /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/git-write-escalation
remove /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/skills/typed-contract-safety
remove empty /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/AGENTS.md
link /var/folders/yv/v_v6t2lj1nz4ypl2bpp_ytqm0000gp/T/ponytail-install.rbLPkL/codex/AGENTS.md -> /Users/alex/git/ctosclub/ponytail/config/AGENTS.md
installer tests passed

> test
> node --test ./test/*.test.js

✔ extension registers Ponytail commands (1.284084ms)
✔ /ponytail updates session mode and injects instructions (1.26675ms)
✔ before_agent_start guards missing event and missing systemPrompt (#439, #440) (1.272209ms)
✔ session_start restores latest persisted mode (0.518167ms)
✔ skill commands delegate and help displays directly (0.3025ms)
✔ normal mode disables compaction but preserves core policy (0.56825ms)
✔ a request mentioning normal mode stays active (0.665958ms)
✔ status bar renders the mode and flips active on agent_start (0.529084ms)
✔ status bar stays silent when ui lacks a theme (0.449625ms)
✔ PONYTAIL_HIDE_STATUS hides the indicator but keeps ponytail active (#324) (0.54375ms)
✔ config.hideStatus hides the indicator but keeps ponytail active (#324) (1.022833ms)
✔ PONYTAIL_HIDE_STATUS=0 does not hide the indicator (0.409666ms)
✔ parsePonytailCommand falls back to full when invoked bare and default is off (0.846708ms)
✔ parsePonytailCommand parses modes, status, and default subcommand (0.137167ms)
✔ parsePonytailCommand rejects review as a default (session-only mode, #377) (0.062167ms)
✔ resolveSessionMode still honors review as a session mode (not a default) (0.098958ms)
✔ resolveSessionMode prefers latest persisted session mode (0.067417ms)
✔ resolveSessionMode returns fallback when entries is not an array (0.054208ms)
✔ readDefaultMode and writeDefaultMode use XDG config path (1.052583ms)
✔ readQuietStartup resolves env var, config file, and default in that order (0.693084ms)
✔ filterSkillBodyForMode keeps only requested intensity examples and rows (0.260292ms)
✔ filterSkillBodyForMode does not drop a rule bullet whose label matches a mode name (0.152625ms)
✔ filterSkillBodyForMode keeps rule bullets that contain a colon (0.737583ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 61.041583

> ponytail-mcp@4.8.4 test
> node --test ./test/*.test.js

✔ resolveMode keeps valid intensities (0.4465ms)
✔ resolveMode preserves off and falls back for unknown or empty values (0.687375ms)
✔ buildInstructions returns the ruleset tagged with the resolved mode (0.514125ms)
✔ buildInstructions preserves core policy when compaction is off (0.166375ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 58.494708

> @alexbaretta/ponytail@4.8.4 test:tsts
> node --test tsts/dist/test/*.test.js

▶ parseTstsCliArguments
  ✔ defaults to tsconfig.json (0.7735ms)
  ✔ parses an explicit unused-code config path (0.089042ms)
  ✔ parses an explicit project path (0.064458ms)
  ✔ parses a directory-structure manifest with a project (0.072917ms)
  ✔ runs directory-structure analysis without an implicit TypeScript project (0.072292ms)
  ✔ parses semantic traceability with an explicit project (0.062417ms)
  ✔ parses help requests (0.05ms)
✔ parseTstsCliArguments (1.74225ms)
▶ formatTextReport
  ✔ formats an empty result (0.104083ms)
✔ formatTextReport (0.175208ms)
▶ usage
  ✔ describes the project option (0.127709ms)
✔ usage (0.183291ms)
▶ TSTS configuration v2
  ✔ accepts an exact graph-only configuration (363.847917ms)
  ✔ rejects missing and unsupported schema versions with upgrade guidance (69.445875ms)
  ✔ rejects unknown keys at every configuration object level (31.973375ms)
  ✔ rejects malformed required fields and severities (70.118666ms)
✔ TSTS configuration v2 (536.090791ms)
▶ directory-structure manifest
  ✔ accepts declared tracked and ignored content (113.140375ms)
  ✔ accepts V1 by normalizing it without exact file rules (207.421416ms)
  ✔ lets one exact file override its containing directory policy (194.38175ms)
  ✔ reports misplaced and untracked content together (159.619417ms)
  ✔ uses the most specific content pattern and directory owner (196.4455ms)
  ✔ accepts data and compiled artifacts only under their declared owners (200.395542ms)
  ✔ reports equal-specificity content kinds as ambiguous (134.851041ms)
  ✔ does not follow configured opaque directory symlinks (146.133875ms)
  ✔ rejects unknown keys and escaping paths (332.250583ms)
  ✔ rejects duplicate JSON keys and directory owners (145.86225ms)
✔ directory-structure manifest (1831.491666ms)
▶ TSTS lossless JSON codec
  ✔ round-trips exact numbers (0.843917ms)
  ✔ rejects malformed and unsupported values (0.1695ms)
✔ TSTS lossless JSON codec (1.486916ms)
▶ no-aliasing
  ✔ reports import and export aliases when configured (828.928625ms)
✔ no-aliasing (829.448916ms)
▶ public union discriminator rule
  ✔ accepts a valid discriminated public union (428.671792ms)
  ✔ accepts const-backed string literal discriminants (237.90125ms)
  ✔ rejects a public union with duplicate discriminator values (184.283875ms)
  ✔ rejects an ambiguous four-variant shape (155.36425ms)
  ✔ accepts synthetic row result variants (144.7325ms)
  ✔ rejects ambiguous synthetic channel variants (121.619375ms)
  ✔ rejects a public union with no shared required literal field (135.766542ms)
  ✔ explains shared required fields that are not literal in every variant (138.347333ms)
  ✔ rejects optional discriminator fields (113.913542ms)
  ✔ ignores non-object unions outside the rule scope (107.700584ms)
  ✔ reports every non-fatal violation (103.03475ms)
✔ public union discriminator rule (1872.539042ms)
▶ public union dispatch rule
  ✔ accepts exhaustive switch dispatch (800.763833ms)
  ✔ accepts const-backed exhaustive switch dispatch (301.097042ms)
  ✔ rejects non-exhaustive switch dispatch (269.06925ms)
  ✔ rejects non-exhaustive dispatch over a non-exported union (165.394667ms)
  ✔ does not allow default clauses to hide missing cases (142.365208ms)
  ✔ rejects a catch-all branch that throws (106.920917ms)
  ✔ checks discriminated union dispatch in configured workspaces (126.486042ms)
  ✔ rejects if dispatch over public union discriminators (107.905208ms)
✔ public union dispatch rule (2020.993792ms)
▶ TypeScript traceability locators
  ✔ accepts a leading annotation on a named declaration (300.951917ms)
  ✔ rejects annotations inside a declaration body (187.183ms)
  ✔ rejects configured files outside the TypeScript project (12.207416ms)
  ✔ checks a shared configured TypeScript path once (142.192375ms)
  ✔ accepts an exact V2 configuration with safe search fields (128.380208ms)
  ✔ accepts an exact V3 inventory and an attached explicit entity marker (139.427042ms)
  ✔ accepts an exact V4 directional validation matrix (113.782917ms)
✔ TypeScript traceability locators (1025.026708ms)
▶ type-safe persisted serdes rule
  ✔ accepts canonical persisted envelope types and schemas (380.781541ms)
  ✔ rejects unknown persisted envelope types (249.92525ms)
  ✔ rejects untyped JSON persisted envelope types (161.544084ms)
  ✔ rejects private narrower reader envelope types (136.136958ms)
  ✔ rejects private reader schemas for persisted envelope parsing (184.618791ms)
  ✔ rejects non-canonical Zod schemas for persisted envelope fields (148.73675ms)
  ✔ accepts canonical contract variant helpers only inside canonical declarations (136.5845ms)
  ✔ ignores ordinary object literals with matching envelope property names (140.319167ms)
✔ type-safe persisted serdes rule (1539.634833ms)
▶ unique exported type names
  ✔ rejects independently declared exported AppState contracts (1058.082292ms)
  ✔ accepts a re-export of the canonical AppState declaration (380.408375ms)
✔ unique exported type names (1439.149333ms)
▶ unused code rule
  ✔ treats exported declarations from public package entrypoints as roots (676.203334ms)
  ✔ reports declarations not reachable from configured entrypoints (440.592416ms)
  ✔ does not report unused declarations when the rule is omitted (237.8485ms)
  ✔ follows exported variables through cross-workspace re-exports (311.04725ms)
  ✔ treats class extends expressions as value references (109.435958ms)
  ✔ follows value and type declarations through local star re-exports (102.229667ms)
  ✔ follows imported module initialization (98.439583ms)
  ✔ follows dynamically imported exports and module initialization (99.881042ms)
  ✔ follows shorthand property value references (115.481458ms)
  ✔ treats global augmentation contracts as type roots (97.720083ms)
✔ unused code rule (2290.010416ms)
▶ versioned data contracts rule
  ✔ accepts exact readers and no adapters when none are required (486.386ms)
  ✔ reports missing readers and downgrade adapters (203.834125ms)
  ✔ checks a selected valid family without checking an unrelated invalid family (136.911166ms)
  ✔ checks selected families in configuration order (107.65625ms)
  ✔ reports every selected family missing from the manifest (104.011583ms)
  ✔ rejects empty and duplicate family selections at the configuration boundary (4.55725ms)
  ✔ validates duplicate manifest IDs before applying selection (107.170291ms)
  ✔ checks every manifest family when selection is omitted (121.195042ms)
✔ versioned data contracts rule (1272.633875ms)
ℹ tests 80
ℹ suites 14
ℹ pass 80
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3046.91325

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1235 files: no violations found.

~~~

## Native evidence context

The explicit native suite recorded 35 passing cases and one failure caused by an incorrect directory echo in the final model reply. The unchanged exact checkout case passed on isolated rerun. Those historical logs are retained in tmp/interface-native-acceptance.log and tmp/interface-native-cwd-revalidation.log; they are not represented as an all-green native-suite invocation by this assessment.
