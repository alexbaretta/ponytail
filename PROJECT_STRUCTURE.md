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
- `src/project-index.js` owns Git-aware PostgreSQL traceability, plan, and
  repository-text projections, transactional generation publication,
  freshness-checked structured queries, incremental historical and worktree
  indexing, and the `ponytail traceability`, `ponytail plan`, and `ponytail
  search` command families; `scripts/test-project-index-postgres.sh` owns their
  real-database contract proof.
- `tsts/` owns the canonical TypeScript analyzer and its Node tests. Root npm dependencies and `npm run build:tsts` produce ignored `tsts/dist/`; npm distributes only its compiled runtime. `cli/tsts` is the registered-project launcher installed alongside `ponytail`.
- `src/` owns non-script runtime implementations dispatched by user-facing
  CLI entrypoints. `src/pm-pdf.py` owns configured linked-Markdown PDF
  rendering. `src/plan-input.js` owns the durable plan-input queue contract and
  lifecycle. `src/campaign-census.js` owns campaign configuration and
  plan metadata readers, scoped campaign discovery and validation,
  repository-wide campaign inventory, census normalization, and human/JSON
  reporting and canonical immediately-runnable tasklet projection.
  `src/campaign-orchestration.js` owns the versioned Ponytail-user
  assignment ledger, authenticated host-observation snapshot, dependency
  scheduler, runnable-plan execution/anomaly summary, scoped blocker reports and batch reservation, reconciled status and ready-action projection, verified
  fast-forward integration, and typed host-action protocol.
  Its per-top-level-project ledgers own the retained worker pool and capacity
  reservations. `src/worker-worktrees.js` owns exact-path Git reconstruction
  from authenticated main-worktree provenance, independently of host tools.
  `src/worktree-reclamation.js` owns the versioned
  project lifecycle-adapter contracts, project-scoped reclamation lock,
  deterministic claim selection, generation fencing, and verified cleanup
  result.
- `ponytail.json` owns the TSTS build-impact target.
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
- `pm/bugs/<status>/` owns all issue types. New issue filenames follow
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
