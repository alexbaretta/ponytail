<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Installed obligation runtime lacks its dependency

- ID: 2026-10-12-BUG-installed_obligation_dependency
- Type: BUG
- Status: CLOSED
- Authority: stakeholder authorized Ponytail tool repairs found during GWEN audit.
- Atomic obligation: installed obligation inspection executes independently of
  the source repository's Node dependency directory.
Historical coverage: introduces REQ-ROLLING-CLIENT-PROTOCOL from issue 2026-10-12-BUG-installed_obligation_dependency
- Root cause: generated portable modules required a bare npm package while the
  installer copies only the skill directory.
- Repair: generate one licensed dependency module within the portable runtime
  and target it with generated relative imports; preserve typed source imports.
- Regression: real installer in a disposable Codex home, external plugin boundary
  stubbed; run validation and Node ESM named import outside the repository with
  Node search overrides removed. Failed before repair, passed afterwards.
- Acceptance: installed-runtime/attribution focused proof 3/3; portable obligation
  proof 24/24; complete disposable installer harness passed. Root build,
  generated-runtime consistency, rule copies, versions, adapters, registry and
  manifests passed. Full `npm test` passed after final generator edits,
  including all configured tests, installation checks, traceability and TSTS.
- Resolution: portable validation and actual Node ESM named imports execute
  without repository dependency search; upstream license remains intact.
- Observation: [confirmed causal incident](../../debugging-pattern-observations/2026-10-12-installed_obligation_dependency.json).
