# Ponytail CLI Lifecycle

- Plan ID: `2026-09-04-ponytail-cli-lifecycle`
- Status: `DONE`
- Approval: on 2026-09-04 the user explicitly requested a `ponytail` CLI
  owning project registration, permission installation, CLI installation,
  Codex installation, and combined installation.

## Objective

Replace installer-script-facing workflows with one installable `ponytail`
command whose explicit project registry under `~/.ponytail` is the sole source
of repositories considered during permission synthesis.

## Scope

- Add `ponytail setup-project`, `install-permissions`, `install-cli`,
  `install-to-codex`, and `install`.
- Store a versioned, deduplicated project registry and Ponytail source root
  under `~/.ponytail`.
- Make combined and compatibility installers delegate to the canonical CLI.
- Update policy synthesis, documentation, reusable guidance, packaging, and
  isolated tests.

## Exclusions

- No filesystem-wide project discovery.
- No automatic project registration during `ponytail install`.
- No live mutation of this task's invoking user configuration during tests.
- No removal of existing standalone Ponytail tools.

## Sprint

- [S01](sprints/S01.md): implement and validate the CLI lifecycle. Status:
  `DONE`.

## Acceptance

- `setup-project` resolves the enclosing Git worktree root and registers it
  idempotently without scanning unrelated directories.
- `install-permissions` uses every and only registered project proposal.
- The three installation subcommands preserve existing installer safety
  checks, and `install` runs all three in order.
- Durable user configuration is exact, versioned, atomic, and symlink-safe.
- Focused and full Ponytail acceptance pass in isolated homes.

## Final Validation

- Implementation commit: `5308d30`.
- Installed Codex parser validation passed all 11 focused permission and CLI
  tests.
- `npm test` passed 264 core tests, 23 Pi extension tests, and 4 MCP tests,
  including registry, generated-output, rule-copy, installer, and distribution
  checks.
- Version, shell syntax, durable-contract, selector, and diff checks passed.
- All installation tests used isolated homes; the invoking user's live
  `~/.ponytail` and `~/.codex` were not changed.
