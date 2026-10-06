<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Planning-only sprint indexing requires executable headings

- **ID:** `2026-10-06-BUG-planning_only_sprint_index`
- **Type:** `BUG`
- **Status:** `closed`
- **Authorization:** Repair of confirmed Ponytail defects within the stakeholder's
  authorized collaboration with the GWEN coordinator; reported 2026-10-06.
- **Requirement:** [REQ-TRACEABILITY-INDEX](../../requirements/traceability-index.md).

Traceability: introduces REQ-TRACEABILITY-INDEX from issue 2026-10-06-BUG-planning_only_sprint_index

## Confirmed diagnosis

A V3 `READY_FOR_REVIEW` sprint with `execution: null` and no sibling tasklet
graph passes campaign validation. The indexer parses tasklet headings anyway,
allowing an empty result only for `STUB`, and aborts indexing. The prior STUB
correction did not cover this other canonical planning-only state.

The fix carries sibling-graph presence into the sprint parser and permits
empty headings exactly when execution is null and either no graph exists or
the sprint is STUB. Detailed graphs, executable sprints, and malformed headings
retain their validation requirements. No client plan or ownership is changed.

## Acceptance and reconciliation

The [plan-corpus Arc](../../uat/traceability-index.md#arc-search-and-traverse-the-plan-corpus)
now includes planning-only states and the executable/graph boundary. The existing
requirement owns this clarification; no new requirement is introduced.

- Before correction: the focused planning-only regression fails with
  `contains no tasklet headings` for `READY_FOR_REVIEW`, null execution, no graph.
- Final validation: 30 project-index tests pass; the changed regression also
  proves sibling-graph presence changes the parse-cache identity. Build impact
  reports no affected targets. Existing executable and malformed-heading
  rejection remains covered.
- Resolution: indexing now uses canonical planning-only eligibility and
  invalidates cached sprint parses when sibling-graph presence changes.
- [Causal observation](../../debugging-pattern-observations/2026-10-06-sprint_projection_ignored_graph_presence.json).
