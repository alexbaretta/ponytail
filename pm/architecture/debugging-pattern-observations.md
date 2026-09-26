<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Debugging Pattern Observation Collection

[Back to architecture index](index.md) | [Governing requirements](../requirements/debugging-pattern-observations.md)

## Ownership Boundary

The canonical `debugging` skill owns when and how an agent records an
observation. Its versioned JSON Schema owns the portable record contract. The
client repository owns each observation and configures its storage root, with
`pm/debugging-pattern-observations/` as the default.

Installed skill resources contain no collected observations. This keeps skill
updates separate from client evidence and respects the agent's current-project
write boundary.

## Collection Flow

1. The debugging workflow confirms one causal mechanism.
2. The repair passes its smallest durable regression proof.
3. The agent checks whether that causal incident already has an observation.
4. The agent writes one schema-conforming record in the client-owned root and
   links any owning bug or plan record to it.

The record captures raw causal evidence but no category or count. Independent
later occurrences remain separate records even when their implementation
shapes appear similar.

## Derivation Boundary

Clustering, counting, category review, threshold configuration, and skill
generation are downstream concerns. A future mining workflow may read records
from one or more explicitly supplied project roots, preserve their observation
identities, and produce derived proposals. It must not rewrite source
observations to fit a cluster.
