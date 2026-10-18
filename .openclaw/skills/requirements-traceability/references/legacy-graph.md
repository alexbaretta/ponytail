<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# V1–V4 traceability compatibility

Read this only for a project whose traceability configuration explicitly selects
V1–V4, or to interpret historical records. The V5 contract is in the skill
entrypoint. Adoption changes the configuration and canonical sources together;
installation and parser failure never select a different version implicitly.

Historical configurations enumerate requirement sources and artifact paths.
Implementation artifacts use `implements` or `supports` directly on requirement
IDs. Unit tests, integration tests and UAT artifacts use `verifies` directly on
requirement IDs. The ordinary annotation is `Traceability: <role> REQ-ID`.
V3/V4 explicit entities can append `from <kind> <id>`; identities must match the
configuration's declarations. Plan/tasklet `plans-implementation` and
`plans-verification`, and activated-issue `introduces`, are prospective provenance
and never satisfy completed coverage.

Legacy coverage requires implementation, unit proof (or its configured nonempty
no-unit-test reason), integration proof and UAT for each configured requirement.
V4 directional rules add explicit source/target-kind, role, direction and minimum
cardinality checks. These rules retain their historical meaning; they do not
establish V5 acceptance-by-acceptance coverage. A legacy green result cannot
prove that every acceptance has an executable test.

Keep historical generated-source ownership, source locators and reverse-view
checks valid while the project remains on its selected version. Paths with
multiple artifact classes require disjoint class-valid role filters. Requirement
sources declare IDs using Identifier metadata, canonical bold-list labels or
ATX headings. Prospective references and incidental prose are not declarations.

V5 adoption requires an explicit inventory of approved requirements and their
atomic obligations, every acceptance, actual test registrations and code blocks.
Preserve old IDs and meanings where they remain correct; introduce missing
obligation/acceptance IDs and canonical edges without counting old requirement
links as proof. Keep incomplete coverage visible and retain unfinished work.
Do not delete or rewrite old certificate records, or create new legacy ledgers
as part of adoption. Historical six-coordinate certificate accounting does not
replace the adopted campaign completeness vector.
