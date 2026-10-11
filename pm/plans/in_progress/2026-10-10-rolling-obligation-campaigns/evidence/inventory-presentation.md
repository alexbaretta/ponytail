<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# OBL-73 inventory presentation evidence

Scope: checked inventory presentation, exact V2/V3/empty formatting, input
preservation, consuming census CLI and isolated rolling graph/PostgreSQL fixtures.
Revision: daca0e7, dirty source tree. Profile: focused-static-migration.
Checkout: Ponytail's supplied repository.
Focused observation began 2026-10-11 05:55:36 UTC and finalized 2026-10-11 05:55:48 UTC.

The configured strict root build completed with exit 0 before this focused run.
Build-impact selected only the root Ponytail target with no indeterminate targets.
Runtime materialization check returned exit 0. Plan validation returned exit 0
with five sprints and 222 tasklets; these are observations, not work counts.

## Focused execution

Command: `node --test dist/tests/campaign-inventory.test.js tests/campaign-census.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js`

Exit: 0. Finalization: pass. Required failures: 0. Required skips: 0.

```text
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.863375ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.216333ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (71.290417ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.238542ms)
✔ empty valid inventory presentation retains its summary and final newline (0.081167ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (614.521166ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (145.150458ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (160.194667ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (23.946958ms)
✔ campaign graph exposes detailed planning review without an execution lease (18.29525ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (229.953541ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (134.064416ms)
✔ campaign report and graph accept an initial planning-only sprint (118.928584ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (87.181875ms)
✔ lists plan sources without parsing and exposes canonical source parsing (14.346875ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.649583ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (15.226417ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (85.019292ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (420.681666ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (147.788166ms)
✔ omitted report input requires exactly one campaign containing active plans (93.312333ms)
✔ bare plan names fail explicitly when missing or ambiguous (27.722041ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (57.990667ms)
✔ selected campaign validates direct dependency membership and cycles (28.161541ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (26.029375ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (105.7495ms)
✔ V1 report reader rejects unknown output fields (66.816833ms)
✔ production module uses exact exit and stream contracts without mutation (588.309958ms)
✔ ponytail dispatches campaign reporting through the production module (2018.967ms)
ℹ tests 29
ℹ suites 0
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4390.193
```

## Configured static verification

Command: `npm run check:tsts`. Exit: 0 after staging the new evidence file for
the configured tracked-file policy. No checker extension or bypass.

```text
TSTS checked 866 files: no violations found.
```

## Fixture isolation and acceptance limits

The first repository certificate exposed two fixtures which copied canonical
implementation evidence into isolated checkouts. Before repair, the PostgreSQL
fixture rejected an unknown certificate obligation reference and the graph fixture
scheduled zero obligations because repository evidence inputs were absent.
Their construction now clears certificates and history when substituting
an isolated scope. Production certificate and freshness validation are unchanged.
The focused tests then passed against real Git and existing PostgreSQL.

Traceability generation returned the same nine unfinished coverage gaps for
review, publication and interfaces, while synchronizing the formatter annotation.
This record certifies only the bounded inventory presentation operation. It does
not establish whole-codebase language migration, full unit acceptance, complete
traceability coverage or campaign closure.
