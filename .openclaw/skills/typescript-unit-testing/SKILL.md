---
name: typescript-unit-testing
description: "Contract-safe TypeScript unit testing"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# TypeScript Unit Testing

Keep unit-test data subject to the same static contracts as production data.
Distinguish data values, which use production types, from behavioral
dependencies, which may require test doubles.

## Project-Configured Test Metadata

Before designing or editing a test, inspect the host project's local
configuration for any declared:

- unit-test indexes and their discovery procedure;
- index or audit-metadata regeneration commands;
- index validation commands; and
- project-specific audit metadata required on tests or mock boundaries.

When configured, consult the declared indexes, inspect their referenced owners
and reusable doubles, update the required metadata, and run the configured
regeneration and validation commands. Also perform a narrow source search
because an index may be stale or incomplete.

When these features are not declared by project configuration, do not assume a
counterpart skill, conventional path, generated index, metadata schema, or
bootstrap workflow exists. Search the source and tests directly, then extend an
existing owning suite or shared double when one represents the required
contract. Do not invent project-local indexing or auditing infrastructure as
part of an ordinary unit-test change.

## Declare Valid Values With Production Types

When a test value represents a valid instance of a named production type,
declare the variable with that type:

```typescript
const fixture: PayloadV1 = {
  // Complete valid PayloadV1 value.
};
```

Do not use any of these in place of an explicit production-type annotation:

- an object literal whose variable type is inferred;
- `satisfies ProductionType`, because the variable retains its inferred type;
- `as ProductionType` or `as unknown as ProductionType`;
- `any`; or
- `Partial<ProductionType>` treated as a complete instance.

The compiler must reject fixtures that no longer satisfy the production
contract.

## Keep Factories Typed End To End

Factories may reduce repetition, but their return type and each receiving
variable must remain the production type:

```typescript
function createPayloadV1(): PayloadV1 {
  return {
    // Complete valid PayloadV1 value.
  };
}

const fixture: PayloadV1 = createPayloadV1();
```

Do not duplicate the production contract in a testing-only structural type.
Do not let factory overrides or `Partial` values escape as complete production
values.

## Represent Invalid Inputs Honestly

Declare deliberately malformed, unsupported, or untyped legacy input as
`unknown` and pass it only through the real validation or parsing boundary:

```typescript
const malformedFixture: unknown = {
  // Deliberately invalid representation.
};

const result: ParseResult = parsePayload(malformedFixture);
```

Do not cast invalid data to the type whose rejection the test proves. Do not
mock the parser, validator, version dispatcher, or normalizer under test.

## Separate Values From Behavioral Doubles

Mocks, stubs, spies, and fakes replace behavior at a boundary; they do not
replace typed data values.

Instantiate every owned internal dependency that can safely and
deterministically run in the unit-test process. Mock only a boundary that is
unavailable, nondeterministic, destructive, or inappropriate for a unit test,
such as a database connection, cloud or third-party service, device, clock,
operating-system integration, or process boundary.

Declare every double with the exact exported production type it replaces:

```typescript
const gatewayClient: GatewayClient = {
  // Complete boundary implementation.
};
```

Do not use an inferred object, `satisfies`, duplicate test-only interface,
`Partial`, `any`, or a type assertion to make a double appear compatible. The
compiler must reject the double when the boundary contract changes.

Instantiate the real production class when class identity, constructor
validation, prototype behavior, or methods are part of the contract under
test. Interfaces and object types instead require complete object values with
explicit production-type annotations.

When replacing an unavailable API:

- implement the double against the exported production interface;
- declare requests and valid responses with production types;
- assert the outbound request and relevant ordering or cardinality;
- route responses through real production parsing and validation;
- represent malformed wire responses as `unknown`; and
- do not reproduce production transformation logic inside the double.

## Centralize Reusable Doubles

Keep one authoritative test-only implementation for a shared external
boundary. Let tests configure scenario-specific responses, errors, and call
expectations without duplicating the boundary's interface, request handling,
response shape, or default behavior.

Prefer a small deterministic fake for stable boundary behavior and a mock or
spy when the interaction itself is the contract. A double must not become a
second implementation of the behavior under test.

Production source, builds, and shipped bundles must never import a double,
read its configuration, or select it through a test-mode branch.

## Completion Check

- Every valid fixture and factory receiver has an explicit production type.
- Every invalid input is `unknown` at the validation boundary.
- Every mocked dependency genuinely requires a double.
- Every double implements the exact exported production boundary type.
- Reusable boundary doubles have one test-only owner.
- Configured indexes, audit metadata, regeneration, and validation commands
  are satisfied; unconfigured mechanisms were not invented.
- Success and failure or edge-path tests pass under the host project's
  configured unit-test command.
