<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Debugging Pattern Observations

[Back to requirements index](index.md)

These requirements were approved by the stakeholder clarification and request
on 2026-09-25 to collect anti-pattern and correct-pattern evidence as it emerges
during bug-fixing work, before deriving prescriptive skills from repeated
categories.

## Approved Requirements

### DBG-OBS-001: Collection after proof

After a bug's causal mechanism is confirmed and its correction passes the
smallest durable regression proof, the debugging workflow must record one
structured observation for that independently occurring causal defect.

### DBG-OBS-002: Evidence content

Each observation must preserve the observed and expected behavior, confirmed
causal mechanism, implementation anti-pattern, proven correct pattern,
applicability conditions, known non-matches, source and code context,
discriminating evidence, and regression proof.

An unconfirmed hypothesis or unproved correction must not enter the collection
as a pattern observation.

### DBG-OBS-003: Project-owned collection

The exported skill defines the collection protocol and versioned record shape.
Each client project owns its observations under its configured observation
root, defaulting to `pm/debugging-pattern-observations/`. Installing or updating
the skill must not overwrite or implicitly publish that project-owned data.

### DBG-OBS-004: Unbiased source observations

Collection must retain one record per independent causal defect without
assigning a derived category, occurrence count, promotion status, or proposed
skill. Multiple symptoms of one incident count as one occurrence; later
independent defects caused by the same pattern remain separate observations.

### DBG-OBS-005: Separate derivation and promotion

A later mining workflow may deduplicate and cluster observations by causal
mechanism and required invariant. A category may be proposed for a prescriptive
skill only after it meets a configured minimum independent-occurrence threshold
and is reviewed. The threshold and mining workflow are not part of the initial
collection capability.

## Acceptance Coverage

- [Debugging observation collection Arc](../uat/debugging-pattern-observations.md#arc-dbg-obs-collection)
- DBG-OBS-005 is a boundary on future mining work; no mining or promotion
  behavior is implemented by the collection Arc.
