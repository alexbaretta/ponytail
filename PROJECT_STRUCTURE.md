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
- `registry.tsv` owns enabled and disabled skill and command publication
  across supported hosts. Benchmark entries are prohibited.
- `versioned-data-contracts.json` inventories Ponytail's durable serialized
  contracts and their reader registries.
- `ponytail-journal.json` owns the project's stable identity and non-secret
  PostgreSQL journal connection settings. Create it once with
  `project_journal.sh init`, then commit it; action commands never create it
  implicitly.
- `hooks/` owns shared lifecycle behavior and policy injection.
- Host directories such as `.claude-plugin/`, `.codex-plugin/`, `.github/`,
  `.opencode/`, `.qoder/`, and `.openclaw/` own host adapters. Generated
  adapters identify their canonical source in their validation tests.
- `scripts/` owns local generation, validation, installation, cleanup, and
  publication tooling. `scripts/install.sh` owns combined Codex and CLI
  installation. `scripts/install-to-codex.sh` owns Codex installation; it
  binds only registry-enabled bundled skills. Codex discovers project-local
  skills from `.agents/skills/` automatically.
- `scripts/setup-project-journal.sh` and `scripts/project-journal.sql` own
  PostgreSQL 18 journal provisioning and its immutable V1 storage contract.
- `cli/` owns user-facing parse-safe Bash tools. Adding a tool there makes it
  installable by `scripts/install-cli.sh`, which installs all `cli/*.sh` files
  or selected tools into the user's configured executable directory. Add each
  tool to the focused CLI syntax, behavior, installer, and distribution tests.
- `generated/` owns runtime data derived from `registry.tsv`.
- `tests/` owns core live-development tests.
- `benchmarks/` is an optional isolated subsystem. It owns all benchmark
  code, tests, dependencies, assets, results, and reproduction instructions.
- `docs/` owns detailed project and host documentation.
- `pm/plans/` owns long-lived plans and sprint records.
- `pm/bugs/open/`, `pm/bugs/in_progress/`, and `pm/bugs/closed/` own bug
  records by lifecycle state. Create a lifecycle directory when its first
  record is added; do not add placeholder files.
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
