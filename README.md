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
