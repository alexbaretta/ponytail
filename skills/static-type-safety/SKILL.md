---
name: static-type-safety
description: >-
  Use when defining, editing, reviewing, or testing owned handwritten
  statically typed code, owned contracts, union or sum types, runtime schemas,
  fixtures, exhaustive dispatch, OpenAPI oneOf schemas, compiler-based
  contract checks, or Rust serde enums. Prohibits type-system bypasses,
  requires exact owned-contract fixtures, and makes public variants
  mechanically unambiguous.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Static Type Safety

## Type Integrity

Use the strongest correct named type at every owned boundary. Do not weaken a
type merely to satisfy a compiler, test, mock, or third-party interface.

Generated output, vendored source, and third-party declarations are outside
this skill's edit scope. Fix their generator, canonical input, or one owned
dependency adapter rather than editing or auditing generated and vendored
files as if they were handwritten owned code.

Do not use:

- `any` or equivalent dynamic escape hatches;
- `as any`, `as unknown as`, unchecked type assertions, or forced casts;
- non-null assertions;
- compiler, linter, or type-checker suppression comments; or
- duplicate test-only interfaces standing in for owned contracts.

If a dependency exposes an incomplete or incorrect type, introduce a checked,
narrow adapter at that dependency boundary. Validate unknown external input
before converting it to an owned type. Do not spread the dependency's weak
type through owned code.

Prefer shared named types over repeated inline structural types. Keep one
canonical contract and derive schemas, generated representations, and helpers
from it where the host architecture permits.

## Exact Test Data

Construct every valid owned-contract fixture as a value explicitly annotated
with the exact type it represents, or through a fixture function whose
declared return type is that exact type. This includes every physical version
of a versioned serialized contract.

Do not substitute `Partial`, `Pick`, `Record`, `unknown`, assertions, inferred
object literals, or duplicate test-only interfaces for an exact valid fixture.
Intentionally malformed parser input is boundary data, not a valid typed
contract value; keep it visibly outside the valid-fixture path.

## Union And Sum-Type Integrity

Treat every owned public API union or sum type as a contract that must
be mechanically and unambiguously narrowable.

For each union:

1. Identify the discriminator field.
2. Verify that the discriminator is required in every variant.
3. Verify that every variant has exactly one unique literal
   discriminator value.
4. Verify that the discriminator identifies the API variant, not a
   broader business-domain concept that multiple variants can share.
5. Verify that validation and dispatch switch or match on the
   discriminator after validation.
6. Reject ordered trial parsing, shape probing, or fallback dispatch
   for owned public API variants.

Generated types are not enough. A generated type can compile while
still leaving callers unable to narrow the variant safely.

## Workflow

1. Locate the canonical contract source before editing.
2. Identify every owned type, fixture, and boundary affected by the change.
3. Remove or reject type-system bypasses and model the correct named type.
4. Enumerate every owned public API union or sum type introduced or changed and
   name its discriminator.
5. Check schema/runtime validation and generated OpenAPI or client
   artifacts for the same discriminator shape.
6. Check backend dispatch for exhaustive switch or match handling.
7. Construct valid tests with exact owned types and keep malformed boundary
   data explicit.
8. Add tests or static checks that fail for unsafe or ambiguous variants.
9. Run focused contract validation immediately. Run the host project's
   broader quality gate at the milestone required by its own policy.

## Language Guidance

- For TypeScript, Zod, and compiler-based checking, read
  `references/typescript-tsts.md`.
- For OpenAPI `oneOf` contracts, read `references/openapi.md`.
- For Rust and serde, read `references/rust-serde.md`.

Load only the reference that matches the contract or language being
edited.
