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

Install Ponytail's Codex skills and user-facing CLI tools from a checkout:

```bash
./scripts/install.sh
```

This installs the `ponytail` executable into `~/.local/bin` and installs the
enabled Codex skills. The executable links to this checkout so it can find
Ponytail's canonical scripts and assets. Use it for subsequent configuration
updates:

```bash
ponytail update-skills
ponytail update-permissions
ponytail update
```

From each adopting repository, register its Git root once:

```bash
ponytail register
```

Remove a deleted or moved repository registration by its previous root:

```bash
ponytail unregister /absolute/repository/root
```

List registered repository roots, including unavailable ones:

```bash
ponytail list-projects
```

Optionally add reference QA to the repository's existing pre-commit flow:

```bash
ponytail pre-commit
```

Registration is stored in `~/.ponytail/config.json`; no filesystem-wide scan
is performed. `ponytail update-permissions` evaluates every registered
repository's `.agents/config/codex-execpolicy.json` proposal together.

The CLI installer prompts before adding that directory to `~/.bashrc`; pass
`--update-shell-path` to approve the update non-interactively. Install only
selected standalone tools by naming them to `scripts/install-cli.sh`, for
example `./scripts/install-cli.sh plan_stats.sh`.

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
| `ponytail register\|unregister\|list-projects\|bless[-worktree]\|blessed[-worktree]\|register-component\|unregister-component\|list-components\|register-dependency\|unregister-dependency\|list-dependencies\|detect-components\|pre-commit\|validate\|qa\|update-permissions\|update-skills\|update` | Register, unregister, and list repositories; select worktree configuration; manage components and dependencies; install pre-commit QA; run local QA; and update Codex configuration |
| `ponytail campaign validate <plan-name-or-path>` | Fail-fast validation of the campaign containing the supplied managed plan |
| `ponytail campaign report <plan-name-or-path> [--json]` | Report that campaign's plan, sprint, and tasklet census |
| `audit_pm.sh [--fix] [--dryrun]` | Audit PM structure and preview or fix missing date prefixes |
| `plan_pdf.sh [--sprints] <plan-name> [output.pdf]` | Render a plan, optionally with its sprints, as PDF using Pandoc |
| `plan_stats.sh <plan-name>` | Legacy flat-layout count of open and done task lines in one plan |
| `bug_stats.sh [date]` | Count bugs by lifecycle state on or after a date |
| `condense_codex_rules.sh [--project root] [--dry-run\|--check\|--restore]` | Legacy low-level Codex command-policy compiler |
| `project_journal.sh init\|start\|run_command\|over ...` | Initialize or record long-lived-plan telemetry in PostgreSQL |

The `issue-tracking` skill defines configurable issue types and shared
issue/plan statuses. The `requirements` skill maintains a linked Markdown web
under `pm/requirements` and requires reconciliation whenever an issue enters
active work. The `user-acceptance-testing` skill derives a linked plain-English
acceptance web under `pm/uat` from approved requirements while deferring every
project command, environment, credential, and evidence operation to a
project-local UAT operations skill. The `architecture` skill maintains the
product's linked architecture web under `pm/architecture`, beginning with a
30,000-foot landing page. `plan-execution` places new plans under
`pm/plans/<status>/`. Configure these skills in the project's agent
instructions or a referenced management document; see
[issue tracking](skills/issue-tracking/SKILL.md).

The PM CLI commands above implement the legacy flat plan layout and three bug
states, except for `ponytail campaign`, which reads the versioned management
configuration and status-directory layout. Do not use `audit_pm.sh --fix` to
migrate the current layout, or treat that audit, `bug_stats.sh`, or
`plan_stats.sh` as a complete campaign check. The plan readiness selectors
accept the current plan/sprint path explicitly and remain usable after a status
move.

Campaign input may be an exact stable plan name, `<plan-name>/plan.md`, an
explicit plan directory, or an explicit `plan.md` path. The first two forms are
resolved across configured lifecycle directories and must identify exactly one
plan.

The human campaign report summarizes `DONE`, `PENDING`, `ERROR`, and total
tasklets by plan lifecycle and by plan, followed by incomplete sprints. Use
`--json` for the normalized tasklet-level records.

`plan_pdf.sh` requires Pandoc and writes to `tmp/<plan-name>.pdf` unless an
output path is supplied.

See [managing Codex command policy](docs/condense-codex-rules.md) for project
proposals, confirmation, accepted state, and single-command recovery.

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

Use `--project-name`, `--database-host`, `--database-port`, `--database-name`,
`--database-role`, and `--pgpassword-variable` to set the complete
non-secret connection configuration during initialization. Initialization is
idempotent: it registers the configured identity in the provisioned journal
database on every run, an existing valid configuration succeeds without file
mutation, and invalid configurations or conflicting explicit settings fail.
Action commands never create the configuration implicitly.
The connection options also accept the PostgreSQL-style shorthands `--dbhost`,
`--dbport`, `--dbname`, `--dbrole`, and `--pgpassvar`.

```bash
project_journal.sh init \
  --database-host postgres.example.internal \
  --database-port 5432 \
  --database-name example_project_journal \
  --database-role example_journal_writer \
  --pgpassword-variable EXAMPLE_JOURNAL_PASSWORD
```

The committed file is the single logical project identity across Git
worktrees. Each worktree has its own checked-out copy, so the initialization
commit must be merged into every worktree branch that uses journaling. When
the configuration does not match `HEAD`, `init` prints the required commit
commands and this worktree reminder to standard error while reserving standard
output for its JSON result.

An authorized database administrator first provisions or reconciles the
database, roles, schema, policies, and functions with:

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

Project identities, validation, and local reference QA: [CLI guide](docs/project-validation.md).

TSTS is included as an installable TypeScript analyzer. `npm install` builds it; `./scripts/install-cli.sh` installs the `tsts` launcher. Run `tsts --project tsconfig.json` inside a registered project. See [TSTS](tsts/README.md).
