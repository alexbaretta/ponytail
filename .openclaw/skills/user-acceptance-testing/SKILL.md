---
name: user-acceptance-testing
description: "Reconcile requirement changes with traceable user acceptance and release evidence"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# User Acceptance Testing

Maintain the human-readable contract by which a release demonstrates approved
user-facing behavior. UAT derives expected outcomes from approved requirements;
it does not create requirements, convert observations into intended behavior,
or replace explicit release authorization.

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `UAT documentation root`;
- `UAT operations skill`;
- `UAT execution profiles`;
- `UAT release-evidence owner`; and
- `UAT release-authorization policy`.

The UAT documentation root defaults to `pm/uat`. All other values default to
`not configured`. The UAT operations skill must be project-local and own the
actual commands, tools, environment names, credentials, setup and finalization
operations, and evidence-recording procedures.

Do not invent those operational details or copy them into this reusable skill.
When the project-local operations skill is absent, documentation and review may
continue, but UAT execution is not configured.

Apply `requirements` when deriving acceptance behavior and
`production-test-boundaries` when adding or changing automated execution.
Apply the host's credential policy before using protected environments or
external services.

## Requirement Change Reconciliation

Whenever `requirements` incorporates a new requirement or clarification from
interactive user conversation, a `pm/bugs` issue, or a user-supplied source,
assess that specific change against the configured UAT root. Do not wait for
release preparation or test execution.

- Add or update the canonical Arc, Steps, and expected observable results when
  the requirement or clarification creates or changes acceptance behavior.
- Link the Arc to the exact requirement identifier or stable anchor while
  preserving its approval state.
- When an existing Arc already proves the exact behavior, keep one canonical
  Arc and record that coverage instead of duplicating the test.
- When the requirement has no meaningful user-acceptance behavior, record why
  no UAT change is needed rather than fabricating a test.
- Preserve the requirement's approval state. Proposed or observed behavior may
  produce an explicitly exploratory Arc, but it cannot become release evidence
  until the requirement is approved.

Keep the requirements change and any necessary UAT documentation change in the
same project change-set. A missing operations skill or execution profile blocks
running UAT, not maintaining this plain-English acceptance contract.

## A Browsable Acceptance Web

Use `index.md` as the configured UAT root's entry point. Link the release
process and thematic Suite pages through ordinary relative Markdown links.
Every page must be reachable from the index and link back to its parent or the
index. Create the root with its first substantive content, not as a placeholder.

Use the canonical integration hierarchy from `production-test-boundaries`:

- a **Suite** groups related acceptance coverage;
- an **Arc** is an independently selectable user outcome; and
- a **Step** is one ordered user or system action with its expected observable
  result.

Keep one canonical plain-English Arc for one behavior. Execution profile,
manual versus automated operation, and target environment are attributes of
that Arc, not reasons to duplicate it.

Each Arc records:

- the requirement identifiers or stable anchors it covers and their approval
  state;
- actor, prerequisites, and owned test data;
- ordered Steps and expected observable outcomes;
- applicable manual and automated execution profiles;
- external effects, safety constraints, and final inspection points; and
- implementation and evidence links without duplicating executable test code.

Candidate and observed requirements may support explicitly exploratory Arcs,
but those Arcs cannot authorize a release until the expected behavior becomes
an approved requirement.

## Derivation And Automation

Derive Arcs from the combined approved requirements, covering success,
required failure behavior, authorization boundaries, and user-visible recovery
without inventing behavior merely to make a Suite comprehensive. Preserve
manual acceptance when automation cannot establish the human-observable
outcome honestly.

Automation implements the plain-English Arc through the project-local harness.
It must exercise the real product path and preserve the Arc's observable
contract. A passing substitute, fake boundary, or test-only product path is not
acceptance evidence for the behavior it replaces.

Execution profiles are orthogonal to Arcs. A project may run the same Arc
against an ephemeral stack or a persistent non-production deployment when its
operations skill supports both. Follow `production-test-boundaries` for
profile isolation, test-owned state, preserved-state manifests, and production
exclusion.

## Release Evidence And Authorization

For each candidate release, record:

- the exact release identity and tested revision;
- target environment and execution profile;
- selected Suites and Arcs;
- outcome and evidence for every selected Arc;
- skips, unverified boundaries, and failures;
- preserved state and inspection references; and
- the resulting authorization decision or the person or process that still
  owns it.

Passing UAT means the recorded acceptance selection passed. It does not by
itself manufacture a developer, operator, or stakeholder approval. Never
author approval text on another person's behalf. A release is authorized only
according to the configured release-authorization policy.

## Validation

Check relative links, stable requirement references, index reachability, Arc
identity, and coverage of the selected release requirements. Verify that every
operational reference resolves to the configured project-local UAT operations
skill and that reusable UAT prose contains no project-specific command,
credential, tool, environment, or provider assumption.
