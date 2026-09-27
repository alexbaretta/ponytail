<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Requirements Traceability

[Back to architecture index](index.md)

The portable traceability skill owns the relationship contract and adoption
workflow. A project-owned versioned manifest selects approved requirements,
classifies artifact files, records justified no-unit-test dispositions, maps
generated outputs to canonical sources, and selects its generated reverse
view.

Relationship annotations beside stable owned units are the single mapping
source. The project-neutral structural checker reads those annotations,
validates requirement and artifact coverage, validates Markdown and
declarative or non-TypeScript locators, checks generated-source mappings, and
renders the requirement-oriented reverse view.

TSTS remains a TypeScript semantic analyzer. It receives the same manifest and
checks only that TypeScript annotations attach to supported named declarations
in the configured TypeScript program. It does not parse requirements
documents, own integration-Arc structure, render reverse views, or become a
general repository-document checker.

The companion checker invokes the configured TSTS entrypoint without a shell
when semantic TypeScript locators are present. This preserves one canonical
project command while keeping the analyzer boundary narrow.

Generated host skill copies retain their canonical source mapping and are
excluded from relationship discovery. Reverse views and generated host copies
are derived artifacts; their canonical annotations remain in handwritten
sources.

Governing requirement:
[`REQ-REQUIREMENTS-TRACEABILITY`](../requirements/requirements-traceability.md#portable-bidirectional-traceability).
