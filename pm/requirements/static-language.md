<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail implementation language

Approval: stakeholder instructions on 2026-10-10 to convert JavaScript to fully
statically typed TypeScript, apply TSTS locally, and replan as necessary; followed
by clarification that existing TSTS suffices and need not be extended.

## REQ-PONYTAIL-STATIC-LANGUAGE: Check every owned executable implementation

**Atomic obligations:** [OBL-70](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-70),
[OBL-71](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-71)
and [OBL-72](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-72)
define the known compiler/checker/runtime foundation conditions in the canonical
campaign obligation document.

In addition, each owned executable operation requires an identified atomic
obligation establishing its checked static implementation with preserved approved
behavior and focused proof. The complete operation inventory must include
implementation, independently consumed QA/tooling and embedded executable source,
with generated copies attached to their canonical owners. Existing S07 migration
evidence supplies inspection inputs, not an alternative condition registry.
Registration of these operation obligations is incomplete and explicitly remains
an unresolved completeness responsibility; the three foundation obligations do
not stand for the whole-codebase migration or authorize unbounded assignment.

Owned handwritten JavaScript is prohibited. TypeScript implementation, scripts,
tests and adapters use full static typing and strict compilation. Apply existing
TSTS to Ponytail's local TypeScript codebase, including its executable tooling.
Other implementation languages must be strongly statically typed. Validate
external unknown data before it enters owned logic; do not conceal defects with
`any`, unchecked assertions, suppressions or untyped dependency declarations.

JavaScript emitted by a checked TypeScript compiler is a generated runtime
artifact with a canonical typed source owner. Preserve supported runtime,
installation, packaging and serialized-contract behavior during conversion.
This requirement authorizes migration and local checker configuration, not
extensions to TSTS or changes to other projects.

Known operation migration obligation:
[OBL-73](../plans/in_progress/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-73)
references the canonical condition and discharge criterion for inventory
presentation. It is one bounded operation, not the remaining migration scope.
