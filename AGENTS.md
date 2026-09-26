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
- Long-lived plans: `pm/plans/<status>/<plan-id>/` for new records.
- Issues of all types: `pm/bugs/<status>/`.
- Requirements: linked Markdown rooted at `pm/requirements/index.md`.
- Architecture: linked Markdown rooted at `pm/architecture/index.md`.
- UAT documentation root: `pm/uat`.
- Debugging pattern observations: `pm/debugging-pattern-observations/`.
- Issue types and shared issue/plan lifecycle: use `issue-tracking` defaults.
- Existing records retain their established paths; see `PROJECT_STRUCTURE.md`.
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
- Build target: `npm run build:tsts`; other Ponytail tooling ships source files.
- Build-impact configuration: `ponytail.json`.
- Build-impact query: `node skills/build-impact/scripts/build-impact.js --file <changed-path>`.
- TSTS focused tests after build: `node --test [--test-name-pattern=<pattern>] tsts/dist/test/<file>.test.js`.
- TSTS full unit tests: `npm run test:tsts` (included in `npm test`).
- TypeScript test indexes/audit metadata: not configured; tests discovered in `tsts/test/`.
- Lossless JSON boundary: `tsts/src/lossless-json.ts`, using `lossless-json`; focused proof `node --test tsts/dist/test/lossless-json.test.js`.
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
- Complete installation: `./scripts/install.sh`.
- Local setup validation: `ponytail validate`.
- Local reference QA: `ponytail qa`; no downstream integration suite.
- Project initialization and registration: `ponytail register`; removal:
  `ponytail unregister <repository-root>`; listing: `ponytail list-projects`.
- Worktree selection: `ponytail bless[-worktree]`; display it with `ponytail
  blessed[-worktree]`.
- Component registration: `ponytail register-component <name>` and
  `ponytail unregister-component <name>`; listing: `ponytail list-components`.
- Project dependency registration: `ponytail register-dependency <project>` and
  `ponytail unregister-dependency <project>`; listing: `ponytail
  list-dependencies`.
- JavaScript/TypeScript component detection: `ponytail detect-components
  [--language typescript|javascript|auto]`.
- Permission update: `ponytail update-permissions`.
- Codex skill update: `ponytail update-skills`; Codex discovers
  project-local skills from `.agents/skills/` automatically.
- Codex installer tests: `./scripts/test-install-to-codex.sh`.
- TSTS CLI: `tsts --project tsconfig.json`, `tsts --config tsts.json`, or
  `tsts --directory-structure .agents/config/project/directory-structure.json`;
  requires a registered project.
- CLI installation: `./scripts/install-cli.sh`.
- Project-journal setup: `./scripts/setup-project-journal.sh`.
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
