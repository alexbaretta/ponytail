<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Rust And serde

Use this reference when editing Rust public API payloads, Rust SDK
types, or Rust services that serialize or deserialize owned public API
sum types.

## Rust Contract Rules

- Model sum types as Rust enums.
- For public JSON payloads, prefer explicitly tagged serde enums.
- Use exhaustive `match` for dispatch.
- Avoid `#[serde(untagged)]` for owned public API unions unless the host
  contract requires that representation and ambiguity tests prove it safe.
- Do not model public API variants as loosely related structs that are
  trial-deserialized in order.

Preferred serde shape:

```rust
#[derive(Deserialize, Serialize)]
#[serde(tag = "request_kind")]
pub enum PaymentRequest {
    #[serde(rename = "raw_ach")]
    RawAch(RawAchPaymentRequest),

    #[serde(rename = "stored_ach")]
    StoredAch(StoredAchPaymentRequest),
}
```

Dispatch should match the enum:

```rust
match request {
    PaymentRequest::RawAch(request) => handle_raw_ach(request),
    PaymentRequest::StoredAch(request) => handle_stored_ach(request),
}
```

If the wire shape must use externally or adjacently tagged serde
representations, document the tag field and prove that every variant
has a unique serialized tag.
