---
name: requirements-traceability
description: >-
  Use when defining, adding, changing, reviewing, or checking links among
  approved requirements, implementation, unit tests, integration tests, UAT,
  or generated artifacts. Maintain one annotated forward mapping and generate
  requirement-oriented reverse views.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Requirements Traceability

Maintain durable bidirectional discovery without maintaining two relationship
maps. The annotation beside the smallest stable owned implementation or
verification unit is the canonical relationship. Generate requirement-oriented
reverse views from those annotations.

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `Traceability configuration`;
- `Traceability check command`;
- `Traceability reverse-view generation command`; and
- `Traceability TypeScript semantic checker`.

Every value defaults to `not configured`. Do not invent paths, commands,
requirement IDs, artifact classifications, or unit-test dispositions when the
host has not adopted them.

The versioned project configuration selects approved in-scope requirements,
their canonical requirement sources, classified artifact files, generated
outputs and their canonical sources, any justified no-unit-test dispositions,
the generated reverse-view path, and the TSTS project and entrypoint used for
semantic TypeScript locators.

A requirement source declares an ID only with one of these canonical Markdown
forms: `**Identifier:** \`REQ-STABLE-ID\``, a list item whose bold label is the
ID (for example, `- **REQ-STABLE-ID:** Description`), or an ATX heading that
begins with the ID and a declaration delimiter (for example,
`## REQ-STABLE-ID: Description`). An incidental mention is not a declaration.

## Canonical Relationships

Use only these roles:

- `implements`: the unit directly realizes required behavior;
- `supports`: the unit is necessary supporting implementation but does not
  independently realize the behavior; and
- `verifies`: the unit proves required behavior.

Write one annotation immediately beside the smallest stable owned unit that
communicates the relationship:

```text
Traceability: implements REQ-STABLE-ID
Traceability: supports REQ-STABLE-ID
Traceability: verifies REQ-STABLE-ID
```

Use the language's ordinary comment syntax in code, ordinary prose metadata in
Markdown, and a native metadata field in declarative formats. Do not annotate
every line, repeat the mapping in a requirement document, or add aliases for a
requirement identifier.

Generated output has no relationship annotations. Configure its canonical
generator or source and retain the relationships there.

Artifact paths remain explicitly enumerated. A path normally has one artifact
class. It may have multiple classes only when every registration declares a
non-empty `roles` filter, the filters are disjoint, and each role is valid for
its class: `implements` and `supports` for implementation; `verifies` for
unit-test, integration-test, and UAT. This lets one canonical file carry its
own implementation/support roles and a distinct verification role without a
second metadata source.

## Required Coverage

For every configured approved requirement:

- at least one implementation unit `implements` or `supports` it;
- at least one unit-test unit `verifies` it when unit testing is possible;
- otherwise, one non-empty project-owned reason explains why no unit test is
  possible;
- at least one executable integration-test unit `verifies` it; and
- at least one plain-English UAT Arc `verifies` it.

A no-unit-test disposition waives only the unit-test relationship class.
Integration and UAT remain required. Do not use a disposition merely because a
test is inconvenient, expensive, or not yet written.

## Enforcement Boundaries

The project-neutral structural checker owns strict configuration parsing,
requirement-source resolution, relationship discovery, approved-role and
artifact-class completeness, non-TypeScript and declarative locators,
generated-source resolution, deterministic diagnostics, and reverse-view
parity.

TSTS owns only semantic TypeScript locators. It verifies that a TypeScript
annotation is a leading comment on a supported named declaration in the
configured TypeScript program. It does not own Markdown, requirements, UAT,
integration-Arc structure, generated views, or general repository traversal.

Run the configured reverse-view generation command after relationship changes,
then run the configured check. A stale checked-in reverse view is a failed
reverse connection, not documentation drift to ignore.

## Workflow

1. Confirm that each requirement is approved, stable, and present in the
   configured canonical requirement source.
2. Annotate each affected stable owned implementation and verification unit.
3. Classify new artifact files in the project traceability configuration.
4. Record a no-unit-test disposition only when unit testing is genuinely
   impossible.
5. Map generated outputs to their canonical sources without copying
   annotations.
6. Generate the reverse view.
7. Run the structural check and configured TypeScript semantic checker.
8. Reconcile changed requirements, UAT, implementation, tests, configuration,
   and generated views in the same project change-set.

## Completion Check

- Every discovered ID resolves to one configured approved requirement.
- Every configured source, artifact, generated output, and canonical source
  resolves.
- Every relationship uses an approved role and the role is valid for its
  artifact class.
- Requirement sources use an explicit Identifier field, canonical bold-list
  declaration, or canonical ATX requirement heading; incidental mentions do
  not satisfy source resolution.
- Duplicate artifact paths have explicit, disjoint, class-valid role filters.
- Every approved requirement has the required implementation, unit or
  disposition, integration, and UAT classes.
- TypeScript annotations attach to supported named declarations.
- The generated reverse view exactly matches canonical annotations.
- Generated outputs contain no duplicated relationship annotations.
