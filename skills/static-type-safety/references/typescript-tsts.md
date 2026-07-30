<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# TypeScript, Zod, And Compiler-Based Checks

Use this reference when editing TypeScript public API contracts, Zod
schemas, generated TypeScript contract surfaces, or TypeScript backend
dispatch over public API variants.

## Type-System Integrity

- Do not use `any`, `as any`, `as unknown as`, non-null assertions, or
  suppression comments in owned handwritten code.
- Do not use an assertion merely because an object literal, mock, or fixture
  does not satisfy its declared contract. Correct the object or contract.
- Narrow external `unknown` data through runtime validation or a checked type
  guard before it enters owned logic.
- Declare valid fixtures with their exact owned type or return them from a
  function explicitly typed to that exact contract.
- Keep intentionally invalid parser inputs separate from valid typed fixtures.
- Exclude generated output, vendored source, and third-party declarations from
  owned-code findings. Check their canonical generators or owned adapters.

## TypeScript Contract Rules

- Model owned public API unions as discriminated unions.
- Add a comment above the union naming the discriminator field.
- The discriminator property must be required in every variant.
- Each variant must assign a unique string literal discriminator value.
- Do not use a business-domain field as the discriminator unless its
  values are guaranteed to stay one-to-one with variants as the domain
  evolves.
- Do not dispatch by attempting schemas in sequence.
- Prefer `switch (value.discriminator)` plus exhaustive handling.

Bad pattern:

```ts
export interface RawAchPaymentRequest {
  readonly type: 'ach';
  readonly account: AchAccount;
}

export interface StoredAchPaymentRequest {
  readonly type: 'ach';
  readonly stored_payment_method_id: string;
}

export type PaymentRequest =
  | RawAchPaymentRequest
  | StoredAchPaymentRequest;
```

The `type` field describes the payment instrument. It does not
identify the request variant.

Good pattern:

```ts
export interface RawAchPaymentRequest {
  readonly request_kind: 'raw_ach';
  readonly type: 'ach';
  readonly account: AchAccount;
}

export interface StoredAchPaymentRequest {
  readonly request_kind: 'stored_ach';
  readonly type: 'ach';
  readonly stored_payment_method_id: string;
}

// Discriminator: request_kind
export type PaymentRequest =
  | RawAchPaymentRequest
  | StoredAchPaymentRequest;
```

## Zod Rules

- Use named exported schemas with explicit type annotations.
- Use `z.discriminatedUnion(...)` when Zod supports the shape.
- Do not validate a public API union by ordered `safeParse` attempts.
- If Zod cannot model the shape directly, redesign the contract before
  adding fallback parsing.

Example:

```ts
export const PaymentRequestSchema: z.ZodType<PaymentRequest> =
  z.discriminatedUnion('request_kind', [
    RawAchPaymentRequestSchema,
    StoredAchPaymentRequestSchema,
  ]);
```

## Compiler-Based Checking

A TypeScript compiler-API checker such as TSTS can enforce contract
rules that vanilla `tsc` accepts but the host project rejects.

When integrating such a checker:

1. Configure the TypeScript project files to analyze.
2. Mark or include public contract source files.
3. Run the checker in focused mode while developing a contract change.
4. Wire it into the host quality gate only after focused checks give
   actionable diagnostics.
5. Report the full non-fatal violation list instead of stopping at the
   first violation.

Expected checks:

- Owned code must not contain prohibited type-system bypasses.
- Valid contract fixtures must use their exact owned contract types.
- A public union must have one shared required discriminator field.
- Discriminator values must be unique across variants.
- Candidate discriminator diagnostics must explain why each candidate
  failed.
- Dispatch over public unions must be exhaustive.
- Ordered trial parsing over public union variants must be rejected.

Treat a compiler-based contract violation as a design defect, not a lint
style issue.
