<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Owned executable language inventory

[Plan](plan.md) | [Delivery decomposition](delivery-decomposition.md)

Inspection basis: `c82e80c`, clean tracked checkout before this documentation
change. Scope is only this Ponytail repository. This is a source-ownership
snapshot and behavioral-boundary discovery record, not a satisfaction registry
or a work-completion denominator. Canonical obligation conditions and criteria
remain in [obligations.json](obligations.json).

## Reproducible ownership census

Enumerate `git ls-files -z`. Select tracked `.ts`, `.js`, `.mjs`, `.cjs`, `.sh`,
`.py` and `.ps1` paths, plus files with a leading shebang regardless of extension.
Apply the invoking project's `traceability.json` generated-source mappings;
do not infer that a JavaScript file is generated merely because a TypeScript
file has a similar name. Separately classify the OpenClaw mirror owned by
`build-openclaw-skills.js` and the existing typed TSTS subtree. Follow generator
and consumer references for embedded programs and declarative launch files.
Generated mappings do not prove byte synchronization; the configured runtime,
mirror and generator checks remain required acceptance evidence.

The selected tracked executable-path census partitions into 192 canonical
owners, 26 mapped adjacent runtimes, 18 OpenClaw executable resource copies and
17 existing TSTS source/test owners. These sets are disjoint and cover all 253
selected paths. The canonical owners comprise 63 TypeScript paths and 129 paths
still written in other executable languages (104 JavaScript-family, 17 shell
or extensionless launch paths, seven Python, one PowerShell). This language
classification reports observed source, not adequacy, discharged work or a
percentage. Some TypeScript owners still contain executable templates that
must be reviewed separately. Existing migrations must enter the outcome
inventory alongside remaining work.

## Behavioral boundaries requiring canonical reconciliation

Exports are inspection leads, not obligations: constants, types, private helpers,
registries and compatibility reexports do not become independent delivery units.
Use the glossary split test on observable operations. Attach required tests,
fixtures, runtime materialization, configuration and traceability to their
functional owner. Independently consumed QA tools may have their own condition;
do not count each test assertion or source file as a delivered outcome.

| Surface | Behavioral boundaries found in current sources | Required disposition |
| --- | --- | --- |
| Portable obligation operations | Physical V1 reading; certificate freshness/projection; selection; checkpoint acceptance; CLI | Register existing typed outcomes and proof without changing historical meanings. |
| Sprint/tasklet operations | Each physical reader; dependency/path ownership; planning/execution/review readiness; ranking/batch selection; obligation-scoped selection; CLI | Register typed outcomes with exact prerequisite/evidence edges; legacy selectors remain inspectable. |
| Campaign discovery/census | Management reading; physical plan/report reading; candidate/link discovery; ancestry/membership; prerequisite graph; normalized contents; report construction/presentation; inventory; listing; activation; invocation grammar; CLI execution/bootstrap diagnostics | Typed owners exist for most boundaries. OBL-73–76 identify four certified outcomes; other typed boundaries still need canonical registration and assessment. Remaining census bootstrap/execution and legacy calls are handwritten. |
| Rolling engine | Configuration/default resolution; authoritative graph/digest; compatible scheduling; PostgreSQL allocation/transition/intents; physical checkout resolution/setup/reuse/ignore; native request/notification/start/resume/stop | Existing rolling OBL-22–48 define conditions. Match class methods and application adapters to those IDs; primitive/module proof does not establish missing application lifecycle. |
| Legacy campaign orchestration | Physical ledger/action/status/binding/delivery readers; authenticated invocation scope; reservations; reconcile/advance; host observation/results; recovery/upgrade; obligation assignment/projection/checkpoint publication; diagnostics/CLI | Preserve historical readers/inspection. Replace old tasklet dispatch in S06 rather than type and retain an obsolete execution path. Inventory retained authority/recovery operations before deletion. |
| Project index | Traceability projection/publication/query/validation; plan projection/search/graph; Git text indexing/checkpoints/concurrency/cancellation/history/query; physical readers and CLI grammars | Split independently observable operations; preserve transactional/freshness behavior and real PostgreSQL proof. Shared database options are already typed. |
| Checkout recovery/reclamation | Recovery provenance/readers; committed-state reconstruction; upgrade intent/recovery; configured reclamation inventory/lock/action/verification; result presentation/CLI | Preserve external-authority and data-loss boundaries; migrate retained operations and focused Git/adapter proof. |
| Main CLI | Physical user/project configuration; invoking-project resolution; register/unregister/list; component/dependency mutation/list; detection; bless/display; local validation/QA; private instruction policy; permission/skill update; chapter dispatch; cancellation/precommit launch | Embedded Python and generated hook programs belong to this owner. Split each independently usable command/lifecycle outcome; do not hide this scope behind a launcher conversion. |
| Project management tools | Journal configuration/action/heartbeat/recovery; PM audit; bug/plan statistics; PDF rendering; rule condensation | Shell and embedded Python bodies are implementations. Preserve configured commands; enumerate journal transitions and rendering/condensation results separately. |
| Hooks | Host activation/subagent context; mode tracking; instruction construction/configuration; plan-input coordinator binding/locking/tool guards; status-line formatting | Migrate canonical shared behavior with exact host envelopes. Embedded Windows conditions and status-line entrypoints need typed ownership and actual host-boundary proof. |
| Host adapters | OpenCode prompt/command/frontmatter behavior; pi extension commands/session state; Hermes prompt/tool registration; MCP tools/instructions | Campaign native control already avoids a plugin requirement; this does not authorize dropping other supported integrations. Retained adapters need checked host contracts, source/runtime mapping and focused host proof. |
| Registry/generation | Registry validation; command parsing/rendering; runtime registry; manifests/marketplaces; rule mirrors; OpenClaw body/resources/annotation stripping; version consistency; emitted runtime | These are independently consumed tools. Synchronize their generated artifacts from canonical typed owners; do not hand-edit copies or count them again. |
| Installation/removal/diagnostics | CLI installation; Codex skills/plugin/policy installation; aggregate installation; removal; diagnostic collection; OpenClaw publication tool | Preserve path/identity and external-action authority. This goal does not authorize invoking publication or altering user configuration. Generated hook/host commands remain part of generator scope. |
| Project QA/check tooling | Reference neutrality; build-impact config/request/result reading and query; traceability config/annotation/coverage/reverse rendering; installation/index/journal integration harnesses | Apply existing TSTS; do not extend it. Typed QA-tool outcomes require adequate checker and real contract proof, not simply a passing compiler. |
| Test ownership | Component fixtures/behavioral assertions, protocol/worktree fixtures, subprocess adapters and independently runnable harnesses | Bind static fixture/harness conversion to the outcomes it establishes. Existing typed tests do not establish complete migration of the remaining JavaScript tests. |
| Benchmarks | Prompt arms; grading behavior/correctness/LOC; provider runners; agentic run/complete/judge/task selection; audit and harness execution | Migrate owned executable behavior while retaining the standalone boundary. Core build, tests, dependency installation and packaging must not execute or provision benchmark behavior. Benchmark subject programs are distinguishable input data, not automatically Ponytail implementation. |

## Embedded programs and launch metadata

| Owner/consumer | Inspected boundary | Remaining acceptance requirement |
| --- | --- | --- |
| `cli/ponytail` | Shell envelope embeds the main Python CLI and generates a precommit shell program. | Typed ownership for every retained command and generated hook behavior; preserve cancellation/registration and client-hook coexistence. |
| `cli/condense_codex_rules.sh`, `cli/tsts` | Embedded Python condensation/path resolution. | Move executable algorithms to checked owners; distinguish a generated host launch artifact from an untyped canonical implementation. |
| `cli/project_journal.sh` | Shell actions, SQL transactions and heartbeat/process lifecycle. | Preserve typed SQL/storage contracts; migrate shell orchestration and its process/ownership behavior. |
| `scripts/install-to-codex.sh`, `scripts/test-install-to-codex.sh` | Embedded Node validation and generated shell test executables. | Canonical typed installer/fixture contracts and generated launch ownership; preserve installation semantics. |
| `scripts/test-project-index-postgres.sh`, `scripts/test-project-journal-postgres.sh` | Shell integration harness orchestration and fixture/schema operations. | Independently executable typed harnesses; do not claim full database acceptance from a unit mock. |
| `tests/ponytail-cli.test.js`, other subprocess/adapter tests | Generated Python/shell processes, hooks and adapters. | Inspect each template: distinguish owned executable fixture behavior from source-language test input. Migrate the former with its consuming proof. |
| `hooks/hooks.json` | Windows command fragments perform conditional runtime discovery before invoking hooks. | Treat those fragments as generated host behavior, with one typed owner and host proof. |
| `hooks/copilot-hooks.json`, `hooks/qoder-hooks.json` | Host launch strings reference canonical executable owners. | Synchronize launch references; metadata is not an independent implementation merely because it invokes Node. |
| `.github/workflows/test.yml`, `.github/workflows/publish.yml`, package manifests | Declarative invocations of existing commands; no algorithmic shell body found in inspected workflow steps. | Keep build/test/install launch order and paths synchronized. No publication authorization is inferred. |
| `benchmarks/correctness.js`, `benchmarks/robustness-audit.js`, agentic Python and promptfoo YAML | Owned harness/grader execution plus candidate-program prompts and source-language subjects. | Type the harness/grader; keep language-under-test inputs identifiable. Promptfoo JavaScript handlers may consume emitted TypeScript runtime; that is not a handwritten JavaScript exception. |

This identifies concrete embedded-program owners; the remaining template scan
must follow every fixture/generator consumer before declaring completeness.
Do not assume that all strings containing source syntax are executable ownership,
or that every template is inert because its container is already TypeScript.
SQL schema/query artifacts remain explicit typed data/storage contracts; their
shell/Python/JavaScript orchestration does not inherit that classification.

## Canonical owner path snapshot

`TS` means a TypeScript source path, not acceptance. `JS`, `Shell`, `Python` and
`PowerShell` identify remaining handwritten source-language owners. Public boundary
names were extracted with the installed TypeScript parser for TS/JS-family
modules; export names include types and reexports and therefore are not counted
as work. Non-exporting tools, tests, shell and Python still have owned behavior.

| Canonical owner | Source | Inspection boundary |
| --- | --- | --- |
| [.opencode/plugins/ponytail-frontmatter.cjs](../../../../.opencode/plugins/ponytail-frontmatter.cjs) | JS | `parseCommandFile` |
| [.opencode/plugins/ponytail.mjs](../../../../.opencode/plugins/ponytail.mjs) | JS | Entrypoint/template behavior; inspect body |
| [__init__.py](../../../../__init__.py) | Python | Entrypoint/template behavior; inspect body |
| [benchmarks/agentic/complete.py](../../../../benchmarks/agentic/complete.py) | Python | Entrypoint/template behavior; inspect body |
| [benchmarks/agentic/judge.py](../../../../benchmarks/agentic/judge.py) | Python | Entrypoint/template behavior; inspect body |
| [benchmarks/agentic/run.py](../../../../benchmarks/agentic/run.py) | Python | Entrypoint/template behavior; inspect body |
| [benchmarks/agentic/tasks.py](../../../../benchmarks/agentic/tasks.py) | Python | Entrypoint/template behavior; inspect body |
| [benchmarks/arms/baseline.js](../../../../benchmarks/arms/baseline.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/arms/caveman.js](../../../../benchmarks/arms/caveman.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/arms/ponytail.js](../../../../benchmarks/arms/ponytail.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/behavior-grader.test.js](../../../../benchmarks/behavior-grader.test.js) | JS | Test/fixture execution |
| [benchmarks/behavior.js](../../../../benchmarks/behavior.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/benchmark-local.py](../../../../benchmarks/benchmark-local.py) | Python | Entrypoint/template behavior; inspect body |
| [benchmarks/claude-email.js](../../../../benchmarks/claude-email.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/correctness-grader.test.js](../../../../benchmarks/correctness-grader.test.js) | JS | Test/fixture execution |
| [benchmarks/correctness.js](../../../../benchmarks/correctness.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/correctness.test.js](../../../../benchmarks/correctness.test.js) | JS | Test/fixture execution |
| [benchmarks/loc.js](../../../../benchmarks/loc.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/loc.test.js](../../../../benchmarks/loc.test.js) | JS | Test/fixture execution |
| [benchmarks/model-email.js](../../../../benchmarks/model-email.js) | JS | Entrypoint/template behavior; inspect body |
| [benchmarks/robustness-audit.js](../../../../benchmarks/robustness-audit.js) | JS | `checkPy`, `pyBlock`, `call`, `TASKS`, `SKILL` |
| [cli/audit_pm.sh](../../../../cli/audit_pm.sh) | Shell | Entrypoint/template behavior; inspect body |
| [cli/bug_stats.sh](../../../../cli/bug_stats.sh) | Shell | Entrypoint/template behavior; inspect body |
| [cli/condense_codex_rules.sh](../../../../cli/condense_codex_rules.sh) | Shell | Entrypoint/template behavior; inspect body |
| [cli/plan_pdf.sh](../../../../cli/plan_pdf.sh) | Shell | Entrypoint/template behavior; inspect body |
| [cli/plan_stats.sh](../../../../cli/plan_stats.sh) | Shell | Entrypoint/template behavior; inspect body |
| [cli/ponytail](../../../../cli/ponytail) | Shell | Entrypoint/template behavior; inspect body |
| [cli/project_journal.sh](../../../../cli/project_journal.sh) | Shell | Entrypoint/template behavior; inspect body |
| [cli/tsts](../../../../cli/tsts) | Shell | Entrypoint/template behavior; inspect body |
| [hooks/plan-input.js](../../../../hooks/plan-input.js) | JS | `PlanInputCoordinatorBindingReaders`, `bindCoordinator`, `bindingForSession`, `campaignCommand`, `coordinatorCommand`, `handle`, `readBindingsV1`, `releaseCoordinator` |
| [hooks/ponytail-activate.js](../../../../hooks/ponytail-activate.js) | JS | Entrypoint/template behavior; inspect body |
| [hooks/ponytail-config.js](../../../../hooks/ponytail-config.js) | JS | `DEFAULT_MODE`, `VALID_MODES`, `RUNTIME_MODES`, `getDefaultMode`, `getConfigDir`, `getConfigPath`, `getClaudeDir`, `getHideStatus`, `getQuietStartup`, `isShellSafe`, `normalizeMode`, `normalizeConfigMode`, `normalizePersistedMode`, `isDeactivationCommand`, `writeDefaultMode` |
| [hooks/ponytail-instructions.js](../../../../hooks/ponytail-instructions.js) | JS | `filterSkillBodyForMode`, `getPonytailInstructions` |
| [hooks/ponytail-mode-tracker.js](../../../../hooks/ponytail-mode-tracker.js) | JS | Entrypoint/template behavior; inspect body |
| [hooks/ponytail-runtime.js](../../../../hooks/ponytail-runtime.js) | JS | `clearMode`, `isCodex`, `isCopilot`, `isQoder`, `readMode`, `setMode`, `writeHookOutput` |
| [hooks/ponytail-statusline.ps1](../../../../hooks/ponytail-statusline.ps1) | PowerShell | Entrypoint/template behavior; inspect body |
| [hooks/ponytail-statusline.sh](../../../../hooks/ponytail-statusline.sh) | Shell | Entrypoint/template behavior; inspect body |
| [hooks/ponytail-subagent.js](../../../../hooks/ponytail-subagent.js) | JS | Entrypoint/template behavior; inspect body |
| [pi-extension/index.js](../../../../pi-extension/index.js) | JS | `readDefaultMode`, `readQuietStartup`, `resolveSessionMode`, `parsePonytailCommand`, `ponytailExtension` |
| [pi-extension/test/extension.test.js](../../../../pi-extension/test/extension.test.js) | JS | Test/fixture execution |
| [pi-extension/test/helpers.test.js](../../../../pi-extension/test/helpers.test.js) | JS | Test/fixture execution |
| [ponytail-mcp/index.js](../../../../ponytail-mcp/index.js) | JS | Entrypoint/template behavior; inspect body |
| [ponytail-mcp/instructions.js](../../../../ponytail-mcp/instructions.js) | JS | `MODES`, `resolveMode`, `buildInstructions` |
| [ponytail-mcp/test/instructions.test.js](../../../../ponytail-mcp/test/instructions.test.js) | JS | Test/fixture execution |
| [scripts/build-command-adapters.js](../../../../scripts/build-command-adapters.js) | JS | `commandEntries`, `parseCommand`, `renderOpenCode` |
| [scripts/build-manifests.js](../../../../scripts/build-manifests.js) | JS | `expectedHermesManifest`, `expectedJson`, `jsonTargets`, `marketplaceTargets` |
| [scripts/build-openclaw-skills.js](../../../../scripts/build-openclaw-skills.js) | JS | `DESCRIPTIONS`, `NAMES`, `copyResources`, `outPath`, `render`, `sourceBody`, `stripTraceabilityAnnotations` |
| [scripts/build-registry-data.js](../../../../scripts/build-registry-data.js) | JS | `outputPath`, `render` |
| [scripts/build-runtime.ts](../../../../scripts/build-runtime.ts) | TS | Entrypoint/template behavior; inspect body |
| [scripts/check-rule-copies.js](../../../../scripts/check-rule-copies.js) | JS | Entrypoint/template behavior; inspect body |
| [scripts/check-versions.js](../../../../scripts/check-versions.js) | JS | Entrypoint/template behavior; inspect body |
| [scripts/codex-diagnostics.sh](../../../../scripts/codex-diagnostics.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/install-cli.sh](../../../../scripts/install-cli.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/install-to-codex.sh](../../../../scripts/install-to-codex.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/install.sh](../../../../scripts/install.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/project-qa.js](../../../../scripts/project-qa.js) | JS | `declaredDependencies`, `submoduleUrls`, `checkReferences` |
| [scripts/publish-openclaw-skills.js](../../../../scripts/publish-openclaw-skills.js) | JS | Entrypoint/template behavior; inspect body |
| [scripts/registry.js](../../../../scripts/registry.js) | JS | `enabled`, `parseRegistry`, `readRegistry`, `validateProjectSkillNames`, `validatePublishedNames`, `validateRegistry` |
| [scripts/setup-project-journal.sh](../../../../scripts/setup-project-journal.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/test-install-to-codex.sh](../../../../scripts/test-install-to-codex.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/test-project-index-postgres.sh](../../../../scripts/test-project-index-postgres.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/test-project-journal-postgres.sh](../../../../scripts/test-project-journal-postgres.sh) | Shell | Entrypoint/template behavior; inspect body |
| [scripts/uninstall.js](../../../../scripts/uninstall.js) | JS | Entrypoint/template behavior; inspect body |
| [skills/build-impact/scripts/build-impact.js](../../../../skills/build-impact/scripts/build-impact.js) | JS | `BuildImpactCustomRequestReaders`, `BuildImpactCustomResultReaders`, `BuildImpactError`, `BuildImpactProjectConfigReaders`, `BuildImpactQueryResultReaders`, `BuildImpactQueryResultWriters`, `inputMatches`, `listTypescriptFiles`, `normalizeChangedFile`, `parseAdapterResult`, `parseArguments`, `parseCustomRequest`, `parseProjectConfig`, `parseQueryResult`, `queryBuildImpact`, `run` |
| [skills/plan-execution/scripts/obligations.ts](../../../../skills/plan-execution/scripts/obligations.ts) | TS | `ObligationCoordinate`, `ObligationCategory`, `ObligationVector`, `ObligationEvidenceOutcome`, `ObligationCheckpointKind`, `ObligationInput`, `ObligationRequirement`, `ObligationTarget`, `ObligationEvidenceTarget`, `ObligationExecution`, `Obligation`, `ObligationAuthority`, `ObligationBaseline`, `ObligationDisposition`, `ObligationEvidence`, `ObligationCertificate`, `ObligationPreparation`, `ObligationCheckpoint`, `ObligationDocumentV1`, `ObligationAssessment`, `ObligationProjection`, `ObligationFreshness`, `ObligationHistory`, `ObligationSelection`, `readObligationDocumentV1`, `parseObligationDocument`, `ObligationDocumentReaders`, `inputDigest`, `freshCertificate`, `projectObligations`, `compareVectors`, `selectObligation`, `acceptCheckpoint`, `main` |
| [skills/plan-execution/scripts/ready-sprints.ts](../../../../skills/plan-execution/scripts/ready-sprints.ts) | TS | `SCHEMA_VERSION`, `isV1Sprints`, `isV3Sprints`, `selectPlanningReadySprints`, `selectPlanningReviewableSprints`, `validateCheckpointOrder`, `validateDependencyExecutionOrder`, `selectExecutionReadySprints`, `selectExecutionRunnableSprints`, `selectExecutionReviewableSprints`, `main` |
| [skills/plan-execution/scripts/ready-tasklets.ts](../../../../skills/plan-execution/scripts/ready-tasklets.ts) | TS | `SCHEMA_VERSION`, `ObligationTaskletSelection`, `selectObligationTasklets`, `main` |
| [skills/plan-execution/scripts/sprint-graph.ts](../../../../skills/plan-execution/scripts/sprint-graph.ts) | TS | `validateDependencies`, `validatePathOwnership`, `validateV3PathOwnership` |
| [skills/plan-execution/scripts/sprint-metadata.ts](../../../../skills/plan-execution/scripts/sprint-metadata.ts) | TS | `METADATA_MARKER`, `SprintPlanningStatus`, `SprintExecutionStatus`, `SprintPlanning`, `SprintExecutionV1`, `SprintExecutionReviewed`, `SprintMetadataV1`, `SprintMetadataV2`, `SprintMetadataV3`, `SprintV1`, `SprintV2`, `SprintV3`, `readSprintMetadataV1`, `readSprintMetadataV2`, `readSprintMetadataV3`, `SprintMetadataReaders`, `parseSprintFile`, `readSprints` |
| [skills/plan-execution/scripts/tasklet-graph.ts](../../../../skills/plan-execution/scripts/tasklet-graph.ts) | TS | `TaskletGraphDerivation`, `validateFeatureGraph`, `effectiveDependencies`, `validateTaskletGraph`, `TaskletRankingCriteria`, `TaskletBatch`, `MAX_BATCH_TASKLETS`, `rankedReadyTasklets`, `selectNextTasklet`, `selectReadyTasklets`, `selectReadyTaskletBatch` |
| [skills/plan-execution/scripts/tasklet-metadata.ts](../../../../skills/plan-execution/scripts/tasklet-metadata.ts) | TS | `NormalTasklet`, `HighRiskTasklet`, `TaskletValue`, `FeatureTasklet`, `TaskletFeature`, `ExternalTaskletDependency`, `TaskletMetadataV1`, `TaskletMetadataV2`, `TaskletMetadataV3`, `TaskletExternalDependencyMetadata`, `TaskletMetadataV4`, `TaskletGraphV1`, `TaskletGraphV2`, `TaskletGraphV3`, `TaskletGraphV4`, `readTaskletMetadataV1`, `readTaskletMetadataV2`, `readTaskletMetadataV3`, `readTaskletMetadataV4`, `TaskletMetadataReaders`, `readTaskletGraph` |
| [skills/plan-execution/scripts/tasklet-statuses.ts](../../../../skills/plan-execution/scripts/tasklet-statuses.ts) | TS | `TaskletStatus`, `parseTaskletStatuses` |
| [skills/requirements-traceability/scripts/check-traceability.js](../../../../skills/requirements-traceability/scripts/check-traceability.js) | JS | `TraceabilityConfigReaders`, `analyzeTraceability`, `findRelationships`, `validateRelationship`, `loadTraceabilityConfiguration`, `renderReverseView` |
| [src/campaign-activation.ts](../../../../src/campaign-activation.ts) | TS | `CampaignActivationResult`, `activateCampaign` |
| [src/campaign-census.js](../../../../src/campaign-census.js) | JS | `CampaignError`, `CampaignManagementConfigReaders`, `CampaignPlanMetadataReaders`, `CampaignReportReaders`, `activateCampaign`, `buildRepositoryInventory`, `buildReport`, `diagnostic`, `discoverCampaign`, `campaignGraph`, `humanReport`, `humanInventory`, `listCampaigns`, `linkedPlanFiles`, `listPlanSourceFiles`, `metadataBlocks`, `parsePlanSource`, `readManagementConfigV1`, `readPlanMetadataV1`, `readPlanMetadataV2`, `readCampaignReportV1`, `readCampaignReportV2`, `readCampaignReportV3`, `readManagementConfig`, `resolveCampaignRoot`, `resolveCampaignScope`, `run` |
| [src/campaign-configuration.ts](../../../../src/campaign-configuration.ts) | TS | `CampaignLifecycleRoles`, `CampaignManagementConfigV1`, `CampaignError`, `dataError`, `toolError`, `exactKeys`, `readManagementConfigV1`, `CampaignManagementConfigReaders`, `readManagementConfig` |
| [src/campaign-dependencies.ts](../../../../src/campaign-dependencies.ts) | TS | `CampaignTaskletDependency`, `CampaignDependencyContents`, `CampaignTaskletPrerequisite`, `CampaignDependencyResult`, `validateCampaignDependencies`, `validateExternalTaskletDependencies` |
| [src/campaign-graph.ts](../../../../src/campaign-graph.ts) | TS | `CampaignGraphPlan`, `CampaignGraph`, `campaignGraph` |
| [src/campaign-inventory.ts](../../../../src/campaign-inventory.ts) | TS | `CampaignDiagnostic`, `CampaignInventoryActiveCampaign`, `CampaignInventoryCampaign`, `CampaignInventoryPlan`, `CampaignInventoryInvalidPlan`, `CampaignInventoryV2`, `CampaignInventoryV3`, `CampaignStatus`, `CampaignListEntry`, `readCampaignReportV2`, `readCampaignReportV3`, `CampaignReportReaders`, `campaignDiagnostic`, `buildRepositoryInventory`, `humanInventory`, `listCampaigns` |
| [src/campaign-invocation.ts](../../../../src/campaign-invocation.ts) | TS | `CampaignListInvocation`, `CampaignActivateInvocation`, `CampaignValidationSelection`, `CampaignValidateInvocation`, `CampaignReportInvocation`, `CampaignInvocation`, `parseCampaignInvocation`, `campaignUsage` |
| [src/campaign-orchestration.js](../../../../src/campaign-orchestration.js) | JS | `recoverWorker`, `workerRecoveryBinding`, `workerRecoveryContext`, `workerRecoveryContextDetails`, `CampaignActionReaders`, `CampaignHostObservationReaders`, `CampaignLedgerReaders`, `CampaignOrchestrationError`, `CampaignReadyActionsReaders`, `CampaignReservationAuditReaders`, `CampaignRunnablePlansReaders`, `CampaignBlockerReportReaders`, `CampaignExecutionBlockersReaders`, `CampaignStatusReaders`, `CampaignWorkerBindingReaders`, `CampaignWorkerDeliveryReaders`, `CampaignWorkerBootstrapReaders`, `advanceLedger`, `scheduleReadyPlans`, `scheduleReviewReadyPlans`, `schedulePlanningReadyPlans`, `readRunnablePlansV1`, `readRunnablePlansV2`, `CampaignTaskletPrerequisitesReaders`, `runnablePlanDiagnostics`, `recordExecutionBlocker`, `bindWorker`, `diagnostic`, `humanStatus`, `humanReadyActions`, `hostObservationPath`, `ledgerPath`, `newLedger`, `parseArguments`, `readActionV1`, `readActionV2`, `readActionV3`, `readActionV4`, `readActionV5`, `readActionV6`, `readAssignmentV1`, `readLedger`, `readLedgerV1`, `readLedgerV2`, `readLedgerV3`, `readLedgerV4`, `readLedgerV5`, `readLedgerV6`, `readLedgerV7`, `readLedgerV8`, `readLedgerV9`, `parseCampaignJson`, `readObligationAssignmentV1`, `reserveAssignment`, `renewObligationAssignment`, `readWorkerDeliveriesV2`, `recordWorkerDelivery`, `adoptedObligationState`, `readReadyActionsV1`, `readReadyActionsV2`, `readReadyActionsV3`, `readReadyActionsV4`, `readReadyActionsV5`, `readReadyActionsV6`, `readReadyActionsV7`, `readHostObservation`, `readHostObservationV1`, `readWorkerBindings`, `readWorkerBindingsV1`, `readWorkerDeliveries`, `readWorkerDeliveriesV1`, `recordWorkerDelivery`, `replaceRecoveredWorkerBinding`, `removeWorkerBinding`, `releaseLedgerCoordinator`, `readStatusV1`, `readStatusV2`, `readStatusV3`, `readStatusV4`, `readStatusV5`, `readStatusV6`, `readStatusV7`, `readStatusV8`, `readStatusV9`, `readStatusV10`, `readStatusV11`, `readReadyActionsV8`, `obligationProjection`, `readWorkerV1`, `reconcile`, `reconcileLedger`, `readyActions`, `reservationAudit`, `readReservationAuditV1`, `recordActionResult`, `retryDispatch`, `retireWorktree`, `upgradeWorker`, `resolveInvocationWorktree`, `setLedgerCoordinator`, `run`, `usage`, `validateActionResultBinding`, `withLedgerLock`, `publishObligationCheckpoint`, `withWorktreeLock`, `writeHostObservation`, `writeWorkerDeliveries` |
| [src/campaign-plan-contents.ts](../../../../src/campaign-plan-contents.ts) | TS | `CampaignTaskletCounts`, `CampaignSprintRecord`, `CampaignTaskletRecord`, `CampaignSprintTasklets`, `CampaignPlanningSprint`, `CampaignPlanContents`, `validatePlanContents` |
| [src/campaign-plan-metadata.ts](../../../../src/campaign-plan-metadata.ts) | TS | `PLAN_METADATA_MARKER`, `CampaignPlanMetadataV1`, `CampaignPlanMetadataV2`, `CampaignPlanMetadataV3`, `CampaignPlanInput`, `CampaignPlanCandidate`, `CampaignPlanV1`, `CampaignPlanV2`, `CampaignPlanV3`, `candidateRecordId`, `metadataBlocks`, `parseCandidate`, `readPlanMetadataV1`, `readPlanMetadataV2`, `readPlanMetadataV3`, `CampaignPlanMetadataReaders`, `readManagedPlan`, `parsePlanSource` |
| [src/campaign-plan-sources.ts](../../../../src/campaign-plan-sources.ts) | TS | `CampaignPlanSource`, `scanPlanCandidates`, `listPlanSourceFiles`, `linkedPlanFiles` |
| [src/campaign-report.ts](../../../../src/campaign-report.ts) | TS | `CampaignRepositoryIdentity`, `CampaignReportPlanRecord`, `CampaignReportSprintRecord`, `CampaignReportTotals`, `CampaignReportV1`, `validateCampaignRepositoryIdentity`, `repositoryIdentity`, `buildReport`, `readCampaignReportV1`, `CampaignReportTableOptions`, `humanReport` |
| [src/campaign-scope.ts](../../../../src/campaign-scope.ts) | TS | `ResolvedInputPlan`, `CampaignAncestors`, `DiscoveredCampaign`, `CampaignRoot`, `CampaignScope`, `resolveInputPlan`, `validateCampaignReference`, `readAncestors`, `discoverCampaign`, `resolveCampaignRoot`, `resolveCampaignScope` |
| [src/plan-input-command.ts](../../../../src/plan-input-command.ts) | TS | `PlanInputEnqueueCommand`, `PlanInputCoordinateCommand`, `PlanInputReleaseCommand`, `PlanInputListCommand`, `PlanInputClaimCommand`, `PlanInputCompleteCommand`, `PlanInputCommand`, `parseCli` |
| [src/plan-input-queue.ts](../../../../src/plan-input-queue.ts) | TS | `PlanInputSource`, `PlanInputStatus`, `PlanInputV1`, `PlanInputV2`, `PlanInputMetadata`, `PlanInputReaders`, `fail`, `readV1`, `readV2`, `queueRoot`, `entries`, `enqueue`, `claim`, `complete` |
| [src/plan-input.ts](../../../../src/plan-input.ts) | TS | `main` |
| [src/pm-pdf.py](../../../../src/pm-pdf.py) | Python | Entrypoint/template behavior; inspect body |
| [src/project-index-database.ts](../../../../src/project-index-database.ts) | TS | `ProjectIndexError`, `databaseOptions` |
| [src/project-index.js](../../../../src/project-index.js) | JS | `ProjectIndexStorageReaders`, `TraceabilityIndexResultReaders`, `TraceabilitySearchResultReaders`, `TraceabilityValidationResultReaders`, `PlanIndexStorageReaders`, `PlanSearchResultReaders`, `PlanGraphResultReaders`, `collectPlanProjection`, `parsePlanIndexObligations`, `collectTraceabilityProjection`, `digest`, `parseFile`, `publishTraceabilityGeneration`, `indexTraceability`, `indexProject`, `parseSearchArguments`, `parseValidationArguments`, `parsePlanSearchArguments`, `parsePlanGraphArguments`, `normalizePlanPayloads`, `searchPlans`, `queryPlanGraph`, `evaluateValidationRules`, `scopedTraceabilityEntityIds`, `searchTraceability`, `validateTraceability`, `parseGrepArguments`, `parseRepositoryIndexUpdateArguments`, `databaseOptions`, `refreshRepositoryTextIndex`, `prepareGitCommitBatch`, `repositoryIndexProgress`, `grepRepository` |
| [src/rolling-campaign-store.ts](../../../../src/rolling-campaign-store.ts) | TS | `RollingAssignmentScopeV1`, `RollingExecutionConfigV1`, `RollingStoredAssignment`, `RollingCampaignRegistration`, `RollingCampaignRegistrationResult`, `RollingGraphReconciliation`, `RollingAssignmentTransition`, `RollingSessionAttachment`, `RollingAssignmentRelease`, `RollingAllocatedWorktree`, `RollingAllocationResult`, `RollingCampaignStatus`, `RollingActionState`, `RollingActionKind`, `RollingAction`, `RollingActionAcknowledgment`, `readRollingAssignmentScopeV1`, `readRollingExecutionConfigV1`, `RollingAssignmentScopeReaders`, `RollingExecutionConfigReaders`, `RollingCampaignStore` |
| [src/rolling-campaign.ts](../../../../src/rolling-campaign.ts) | TS | `RollingArgv`, `RollingMainline`, `RollingProjectConfigV1`, `RollingCampaignRequest`, `RollingResolvedConfiguration`, `RollingAcceptanceReference`, `RollingTestReference`, `RollingBinding`, `RollingBindingsV1`, `RollingGraph`, `RollingAssignmentState`, `RollingOccupiedScope`, `RollingAssignment`, `RollingWorkerScope`, `RollingStartWorkerSelection`, `RollingResumeWorkerSelection`, `RollingWorkerSelection`, `RollingUnavailableInputs`, `RollingPrerequisiteBlock`, `RollingMissingBinding`, `RollingChangedScope`, `RollingScopeConflict`, `RollingSchedulingBlock`, `RollingSchedulingResult`, `readRollingProjectConfigV1`, `parseRollingProjectConfig`, `RollingProjectConfigReaders`, `readRollingBindingsV1`, `RollingBindingsReaders`, `collectRollingGraph`, `selectRollingAssignments`, `resolveRollingConfiguration`, `readRollingResolvedConfiguration`, `loadRollingConfiguration` |
| [src/rolling-codex.ts](../../../../src/rolling-codex.ts) | TS | `RollingCodexOptions`, `RollingNativeThread`, `RollingNativeItem`, `RollingNativeTurn`, `RollingTurnStarted`, `RollingNativeNotification`, `RollingNativeServerRequest`, `RollingUnknownOutcome`, `RollingObservationTimeout`, `RollingNativeResponseError`, `RollingNativeRpcError`, `RollingCodex` |
| [src/rolling-worktrees.ts](../../../../src/rolling-worktrees.ts) | TS | `RollingWorktreeLease`, `RollingManagedDirectory`, `RollingMarkerIgnoreResult`, `RollingProvisionedWorktree`, `readRollingPhysicalDirectory`, `resolveRollingManagedDirectory`, `ensureRollingSessionIdIgnored`, `provisionRollingWorktree` |
| [src/worker-worktrees.js](../../../../src/worker-worktrees.js) | JS | `recoverySource`, `recoverCheckout`, `recoverLegacyCheckout`, `upgradeCheckout`, `WorkerRecoveryReaders` |
| [src/worktree-reclamation.js](../../../../src/worktree-reclamation.js) | JS | `WorktreeLifecycleAdapterRequestReaders`, `WorktreeLifecycleAdapterResultReaders`, `WorktreeLifecycleConfigReaders`, `WorktreeReclamationError`, `WorktreeReclamationResultReaders`, `diagnostic`, `humanResult`, `main`, `parseArguments`, `readAdapterRequestV1`, `readAdapterResultV1`, `readCommandResultV1`, `readConfigV1`, `runReclamation` |
| [tests/agent-caused-repair.test.js](../../../../tests/agent-caused-repair.test.js) | JS | Test/fixture execution |
| [tests/attribution.test.js](../../../../tests/attribution.test.js) | JS | Test/fixture execution |
| [tests/build-impact.test.js](../../../../tests/build-impact.test.js) | JS | Test/fixture execution |
| [tests/campaign-activation.test.ts](../../../../tests/campaign-activation.test.ts) | TS | Test/fixture execution |
| [tests/campaign-census-format.test.js](../../../../tests/campaign-census-format.test.js) | JS | Test/fixture execution |
| [tests/campaign-census.test.js](../../../../tests/campaign-census.test.js) | JS | Test/fixture execution |
| [tests/campaign-configuration.test.ts](../../../../tests/campaign-configuration.test.ts) | TS | Test/fixture execution |
| [tests/campaign-dependencies.test.ts](../../../../tests/campaign-dependencies.test.ts) | TS | Test/fixture execution |
| [tests/campaign-graph.test.ts](../../../../tests/campaign-graph.test.ts) | TS | Test/fixture execution |
| [tests/campaign-inventory.test.ts](../../../../tests/campaign-inventory.test.ts) | TS | Test/fixture execution |
| [tests/campaign-invocation.test.ts](../../../../tests/campaign-invocation.test.ts) | TS | Test/fixture execution |
| [tests/campaign-orchestration.test.js](../../../../tests/campaign-orchestration.test.js) | JS | Test/fixture execution |
| [tests/campaign-plan-contents.test.ts](../../../../tests/campaign-plan-contents.test.ts) | TS | Test/fixture execution |
| [tests/campaign-plan-metadata.test.ts](../../../../tests/campaign-plan-metadata.test.ts) | TS | Test/fixture execution |
| [tests/campaign-plan-sources.test.ts](../../../../tests/campaign-plan-sources.test.ts) | TS | Test/fixture execution |
| [tests/campaign-report.test.ts](../../../../tests/campaign-report.test.ts) | TS | Test/fixture execution |
| [tests/campaign-scope.test.ts](../../../../tests/campaign-scope.test.ts) | TS | Test/fixture execution |
| [tests/cli-tools.test.js](../../../../tests/cli-tools.test.js) | JS | Test/fixture execution |
| [tests/cloud-cli-reauth.test.js](../../../../tests/cloud-cli-reauth.test.js) | JS | Test/fixture execution |
| [tests/commands.test.js](../../../../tests/commands.test.js) | JS | Test/fixture execution |
| [tests/condense-codex-rules.test.js](../../../../tests/condense-codex-rules.test.js) | JS | Test/fixture execution |
| [tests/copilot-plugin.test.js](../../../../tests/copilot-plugin.test.js) | JS | Test/fixture execution |
| [tests/debt-policy.test.js](../../../../tests/debt-policy.test.js) | JS | Test/fixture execution |
| [tests/debugging.test.js](../../../../tests/debugging.test.js) | JS | Test/fixture execution |
| [tests/diagnostic-assertions.test.js](../../../../tests/diagnostic-assertions.test.js) | JS | Test/fixture execution |
| [tests/distribution.test.js](../../../../tests/distribution.test.js) | JS | Test/fixture execution |
| [tests/fixtures/rolling-codex-server.ts](../../../../tests/fixtures/rolling-codex-server.ts) | TS | Test/fixture execution |
| [tests/fixtures/rolling-worktree-setup.ts](../../../../tests/fixtures/rolling-worktree-setup.ts) | TS | Test/fixture execution |
| [tests/helpers/obligation-fixture.js](../../../../tests/helpers/obligation-fixture.js) | JS | `git`, `fixture` |
| [tests/hermes-plugin.test.js](../../../../tests/hermes-plugin.test.js) | JS | Test/fixture execution |
| [tests/hooks-windows.test.js](../../../../tests/hooks-windows.test.js) | JS | Test/fixture execution |
| [tests/hooks.test.js](../../../../tests/hooks.test.js) | JS | Test/fixture execution |
| [tests/imported-skills.test.js](../../../../tests/imported-skills.test.js) | JS | Test/fixture execution |
| [tests/indeterminate-list-ux.test.js](../../../../tests/indeterminate-list-ux.test.js) | JS | Test/fixture execution |
| [tests/issue-requirement-activation-policy.test.js](../../../../tests/issue-requirement-activation-policy.test.js) | JS | Test/fixture execution |
| [tests/manifest-metadata.test.js](../../../../tests/manifest-metadata.test.js) | JS | Test/fixture execution |
| [tests/obligation-execution.integration.test.js](../../../../tests/obligation-execution.integration.test.js) | JS | Test/fixture execution |
| [tests/obligation-execution.test.js](../../../../tests/obligation-execution.test.js) | JS | Test/fixture execution |
| [tests/obligation-glossary.test.js](../../../../tests/obligation-glossary.test.js) | JS | Test/fixture execution |
| [tests/obligations.test.js](../../../../tests/obligations.test.js) | JS | Test/fixture execution |
| [tests/openclaw-skills.test.js](../../../../tests/openclaw-skills.test.js) | JS | Test/fixture execution |
| [tests/opencode-plugin.test.js](../../../../tests/opencode-plugin.test.js) | JS | Test/fixture execution |
| [tests/package-scripts.test.js](../../../../tests/package-scripts.test.js) | JS | Test/fixture execution |
| [tests/package.test.js](../../../../tests/package.test.js) | JS | Test/fixture execution |
| [tests/plan-execution-goals.test.js](../../../../tests/plan-execution-goals.test.js) | JS | Test/fixture execution |
| [tests/plan-execution-policy.test.js](../../../../tests/plan-execution-policy.test.js) | JS | Test/fixture execution |
| [tests/plan-execution-serial.test.ts](../../../../tests/plan-execution-serial.test.ts) | TS | Test/fixture execution |
| [tests/plan-input-command.test.ts](../../../../tests/plan-input-command.test.ts) | TS | Test/fixture execution |
| [tests/plan-input-hooks.test.js](../../../../tests/plan-input-hooks.test.js) | JS | Test/fixture execution |
| [tests/plan-input-queue.test.ts](../../../../tests/plan-input-queue.test.ts) | TS | Test/fixture execution |
| [tests/plan-input.test.ts](../../../../tests/plan-input.test.ts) | TS | Test/fixture execution |
| [tests/pm-pdf.test.js](../../../../tests/pm-pdf.test.js) | JS | Test/fixture execution |
| [tests/policy-conformance.test.js](../../../../tests/policy-conformance.test.js) | JS | Test/fixture execution |
| [tests/ponytail-cli.test.js](../../../../tests/ponytail-cli.test.js) | JS | Test/fixture execution |
| [tests/production-test-boundaries.test.js](../../../../tests/production-test-boundaries.test.js) | JS | Test/fixture execution |
| [tests/project-index-database.test.ts](../../../../tests/project-index-database.test.ts) | TS | Test/fixture execution |
| [tests/project-index.test.js](../../../../tests/project-index.test.js) | JS | Test/fixture execution |
| [tests/project-skill-configuration.test.js](../../../../tests/project-skill-configuration.test.js) | JS | Test/fixture execution |
| [tests/project-validation.test.js](../../../../tests/project-validation.test.js) | JS | Test/fixture execution |
| [tests/qoder-plugin.test.js](../../../../tests/qoder-plugin.test.js) | JS | Test/fixture execution |
| [tests/ready-sprints-cli.test.ts](../../../../tests/ready-sprints-cli.test.ts) | TS | Test/fixture execution |
| [tests/ready-sprints.test.js](../../../../tests/ready-sprints.test.js) | JS | Test/fixture execution |
| [tests/ready-tasklets-cli.test.ts](../../../../tests/ready-tasklets-cli.test.ts) | TS | Test/fixture execution |
| [tests/ready-tasklets.test.js](../../../../tests/ready-tasklets.test.js) | JS | Test/fixture execution |
| [tests/registry.test.js](../../../../tests/registry.test.js) | JS | Test/fixture execution |
| [tests/repository-index-concurrency.test.js](../../../../tests/repository-index-concurrency.test.js) | JS | Test/fixture execution |
| [tests/requirements-traceability-cli.test.js](../../../../tests/requirements-traceability-cli.test.js) | JS | Test/fixture execution |
| [tests/requirements-traceability-policy.test.js](../../../../tests/requirements-traceability-policy.test.js) | JS | Test/fixture execution |
| [tests/requirements-traceability.test.js](../../../../tests/requirements-traceability.test.js) | JS | Test/fixture execution |
| [tests/rolling-campaign-store.integration.test.ts](../../../../tests/rolling-campaign-store.integration.test.ts) | TS | Test/fixture execution |
| [tests/rolling-campaign-store.test.ts](../../../../tests/rolling-campaign-store.test.ts) | TS | Test/fixture execution |
| [tests/rolling-campaign.integration.test.ts](../../../../tests/rolling-campaign.integration.test.ts) | TS | Test/fixture execution |
| [tests/rolling-campaign.test.ts](../../../../tests/rolling-campaign.test.ts) | TS | Test/fixture execution |
| [tests/rolling-codex.integration.ts](../../../../tests/rolling-codex.integration.ts) | TS | Test/fixture execution |
| [tests/rolling-codex.test.ts](../../../../tests/rolling-codex.test.ts) | TS | Test/fixture execution |
| [tests/rolling-worktrees.integration.test.ts](../../../../tests/rolling-worktrees.integration.test.ts) | TS | Test/fixture execution |
| [tests/rolling-worktrees.test.ts](../../../../tests/rolling-worktrees.test.ts) | TS | Test/fixture execution |
| [tests/runtime-registry.test.js](../../../../tests/runtime-registry.test.js) | JS | Test/fixture execution |
| [tests/sprint-graph.test.ts](../../../../tests/sprint-graph.test.ts) | TS | Test/fixture execution |
| [tests/sprint-metadata.test.ts](../../../../tests/sprint-metadata.test.ts) | TS | Test/fixture execution |
| [tests/tasklet-graph.test.ts](../../../../tests/tasklet-graph.test.ts) | TS | Test/fixture execution |
| [tests/tasklet-metadata.test.ts](../../../../tests/tasklet-metadata.test.ts) | TS | Test/fixture execution |
| [tests/tasklet-selection.test.ts](../../../../tests/tasklet-selection.test.ts) | TS | Test/fixture execution |
| [tests/tasklet-statuses.test.ts](../../../../tests/tasklet-statuses.test.ts) | TS | Test/fixture execution |
| [tests/testing-cadence.test.js](../../../../tests/testing-cadence.test.js) | JS | Test/fixture execution |
| [tests/tsts-cli.test.js](../../../../tests/tsts-cli.test.js) | JS | Test/fixture execution |
| [tests/typescript-unit-testing.test.js](../../../../tests/typescript-unit-testing.test.js) | JS | Test/fixture execution |
| [tests/uninstall.test.js](../../../../tests/uninstall.test.js) | JS | Test/fixture execution |
| [tests/user-acceptance-testing.test.ts](../../../../tests/user-acceptance-testing.test.ts) | TS | Test/fixture execution |
| [tests/ux-testing.test.js](../../../../tests/ux-testing.test.js) | JS | Test/fixture execution |
| [tests/variant-neutrality.test.js](../../../../tests/variant-neutrality.test.js) | JS | Test/fixture execution |
| [tests/worker-worktrees.test.js](../../../../tests/worker-worktrees.test.js) | JS | Test/fixture execution |
| [tests/worktree-reclamation-cli.test.js](../../../../tests/worktree-reclamation-cli.test.js) | JS | Test/fixture execution |
| [tests/worktree-reclamation.test.js](../../../../tests/worktree-reclamation.test.js) | JS | Test/fixture execution |

## Generated and existing typed source partitions

Adjacent runtimes are mapped to their canonical owner in project traceability configuration.

| Generated runtime | Canonical owner |
| --- | --- |
| [skills/plan-execution/scripts/obligations.js](../../../../skills/plan-execution/scripts/obligations.js) | [skills/plan-execution/scripts/obligations.ts](../../../../skills/plan-execution/scripts/obligations.ts) |
| [skills/plan-execution/scripts/ready-sprints.js](../../../../skills/plan-execution/scripts/ready-sprints.js) | [skills/plan-execution/scripts/ready-sprints.ts](../../../../skills/plan-execution/scripts/ready-sprints.ts) |
| [skills/plan-execution/scripts/ready-tasklets.js](../../../../skills/plan-execution/scripts/ready-tasklets.js) | [skills/plan-execution/scripts/ready-tasklets.ts](../../../../skills/plan-execution/scripts/ready-tasklets.ts) |
| [skills/plan-execution/scripts/sprint-graph.js](../../../../skills/plan-execution/scripts/sprint-graph.js) | [skills/plan-execution/scripts/sprint-graph.ts](../../../../skills/plan-execution/scripts/sprint-graph.ts) |
| [skills/plan-execution/scripts/sprint-metadata.js](../../../../skills/plan-execution/scripts/sprint-metadata.js) | [skills/plan-execution/scripts/sprint-metadata.ts](../../../../skills/plan-execution/scripts/sprint-metadata.ts) |
| [skills/plan-execution/scripts/tasklet-graph.js](../../../../skills/plan-execution/scripts/tasklet-graph.js) | [skills/plan-execution/scripts/tasklet-graph.ts](../../../../skills/plan-execution/scripts/tasklet-graph.ts) |
| [skills/plan-execution/scripts/tasklet-metadata.js](../../../../skills/plan-execution/scripts/tasklet-metadata.js) | [skills/plan-execution/scripts/tasklet-metadata.ts](../../../../skills/plan-execution/scripts/tasklet-metadata.ts) |
| [skills/plan-execution/scripts/tasklet-statuses.js](../../../../skills/plan-execution/scripts/tasklet-statuses.js) | [skills/plan-execution/scripts/tasklet-statuses.ts](../../../../skills/plan-execution/scripts/tasklet-statuses.ts) |
| [src/campaign-activation.js](../../../../src/campaign-activation.js) | [src/campaign-activation.ts](../../../../src/campaign-activation.ts) |
| [src/campaign-configuration.js](../../../../src/campaign-configuration.js) | [src/campaign-configuration.ts](../../../../src/campaign-configuration.ts) |
| [src/campaign-dependencies.js](../../../../src/campaign-dependencies.js) | [src/campaign-dependencies.ts](../../../../src/campaign-dependencies.ts) |
| [src/campaign-graph.js](../../../../src/campaign-graph.js) | [src/campaign-graph.ts](../../../../src/campaign-graph.ts) |
| [src/campaign-inventory.js](../../../../src/campaign-inventory.js) | [src/campaign-inventory.ts](../../../../src/campaign-inventory.ts) |
| [src/campaign-invocation.js](../../../../src/campaign-invocation.js) | [src/campaign-invocation.ts](../../../../src/campaign-invocation.ts) |
| [src/campaign-plan-contents.js](../../../../src/campaign-plan-contents.js) | [src/campaign-plan-contents.ts](../../../../src/campaign-plan-contents.ts) |
| [src/campaign-plan-metadata.js](../../../../src/campaign-plan-metadata.js) | [src/campaign-plan-metadata.ts](../../../../src/campaign-plan-metadata.ts) |
| [src/campaign-plan-sources.js](../../../../src/campaign-plan-sources.js) | [src/campaign-plan-sources.ts](../../../../src/campaign-plan-sources.ts) |
| [src/campaign-report.js](../../../../src/campaign-report.js) | [src/campaign-report.ts](../../../../src/campaign-report.ts) |
| [src/campaign-scope.js](../../../../src/campaign-scope.js) | [src/campaign-scope.ts](../../../../src/campaign-scope.ts) |
| [src/plan-input-command.js](../../../../src/plan-input-command.js) | [src/plan-input-command.ts](../../../../src/plan-input-command.ts) |
| [src/plan-input-queue.js](../../../../src/plan-input-queue.js) | [src/plan-input-queue.ts](../../../../src/plan-input-queue.ts) |
| [src/plan-input.js](../../../../src/plan-input.js) | [src/plan-input.ts](../../../../src/plan-input.ts) |
| [src/project-index-database.js](../../../../src/project-index-database.js) | [src/project-index-database.ts](../../../../src/project-index-database.ts) |
| [src/rolling-campaign-store.js](../../../../src/rolling-campaign-store.js) | [src/rolling-campaign-store.ts](../../../../src/rolling-campaign-store.ts) |
| [src/rolling-campaign.js](../../../../src/rolling-campaign.js) | [src/rolling-campaign.ts](../../../../src/rolling-campaign.ts) |
| [src/rolling-worktrees.js](../../../../src/rolling-worktrees.js) | [src/rolling-worktrees.ts](../../../../src/rolling-worktrees.ts) |

OpenClaw executable resources are mirrored by the canonical skill generator:

- [.openclaw/skills/build-impact/scripts/build-impact.js](../../../../.openclaw/skills/build-impact/scripts/build-impact.js)
- [.openclaw/skills/plan-execution/scripts/obligations.js](../../../../.openclaw/skills/plan-execution/scripts/obligations.js)
- [.openclaw/skills/plan-execution/scripts/obligations.ts](../../../../.openclaw/skills/plan-execution/scripts/obligations.ts)
- [.openclaw/skills/plan-execution/scripts/ready-sprints.js](../../../../.openclaw/skills/plan-execution/scripts/ready-sprints.js)
- [.openclaw/skills/plan-execution/scripts/ready-sprints.ts](../../../../.openclaw/skills/plan-execution/scripts/ready-sprints.ts)
- [.openclaw/skills/plan-execution/scripts/ready-tasklets.js](../../../../.openclaw/skills/plan-execution/scripts/ready-tasklets.js)
- [.openclaw/skills/plan-execution/scripts/ready-tasklets.ts](../../../../.openclaw/skills/plan-execution/scripts/ready-tasklets.ts)
- [.openclaw/skills/plan-execution/scripts/sprint-graph.js](../../../../.openclaw/skills/plan-execution/scripts/sprint-graph.js)
- [.openclaw/skills/plan-execution/scripts/sprint-graph.ts](../../../../.openclaw/skills/plan-execution/scripts/sprint-graph.ts)
- [.openclaw/skills/plan-execution/scripts/sprint-metadata.js](../../../../.openclaw/skills/plan-execution/scripts/sprint-metadata.js)
- [.openclaw/skills/plan-execution/scripts/sprint-metadata.ts](../../../../.openclaw/skills/plan-execution/scripts/sprint-metadata.ts)
- [.openclaw/skills/plan-execution/scripts/tasklet-graph.js](../../../../.openclaw/skills/plan-execution/scripts/tasklet-graph.js)
- [.openclaw/skills/plan-execution/scripts/tasklet-graph.ts](../../../../.openclaw/skills/plan-execution/scripts/tasklet-graph.ts)
- [.openclaw/skills/plan-execution/scripts/tasklet-metadata.js](../../../../.openclaw/skills/plan-execution/scripts/tasklet-metadata.js)
- [.openclaw/skills/plan-execution/scripts/tasklet-metadata.ts](../../../../.openclaw/skills/plan-execution/scripts/tasklet-metadata.ts)
- [.openclaw/skills/plan-execution/scripts/tasklet-statuses.js](../../../../.openclaw/skills/plan-execution/scripts/tasklet-statuses.js)
- [.openclaw/skills/plan-execution/scripts/tasklet-statuses.ts](../../../../.openclaw/skills/plan-execution/scripts/tasklet-statuses.ts)
- [.openclaw/skills/requirements-traceability/scripts/check-traceability.js](../../../../.openclaw/skills/requirements-traceability/scripts/check-traceability.js)

The existing TSTS compiler/checker subtree is retained and exercised rather than extended:

- [tsts/src/cli.ts](../../../../tsts/src/cli.ts)
- [tsts/src/directory-structure.ts](../../../../tsts/src/directory-structure.ts)
- [tsts/src/index.ts](../../../../tsts/src/index.ts)
- [tsts/src/lossless-json.ts](../../../../tsts/src/lossless-json.ts)
- [tsts/src/traceability.ts](../../../../tsts/src/traceability.ts)
- [tsts/test/cli.test.ts](../../../../tsts/test/cli.test.ts)
- [tsts/test/config.test.ts](../../../../tsts/test/config.test.ts)
- [tsts/test/directory-structure.test.ts](../../../../tsts/test/directory-structure.test.ts)
- [tsts/test/lossless-json.test.ts](../../../../tsts/test/lossless-json.test.ts)
- [tsts/test/no-aliasing.test.ts](../../../../tsts/test/no-aliasing.test.ts)
- [tsts/test/public-union-discriminator.test.ts](../../../../tsts/test/public-union-discriminator.test.ts)
- [tsts/test/public-union-dispatch.test.ts](../../../../tsts/test/public-union-dispatch.test.ts)
- [tsts/test/traceability.test.ts](../../../../tsts/test/traceability.test.ts)
- [tsts/test/type-safe-serdes.test.ts](../../../../tsts/test/type-safe-serdes.test.ts)
- [tsts/test/unique-exported-type-names.test.ts](../../../../tsts/test/unique-exported-type-names.test.ts)
- [tsts/test/unused-code.test.ts](../../../../tsts/test/unused-code.test.ts)
- [tsts/test/versioned-data-contracts.test.ts](../../../../tsts/test/versioned-data-contracts.test.ts)

## Registration and completion boundary

The owner census is now explicit; the atomic outcome inventory is still incomplete.
Class methods, command operations and embedded programs must be reconciled to
canonical condition/criterion owners, requirement IDs, acceptance/Arc/Step
contributions and exact execution bindings. Inspect aliases/reexports before
treating two names as two responsibilities. Verify that every source/fixture
belongs to a retained outcome or an approved replacement/removal.

Append successor baselines for newly registered responsibilities and assess
existing adequate evidence against final inputs. Preserve earlier identities
and historical meaning. At the inspected baseline, four migration outcomes
(OBL-73–76) have fresh certificates. Derive current discharge counts from the
ledger after subsequent changes; never report 63/192 completion or another
source-count percentage. The rolling 48-condition registration, foundation
gates and this source census are not the full delivery denominator.

Structural inspection only: no product code, project-local configuration,
generated runtime or existing certificate input was modified by this record.
No benchmark, publication, plugin installation or foreign-project action ran.
