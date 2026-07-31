---
name: lossless-json-contracts
description: >-
  Use when adding, changing, reviewing, or testing an owned JSON parse,
  serialization, HTTP, database, event, file, signing, or forwarding boundary
  where numeric precision or raw-byte identity matters. Requires lossless
  number handling for semantic number processing, byte-preserving handling for
  identity-sensitive paths, explicit boundary ownership, and focused tests.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Lossless JSON Contracts

Treat an owned JSON boundary as an explicit contract. Ordinary JSON codecs
commonly coerce number tokens through a binary floating-point type and can
silently change integer or decimal values.

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `Lossless JSON standard`;
- `Lossless JSON boundary inventory`;
- `Lossless JSON numeric representation`; and
- `Lossless JSON validation commands`.

The standard and inventory default to `not configured`. The numeric
representation defaults to a lossless representation appropriate to the
language and contract. Validation defaults to the smallest focused boundary
tests that prove the changed invariant. The host's broader gate runs at its
owning milestone. Do not create an inventory or select a second numeric
representation when the host already owns one.

## Boundary Inventory

Before editing, identify every affected:

- parser and serializer;
- HTTP request and response decoder;
- database JSON reader and writer;
- message, event, webhook, file, or cache boundary;
- signature, hash, or byte-forwarding path; and
- generated or third-party adapter.

Use the configured inventory and standard when present.
Update that inventory in the same change as an added, removed, or changed
boundary.

## Numeric Integrity

Apply this section when the boundary semantically parses, validates,
transforms, or serializes JSON that can contain number tokens. An opaque path
that only verifies, hashes, stores, or forwards authoritative bytes does not
need semantic number conversion or numeric round-trip tests.

- Parse JSON number tokens without first converting them through a lossy
  native floating-point representation.
- Preserve arbitrary-size integers and decimal values in a representation that
  can serialize the original mathematical value exactly.
- Normalize to a native integer only after proving the value is an integer and
  lies inside the language's exact safe range.
- Do not stringify numeric values merely to avoid precision loss when the wire
  contract requires JSON number tokens.
- Reject non-finite values and any value the owned contract cannot represent.
- Keep parsing and serialization symmetric across every supported boundary.

Use the configured lossless-number library or type rather than introducing
another.

## Raw-Byte Integrity

When authentication, signatures, hashes, audit evidence, or transparent
forwarding depends on the received bytes:

- retain the authoritative raw byte sequence;
- verify signatures or hashes against those bytes before normalization;
- do not parse and reserialize before verification; and
- distinguish byte identity from semantic JSON equivalence in types and tests.

## Adapters And Ownership

Keep one owned boundary adapter per external codec or library. Do not scatter
ad hoc conversions through business logic. Validate external values before
they enter the owned contract and fail with an actionable boundary error when
lossless conversion is impossible.

For a durable or independently exchanged versioned representation, also use
`versioned-data-contracts`. When the boundary carries an owned public monetary
contract, also use `monetary-contract-safety`. A private provider or storage
representation remains governed by its host/provider adapter unless the host
explicitly binds it to that public monetary contract.

## Verification

For each affected boundary, test the applicable cases:

- integers below, at, and above the native safe-integer limit;
- positive and negative decimal values with significant trailing zeros where
  the contract preserves lexical form;
- exponent notation when accepted by the contract;
- nested arrays and objects when the contract permits them;
- parse-serialize-parse mathematical equivalence;
- raw-byte signature or hash verification before normalization when the
  protocol signs or hashes received bytes; and
- explicit rejection of unsupported or non-finite values.

Run the host's focused boundary guard after each atomic change and its broader
quality gate at the configured milestone.
