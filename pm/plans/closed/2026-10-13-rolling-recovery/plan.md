<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Rolling campaign recovery repairs

Status: COMPLETED. Authority: stakeholder authorization on 2026-10-13.
Repository: Ponytail. The GWEN campaign remains owned by its reporting session.

| Atomic obligation | Canonical condition and discharge criterion | Status |
| --- | --- | --- |
| OBL-RECOVERY-1 | [Read-only collection](../../../requirements/rolling-campaigns.md#req-rolling-readonly-collection-read-only-result-collection) and its identified acceptance | DONE |
| OBL-RECOVERY-2 | [Failed-QA candidate repair](../../../requirements/rolling-campaigns.md#req-rolling-publication-repair-repair-a-failed-qa-candidate) and its identified acceptance | DONE |

Implement and verify each purpose separately. Preserve historical contracts,
actors, leases, publication candidates and QA attempts. Use TypeScript and the
configured static checks. Run focused native-protocol/Git/PostgreSQL regression
proof, then final repository acceptance after the last relevant source change.
Commit locally; report exact commands and commits to the session that reported
the failures. Do not mutate GWEN, its campaign state, or publish on its behalf.

Acceptance evidence (2026-10-13):

- Native protocol, worker and publication unit selection: 21 tests passed.
- Real Git/PostgreSQL recovery selection: 3 tests passed, covering foreign
  writer collection, retained creation recovery, and reviewed failed-QA repair
  followed by fresh full QA and normal publication.
- Final `npm test`: passed; 942 tests across root, typed, extension, MCP and
  TSTS packages. TSTS checked 1,561 files without violations.
- Canonical traceability generation/validation, generated runtime consistency,
  rule copies and version checks passed.
- Independent adversarial review accepted both fixes; its foreign-turn
  cancellation finding was corrected and covered by a regression.

Reporting session: `01a1343a-fb49-7e81-abb6-1212c141a1a2`
(Resolve GWEN traceability defects). Deliver the command contracts and commit
IDs there. This change authorizes no GWEN execution or publication.
