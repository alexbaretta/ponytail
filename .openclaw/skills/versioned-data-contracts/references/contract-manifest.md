<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Contract Manifest

Store project requirements in `versioned-data-contracts.json`. Treat the
manifest as reviewed policy and the TypeScript registries as implementation.
Do not generate the manifest from the implementation being checked.

Validate the file with
`schemas/versioned-data-contracts.schema.json` from this skill.

## Representation Families

Create one family for each independently evolving serialized representation.
Use separate families for storage, API requests, API responses, events,
messages, and webhooks when their physical formats can evolve independently.

Each family declares:

- a stable family identifier;
- the TSTS workspace and source module that own the implementation;
- the exported reader registry;
- the current physical version;
- every known physical version;
- the exact versions accepted by production readers;
- the exact legacy versions produced by downgrade adapters; and
- an optional exported downgrade registry.

When the representation contributes to full-text indexing, it also declares:

- the exact physical versions that must be projectable;
- a stable logical policy identifier; and
- an optional host-checker reference to the projector registry.

Use exact supported sets. An implementation must not omit a declared version
or expose an undeclared version.

## Example

```json
{
  "$schema": "./schemas/versioned-data-contracts.schema.json",
  "schemaVersion": 1,
  "families": [
    {
      "id": "payment-request-storage",
      "implementation": {
        "workspace": "database",
        "module": "src/payment-request.storage.ts",
        "readerRegistryExport": "PaymentRequestStorageContract"
      },
      "currentVersion": "V3",
      "versions": ["V1", "V2", "V3"],
      "supportedReadVersions": ["V1", "V2", "V3"],
      "supportedDowngradeVersions": []
    }
  ]
}
```

`versions` records known history. `supportedReadVersions` declares the exact
production reader surface. `supportedDowngradeVersions` declares the exact
adapter output surface.

When downgrade support is nonempty, set
`implementation.downgradeRegistryExport`. The registry must expose one
function property for each declared downgrade target and no others.

## Full-Text Projection

Declare projection coverage independently from reader and downgrade coverage:

```json
{
  "id": "payment-request-storage",
  "implementation": {
    "workspace": "database",
    "module": "src/payment-request.storage.ts",
    "readerRegistryExport": "PaymentRequestStorageContract"
  },
  "currentVersion": "V3",
  "versions": ["V1", "V2", "V3"],
  "supportedReadVersions": ["V1", "V2", "V3"],
  "supportedDowngradeVersions": [],
  "fullTextProjection": {
    "supportedProjectionVersions": ["V1", "V2", "V3"],
    "policyId": "payment-request-searchable-fields",
    "projectorRegistryReference": "PaymentRequestFullTextProjectors"
  }
}
```

`supportedProjectionVersions` is the exact set required in the indexed
dataset. Every listed version needs a projector implementing the named logical
policy. The optional `projectorRegistryReference` is an opaque identifier
interpreted by the host project's checker; it is not a prescribed language,
module, database, or search-engine mechanism.

Omit `fullTextProjection` when the representation does not contribute to a
full-text projection. Projects maintaining a complete representation inventory
should separately enforce that every family is explicitly classified as
contributing or noncontributing so omission cannot conceal an undecided policy.

## Stored Data

A static manifest cannot discover which versions exist in a database. Compare
observed stored version markers with the manifest separately:

```text
observed versions subset-of supportedReadVersions
```

Remove a stored reader only after authoritative verification proves that its
physical version can no longer exist. Keep the retired physical definition in
`versions` so revision-aware checks can continue to protect its immutability.

## DTOs And Synchronized Releases

A synchronized project may declare only the current DTO version:

```json
{
  "currentVersion": "V3",
  "versions": ["V1", "V2", "V3"],
  "supportedReadVersions": ["V3"],
  "supportedDowngradeVersions": []
}
```

Another project may accept several DTO inputs and provide selected downgrades:

```json
{
  "currentVersion": "V4",
  "versions": ["V1", "V2", "V3", "V4"],
  "supportedReadVersions": ["V1", "V2", "V3", "V4"],
  "supportedDowngradeVersions": ["V2", "V3"]
}
```
