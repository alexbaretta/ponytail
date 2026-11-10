---
name: requirements-traceability
description: >-
  Create and check the typed compliance graph connecting requirements,
  constraints, architecture, acceptances, tests and implementation.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Requirements traceability

Compute completeness from canonical records; never infer it from activity or an
agent's report. Each relationship is declared beside its source. Generate reverse
views from those declarations; do not maintain a second map.

## Project contract

Use only the invoking project's configured specification roots, source scopes,
generated-source mappings, exclusions, check commands and semantic locator. An
undeclared value is not configured. Do not borrow another project's configuration
or narrow discovery to make coverage pass.

This expanded ontology applies only when the project explicitly adopts it.
Earlier traceability configurations retain their documented meanings; read
[legacy-graph.md](references/legacy-graph.md) when checking them. Migration must
inventory and convert the whole active graph without treating legacy direct links
as expanded coverage.

## Canonical records

| Kind | Record | Complete when |
| --- | --- | --- |
| Requirement | Approved behavior with provenance and delivery state | Its atomic obligations and served structure are adequate |
| Obligation | Smallest independently verifiable, coherently integrable functional condition | Adequate acceptances and realizing component elements exist |
| Constraint | Approved project-wide property with provenance and delivery state | Its applicable component invariants are adequate |
| Invariant | Atomic, testable specialization of a constraint in a component | Applicability is declared, tests pass and implementations uphold it |
| Structure | High-level architecture element | It names served requirements and adequate refining components |
| Component | Detailed design with identified elements | Its elements name realized obligations, governing invariants and implementations |
| Acceptance | Atomic observable demonstration of obligations | Adequate executable tests pass |
| Test | Executable verification of acceptances or invariants | It is enabled, adequate and passes on the assessed revision |
| Implementation | Stable source block | It implements its component elements, upholds applicable invariants and passes their tests |

Obligations are the functional atoms of approval and delivery. Split one only
when each part has a meaningful outcome, an independent verdict after its
prerequisites, and a coherent integration boundary. Constraints do not decompose
into obligations; invariants make them locally testable. A component owns its
identified elements and declares which invariants govern it.

Requirements and constraints are `delivered` or `in-flight <change-id>`. Other
kinds inherit scope through graph reachability and carry no delivery state.

## Canonical graph

| Source | Relationship | Target |
| --- | --- | --- |
| Obligation | `decomposes` | Requirement |
| Structure element | `satisfies` | Requirement |
| Component | `refines` | Structure element |
| Component element | `realizes` | Obligation |
| Invariant | `specializes` | Constraint |
| Component | `governed-by` | Invariant |
| Acceptance | `verifies` | Obligation |
| Unit or integration test | `verifies` | Acceptance or Invariant |
| Implementation | `implements` | Component element |
| Implementation | `upholds` | Invariant |

Every source and target has one stable project-unique ID and one declaration of
the expected kind. Plan, issue and task references are provenance, not coverage.
Direct code/test links to requirements or constraints do not replace canonical
edges. Generated output and shared test helpers receive no declaration or credit;
map generated output to its canonical authored source.

## Declarations

Declare specification entities with an ATX heading containing the kind and ID.
Put each outgoing relationship after its source declaration and before the next
declaration:

```markdown
## obligation OBL-ORDER-SAVE: Persist an accepted order
Traceability: decomposes REQ-ORDER from obligation OBL-ORDER-SAVE

## component element ELM-ORDER-WRITE: Store the order atomically
Traceability: realizes OBL-ORDER-SAVE from component-element ELM-ORDER-WRITE
```

Attach source relationships immediately above the stable block or executable
test registration that owns them:

```typescript
// Traceability: implements ELM-ORDER-WRITE from implementation saveOrder
// Traceability: upholds INV-MONEY-EXACT from implementation saveOrder
function saveOrder(order: Order): void { /* ... */ }

// Traceability: verifies ACC-ORDER-SAVED from unit-test TEST-ORDER-SAVED
test('retrieves an accepted order', () => { /* assertions */ });
```

Annotations identify relationships only. Planned, disabled, skipped,
assertion-free or unexecuted tests receive no passing credit. Remove a
relationship when its source no longer establishes the target; never delete a
canonical condition merely to improve a count.

## Evidence and completeness

Keep three forms of evidence distinct:

- **Structural:** the configured checker discovers every declaration and reports
  duplicate IDs, wrong kinds, dangling or missing ownership links, malformed
  states or annotations, unreachable specification records and broken links.
- **Executional:** an immutable annotated Git tag targets the exact tested
  revision and records scope, commands, environment, time, passes, failures and
  skips. Another revision, a moved tag or prose is not execution evidence.
- **Semantic:** an independent reviewer assesses the actual declarations, tests,
  implementation and diff. Unknown adequacy remains unresolved.

Report unresolved structural findings as gate `F`. While `F > 0`, all completeness
coordinates are provisional. For each identified scope report:

```text
F | (Cn, R, S, O, Cm, In, A, T, Im)
```

Each coordinate counts incomplete records of the corresponding kind in the table
above: constraints, requirements, structure elements, obligations, component
elements, invariants, acceptances, tests and implementations. Prefer work that
decreases the vector lexicographically. Report discovery, invalidated evidence
and authorized scope growth explicitly when they increase it.

An immutable assessment tag targets the assessed integrated revision and records
the scope, complete IDs by coordinate, independent review references and exact-
revision validation tags. A correction creates a new assessment naming the one it
supersedes. A tag cannot override a missing edge, failed execution or unknown
adequacy. Do not store logs, dossiers, ledgers or passing output in source.

## Scope gates

The delivered baseline contains every record reaching a delivered requirement or
constraint. Each change's in-flight scope contains every record reaching its
in-flight requirements or constraints; a shared record belongs to every scope it
reaches.

- Every revision must have `F = 0`.
- Every integration into a shared line must leave the baseline vector zero.
- Every release must have a zero baseline vector and make all in-flight behavior
  unreachable.
- Delivery changes a zero-vector in-flight scope to `delivered` and records an
  assessment on that revision.

A revision of delivered behavior must integrate whole. If it cannot, add the new
behavior in flight and unreachable beside the delivered behavior, then switch and
retire the old behavior in one complete change.

## Create and check

1. Record approved requirements and constraints with provenance and delivery
   state; decompose requirements and specialize constraints without adding scope.
2. Record structure, components and elements before implementation; derive
   acceptances from obligations, not from code.
3. Add canonical source-owned edges with the records, tests and implementation
   they describe. Keep project configuration synchronized.
4. Run the configured reverse-view generator and structural/semantic checker.
   Resolve every finding; checker exit alone does not mean the vector is zero.
5. Run the smallest required focused proof while developing. For completion, run
   every configured final QA command without interruption on the assessed
   revision and record exact results in immutable validation tags.
6. Obtain independent semantic review, create the assessment tag, and claim
   completion only when `F` and every coordinate are zero and all final QA passed.
