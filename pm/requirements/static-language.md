<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail implementation language

Approval: stakeholder instructions on 2026-10-10 to convert JavaScript to fully
statically typed TypeScript, apply TSTS locally, and replan as necessary; followed
by clarification that existing TSTS suffices and need not be extended.

## REQ-PONYTAIL-STATIC-LANGUAGE: Check every owned executable implementation

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
