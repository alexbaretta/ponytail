---
name: versioned-data-contracts
description: "Serialized contract versioning"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Versioned Data Contracts

Treat each typed serialized representation as an immutable physical contract.
Apply the same rules to data at rest and data in transit.

## Applicability

Use this workflow when at least one of these is true:

- serialized instances outlive the process or release that wrote them;
- producers and consumers can deploy or upgrade independently;
- an external consumer relies on a compatibility commitment; or
- the contract already carries an explicit version identity.

An internal in-memory DTO, controller-to-service argument, or generated
intermediate representation released atomically with every consumer does not
trigger this skill merely because it has a type. If such a value is serialized
into a durable or independently consumed boundary, the boundary contract does.

## Contract Model

Model each versioned data type as:

```text
PhysicalV1 ─┐
PhysicalV2 ─┼─> read and normalize ─> Current
PhysicalV3 ─┘

Current ─> validate and write ─> LatestPhysical
```

Keep historical representations at serialization boundaries. Make ordinary
business logic process only `Current`.

For each boundary, distinguish:

- known physical versions;
- supported input versions;
- retired versions;
- the latest physical version emitted by the current software release; and
- optional downgrade targets supplied by compatibility adapters.

Require each host project to declare those sets in a
`versioned-data-contracts.json` manifest. Read
[contract-manifest.md](references/contract-manifest.md) when creating,
reviewing, or enforcing that manifest.

## Physical Version Rules

- Give every physical representation a stable version identity.
- Freeze a physical version as soon as any writer can emit it.
- Do not change a historical version because a source symbol was renamed.
- Add a physical version whenever emitted representation can change.
- Keep storage or transport metadata outside the canonical value when it is
  not part of the business contract.
- Follow the host project's exact-number, raw-byte, encoding, signing,
  authentication, authorization, and encryption rules.
- Treat encrypted JSON plaintext as a versioned contract independently from
  the encryption envelope and encryption-format version.

## Readers

- Maintain an explicit set of supported input versions.
- Parse each version with its exact immutable schema.
- Normalize each supported version into `Current`.
- Reject malformed, ambiguous, conflicting, unsupported, and retired inputs.
- Never expose historical representations to business logic.
- Accept a historical version only when every valid value of that version can
  normalize without inventing, discarding, or changing contract-critical
  meaning.
- Verify signatures against the protocol's required original bytes or
  canonical form before normalization when the input is signed.

Treat an untagged historical representation as an explicit legacy version only
when source history or authoritative data proves its exact shape. Do not infer
or speculatively widen an untagged format.

## Writers

- Emit only the latest physical version available in the software release.
- Validate output against the exact latest-version schema.
- Never validate output with a multi-version reader.
- Never emit a legacy representation from ordinary business logic.
- Keep request normalizers separate from response, event, file, or storage
  encoders.

## Business Logic

- Process only the current canonical representation.
- Keep version dispatch, historical shapes, boundary envelopes, and downgrade
  behavior out of ordinary business logic.
- Make the canonical value statically identical to the latest serialized
  payload where the language permits.
- Exclude explicitly boundary-owned envelopes and metadata from that identity
  requirement.
- Keep independently evolving request, response, event, storage, and webhook
  types in separate version families, even when their current version numbers
  happen to match.

## Compatibility Adapters

Use optional compatibility adapters outside ordinary server business logic
when a consumer must process a legacy representation internally.

- Do not require an adapter when all producers and consumers are released
  together and use the same current representation.
- Accept an explicitly declared current physical version.
- Parse current wire data before legacy application code receives it.
- Produce an explicitly declared subset of legacy versions.
- Model downgrade conversion as fallible.
- Reject values that the selected legacy representation cannot express
  without loss or semantic change.
- Never truncate, default, omit, or reinterpret contract-critical data.
- Publish concrete accepted-input and supported-output version sets. Do not
  describe an adapter as accepting an unbounded "latest" version.
- Version and release compatibility adapters independently.

An application using a legacy internal model is current at the wire boundary
only when its installed compatibility layer accepts the server's emitted
version.

Read [compatibility-and-releases.md](references/compatibility-and-releases.md)
when changing a networked or independently deployed producer, consumer,
client, server, SDK, event, or message contract.

## Required Workflow

1. Read the host repository's instructions and serialization policies.
2. Identify the canonical current type and every physical version.
3. Create or update the project contract manifest.
4. Inventory readers, writers, adapters, fixtures, migrations, queries,
   indexes, projections, logs, exports, jobs, and external consumers that
   depend on the representation.
5. Determine whether the change alters the canonical value, a physical
   representation, or both.
6. Preserve all emitted physical versions and add a new immutable version when
   writer output can change.
7. Add or update exact readers and total normalizers for every supported input
   version.
8. Update the latest-only writer and every representation-dependent consumer.
9. Prove compatibility from exact source contracts where possible.
10. Inspect authoritative stored values or deployed-client capabilities when
   compatibility depends on runtime facts.
11. Add migration or coordinated release support where historical values,
    producers, or consumers must be retired.
12. Run static, runtime, boundary, real-storage, and compatibility checks
    required by the affected representation.

Stop when normalization or downgrade would require invented, discarded, or
semantically changed contract-critical information.

## Representation-Derived Indexing

A full-text index derived from versioned structured data is a non-authoritative
projection and a consumer of the versioned contract.

For each indexed representation family:

- define a named policy in terms of logical field meaning, not physical paths;
- classify possible scalar values as included, excluded, conditionally
  included, or transformed;
- declare the exact physical versions the projection must support;
- provide a projector for each declared version;
- make every projector implement the same logical policy; and
- leave unclassified fields out of the projection.

Projectors may normalize into `Current` before projecting or interpret a
physical version directly. Direct interpretation is valid for database
triggers, generated expressions, external search pipelines, and other
environments that cannot invoke the application reader. Different execution
mechanisms must produce semantically equivalent projections:

> Every safe, human-meaningful value selected by the policy remains
> discoverable from every supported physical version.

Ordering, whitespace, duplication, tokenization, and representation-specific
traversal may differ. Additional searchable values are permitted only after an
explicit policy change classifies them as safe and useful.

Exclude by default:

- object keys, schema field names, nulls, and booleans;
- serialization versions and type discriminators;
- database primary keys and internal foreign keys;
- secrets, credentials, tokens, authentication evidence, and encrypted data;
- hashes, digests, deduplication keys, and internal revisions; and
- implementation metadata and machine-only identifiers.

Do not classify identifiers by a naming heuristic. An external business
identifier can be searchable while an internal identifier with a similar name
must remain excluded.

Generic whole-document serialization, including `JSON.stringify`,
`jsonb::text`, and recursive extraction of every scalar, is non-conforming.

Declare projection participation and exact version coverage independently from
reader and downgrade support. A project may read a version without indexing
it, but it must support every physical version that can occur in the dataset
being indexed. Read
[contract-manifest.md](references/contract-manifest.md) for the declaration.

A materialized projection must define create, update, removal, rebuild, and
drift-detection behavior. Maintain it in the same atomic boundary as the
authoritative write where possible; otherwise define retry and reconciliation.
Any policy or projection-schema change requires a rebuild strategy.

## Verification

For every supported version, prove:

- the exact physical schema accepts valid values and rejects malformed values;
- its reader normalizes into the exact current representation;
- the full reader dispatches it correctly;
- unsupported and retired versions fail explicitly; and
- relevant storage, transport, query, and consumer boundaries behave
  equivalently after normalization.

For the latest version, prove:

- the canonical current value and latest payload are statically identical,
  excluding declared boundary metadata;
- the writer emits the complete latest physical representation;
- the writer cannot emit a historical version; and
- serialized output round-trips through the production reader.

For each downgrade adapter, prove:

- its declared current input version matches the release it supports;
- each declared legacy output is exact;
- representable values downgrade without semantic change; and
- unrepresentable values fail explicitly.

For each full-text projection, prove:

- every policy-included value is discoverable from every declared version;
- every excluded value is absent, including security-sensitive values;
- version envelopes and nesting changes preserve logical discoverability;
- transformations and aliases behave consistently;
- creates, updates, and removals do not leave missing or stale values; and
- materialization and rebuilding yield semantically equivalent projections.

Read [typescript-static-conformance.md](references/typescript-static-conformance.md)
when the host project uses TypeScript or a TypeScript compiler-API checker such
as TSTS.

## Completion Gate

Do not treat a versioned-contract change as complete until:

- every emitted physical version is immutable and explicitly represented;
- the project manifest declares the exact supported reader and downgrade sets;
- every supported input version normalizes to the current representation;
- ordinary writers emit only the latest version;
- ordinary business logic imports no historical representation;
- compatibility adapters, when present, declare finite version bounds and fail
  closed;
- every full-text projection has a named policy, exact version coverage,
  per-version projectors, exclusion tests, and a rebuild strategy;
- representation-dependent consumers cover all versions they can encounter;
- migrations or release coordination are complete where required; and
- the host project's focused and final validation gates pass.
