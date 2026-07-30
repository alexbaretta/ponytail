<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Compatibility And Releases

Use this reference for independently deployed clients, servers, producers,
consumers, SDKs, events, and messages.

## Compatibility Direction

Latest-only writers plus multi-version readers provide backward-compatible
ingestion. They do not make new output transparently consumable by an
unchanged historical client.

An older internal client can consume a newer response only when its wire
compatibility layer understands the response's concrete physical version.

```text
Legacy request
    -> current server reader
    -> current request
    -> current business logic
    -> current response
    -> current-capable client adapter
    -> legacy client value
```

The compatibility adapter must parse the current response before legacy
application code attempts to deserialize it.

## Version Bounds

Declare finite compatibility sets:

```text
server release:
  accepted request versions = {V1, V2, V3}
  emitted response version = V3

adapter release:
  accepted response versions = {V3}
  available downgrade targets = {V1, V2}
```

Do not claim that a released adapter accepts "the latest" version. Future
versions do not yet exist in its compiled contract.

## Coordinated Release

When a server will begin emitting a new incompatible version:

1. Identify whether every producer and consumer will be released together
   using the new current representation.
2. If they will, release the synchronized current readers and writers without
   a compatibility adapter.
3. If a consumer must retain an older internal representation, publish a
   compatibility package that parses the new version.
4. Upgrade that consumer's wire compatibility package.
5. Confirm the consumer can parse and, when necessary, downgrade the new
   representation.
6. Release the producer or server that emits the new version.

This is release coordination, not runtime version negotiation.

## Synchronized Current Releases

No compatibility adapter is required when all affected producers and consumers:

- are released as one coordinated unit;
- read and write the same current physical version;
- do not retain a legacy internal representation at the boundary; and
- cannot remain deployed in a mixed-version topology after the release.

This is the simplest conforming profile. It still requires multi-version
readers wherever historical stored values, queued messages, retries, cached
payloads, or other legacy inputs can survive the synchronized release.

Document and test any rollback path that can temporarily recreate a
mixed-version topology. If rollback can pair an older consumer with a newer
producer, the synchronized-current assumption does not cover that interval.

Without coordinated consumers, a server that always emits its latest version
makes incompatible output evolution breaking by design. A boundary that
cannot coordinate consumers must constrain itself to backward-compatible
output evolution or adopt another explicit protocol such as versioned
endpoints, topics, or envelopes.

## Fallible Downgrades

Model each downgrade as:

```text
downgrade(Current) -> Result<Legacy, Incompatibility>
```

A downgrade may succeed for only a subset of current values. Reject a value
when the legacy representation cannot preserve its contract-critical meaning.
Do not silently drop fields, narrow numbers, select defaults, or reinterpret
literals.

## Retirement

Distinguish known, supported, and retired versions. Retire an input version
only after proving that no permitted stored value, producer, retry, queue,
offline client, or other source can still supply it.

If the project promises permanent support for all published inputs, record
that policy explicitly and retain the corresponding parsers, fixtures, and
security coverage.
