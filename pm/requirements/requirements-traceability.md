<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Requirements Traceability

[Back to requirements index](index.md)

## Portable bidirectional traceability

**Identifier:** `REQ-REQUIREMENTS-TRACEABILITY`

**Approval:** Approved by the stakeholder's 2026-09-27 request.

**Source:** The stakeholder requested portable, maintainable bidirectional
links among stable requirements, owned implementation, unit tests,
plain-English UAT, and executable integration tests.

An adopting project must be able to discover, from each approved in-scope
requirement, the owned implementation and verification that cover it. A
developer inspecting a meaningful stable implementation unit must be able to
identify the requirements that unit implements or supports.

The only relationship roles are `implements`, `supports`, and `verifies`.
Relationships belong to the smallest stable owned unit that communicates the
connection; they are not repeated on every line. An annotation beside that
unit is the canonical relationship source. Requirement-oriented views are
generated from those annotations rather than maintained independently.

The checker must be project-agnostic and configuration-driven. It must reject:

- unknown or stale requirement identifiers;
- annotations that do not resolve to their declared owned unit;
- missing generated reverse connections;
- missing implementation, unit-test, integration-test, or UAT relationship
  classes required by the adopted configuration; and
- generated-output mappings whose canonical source no longer resolves.

Generated outputs map to their canonical generator or source. They do not
duplicate annotations from that source.

Every approved in-scope requirement has one or more unit tests when unit
testing is possible. Otherwise it has an explicit justified no-unit-test
disposition. Every approved in-scope requirement also has executable
integration-test and plain-English UAT coverage.

Acceptance coverage:
[Requirements traceability Suite](../uat/requirements-traceability.md).
