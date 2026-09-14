---
name: architecture
description: >-
  Use when defining, updating, reviewing, or organizing product architecture
  in the linked Markdown web under pm/architecture, or when separating
  requirements from the implementation architecture that realizes them.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Architecture

Maintain the human-language description of how the product is structured in
its configured architecture root, by default `pm/architecture`. Architecture
documents explain how approved requirements are realized through components,
boundaries, state, control flow, data flow, concurrency, persistence, runtime
topology, and external integrations.

Keep requirements and architecture distinct. Requirements describe what the
product must do and the constraints visible to its stakeholders. Architecture
describes how the product is organized to satisfy those requirements. An
architecture decision does not create a product requirement, and an
implementation detail does not belong in requirements merely because the
current implementation depends on it. Link architecture claims to their
governing requirements, constraints, or recorded decisions when that
traceability helps prevent accidental scope growth.

## A Browsable Markdown Web

Use `index.md` as the entry point. Its opening section must describe the
product and its architecture at a 30,000-foot level. Link from it to thematic
Markdown pages that explain individual components, boundaries, data and
control flows, persistence, runtime topology, integrations, or other material
architectural concerns.

Every architecture page must be reachable from the index through links and
provide a way back to its parent or the index. Cross-link related topics and
their canonical requirements. Directories alone are not navigation. Ordinary
Markdown browsing must suffice; no hosted site or site generator is required.

Maintain one canonical description of each architectural decision or
boundary. Other architecture pages, requirements, issues, plans, and code
documentation link to it rather than duplicating it. Separate approved
architecture, proposals, unresolved questions, and descriptions of the
currently implemented state when they differ.

Describe architecture at the level needed to make implementation boundaries
and consequences understandable. Keep source-level algorithms, tasklets,
incident history, command transcripts, and debugging evidence with their code,
plan, or issue unless they establish a durable architectural constraint.

## Reconciliation

When approved work establishes or changes a component boundary, persistence
model, execution model, ownership rule, dependency direction, runtime
topology, or comparable architectural fact, update its canonical architecture
page and navigation in the same project change-set. Do not document a proposed
design as current architecture before approval or implementation. Do not
rewrite architecture to excuse a defect in the current implementation.

If a plan or implementation conflicts with approved architecture, resolve the
conflict before treating the work as complete. A plan may refine architecture
within approved requirements, but it must not silently expand those
requirements or replace a stakeholder-visible outcome.

## Validation

Check changed Markdown structure, relative links, section anchors, index
reachability, navigation back to the index, and links to governing
requirements. Review the result for duplicated authority, accidental product
requirements, implementation details presented as requirements, and proposed
architecture presented as current. Use the host's configured documentation
checks; architecture prose alone does not call for product tests unless a
configured execution or generation path consumes it.
