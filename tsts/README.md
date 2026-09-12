# TSTS — Type-safe TypeScript

TSTS is Ponytail's project-agnostic TypeScript static analyzer. Its canonical
source lives here; consuming projects use the installed CLI instead of editing
a Git submodule. It checks public union discriminators and exhaustive dispatch,
with additional configuration-driven no-aliasing, unused-code, type-safe
serialization, and versioned-data-contract rules.

## Installation and use

From the Ponytail source root, `npm install` installs dependencies and builds
TSTS. `./scripts/install-cli.sh` links both `ponytail` and `tsts` into the
configured executable directory. npm packages include these bins and the
compiled analyzer runtime. No compiler build or dependency installation occurs
when invoking the CLI.

In a consuming Git project:

```sh
ponytail register
# Commit .agents/config/ponytail.json and .agents/config/codex-execpolicy.json.
tsts --project tsconfig.json
# For explicitly configured rules:
tsts --config tsts.json
# For repository placement rules:
tsts --directory-structure .agents/config/project/directory-structure.json
```

The launcher runs `ponytail validate` first, preserving exit 2 for no worktree
and 3 for unregistered repositories. The analyzer returns 1 for error-level
violations and 0 when none occur. `ponytail qa` currently selects reference QA;
TSTS is an explicitly invoked analyzer, never a whole integration-suite runner.

See [architecture](docs/architecture.md),
[configuration V2](docs/configuration-v2-upgrade.md), and the
[directory-structure manifest](docs/directory-structure.md). A minimal analysis
configuration:

```json
{
  "schemaVersion": 2,
  "noAliasing": { "severity": "error" },
  "unusedCode": { "severity": "error" },
  "workspaces": [{ "projectPath": "tsconfig.json", "entrypoints": ["src/index.ts"] }]
}
```

## Development and verification

`npm run build:tsts` compiles the analyzer and its tests. Build impact is
configured in the root `ponytail.json`. After a build, use
`node --test tsts/dist/test/<file>.test.js` for focused tests. Root `npm test`
includes all TSTS tests via `npm run test:tsts`, without rebuilding unchanged
inputs. Test output remains ignored and is excluded from the npm package.

TypeScript is a runtime dependency because TSTS uses the compiler API.
`lossless-json` preserves numeric tokens at the analyzer's JSON boundary.
The exported `checkProject` entry point owns reading the physical analysis
configuration and versioned-contract manifest listed in the root contract
inventory. V1 analysis configuration remains retired; V2 is the supported
physical configuration. This import does not change analyzer semantics.

Directory-structure analysis is independent of TypeScript analysis and may run
alone or in the same invocation as `--project` or `--config`. Client projects
keep its versioned manifest at
`.agents/config/project/directory-structure.json` and invoke it from their
canonical TSTS quality command.

## Provenance and license

Imported from the standalone TSTS repository at commit
`23dfee0d97caaaa453c071c6dd6ce50c5e8c1914`. Source and tests were imported from
that exact revision, with copyright/license headers changed under the owner's
explicit authorization on 2026-09-08:

Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
Licensed under the MIT License in the Ponytail repository root.

The former checkout and consuming repositories were not modified. Replacing
existing downstream submodule invocations with this CLI is a separate change
owned by each consuming project.
