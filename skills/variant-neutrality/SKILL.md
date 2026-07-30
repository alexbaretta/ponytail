---
name: variant-neutrality
description: >-
  Use when editing, reviewing, or testing shared typed contracts or operational
  code that serves multiple configured providers, API implementations,
  protocol variants, backends, clients, or other implementations of one
  capability. Keep shared roots variant-neutral, place variant-specific data
  under explicit discriminated variants, and require exhaustive shared
  dispatch using the host project's configured families, terminology,
  discriminants, ownership paths, documentation, and validation commands.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Variant Neutrality

A variant family contains mutually exclusive or independently selectable
implementations of one shared capability. The host project defines its
families and names; this skill defines how shared code remains neutral across
them.

## Project Configuration Contract

The host configures this skill in `AGENTS.md` with `Variant-neutrality
configuration`, naming one owner document or `not configured`. That owner must
identify:

- variant-family terminology and the current variants in each family;
- exact discriminant fields and values or canonical registries that own them;
- shared contract roots and variant-specific contract rules;
- neutral and variant-specific source ownership paths;
- allowed shared-layer coupling or explicit exceptional rules;
- serialization or contract documentation that must remain synchronized; and
- focused audit, generation, test, and build commands.

The default is `not configured`; in that state the skill defines no project
families and must not invent them. Do not assume a companion project-local
skill, conventional paths, particular
provider names, or a specific validation tool. If required project-specific
facts are absent, apply the host's configuration-discrepancy policy instead of
inventing them.

## Contract Neutrality

Shared root contracts and shared operational contracts must be neutral across
every configured variant in their family.

Place a variant-specific field, name, literal, or concept only inside a
subtree whose type is rooted by that variant's configured discriminant. The
discriminant must mechanically select a complete variant; a generic map,
optional field cluster, alias, or neutral-looking wrapper is not a substitute.

Flag these violations:

- a shared root containing fields owned by one variant;
- a generic contract that aliases or wraps a single variant shape;
- a shared registry value whose payload is silently fixed to one variant;
- a variant-specific name or literal outside its discriminated subtree; and
- a fallback field or conversion added to hide a misplaced variant contract.

## Operational Neutrality

Classify every covered source file using the host project's configured source
ownership as either neutral or owned by one variant.

Neutral code may select variant behavior only through:

- an exhaustive `switch`, `match`, or equivalent over the configured
  discriminant for one operational context; or
- mechanical iteration over the complete canonical registry for that context.

Neutral code must not directly select a singleton variant, assume that one
variant is the only implementation, or use a default or fallback branch that
conceals an unhandled variant.

Variant-owned code may depend on shared neutral contracts and its own variant.
It must not depend on a sibling variant. If neutral code needs variant-specific
behavior, keep that behavior in its owning module and invoke it through the
exhaustive neutral dispatch point.

## Workflow

1. Identify the affected configured family, contract roots, source ownership,
   discriminants, and validation commands.
2. Trace the shared contract or operational path until every variant-specific
   value has an explicit owner.
3. Keep shared roots neutral and move variant-specific structure under the
   correct discriminated variant or owning module.
4. Make shared dispatch exhaustive over the configured family without a
   fallback branch.
5. Update the configured serialization or contract documentation when the
   structural tree changes.
6. Run focused success and failure or edge-path tests, the configured
   neutrality audit, and the affected build commands.

When a violation is found, fix the owning contract or module. Do not mask it
with aliases, duplicate fields, compensating conversions, secondary lookups,
or fake-generic names.

## Completion Check

- Shared roots contain no sibling-specific fields, types, or literals.
- Every variant-specific subtree has the configured literal discriminant.
- Neutral dispatch covers every current configured variant exactly once.
- Variant-owned modules do not depend on siblings.
- Configured structural documentation matches the implementation.
- Configured neutrality audits and affected tests and builds pass.
