<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# Prior operation evidence renewal on BASELINE-8

Source revision: 43306a1; dirty documentation/ledger inputs.
Started: 2026-10-11T06:38:42.769Z; completed: 2026-10-11T06:38:47.369Z.

OBL-73–76 are reassessed; OBL-77–106 remain unassessed. Canonical source,
compiler/checker configuration and generated runtime bytes are unchanged from
CERT-4, so its passing strict build evidence is reused. Configured build-impact
selects no targets for these PM inputs; no unnecessary rebuild ran.
Unchanged TSTS checked 880 files with no violations. Plan structure passes.
Reverse-view generation retains the same nine global gaps for rolling review,
publication and interfaces; global traceability is not claimed to pass.

Command: `node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js`

Focused execution finalized with exit 0; 37 tests pass, zero failures/skips.
Existing local PostgreSQL fixture and Git consumer proofs are included.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (79.429875ms)
✔ activation write failure restores the directory and every original Markdown byte (47.087459ms)
✔ activation destination and status guards reject before changing source bytes (42.193125ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.827708ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.212167ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (97.343375ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.235667ms)
✔ empty valid inventory presentation retains its summary and final newline (0.089458ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.87425ms)
✔ typed validation selection retains all/json ordering and plan selection (0.117833ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.124041ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.426ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (612.778042ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (141.859541ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (190.348583ms)
✔ human report aligns census columns after long identifiers (0.677917ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (23.597083ms)
✔ campaign graph exposes detailed planning review without an execution lease (17.349417ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (231.943833ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (140.684625ms)
✔ campaign report and graph accept an initial planning-only sprint (121.55175ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (93.288167ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.739958ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.574666ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.527709ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (83.204375ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (445.757792ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (159.45075ms)
✔ omitted report input requires exactly one campaign containing active plans (100.753417ms)
✔ bare plan names fail explicitly when missing or ambiguous (29.084334ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (58.704666ms)
✔ selected campaign validates direct dependency membership and cycles (28.652ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (29.187875ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (87.709417ms)
✔ V1 report reader rejects unknown output fields (73.980583ms)
✔ production module uses exact exit and stream contracts without mutation (646.291208ms)
✔ ponytail dispatches campaign reporting through the production module (2087.942125ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4568.446375
```
