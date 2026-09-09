<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# TypeScript Static Conformance

A TypeScript compiler-API checker such as TSTS can enforce a substantial
subset of this skill when a project supplies `versioned-data-contracts.json`
and explicit implementation registries.

## Recommended Contract Registration

Require each version family to declare:

```text
family name
current physical version
all known physical versions
exact reader versions
exact downgrade versions
reader registry export
optional downgrade registry export
```

The adapter registration is optional. A version family with no adapters is a
valid implementation when the host project uses synchronized current releases.
TSTS validates adapter rules only for adapters that the project declares.

A semantic checker resolves the declared module and exports with the
TypeScript compiler API rather than relying on textual naming.

## Statically Enforceable Rules

TSTS can report when:

- a physical version type or discriminator is missing;
- the version registry omits or duplicates a declared physical version;
- a supported version has no normalizer;
- a normalizer's input is not its exact physical version;
- a normalizer's output is not the exact current canonical type;
- the full reader does not return the exact current canonical type;
- the writer accepts something other than the current canonical type;
- the writer's declared output is not the latest physical type;
- the current canonical payload and latest physical payload are not
  bidirectionally assignable after excluding declared boundary metadata;
- ordinary modules import historical physical types outside approved boundary,
  migration, adapter, or fixture locations;
- a downgrade adapter does not accept its declared current version;
- a downgrade adapter emits an undeclared legacy version;
- a downgrade API cannot represent explicit failure; or
- a full-text projection omits or adds a projector version relative to its
  declared exact set;
- a full-text projection references no named policy or declared registry; or
- a valid fixture relies on `any`, `unknown`, assertions, `Partial`, `Pick`,
  inferred object shapes, or duplicate test-only interfaces.

Prefer exact type identity checks over one-way assignability where a rule
requires identity.

Do not report a missing-adapter violation merely because a version family has
historical readers. Reader compatibility and downgrade compatibility are
independent capabilities.

## Rules Requiring More Than Static Types

TSTS alone cannot prove:

- that a runtime schema accepts or rejects the intended serialized values;
- that a serializer actually emits its declared return type;
- that a normalizer preserves contract-critical meaning;
- that all historical stored bytes match the source contracts;
- that an adapter's downgrade is lossless for a particular value;
- that deployed consumers have installed a compatible adapter;
- that migrations are resumable, idempotent, or complete;
- that signed bytes are verified before normalization; or
- that an indexing projection includes and excludes the correct semantic
  values;
- that projection maintenance is atomic or eventually reconciled; or
- that a rebuild is semantically equivalent to incremental maintenance.

Cover these properties with runtime schema tests, exact historical fixtures,
real-storage or protocol tests, migration tests, compatibility matrices, and
release evidence.

## Cross-Revision Immutability

The TypeScript compiler sees only the current checkout. It cannot prove by
itself that a historical physical type was not edited after release.

Enforce historical immutability with at least one revision-aware mechanism:

- checked-in canonical schema snapshots;
- generated fingerprints for every released physical version;
- comparison with a release tag or approved baseline; or
- a registry whose historical entries are checked against immutable generated
  artifacts.

TSTS may validate the current registry and equality witnesses, while a
revision-aware CI check detects historical edits.

## Recommended Rule Boundary

Implement TSTS as a project-agnostic, configuration-driven rule family. Do not
hard-code repository paths, package names, domain types, or naming conventions.

Use configuration to identify version-family registrations and permitted
boundary locations. Report the full set of violations with source locations
and rule identifiers.
