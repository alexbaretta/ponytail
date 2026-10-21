<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Debugging Pattern Observations Suite

[Back to UAT index](index.md) | [Requirements](../requirements/debugging-pattern-observations.md)

## Arc DBG-OBS-COLLECTION

### Coverage

The [current decision](../requirements/debugging-pattern-observations.md#current-decision)
retires the former DBG-OBS-001 collection mandate as of 2026-10-21.

### Actor And Prerequisites

A coding agent has confirmed a bug's cause, completed its correction and passed
the required regression proof. Existing historical observations may be present.

### Steps

1. Complete the repair under the debugging skill.
   - Expected: no separate observation file, JSON collection step or observation
     completion gate is required.
2. Inspect the skill's diagnosis and validation guidance.
   - Expected: useful causal explanations may remain in an existing bug or plan;
     retained validation results use annotated Git tags, without companion files.
3. Inspect retained historical observations.
   - Expected: existing data and its schema remain readable. The historical
     format does not authorize automatic collection.

### Profiles And Evidence

The focused skill and schema conformance tests verify these policy boundaries.
No product runtime or release UAT is implied by those checks.
