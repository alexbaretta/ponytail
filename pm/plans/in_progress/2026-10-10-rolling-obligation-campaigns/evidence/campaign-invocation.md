<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# OBL-76 typed campaign invocation evidence

Revision 514ae53, dirty source tree, supplied Ponytail checkout.
Profile: focused-static-migration. Began 2026-10-11 06:16:21 UTC;
finalized 2026-10-11 06:16:42 UTC.

Strict root build completed with exit 0 before this focused execution.
Build-impact selected Ponytail without indeterminate targets. Runtime check
passed. Plan validation passed with five sprints and 247 tasklets; structural
counts are not units of work.

## Focused execution

Command: `node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js`

Exit 0, finalized pass; 37 passing checks, zero failures/skips.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (73.246584ms)
✔ activation write failure restores the directory and every original Markdown byte (48.219708ms)
✔ activation destination and status guards reject before changing source bytes (41.684459ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.90775ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.212083ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (87.309583ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.220334ms)
✔ empty valid inventory presentation retains its summary and final newline (0.087458ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.85525ms)
✔ typed validation selection retains all/json ordering and plan selection (0.114583ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.129083ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.428209ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (557.365125ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (136.2025ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (172.601166ms)
✔ human report aligns census columns after long identifiers (0.65325ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (23.658333ms)
✔ campaign graph exposes detailed planning review without an execution lease (18.507541ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (228.5585ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (132.6545ms)
✔ campaign report and graph accept an initial planning-only sprint (119.659792ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (87.505458ms)
✔ lists plan sources without parsing and exposes canonical source parsing (12.874375ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (14.626791ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.275584ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (82.298792ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (425.830542ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (149.873167ms)
✔ omitted report input requires exactly one campaign containing active plans (90.538333ms)
✔ bare plan names fail explicitly when missing or ambiguous (25.672ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (55.14625ms)
✔ selected campaign validates direct dependency membership and cycles (28.278208ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (27.362917ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (78.715792ms)
✔ V1 report reader rejects unknown output fields (65.371916ms)
✔ production module uses exact exit and stream contracts without mutation (593.600208ms)
✔ ponytail dispatches campaign reporting through the production module (1906.728167ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4246.950375
```

Typed valid fixtures use exact owned invocation variants. Invalid argument
vectors stay boundary data. Proof covers all five lifecycle flags, required
activation selection, both validate-all JSON orders, invalid duplicates/mixed
selection, optional report input, final table-flag precedence, repeated report
JSON, input preservation and exact usage/conflict diagnostics. Existing real CLI
and formatting checks consume the generated parser. Prior activation, formatter,
listing and isolated PostgreSQL/Git consumers pass on final inputs.

Inspection found a concrete inherited-property problem in the old object flag
lookup: constructor/toString/__proto__ could be mistaken for table tuples.
Exact Map lookup restores their intended interpretation as ordinary plan names,
with explicit regression assertions. No extra CLI feature or legacy dispatcher
replacement is claimed.

## Static verification and source ownership

Command: `npm run check:tsts`. Exit 0, unchanged checker.

```text
> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 879 files: no violations found.
```

The four top-level invocation variants have unique operation literals;
validation selection uses unique mode literals. No assertions, any, suppression
or untyped dependency declaration. Compiler output is materialized by the existing
runtime tool. Project traceability classifies canonical source/tests and maps the
emitted runtime. Census delegates parsing to that owner; duplicate handwritten
grammar, flag constants and help body were deleted. Its legacy execution adapter
still requires migration; this evidence does not certify that adapter.

Reverse-view generation remains synchronized with nine known unfinished coverage
gaps for review, publication and interfaces. Complete language inventory, full
unit acceptance and campaign closure are pending.
