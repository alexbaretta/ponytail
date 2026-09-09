# Global component registry

Plan ID: 2026-09-08-global-component-registry
Status: DONE

## Objective and authority

Record each registered project's component identities in
`~/.ponytail/config.json`. JavaScript and TypeScript detection records both
each package's full name and its unscoped shorthand, with exact deduplication.
The user requested implementation on 2026-09-08.

## Contract

- Ponytail configuration V1 keeps `projects` as the sorted project-path array
  and adds a required `components` object keyed by those exact paths.
- Every `components` value is a sorted, unique string array. Its keys exactly
  match `projects`; there is no compatibility reader or second format.
- A scoped detected package such as `@example/service` registers both
  `@example/service` and `service`. An unscoped name registers once.
- Project component metadata and the matching global registry entry are
  updated under the existing global lock and with atomic file replacement.
- Registration initializes the global entry from committed project metadata;
  validation requires both representations to agree.

## Sprint

1. [S01](sprints/S01.md): registry contract, synchronized commands, tests,
   documentation, and final acceptance — DONE.

## Acceptance

Focused CLI tests cover registration, shorthand derivation, deduplication,
unregistration, and strict validation. Final acceptance runs build impact,
the full unit-test command, rule-copy validation, and version validation.

## Evidence

Starting revision: `0d380f5`; working tree clean.

Implementation commit: `91de9ce`.

Final acceptance passed `npm test` (297 core, 23 Pi extension, 4 MCP, and 58
TSTS tests), `node scripts/check-rule-copies.js`, and `node
scripts/check-versions.js`. Build impact reported no affected or indeterminate
TSTS target. The live `~/.ponytail/config.json` was updated and verified with
`ponytail detect-components`.
