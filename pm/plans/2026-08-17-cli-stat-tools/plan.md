# Plan: Ponytail CLI Statistics Tools

- Plan ID: `2026-08-17-cli-stat-tools`
- Status: `DONE`
- Objective: Install Ponytail-owned CLI tools for users and provide plan and
  bug lifecycle statistics from any Git project.
- Management repository: Ponytail.
- Component repository: Ponytail.

## Scope

- Add `plan_stats.sh` and `bug_stats.sh` as user-facing CLI tools.
- Add `scripts/install-cli.sh` to install all tools by default or selected
  tools by name into `~/.local/bin` by default.
- Prompt interactively before adding `~/.local/bin` to `~/.bashrc` unless
  `--update-shell-path` was supplied.
- Add focused regression coverage and synchronize repository commands and
  ownership documentation.

## Exclusions

- Zsh and shell configuration files other than `~/.bashrc`.
- Uninstallation and package-manager integration.
- Statistics outside `pm/plans/` and `pm/bugs/`.

## Acceptance

- Installed tools work from any directory inside a Git worktree.
- `plan_stats.sh <plan-name>` prints open and done task-line counts for the
  exact plan directory basename under `pm/plans/`.
- `bug_stats.sh [YYYY-MM-DD|YYYYMMDD]` prints counts for each lifecycle
  directory whose date-prefixed filename is on or after the inclusive date;
  omission uses `0000-00-00`.
- The installer is safe, idempotent, testable without changing the real home
  directory, and refuses to overwrite unowned files.
- All changed Bash scripts pass syntax checks and focused tests; final core
  acceptance passes.

## Sprints

- [S01](sprints/S01.md): `DONE`

## Questions

- `[RESOLVED]` Installation shell support: Bash only, per user instruction.
- `[RESOLVED]` Default date: `0000-00-00`, per user instruction.
- `[RESOLVED]` Supported date inputs: `YYYY-MM-DD` and `YYYYMMDD`, per user
  instruction.

## Approval

- Approved by the user's persistent instruction to implement this plan.

## Final Validation

- `npm test`: passed, including 206 core tests, Codex installer tests, 23 Pi
  tests, and 4 MCP tests.
- `node scripts/check-rule-copies.js`: passed.
- `node scripts/check-versions.js`: passed; all version files remain `4.8.4`.
- Package dry-run includes both CLI tools and `scripts/install-cli.sh`.
