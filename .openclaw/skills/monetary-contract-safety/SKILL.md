---
name: monetary-contract-safety
description: "Monetary contract rules"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Monetary Contract Safety

## Core Rule

Owned public APIs represent monetary amounts and decimal-capable quantities as
unquoted JSON number tokens. OpenAPI fields use:

```yaml
type: number
```

Do not attach an IEEE-754 format such as `float`, `double`, or `float64`.
TypeScript contracts and implementations use `LosslessNumber` from the
`lossless-json` package. Do not expose JavaScript `number` as the canonical
monetary type.

Do not allow a parser, language runtime, serializer, arithmetic operation,
fingerprint, or provider adapter to silently round or reinterpret a value.

## Required Boundary Checks

1. Identify monetary fields by domain meaning, not only by names such as
   `amount`, `fee`, `tax`, `refund`, `settled`, or `surcharge`.
2. Verify request and response validation accepts JSON number tokens and
   rejects quoted numbers.
3. Verify decoding reaches `LosslessNumber` or the language's exact decimal
   equivalent without first passing through a lossy binary float.
4. Verify serialization emits the exact value as an unquoted JSON number.
5. Use exact decimal helpers for arithmetic and comparison.
6. Verify idempotency keys, signatures, hashes, and fingerprints preserve the
   required exact-number semantics or byte identity.
7. Keep provider-specific string or formatted amounts inside provider
   adapters.
8. Apply the same guarantees to every maintained SDK, generated client,
   example, demo, wrapper, and supported language that carries the field.

## Language Guidance

### TypeScript And JavaScript

- Use `LosslessNumber` from `lossless-json` for monetary and decimal-capable
  contract values.
- Parse request and response bodies with a lossless JSON codec before runtime
  schema validation.
- Ensure runtime schemas accept `LosslessNumber` values and reject quoted
  numeric strings.
- Use exact decimal helpers for arithmetic and comparison.
- Keep lossless parsing and serialization inside one shared codec.

### PHP

- Use an immutable arbitrary-precision decimal value object rather than native
  floats.
- Decode fractional, exponent, and unsafe-integer tokens without first
  materializing them as floats.
- Use one shared codec to emit unquoted JSON number tokens.

### C Sharp

- Use an arbitrary-precision value or validated exact-number-token wrapper;
  do not reduce an unbounded contract to CLR `decimal`.
- Configure `System.Text.Json` converters to read only number tokens and emit
  validated numeric text, rejecting quoted, malformed, and non-finite values.

### Elixir

- Use `Decimal` instead of native floats.
- Decode numeric tokens directly into the exact type and encode them without
  an intermediate float.
- Keep custom JSON protocol integration in a shared runtime codec.

## Host-Specific Bindings

Keep concrete runtime classes other than the required TypeScript
`lossless-json` binding, provider conventions, currency shapes, and
API-specific field layouts in the host repository's contracts and
documentation. Do not add one project's bindings to this project-agnostic
skill.

## Completion

Add success, quoted-number rejection, boundary, unsafe-range, fractional,
exponent, non-finite, and round-trip tests. Run focused contract and codec
checks, then the host repository's required final gate at its normal
milestone.
