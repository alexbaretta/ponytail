<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# OBL-74 typed campaign listing evidence

Revision cb01526, dirty source tree. Checkout: supplied Ponytail repository.
Profile: focused-static-migration.
Focused observation began 2026-10-11 06:02:36 UTC;
finalized 2026-10-11 06:02:43 UTC.

The configured strict root build completed with exit 0 before focused execution.
Build-impact selected only Ponytail with no indeterminate targets.
Runtime materialization check passed. Plan validation passed with five sprints
and 226 tasklets; these are structural observations, not work counts.

## Focused execution

Command: `node --test dist/tests/campaign-inventory.test.js tests/campaign-census.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js`

Exit 0; finalized pass; 29 passed, zero failures and skips.

```text
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.807334ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.203958ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (84.236875ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.20625ms)
✔ empty valid inventory presentation retains its summary and final newline (0.081583ms)
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (557.941041ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (131.00475ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (161.915834ms)
✔ campaign graph exposes a validated review scope without runnable implementation tasklets (21.061333ms)
✔ campaign graph exposes detailed planning review without an execution lease (17.323208ms)
✔ cross-plan tasklet prerequisites block review and execution until integrated DONE and reject invalid edges (216.456541ms)
✔ external prerequisite resolves a frozen non-executable tasklet without dispatching or counting it (129.814916ms)
✔ campaign report and graph accept an initial planning-only sprint (116.958167ms)
✔ intent-only STUB with empty tasklet metadata is valid, but detailed sprints require tasklet headings (87.890209ms)
✔ lists plan sources without parsing and exposes canonical source parsing (13.352375ms)
✔ V2 campaign metadata adds exact direct dependencies while V1 remains readable (13.218542ms)
✔ linked dispatch prerequisites must appear in V2 campaign dependencies (14.080625ms)
✔ repository inventory accepts unmarked legacy plans and rejects referenced unmarked members (86.230458ms)
✔ lists normalized campaign statuses and activates a pending campaign through a child (419.015667ms)
✔ root and leaf report the same campaign while unrelated malformed plans stay out of scope (143.771042ms)
✔ omitted report input requires exactly one campaign containing active plans (95.139667ms)
✔ bare plan names fail explicitly when missing or ambiguous (27.342042ms)
✔ selected campaign fails on missing, ambiguous, and cyclic parentage (55.109083ms)
✔ selected campaign validates direct dependency membership and cycles (26.219292ms)
✔ selected and linked campaign records require managed metadata and reciprocal campaign links (26.327833ms)
✔ census enforces closure and represents the zero-tasklet percentage exactly (79.437542ms)
✔ V1 report reader rejects unknown output fields (66.017958ms)
✔ production module uses exact exit and stream contracts without mutation (604.54675ms)
✔ ponytail dispatches campaign reporting through the production module (1985.8305ms)
ℹ tests 29
ℹ suites 0
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4306.210458
```

Existing census assertions establish active, pending, closed, deferred and
rejected filters and CLI output. The typed inventory fixture additionally
establishes rejection of invalid inventory with CAMPAIGN_INVENTORY_INVALID.
Formatter proof remains passing on the final shared owner (OBL-73).
Strict types use CampaignStatus and CampaignListEntry, checked root lookup and
indexed lifecycle mapping; no cast, untyped declaration or checker suppression.
Census consumes the same generated declaration and has no handwritten listing.

## Static and traceability checks

The unchanged configured TSTS passed over 866 files before this evidence file
was created. After staging it, the final tracked-artifact check passed:
TSTS checked 867 files with no violations. Traceability generation synchronized the listing annotation while
reporting the same nine unfinished review/publication/interface coverage gaps.

This establishes only listing and renewed formatter proof on identified inputs.
Activation, replacement dispatcher, complete language migration, full repository
unit acceptance and campaign closure remain pending.
