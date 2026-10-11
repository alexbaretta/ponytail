<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# OBL-75 typed activation evidence

Revision bb8bccf, dirty source tree. Supplied Ponytail checkout.
Profile: focused-static-migration. Observation began 2026-10-11 06:10:18 UTC;
finalized 2026-10-11 06:10:34 UTC.

Configured strict root build completed successfully before this run.
Build-impact selected Ponytail, with no indeterminate targets. Runtime
materialization check passed. Plan validation passed (five sprints, 236 tasklets);
these structural counts do not measure completed work.

## Focused execution

Command: `node --test dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js`

Exit 0, finalized pass: 32 passing checks, zero failures and skips.

```text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (75.288959ms)
✔ activation write failure restores the directory and every original Markdown byte (44.911917ms)
✔ activation destination and status guards reject before changing source bytes (45.004958ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.815208ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.214125ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (90.380375ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.220542ms)
✔ empty valid inventory presentation retains its summary and final newline (0.085916ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (516.776167ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (137.130042ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (166.772458ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (25.142458ms)
✔ campaign graph exposes detailed planning review without an execution lease (17.929709ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (226.760291ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (134.331708ms)
✔ campaign report and graph accept an initial planning-only sprint (116.065625ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (85.51675ms)
✔ lists plan sources without parsing and exposes canonical source parsing (12.72025ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (13.187875ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (13.832042ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (81.163834ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (417.880958ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (144.59425ms)
✔ omitted report input requires exactly one campaign containing active plans (93.474084ms)
✔ bare plan names fail explicitly when missing or ambiguous (26.813083ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (54.6625ms)
✔ selected campaign validates direct dependency membership and cycles (28.549875ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (26.66175ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (79.866458ms)
✔ V1 report reader rejects unknown output fields (67.967792ms)
✔ production module uses exact exit and stream contracts without mutation (595.972791ms)
✔ ponytail dispatches campaign reporting through the production module (1842.074458ms)
ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4166.452875
```

The typed real Git/filesystem fixture establishes directory/status transition,
relative links with query/hash suffixes, anchor/URL/absolute exclusions,
symlink exclusion and already-active behavior. Destination and invalid-status
guards preserve original source bytes. A filesystem write replacement has the
exact production write function type, fails once and delegates other writes to
the real function. It establishes byte-for-byte restoration and directory
rollback before propagating the original failure. No production test switch.

Existing census proof establishes activation through a child and real CLI
consumption. Inventory/formatter/listing and isolated Git/PostgreSQL checks also
pass on the final checkout, renewing OBL-73/74 evidence.

The initial new fixture omitted its required prose Plan ID. Three checks failed
at that reader before activation. Correcting the fixture restored the contract;
production readers and validators were preserved.

## Static and source ownership proof

Command: `npm run check:tsts`. Exit 0; unchanged checker, no bypass.

```text
> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 873 files: no violations found.
```

The canonical TypeScript owner emits the established adjacent runtime via
scripts/build-runtime.ts; census imports that declaration and no longer owns
handwritten activation. Review confirms the move preserves the existing
filesystem/link algorithm and rollback sequence, with explicit static contracts
and checked graph root narrowing.

Canonical implementation/test classifications and the generated-source mapping
are registered in project traceability configuration. Reverse-view generation
includes both new canonical annotations and is synchronized. It still reports the same nine
unfinished coverage gaps for review, publication and interfaces. This certifies
activation and renewed formatter/listing proof only. Whole-language migration,
full unit acceptance and campaign completion remain unresolved.
