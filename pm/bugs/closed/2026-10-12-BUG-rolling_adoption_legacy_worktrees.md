<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Rolling adoption rejects historical worktrees

- Status: CLOSED
- ID: 2026-10-12-BUG-rolling_adoption_legacy_worktrees
- Type: BUG
- Requirement: REQ-ROLLING-WORKERS / REQ-ROLLING-CONFIGURATION.
Traceability: introduces REQ-ROLLING-CONFIGURATION from issue 2026-10-12-BUG-rolling_adoption_legacy_worktrees
Traceability: introduces REQ-ROLLING-WORKERS from issue 2026-10-12-BUG-rolling_adoption_legacy_worktrees

- Authority: stakeholder requested rolling N=10 adoption for GWEN and authorized
  Ponytail tooling bug repairs in this repository.
- Atomic obligation: permit adoption without editing unconfigured historical
  branches, while requiring identical pool identity for all actual participants.
- Root cause: pool discovery reads configuration and resolves physical roots for
  every Git worktree, including unrelated old branches and retained stale entries.
- Repair: validate the invoking root, all pool members and all other configured
  checkouts; preserve unconfigured historical entries and their files.
- Regression: real disposable Git repository with old primary/legacy branches,
  a current coordinator, conflicting configured legacy checkout, an unconfigured
  pool member and a stale unowned registration. No runtime fallback configuration.
- UAT: rolling CONFIG-POOL Step; the mismatch and missing-pool-config checks remain.
- Acceptance: focused native Git regression 4/4 passed; root build and generated
  runtime checks passed. Full core QA passed 547 legacy Node tests, 273 typed
  tests, installation acceptance, 23 Pi tests, 4 MCP tests and 80 TSTS tests.
  The final static gate initially rejected the untracked observation; staging
  that authorized record and rerunning `npm run check:tsts` passed (1538 files).
  Rule copies, versions, registry, adapters and manifests are synchronized.
- Resolution: the atomic adoption obligation is discharged by the real Git
  regression, retaining fail-closed checks for actual participants.
- Observation: [confirmed causal incident](../../debugging-pattern-observations/2026-10-12-rolling_adoption_legacy_worktrees.json).
