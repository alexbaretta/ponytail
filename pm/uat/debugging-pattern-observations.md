<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Debugging Pattern Observations Suite

[Back to UAT index](index.md) | [Requirements](../requirements/debugging-pattern-observations.md)

## Arc DBG-OBS-COLLECTION

### Coverage

- [DBG-OBS-001 through DBG-OBS-004](../requirements/debugging-pattern-observations.md#approved-requirements), approved 2026-09-25.

### Actor And Prerequisites

The actor is a coding agent using Ponytail's `debugging` skill in a client
project. The agent has confirmed one bug's causal mechanism, implemented its
correction, and passed the smallest durable regression proof. The project may
configure an observation root; otherwise the default applies.

### Steps

1. Complete the confirmed bug repair.
   - Expected: the agent checks whether this causal incident already owns an
     observation.
2. Record a new independent occurrence.
   - Expected: exactly one JSON record is written under the client-owned root
     and conforms to the published schema.
3. Inspect the record.
   - Expected: it contains causal, anti-pattern, correct-pattern,
     applicability, evidence, provenance, and regression-proof fields.
   - Expected: it contains no derived category, occurrence count, promotion
     status, or proposed skill.
4. Encounter another symptom of the same incident.
   - Expected: the existing observation is referenced rather than counted
     again.
5. Encounter a later independent defect with a similar mechanism.
   - Expected: it receives a separate observation without being automatically
     assigned to a category.

### Profiles And Evidence

Manual and automated execution profiles are not configured. The focused skill
and schema conformance tests provide implementation evidence but are not
release UAT evidence.
