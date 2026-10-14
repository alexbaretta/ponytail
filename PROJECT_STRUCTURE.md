<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail Project Structure

This repository is both Ponytail's management repository and its only
component repository. The structure remains valid if future components move
into independently versioned repositories: ownership follows the component,
while project-wide management records remain under `pm/`.

## Ownership

- `skills/` owns canonical reusable skills and the portable Ponytail policy.
  `skills/plan-execution/references/rolling-campaigns.md` owns the configured
  rolling coordinator/worker operating procedure. `src/cli-help.ts` owns
  cross-chapter CLI help; campaign help remains owned by its command registry.
  `scripts/build-runtime.ts` generates the shipped JavaScript launch files.
  `skills/plan-execution/references/glossary.md` owns shared short definitions.
  `skills/plan-execution/scripts/obligations.js` owns the portable V1 obligation
  reader, certificate projection, checkpoint validation and scoped entrypoint.
  Configured obligation documents beside their owning plan/issue own conditions,
  certificate assessments and checkpoint history; campaign members reference the
  root document rather than duplicate it. Assignments remain in their execution
  owner, and canonical relationship annotations retain their existing ownership.
  Campaign ledger V9 owns append-only frozen obligation lease history; delivery V2
  proposes evidence and current status/ready responses project acceptance.
- `commands/` owns canonical command prompts.
- `config/AGENTS.md` is the generated global Codex policy installed by the
  Codex installer.
- `.agents/config/codex-execpolicy.json` is this project's versioned Codex
  command policy proposal. Every adopting project uses that same root-relative path;
  accepted user policy is stored outside repositories under
  `~/.ponytail/codex-execpolicy/`, while its disposable project-local
  projection is `.codex/rules/ponytail.rules` and remains Git-ignored.
- `~/.ponytail/config.json` is the external V2 user configuration written by
  `ponytail register` and `ponytail unregister`; it owns the canonical
  Ponytail source root and registered repositories with their explicitly
  blessed worktrees and validated identity snapshots. Exact V1 remains
  readable. `ponytail list-projects` displays the registered roots.
- `registry.tsv` owns enabled and disabled skill and command publication
  across supported hosts. Benchmark entries are prohibited.
- `versioned-data-contracts.json` inventories Ponytail's durable serialized
  contracts and their reader registries.
- `ponytail-journal.json` owns the project's stable identity and non-secret
  PostgreSQL journal connection settings. Create it once with
  `project_journal.sh init`, which also owns idempotent database registration,
  then commit it; action commands never create it implicitly.
- `hooks/` owns shared lifecycle behavior and policy injection.
- Host directories such as `.claude-plugin/`, `.codex-plugin/`, `.github/`,
  `.opencode/`, `.qoder/`, and `.openclaw/` own host adapters. Generated
  adapters identify their canonical source in their validation tests.
- `scripts/` owns local generation, validation, installation, cleanup, and
  publication tooling. `scripts/install.sh` combines CLI, local Codex plugin,
  and Codex skill installation; `scripts/install-cli.sh` configures the
  installed `ponytail` symlink with this checkout as its canonical source.
  Codex discovers project-local skills from `.agents/skills/` automatically.
- `scripts/setup-project-journal.sh`, `scripts/project-journal.sql`, and
  `scripts/project-index.sql` own PostgreSQL 18 journal and project-index
  provisioning and their immutable V1 storage contracts.
- `src/rolling-reset.ts` owns explicit project campaign reset, original actor
  cessation, Git source recovery and exact registered checkout dispositions. Its
  durable pending receipt fences scheduling until project resource cleanup and
  campaign/lease removal complete.
- `src/swarm-owner.ts` owns independently testable user/managed-worktree owner
  resolution over a checked physical inventory. It rejects ambiguous, unassigned
  and cross-repository ownership; its adjacent `.js` runtime is generated.
- `src/swarm-info.ts` owns the initial read-only swarm chapter, physical
  Git/project-scoped lease inventory and immutable V1 result reader. Its adjacent
  `.js` runtime is generated; existing lease provenance and absent native
  observations remain explicit until authoritative swarm bindings are adopted.
- `src/project-index-database.ts` owns the checked project-local PostgreSQL
  connection options and shared index error declaration. `src/project-index-database.js`
  is compiler-generated compatibility runtime.
- `src/project-index.js` owns Git-aware PostgreSQL traceability, plan, and
  repository-text projections, transactional generation publication,
  freshness-checked structured queries, incremental historical and worktree
  indexing, and the `ponytail traceability`, `ponytail plan`, and `ponytail
  search` command families; `scripts/test-project-index-postgres.sh` owns their
  real-database contract proof.
- `tsts/` owns the canonical TypeScript analyzer and its Node tests. Root npm dependencies and `npm run build:tsts` produce ignored `tsts/dist/`; npm distributes only its compiled runtime. `cli/tsts` is the registered-project launcher installed alongside `ponytail`.
- `skills/plan-execution/scripts/ready-sprints.ts` owns typed sprint planning,
  execution, review/resume selection and the portable CLI; its established
  `.js` launch path is compiler-generated.
- `skills/plan-execution/scripts/sprint-graph.ts` owns typed planning/execution
  dependency validation and V1/V3 path ownership with shared reachability and
  pair comparison; its adjacent runtime is generated.
- `skills/plan-execution/scripts/sprint-metadata.ts` owns physical V1–V3
  sprint readers, separate planning/execution contracts and numeric discovery;
  its adjacent runtime is compiler-generated.
- `skills/plan-execution/scripts/ready-tasklets.ts` owns the portable CLI and
  obligation-scoped tasklet selection over typed graph and obligation operations;
  its established `.js` launch path is compiler-generated.
- `skills/plan-execution/scripts/tasklet-graph.ts` owns typed dependency and
  path validation, derived graph metrics, ranking and versioned batch selection;
  its adjacent runtime is generated.
- `skills/plan-execution/scripts/tasklet-metadata.ts` owns physical V1–V4
  tasklet metadata readers and shared external dependency identities; its adjacent
  JavaScript runtime is compiler-generated.
- `src/campaign-report.ts` owns typed V1 report construction, unknown input
  validation, human table presentation and Git repository identity; its adjacent
  runtime is generated.
- `src/campaign-inventory.ts` owns typed V2/V3 inventory validation and
  repository-wide campaign construction, with the complete physical report
  reader registry; its adjacent runtime is generated. Invalid metadata IDs
  remain unknown diagnostic data while valid plan and repository fields are
  checked against their typed contracts.
- `src/campaign-graph.ts` owns typed campaign graph projection and prerequisite
  blocking over validated plan contents; its adjacent runtime is generated.
- `src/campaign-plan-contents.ts` owns typed sprint/tasklet content validation,
  readiness, normalized records and closed-plan gates over portable operations;
  its adjacent runtime is compiler-generated.
- `src/campaign-dependencies.ts` owns plan and cross-plan tasklet validation;
  `skills/plan-execution/scripts/tasklet-statuses.ts` owns the shared heading parser.
  Their adjacent JavaScript files are compiler-generated.
- `src/campaign-scope.ts` owns typed campaign selection, ancestry, membership
  and coordinator scope resolution; its adjacent JavaScript is compiler-generated.
- `src/campaign-plan-sources.ts` owns typed plan source inventory, candidate
  discovery and link resolution; its `.js` runtime is compiler-generated.
- `src/campaign-plan-metadata.ts` owns physical V1/V2/V3 plan readers, candidate
  parsing and selected-manifest validation; its `.js` runtime is compiler-generated.
- `src/campaign-configuration.ts` owns checked management configuration and
  shared campaign error/schema helpers; its `.js` runtime is compiler-generated.
- `src/` owns non-script runtime implementations dispatched by user-facing
  CLI entrypoints. `src/pm-pdf.py` owns configured linked-Markdown PDF
  rendering. `src/plan-input-queue.ts` owns the durable plan-input queue contract and
  lifecycle; its `.js` runtime is compiler-generated. `src/plan-input.ts` owns
  the plan-input CLI adapter over typed campaign scope and queue operations;
  its `.js` launch path is compiler-generated.
  `src/plan-input-command.ts` owns its typed command grammar; its `.js` runtime
  is compiler-generated. `src/campaign-census.js` owns campaign configuration and
  plan metadata readers, scoped campaign discovery and validation,
  repository-wide campaign inventory, census normalization, and human/JSON
  reporting and canonical immediately-runnable tasklet projection.
  `src/campaign-orchestration.js` owns the versioned Ponytail-user
  assignment ledger, authenticated host-observation snapshot, dependency
  scheduler, runnable-plan execution/anomaly summary, scoped blocker reports and batch reservation, reconciled status and ready-action projection, verified
  fast-forward integration, and typed host-action protocol.
  Its per-top-level-project ledgers own the retained worker pool and capacity
  reservations. `src/worker-worktrees.js` owns exact-path Git reconstruction
  and checkpointed pre-attachment upgrades from authenticated main-worktree
  provenance, independently of host tools.
  `src/rolling-campaign.ts` owns the new rolling execution configuration and
  independently testable graph/scheduling boundary. Its project configuration
  is `.agents/config/project/rolling-campaigns.json`. The installed campaign
  chapter routes to the rolling operation layer; historical readers are available
  through explicit read-only `campaign legacy` inspection.
  `src/rolling-publication.ts` owns accepted-increment publication batch
  selection, nonempty partial-flush policy, history-preserving mainline candidate
  preparation and exact-candidate full QA validation. Its shipped `.js` entrypoint is
  compiler output materialized by `scripts/build-runtime.ts`.
  `src/rolling-operations.ts` owns shared typed campaign initialization,
  coordinator decisions, event/periodic replenishment, native worker/reviewer
  execution and publication operations. `src/rolling-cli-registry.ts` owns
  the command names, fields and help used by CLI and MCP.
  `ponytail-mcp/rolling.ts` registers those operations over stdio, with an
  explicit invoking project root. Its entrypoint is `ponytail-mcp/index.ts`;
  their `.js` files are compiler output from the runtime generator.
  `src/rolling-campaign-store.ts` owns transactional PostgreSQL campaign,
  checkout and assignment leases and durable external-action intents.
  Its tables and indexes use the existing `scripts/project-index.sql` setup.
  `src/rolling-worktrees.ts` validates the shared physical pool and provisions
  generation-bound ordinary Git checkouts with project setup and marker ignore.
  `src/rolling-codex.ts` owns direct stdio App Server connections, native
  thread/session identity, turns, approval routing and interruption observation.
  `tests/rolling-codex.integration.ts` is explicit live native acceptance and
  is excluded from default fixture-only test discovery.
  `src/worktree-reclamation.js` owns the versioned
  project lifecycle-adapter contracts, project-scoped reclamation lock,
  deterministic claim selection, generation fencing, and verified cleanup
  result.
- `tsconfig.json` owns strict root TypeScript compilation into ignored `dist/`;
  `npm run build` emits runtime and tests. `tsts.json` applies existing TSTS to
  root TypeScript and the TSTS workspace. The root migration is incomplete
  until every owned executable source has a checked typed owner.
- `ponytail.json` owns the Ponytail and TSTS build-impact targets.
- `cli/` owns user-facing parse-safe Bash tools. `cli/ponytail` owns project
  registration, optional pre-commit integration, and Codex configuration
  updates. The `ponytail` and `tsts` executables are linked to canonical source. Adding a `.sh` tool there
  makes it
  installable by `scripts/install-cli.sh`, which installs all `cli/*.sh` files
  or selected tools into the user's configured executable directory. Add each
  tool to the focused CLI syntax, behavior, installer, and distribution tests.
  `cli/condense_codex_rules.sh` owns exact V1/V2/V3 global accepted-policy
  readers, the V3 writer, the V1 project-state reader and writer, one-time
  user-rule import, isolated global and project synthesis, restoration, and
  installation pipeline.
- `.agents/config/` owns each worktree's committed Ponytail configuration.
  `project/directory-structure.json` owns the machine-readable content-kind,
  directory, Git-state, and opaque-boundary rules enforced by
  `npm run check:tsts`. `ponytail.json` owns project names,
  components and aliases, explicit project dependencies, package/repository
  identities, dependency manifests, and reference exceptions. `ponytail
  register-component`, `unregister-component`, `list-components`, and
  `detect-components` maintain its component data; `register-dependency`,
  `unregister-dependency`, and `list-dependencies` maintain explicit project
  dependencies.
  Root `AGENTS.local.md`, when present, owns developer-private additive
  instructions. It remains untracked under the repository-local
  `.git/info/exclude`; the tracked root `AGENTS.md` remains authoritative.
  `project/management.json` owns the versioned project-management root, plan
  root, lifecycle directories and roles, and supported legacy plan layout used
  by the campaign census CLI.
  `project/pm-pdf.json`, when present, owns PDF collection roots, titles,
  exclusions, presentation variables, and the default generated-output path.
  `project/worktree-lifecycle.json`, when present, selects the invoking
  project's committed executable lifecycle adapter for authoritative claim
  inventory and reclamation.
  `project/traceability.json` owns the approved in-scope requirement set,
  artifact classifications, generated-source mappings, reverse-view path, and
  TypeScript semantic-checker binding consumed by the reusable traceability
  checker.
  Ordinary project-local commands do not read other projects' identity
  snapshots; explicitly scoped inventory and dependency-management commands
  may resolve named targets from the external user registry. `ponytail
  validate --all` explicitly validates every live blessed worktree.
  `codex-execpolicy.json` owns its Codex command policy proposal. See
  `docs/project-validation.md`.
- `scripts/project-qa.js` owns indexed current-worktree reference QA and
  dependency manifest parsing.
- `generated/` owns runtime data derived from `registry.tsv`.
- `tests/` owns core live-development tests.
- `benchmarks/` is an optional isolated subsystem. It owns all benchmark
  code, tests, dependencies, assets, results, and reproduction instructions.
- `docs/` owns detailed project and host documentation.
- `pm/plans/<status>/<plan-id>/` owns new long-lived plans and their sprint
  records. Existing flat `pm/plans/<plan-id>/` records are historical layouts
  and remain in place until an explicitly scoped migration.
- `pm/bugs/<status>/` owns `BUG`, `FEAT`, `CHNG`, `TASK`, and any additional
  project-defined issue types. These four base categories are required;
  client projects may extend the list under `issue-tracking`, which owns
  their meanings and approval rules. New issue filenames follow
  `YYYY-MM-DD-<type>-<short_description>.md`. Existing filenames remain stable
  until an explicitly scoped migration.
- `pm/requirements/index.md` is the entry point for the linked requirements
  web. Create it with the first requirements content, not as a placeholder.
  `pm/requirements/traceability.generated.md` is a derived reverse view;
  canonical relationships remain beside handwritten owned units.
- `pm/architecture/index.md` is the entry point for the linked product
  architecture web. Its introduction describes the product architecture at a
  30,000-foot level and links to thematic architecture documents. Create it
  with the first architecture content, not as a placeholder.
- `pm/uat/index.md` is the entry point for the linked user-acceptance web.
- `pm/plan-inputs/<campaign-id>/<status>/` owns immutable raw user input while it moves from
  `open` through `in_progress` to `closed`; closed entries link the PM records
  that completed semantic ingestion.
- `pm/debugging-pattern-observations/` owns one structured evidence record per
  independently occurring confirmed causal defect. Create it with the first
  observation, without a placeholder; derived categories and promoted skills
  do not belong there.
- `pm/retrospectives/` owns evidence-backed accounts of completed or paused
  project efforts. They record outcomes and unresolved questions, not new
  requirements or acceptance claims.
- `skills/issue-tracking/SKILL.md` supplies the issue types and lifecycle
  semantics. `.agents/config/project/management.json` is the machine-readable
  source for this project's lifecycle directory names and roles; do not repeat
  them in either `ponytail.json` contract. Create lifecycle directories with
  their first record, without placeholder files.
- `tech_debt.md` is the canonical local technical-debt record.
- `tmp/` owns ignored local logs, probes, generated previews, and other
  temporary artifacts, including disposable `tmp/project-journal/` process
  coordination state.

## Boundaries

Core installation, testing, packaging, and publication must not execute
benchmark code or require benchmark dependencies. Core documentation may link
to `benchmarks/`, but benchmark results are not core acceptance evidence.

Project-local skills belong under `.agents/skills/` when Ponytail needs one.
Reusable skills intended for publication belong under `skills/`. Do not copy
project-local skills into the published reusable collection.

Ponytail owns no cloud environments, deployment topology, or ancillary cloud
services. If that changes, add a dedicated cloud infrastructure architecture
document and reference it from `AGENTS.md` in the same change-set.


During the static-language migration, portable obligation logic is canonical in
`skills/plan-execution/scripts/obligations.ts`. Strict compilation emits it under
`dist/`; `scripts/build-runtime.ts`, executed by `npm run build`, materializes
its compiler output at the established portable `.js` launch path. That tracked
text is generated runtime, not a second handwritten owner. The same generator
ships one MIT-licensed upstream `lossless-json.js` module with relative portable
runtime imports, so installed skill copies include their dependency. Existing OpenClaw
resource generation copies the typed owner and generated runtime. Traceability
and versioned-contract ownership point to the typed source.

The rolling configuration/graph/scheduler and checkout runtime entrypoints in
`src/rolling-campaign.js` and `src/rolling-worktrees.js` are generated from their
canonical `.ts` owners by `scripts/build-runtime.ts`. Their behavioral tests are
migrated to checked TypeScript before language acceptance; checkout tests now
execute their typed setup fixture and compiled test runtime.

The rolling PostgreSQL store has a canonical checked TypeScript owner; its
established `.js` entrypoint is materialized compiler output. Database rows are
validated before entering owned typed contracts. Published `@types/pg` is a
development dependency; runtime PostgreSQL topology and schema remain unchanged.
