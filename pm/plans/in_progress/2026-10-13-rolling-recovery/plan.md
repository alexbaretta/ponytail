<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Rolling campaign recovery repairs

Status: IN_PROGRESS. Authority: stakeholder authorization on 2026-10-13.
Repository: Ponytail. The GWEN campaign remains owned by its reporting session.

| Atomic obligation | Canonical condition and discharge criterion | Status |
| --- | --- | --- |
| OBL-RECOVERY-1 | [Read-only collection](../../../requirements/rolling-campaigns.md#req-rolling-readonly-collection-read-only-result-collection) and its identified acceptance | IN_PROGRESS |

Implement and verify each purpose separately. Preserve historical contracts,
actors, leases, publication candidates and QA attempts. Use TypeScript and the
configured static checks. Run focused native-protocol/Git/PostgreSQL regression
proof, then final repository acceptance after the last relevant source change.
Commit locally; report exact commands and commits to the session that reported
the failures. Do not mutate GWEN, its campaign state, or publish on its behalf.
