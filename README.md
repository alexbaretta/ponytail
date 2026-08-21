<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail

Ponytail is a project-agnostic agentic coding harness. It combines an
always-on engineering policy, optional implementation-compaction modes, and
specialized reusable skills for contracts, testing, project management, and
runtime safety.

## Install

For Codex from a checkout:

```bash
./scripts/install-to-codex.sh
```

Install Ponytail's user-facing CLI tools into `~/.local/bin`:

```bash
./scripts/install-cli.sh
```

The CLI installer prompts before adding that directory to `~/.bashrc`; pass
`--update-shell-path` to approve the update non-interactively. Install only
selected tools by naming them, for example
`./scripts/install-cli.sh plan_stats.sh`.

Codex discovers project-owned skills automatically from `.agents/skills/`
between the working directory and repository root.

Other supported installation paths include:

```text
Claude Code:  /plugin marketplace add alexbaretta/ponytail
              /plugin install ponytail@ponytail
Copilot CLI:  copilot plugin marketplace add alexbaretta/ponytail
              copilot plugin install ponytail@ponytail
Devin CLI:    devin plugins install alexbaretta/ponytail
Hermes:       hermes plugins install alexbaretta/ponytail --enable
OpenCode:     { "plugin": ["@alexbaretta/ponytail"] }
Pi:           pi install git:github.com/alexbaretta/ponytail
```

File-based adapters for other supported hosts are included in the repository.
See [agent portability](docs/agent-portability.md) for their locations.

## Modes and commands

All engineering rules remain active in every mode. Only aggressive code
compaction changes.

| Command | Purpose |
| --- | --- |
| `/ponytail lite` | Light compaction |
| `/ponytail full` | Default compaction |
| `/ponytail ultra` | Most aggressive compaction |
| `/ponytail off` | Disable compaction only |
| `/ponytail-review` | Review current changes |
| `/ponytail-audit` | Audit repository complexity |
| `/ponytail-debt` | Reconcile technical debt |
| `/ponytail-help` | Show command help |

Installed shell tools:

| Tool | Purpose |
| --- | --- |
| `audit_pm.sh [--fix] [--dryrun]` | Audit PM structure and preview or fix missing date prefixes |
| `plan_pdf.sh [--sprints] <plan-name> [output.pdf]` | Render a plan, optionally with its sprints, as PDF using Pandoc |
| `plan_stats.sh <plan-name>` | Count open and done task lines in a plan |
| `bug_stats.sh [date]` | Count bugs by lifecycle state on or after a date |
| `project_journal.sh init\|start\|run_command\|over ...` | Initialize or record long-lived-plan telemetry in PostgreSQL |

`plan_pdf.sh` requires Pandoc and writes to `tmp/<plan-name>.pdf` unless an
output path is supplied.

### Project journaling

Long-lived-plan telemetry uses PostgreSQL 18 rather than Git. A project owns a
root-level `ponytail-journal.json` containing `schemaVersion`, a stable UUIDv7
`projectId`, `projectName`, and non-secret database settings. Database name
defaults to `ponytail`, role defaults to the current Unix user, and an omitted
host uses PostgreSQL's local Unix socket. Optional `host`, `port`, `role`, and
`passwordEnvironment` fields override those defaults; passwords never belong
in the JSON file.

Initialize an adopting Git repository once, then commit the generated project
configuration so every checkout and agent uses the same identity:

```bash
project_journal.sh init
git add ponytail-journal.json
```

Use `--project-name` or `--database-name` to override the derived repository
name or default database name. Initialization is idempotent: an existing valid
configuration succeeds without mutation, while invalid configurations and
explicit names that conflict with the existing identity fail. Action commands
never create the configuration implicitly.

The committed file is the single logical project identity across Git
worktrees. Each worktree has its own checked-out copy, so the initialization
commit must be merged into every worktree branch that uses journaling. When
the configuration does not match `HEAD`, `init` prints the required commit
commands and this worktree reminder to standard error while reserving standard
output for its JSON result.

An authorized database administrator provisions or reconciles the database,
roles, schema, policies, functions, and project registration with:

```bash
./scripts/setup-project-journal.sh
```

The tool records actions through sanitizing database functions, keeps its
disposable heartbeat state under ignored `tmp/project-journal/`, and emits
one-line JSON. Journal failures do not stop engineering work and must be
reported in the agent's reply.

## Skills and project configuration

`registry.tsv` is the source of truth for published skills and commands.
Reusable skills live in `skills/`. A host project keeps its own configuration
in `AGENTS.md` and its project-local skills in `.agents/skills/`; Ponytail does
not install them globally.

## Development

```bash
npm install
npm install --prefix ponytail-mcp
npm test
node scripts/check-versions.js
```

`npm test` is the complete live-development core acceptance gate. Optional
benchmark code and instructions are isolated under [benchmarks](benchmarks/)
and never participate in core installation, testing, packaging, or
publication.

## License

MIT. Dietrich Gebert is Ponytail's original author. Alex Baretta maintains
this combined distribution.
