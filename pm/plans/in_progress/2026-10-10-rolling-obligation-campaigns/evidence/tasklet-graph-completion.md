# Typed tasklet graph and selection completion

Exact clean revision b8dc14f991790bee722e0ae1fa796b12d1b581ae. OBL-102 through OBL-104 preserve their original
conditions and discharge criteria, with append-only BIND-23 through BIND-25.
Each has its own frozen standalone lease and bound certificate. These records
use existing standalone coordinator authority and actual executed local proof;
they do not represent PostgreSQL worker leases or live campaign submissions.

OBL-102: effective feature gates yield exact reverse edges, descendants,
depth and pending counts. Completed graphs preserve depth and zero pending
counts. Cycles, unknown dependencies, invalid validation ownership, missing
direct edges, unfinished completed nodes and unordered sharing reject.
Full tasklet/feature value snapshots and statuses remain unchanged across
successful graph derivation and rejected status identity validation.
OBL-103: physical V1 scalar and V2 one-element selection preserve risk and
prior affinity. Equal-risk/affinity ranking separately orders descendant count,
depth and stable ID, with exact selected criteria. Invalid last-completed
identity rejects without changing inputs; completed graphs return exact null.
OBL-104: V3/V4 retain ordered descendant batching and the fixed limit. Shared
paths in a valid ordered chain are deduplicated into their exact union. Literal
bracket paths are retained. Validation tasklets and incompatible independent
roots remain outside the batch. Graph values and statuses remain unchanged.

All historical regression cases remain in tests/ready-tasklets.test.ts with
canonical statically checked fixtures and immutable successors. Strict root
compilation and unchanged TSTS cover production readers and all owned fixtures.
Project command paths, traceability classification and generated runtime are
synchronized. No checker extension, cast or type bypass was introduced.

Command: node --test dist/tests/tasklet-graph.test.js dist/tests/tasklet-selection.test.js dist/tests/ready-tasklets.test.js tests/campaign-census.test.js tests/obligation-execution.test.js

50 passes; no failures, skips or cancellations. The 37-test physical metadata
selection also passed in renewal. The adopted obligation-execution suite is
still handwritten and is not an owned fixture of these three graph atoms;
OBL-105 and OBL-106 remain pending for its conversion. Original V1
checkpoint preparation retains inspection semantics; committed proof edits
were separately authorized by frozen append-only bindings.

```text
✔ retains strict physical V1 parsing and scalar selection (43.171292ms)
✔ V4 preserves V3 local selection and rejects malformed external edges (6.095958ms)
✔ requires strict V2 identity, keys, feature membership, risk reasons and paths (7.830542ms)
✔ requires validation ownership, direct dependency coverage and implementation paths (3.265708ms)
✔ rejects tasklet and feature dependency errors, cycles and status identity mismatches (4.715375ms)
✔ selects the highest-ranked V2 tasklet (8.722334ms)
✔ rejects unordered overlap within and across features but permits ordered overlap (3.265458ms)
✔ blocks tasklets until dependency-feature validation is complete (3.265ms)
✔ uses prior affinity and graph criteria deterministically (1.227834ms)
✔ returns exact completion JSON and leaves all input bytes unchanged (39.98025ms)
✔ V3 returns one complete ordered batch (1.428667ms)
✔ V3 bounds a batch while V2 selects one tasklet (2.551625ms)
✔ preserves bracket route paths as exact leases and rejects invalid paths (7.000958ms)
✔ derivation retains direct reverse edges, transitive descendants, depth and pending counts across feature gates (1.785167ms)
✔ typed selection preserves versioned physical results and completion without mutating inputs (1.896459ms)
✔ equal risk and affinity rank by unfinished descendants, depth, then stable ID (8.359083ms)
✔ ordered batch deduplicates its exact path union and preserves every input (0.261708ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (19.925167ms)
✔ campaign graph exposes detailed planning review without an execution lease (15.786459ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (228.867125ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (129.487875ms)
✔ campaign report and graph accept an initial planning-only sprint (122.529708ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (88.749875ms)
✔ lists plan sources without parsing and exposes canonical source parsing (12.884125ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (13.566833ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.0615ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (85.925583ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (449.472958ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (158.264375ms)
✔ omitted report input requires exactly one campaign containing active plans (98.839292ms)
✔ bare plan names fail explicitly when missing or ambiguous (27.706958ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (59.989708ms)
✔ selected campaign validates direct dependency membership and cycles (29.701875ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (29.032041ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (84.307167ms)
✔ V1 report reader rejects unknown output fields (72.095292ms)
✔ production module uses exact exit and stream contracts without mutation (696.05825ms)
✔ ponytail dispatches campaign reporting through the production module (1847.104333ms)
✔ adopted plan binds explicit scope and selects only subordinate tasklets within its paths (96.573417ms)
✔ ledger V9 retains exact empty legacy acceptance rather than inferring satisfaction (89.203166ms)
✔ existing serialization cannot reap a live coordinator merely because its lock aged (1547.758792ms)
✔ two independent coordinator processes cannot publish the same predecessor twice (251.92025ms)
✔ frozen dispatch binding checks actual worker changes and delivery cannot satisfy obligations (254.900917ms)
✔ current campaign status projects canonical metrics and retains an explicit legacy null scope (112.915792ms)
✔ campaign codec preserves historical numeric spelling and rejects imprecise values (0.306916ms)
✔ configured discovery indexes canonical IDs and refreshes when relevant source inputs change (272.395167ms)
✔ generated skill rendering preserves vocabulary and never copies canonical relationship annotations (2.971667ms)
✔ canonical tasklet CLI honors adopted metadata and DONE edits leave acceptance unresolved (203.694584ms)
✔ retained worker renews a bounded no-edit lease while preserving IDs and frozen lease history (201.898167ms)
✔ no-edit assessment remains selectable while subordinate edit tasks are pending (92.248542ms)
ℹ tests 50
ℹ suites 0
ℹ pass 50
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4343.151708

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 952 files: no violations found.
```
