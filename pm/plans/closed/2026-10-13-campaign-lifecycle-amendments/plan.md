<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Campaign lifecycle amendments

Status: CLOSED. Authority: human approval on 2026-10-13.
Scope: Ponytail tooling, exported skills, requirements, acceptance and tests.
Client configuration/execution remains owned by the GWEN reporting session.

| Atomic obligation | Canonical owner | Status |
| --- | --- | --- |
| OBL-RECOVERY-3 | REQ-ROLLING-CONFIGURATION-AMENDMENT: audited existing-campaign amendment | DONE |
| OBL-RECOVERY-4 | REQ-ROLLING-PUBLICATION-WITHDRAWAL: withdraw unpublished batch without losing delivery history | DONE |
| OBL-RECOVERY-5 | REQ-ROLLING-WORKER-CORRECTION: retain and reactivate terminal workers without fabricated dependencies | DONE |
| OBL-RECOVERY-6 | REQ-ROLLING-QA-APPROVAL: bounded approval of exact required QA commands | DONE |
| OBL-RECOVERY-7 | REQ-ROLLING-PARALLEL-DISPATCH: explicit concurrent dispatch within authorized capacity | DONE |

The canonical conditions and discharge criteria live in
[rolling requirements](../../../requirements/rolling-campaigns.md); their
acceptances live in [rolling UAT](../../../uat/rolling-campaigns.md).
Preserve workers, frozen leases, original publication candidates and attempts.
No raw client-state updates, replacement campaign, broad permission rules, or
client worktree creation. Implement related lifecycle changes as one batch,
then worker recovery/QA approval and exported instructions. Run focused
Git/PostgreSQL/protocol regressions and final full repository acceptance.
Deliver validated commands and local commits to reporting session
`01a1343a-fb49-7e81-abb6-1212c141a1a2`.

## Final acceptance

All five atomic obligations discharged on 2026-10-13. Full `npm test` passed
with 946 tests and no failures (log: ignored `tmp/campaign-lifecycle-full.log`); TSTS checked
1,562 files with no violations. The focused Git/PostgreSQL/protocol selection
passed all four scenarios, including original unloaded-worker correction.
Traceability checked 967 relationships without violations; generated runtime,
rule copies, version checks and new command help passed. Read-only adversarial
review accepted the final ownership, QA-command and withdrawal fences.

Acceptance exercises disposable Git repositories and isolated rows in the
existing local PostgreSQL database. It does not claim that a live GWEN worker
has been repaired or its campaign has published. The reporting coordinator
owns applying the validated lifecycle commands and client scheduling.
