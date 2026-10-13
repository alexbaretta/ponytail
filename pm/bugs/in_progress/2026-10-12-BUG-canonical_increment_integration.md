<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Canonical integrate skipped preparation and proof

- ID: 2026-10-12-BUG-canonical_increment_integration
- Type: BUG
- Status: IN_PROGRESS
- Authority: stakeholder authorized repairs to Ponytail coordination tooling.
Traceability: introduces REQ-ROLLING-REVIEW from issue 2026-10-12-BUG-canonical_increment_integration
Traceability: introduces REQ-ROLLING-PUBLICATION from issue 2026-10-12-BUG-canonical_increment_integration
- Atomic obligation: an accepted exact candidate can traverse the complete
  canonical integrate command without manually invoking internal store methods.
- Root cause: the command called publication directly, bypassing the required
  claim, persisted rebase intent, actual Git replay and refreshed focused proof.
- Repair: connect the existing lifecycle operations; retain original identity
  across replay and push recovery, serialize integration ownership with the
  existing project transaction, route conflicts to the original worker and
  preserve rejected QA outputs without pushing.
- Differential proof: all five real CLI/PG/Git cases failed at the original
  missing-proof gate before repair. Afterward publication, upstream replay,
  conflict return, QA failure and lost replay-receipt recovery pass. The upstream
  case also converts historical ignored output inputs to tracked Git inputs.
- Validation: focused canonical integration Arc 5/5 and integration unit tests
  11/11; build, 918 traceability relationships and TSTS on 1558 files pass.
  Rule-copy/version checks pass; independent adversarial review accepted.
  Final combined repository
  acceptance remains the coordinator's gate after the related repairs land.
- Evidence: ignored tmp/integrate-before.log and tmp/integrate-after.log.
