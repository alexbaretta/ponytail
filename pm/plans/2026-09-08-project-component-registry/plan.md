# Project component registry

Plan ID: 2026-09-08-project-component-registry
Status: DONE

## Objective and authority

Add per-project component names to Ponytail metadata, explicit component
registration commands, and JavaScript/TypeScript monorepo package detection.
The user requested implementation on 2026-09-08.

Management and implementation repository: Ponytail. No current-user metadata,
downstream repository, installation, deployment, or CI/CD mutation is in scope.

## Contract

- Project metadata V1 adds a required, distinct `components` string array.
  `names` continues to own project synonyms. The earlier V1 shape without
  `components` is not retained or migrated.
- `ponytail register-component <name>` adds one exact component idempotently.
- `ponytail unregister-component <name>` removes one exact component and fails
  when it is absent.
- `ponytail detect-components [--language typescript|javascript|auto]` reads
  all tracked regular `package.json` files, atomically adds their package
  names, and prints the complete detected set in sorted order. It never removes
  components. `auto` is the default and currently selects this same detector.
- Component mutations use a repository-specific lock and atomic metadata
  writes. Detection parses every candidate before changing metadata.
- Reference QA treats foreign component names exactly like foreign canonical
  and synonymous project names.

## Sprint

1. [S01](sprints/S01.md): V1 metadata, component commands, detection, QA,
   documentation, and final acceptance — DONE.

## Acceptance

Focused CLI tests cover the exact V1 shape, idempotency,
missing components, tracked package discovery, malformed manifests, atomic
failure, linked worktrees, and foreign component findings. Final acceptance
runs the repository's full unit-test command, rule-copy check, and version
check. No integration suite exists or is introduced.

## Evidence

Starting revision: `1c61966`; working tree clean.
Journal startup failed because the sandbox denied access to the configured
PostgreSQL Unix socket. Journaling is non-blocking; execution evidence remains
in this plan.

Implementation commit: `07b83da`.

Final acceptance passed `npm test` (296 core, 23 Pi extension, 4 MCP, and 58
TSTS tests), `node scripts/check-rule-copies.js`, and `node
scripts/check-versions.js`. Ponytail has no configured build target, so no
build was applicable. The strict physical contract remains V1 and now requires
`components`; no second format, compatibility reader, or migration was added.
