<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# OpenAPI

Use this reference when editing OpenAPI schemas that describe owned
public API unions.

## oneOf Rules

- Every owned public `oneOf` union must have a
  discriminator-compatible field.
- The discriminator-compatible field must be required by every variant.
- Every variant must constrain the field to exactly one unique literal
  value, usually with `const`.
- Do not describe a field as a discriminator unless it uniquely
  identifies every variant.
- Do not rely on shape overlap, required-field differences, or schema
  order to identify variants.

Preferred shape:

```yaml
PaymentRequest:
  oneOf:
    - $ref: '#/components/schemas/RawAchPaymentRequest'
    - $ref: '#/components/schemas/StoredAchPaymentRequest'
  description: Union of supported payment requests. Discriminator: request_kind.
```

Each variant should include:

```yaml
required: [request_kind, type, account]
properties:
  request_kind:
    const: raw_ach
    description: Identifies this request as a raw ACH payment request.
```

## Documentation Rules

Document the discriminator in API terms: explain which request or
response variant the value selects. Keep separate domain fields
separate. For example, `type: ach` can describe an ACH instrument while
`request_kind: stored_ach` selects the stored-ACH request variant.
