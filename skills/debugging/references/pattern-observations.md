<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Bug-Pattern Observations

Use this format only after a bug's causal mechanism and corrective pattern have
been proved. The observation preserves evidence from one occurrence without
guessing the reusable category to which it may eventually belong.

## Placement And Identity

The host project owns the collected data. Store each observation as a separate
JSON file under its configured observation root, which defaults to
`pm/debugging-pattern-observations/`. Name it
`YYYY-MM-DD-<lowercase_underscore_description>.json`; add a distinguishing
description before writing if that name already exists. Use the filename stem
as `observation_id` and keep it stable.

Do not store observations in the installed skill directory. Skill installation
and updates replace instructional resources and do not publish client-project
observations back to Ponytail.

Validate each record against
[pattern-observation.schema.json](pattern-observation.schema.json). Keep one
file per independently occurring causal defect. If a bug or plan record exists,
link the observation from it rather than duplicating the complete observation.

## Evidence Boundary

Describe the anti-pattern structurally: identify the ownership, state,
control-flow, data-flow, ordering, or contract relationship that admitted the
defect. Describe the correct pattern as the invariant or implementation
relationship proved by the repair. A patch description alone is neither.

Record source and code references as repository-relative paths, stable issue or
plan identifiers, or commit identities. Keep excerpts short and include them
only when a reference cannot preserve the material distinction.

`applicability_conditions` identifies conditions required for the causal
mechanism. `known_non_matches` records similar-looking cases that the evidence
shows do not share it. An empty `known_non_matches` array means none were
established; it does not claim universal applicability.

Do not add category names, similarity labels, occurrence counts, promotion
status, or proposed skill text. Those are derived outputs owned by a later
mining workflow. Corrections to factual errors remain ordinary versioned edits;
do not rewrite an observation merely to make it fit a later cluster.

## Record Shape

```json
{
  "schema_version": 1,
  "observation_id": "2026-09-25-short_description",
  "recorded_at": "2026-09-25T16:30:19-07:00",
  "source_references": [
    "pm/bugs/closed/2026-09-25-BUG-short_description.md",
    "commit:0123456789abcdef"
  ],
  "context": {
    "languages": ["typescript"],
    "frameworks": [],
    "components": ["component-name"],
    "affected_boundaries": ["boundary-name"],
    "code_references": ["src/example.ts:42"]
  },
  "observed_behavior": "Concrete failing behavior.",
  "expected_behavior": "Concrete intended behavior.",
  "causal_mechanism": "Confirmed mechanism that produced the failure.",
  "anti_pattern": {
    "structural_description": "Implementation relationship that admitted the defect.",
    "why_it_fails": "How that relationship produces the observed failure."
  },
  "correct_pattern": {
    "required_invariant": "Relationship that must remain true.",
    "implementation_description": "How the correction preserves that invariant."
  },
  "applicability_conditions": ["Condition required for this mechanism."],
  "known_non_matches": ["Similar case ruled out by the evidence."],
  "confirmation_evidence": ["Focused observation that distinguished this cause."],
  "regression_proofs": ["tests/example.test.ts: test name"]
}
```
