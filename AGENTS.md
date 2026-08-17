<!--
Copyright (c) Ponytail contributors.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail Repository Configuration

This file configures work on the Ponytail repository. Portable engineering
policy belongs in `skills/ponytail/SKILL.md`; do not duplicate it here.

## Ownership

- Repository and management root: this repository.
- Structure and ownership: `PROJECT_STRUCTURE.md`.
- Project-management root: `pm/`.
- Long-lived plans: `pm/plans/<plan-id>/`.
- Bugs: `pm/bugs/open/`, `pm/bugs/in_progress/`, and `pm/bugs/closed/`.
- Technical debt: `tech_debt.md`.
- Ignored temporary artifacts: `tmp/`.
- Reusable skills: `skills/`.
- Project-local skills, when needed: `.agents/skills/`.

Ponytail owns no cloud environments, deployments, or ancillary cloud
services. `PROJECT_STRUCTURE.md` is authoritative for that boundary.

## Commands

- Initial setup: `npm install` and `npm install --prefix ponytail-mcp`.
- Dependency update: use the same two install commands after dependency or
  lockfile changes.
- Full build: not applicable; Ponytail ships source files.
- Build-impact configuration: not applicable; Ponytail has no build target.
- Unit-test command families:
  - Node focused: `node --test [--test-name-pattern=<pattern>] <test-files>`.
  - Node full: `npm test`.
- Integration tests: no separate integration suite; supported adapter and
  bundled-subproject behavior is exercised by the Node full command.
- Integration arc listing: not applicable.
- Rule-copy check: `node scripts/check-rule-copies.js`.
- Registry check: `node scripts/registry.js`.
- Command-adapter generation: `node scripts/build-command-adapters.js
  --write`; omit `--write` to check generated output.
- Runtime-registry generation: `node scripts/build-registry-data.js
  --write`; omit `--write` to check generated output.
- Version check: `node scripts/check-versions.js`.
- Manifest generation: `node scripts/build-manifests.js --write`; omit
  `--write` to check repeated metadata.
- OpenClaw generation: `node scripts/build-openclaw-skills.js`.
- Codex installation: `./scripts/install-to-codex.sh`; Codex discovers
  project-local skills from `.agents/skills/` automatically.
- Codex installer tests: `./scripts/test-install-to-codex.sh`.
- CLI installation: `./scripts/install-cli.sh`.
- CLI focused tests: `node --test tests/cli-tools.test.js`.
- Deployment: not applicable.

Use the Node focused command while editing. Run the Node full command, the
rule-copy check, and the version check for final core acceptance.

## Local Rules

- Keep generated host adapters synchronized with their canonical sources in
  the same commit.
- Do not hand-edit generated skill copies when the owning generator can
  produce the change.
- Preserve the benchmark boundary: core commands, dependencies, packages, and
  CI must not execute or provision benchmark behavior.
- Never commit generated distributable archives or other binary release
  artifacts.
- Follow the active plan under `pm/plans/` for multi-step work.
