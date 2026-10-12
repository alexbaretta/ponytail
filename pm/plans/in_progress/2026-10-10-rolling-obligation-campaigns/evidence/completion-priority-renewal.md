<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# Existing migration proof after completion-priority policy change

Source revision 4c9034a, clean checkout during execution. CERT-5 became stale
because twelve policy inputs changed. All its other recorded inputs are byte
identical, including compiler configuration, canonical sources and emitted code.
Passing strict compilation evidence is reused on those unchanged inputs. No
product source changed. Build-impact reports no affected or indeterminate targets.

This renewal covers OBL-73–76 and preserves the original complete criteria and
conservative input closure. New obligations are not registered. The sandboxed
selection passed 36 tests but could not connect to local PostgreSQL (EPERM);
it is not used as passing evidence. The authorized run completed the existing
PostgreSQL fixture and all 37 selected tests with cleanup.

Command: `node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js`. Exit 0, zero failures/skips/cancellations.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (95.801708ms)
✔ activation write failure restores the directory and every original Markdown byte (53.603709ms)
✔ activation destination and status guards reject before changing source bytes (43.822834ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.913917ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.215084ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (114.228459ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.301959ms)
✔ empty valid inventory presentation retains its summary and final newline (0.091167ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.888167ms)
✔ typed validation selection retains all/json ordering and plan selection (0.112458ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.126584ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.363917ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (732.225208ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (174.153834ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (209.381542ms)
✔ human report aligns census columns after long identifiers (0.667291ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (27.487875ms)
✔ campaign graph exposes detailed planning review without an execution lease (23.144458ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (271.959875ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (138.526042ms)
✔ campaign report and graph accept an initial planning-only sprint (124.319875ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (92.828916ms)
✔ lists plan sources without parsing and exposes canonical source parsing (16.272542ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.805625ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.817959ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (90.277084ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (438.677917ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (152.245917ms)
✔ omitted report input requires exactly one campaign containing active plans (105.74675ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.838541ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (58.688292ms)
✔ selected campaign validates direct dependency membership and cycles (27.45325ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (29.281708ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (80.382708ms)
✔ V1 report reader rejects unknown output fields (64.947125ms)
✔ production module uses exact exit and stream contracts without mutation (613.711083ms)
✔ ponytail dispatches campaign reporting through the production module (1905.09175ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4397.757792
```

Unchanged configured TSTS:

```text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 883 files: no violations found.
```

Runtime materialization, eight rule copies, registry and pinned versions pass.
Global campaign traceability and final language completeness remain open.
