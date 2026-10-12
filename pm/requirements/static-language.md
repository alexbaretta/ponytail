<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail implementation language

Approval: stakeholder instructions on 2026-10-10 to convert JavaScript to fully
statically typed TypeScript, apply TSTS locally, and replan as necessary; followed
by clarification that existing TSTS suffices and need not be extended.

## Stakeholder scope correction — 2026-10-11

The [repository-local language rule](../../AGENTS.md#local-rules) supersedes
the broader migration scope recorded below. It applies prospectively to our
Codex plan-execution implementation, tests and tooling. Completed translations
remain in place. The previous whole-codebase inventory and accepted evidence
remain historical records; they do not authorize further migration of
pre-existing Ponytail code or impose language mandates on client projects.

## REQ-PONYTAIL-STATIC-LANGUAGE: Check our Codex plan-execution implementation

**Atomic obligations:** [OBL-70](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-70),
[OBL-71](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-71)
and [OBL-72](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-72)
define the known compiler/checker/runtime foundation conditions in the canonical
campaign obligation document.

In addition, each operation introduced by our Codex plan-execution work requires an identified atomic
obligation establishing its checked static implementation with preserved approved
behavior and focused proof. The complete operation inventory must include
implementation, independently consumed QA/tooling and embedded executable source,
with generated copies attached to their canonical owners. Existing S07 migration
evidence supplies inspection inputs, not an alternative condition registry.
The inventory concerns our plan-execution implementation, its supporting
tests/tooling and retained completed translations. The three foundation
obligations do not authorize migrating other pre-existing Ponytail operations.

Handwritten JavaScript introduced by our work is prohibited. Its TypeScript implementation, scripts,
tests and adapters use full static typing and strict compilation. Apply existing
TSTS to Ponytail's local TypeScript codebase, including its executable tooling.
Other implementation languages must be strongly statically typed. Validate
external unknown data before it enters owned logic; do not conceal defects with
`any`, unchecked assertions, suppressions or untyped dependency declarations.

JavaScript emitted by a checked TypeScript compiler is a generated runtime
artifact with a canonical typed source owner. Preserve supported runtime,
installation, packaging and serialized-contract behavior during conversion.
This requirement authorizes typed implementation and local checker configuration
within that scope, not further blanket migration, extensions to TSTS or changes
to other projects. Preserve translations already completed.

Known operation migration obligation:
[OBL-73](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-73)
references the canonical condition and discharge criterion for inventory
presentation. It is one bounded operation, not the remaining migration scope.

[OBL-74](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-74)
references the canonical typed campaign listing condition and its discharge
criterion, including configured lifecycle normalization and active membership.

[OBL-75](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-75)
references the canonical typed activation condition, including link preservation,
precondition errors and rollback after a failed move/write episode.

[OBL-76](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-76)
references the canonical typed campaign argument parsing condition and its
selection, option compatibility and usage-error proof.

Known portable operation obligations:
[OBL-77](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-77),
[OBL-78](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-78),
[OBL-79](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-79),
[OBL-80](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-80),
[OBL-81](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-81),
[OBL-82](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-82),
[OBL-83](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-83),
[OBL-84](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-84),
[OBL-85](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-85),
[OBL-86](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-86),
[OBL-87](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-87),
[OBL-88](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-88),
[OBL-89](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-89),
[OBL-90](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-90),
[OBL-91](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-91),
[OBL-92](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-92),
[OBL-93](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-93),
[OBL-94](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-94),
[OBL-95](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-95),
[OBL-96](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-96),
[OBL-97](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-97),
[OBL-98](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-98),
[OBL-99](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-99),
[OBL-100](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-100),
[OBL-101](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-101),
[OBL-102](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-102),
[OBL-103](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-103),
[OBL-104](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-104),
[OBL-105](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-105),
[OBL-106](../plans/closed/2026-10-10-rolling-obligation-campaigns/delivery-decomposition.md#obl-106).
These canonical records cover inspected portable readers, projection, acceptance
and selectors. Their inspection-only bindings do not authorize implementation
until prerequisites, exact paths and operations are reconciled. The former
blanket migration frontier for indexing, host adapters and unrelated tooling is
superseded by the stakeholder scope correction; it is not outstanding campaign
work. Already registered and translated outcomes retain their identities and
required verification.
