<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Traceability index and queries

[Back to requirements index](index.md)

**Identifier:** `REQ-TRACEABILITY-INDEX`

**Approval:** Approved by explicit stakeholder direction on 2026-09-29.

**Source:** The stakeholder required repository-wide incremental indexing,
full-text queries, relationship-gap validation, plan and bug traceability, and
optional campaign- or plan-scoped validation for Ponytail's requirements
traceability annotations.

## Repository index

Ponytail must create and maintain a repository-wide derived index of every
supported requirements-traceability entity and annotation in tracked,
configured source files. The index is a cache, never a source of truth: source
requirements, annotations, plans, issues, implementation, tests, and UAT remain
canonical, and a complete rebuild must reproduce the same logical index.

Reindexing must avoid reparsing an unchanged file. Each indexed file record
must retain its exact content identity, the repository revision observed during
the scan, and the applicable configuration, grammar, and index-schema
identities. A working-tree edit must invalidate its file even when `HEAD` has
not changed. Removed, renamed, newly tracked, configuration-invalidated, and
previously failed files must be reconciled without leaving stale entities or
relationships.

Index publication must be transactional. Concurrent human and agent readers
must see either the prior complete generation or the next complete generation,
never a partial rebuild. Concurrent writers must serialize with a bounded,
actionable failure instead of corrupting the cache. Distinct worktrees retain
independent indexes because their working-tree content may differ.

## Search

Ponytail must provide fast human and versioned-JSON queries over indexed entity
identities, kinds, roles, requirement identifiers, owning paths, stable unit
names, annotations, and safe descriptive text. Search must support full-text
terms plus exact kind, role, requirement, path, and lifecycle filters; stable
ordering; safe parameter binding; and actionable stale-index diagnostics.
It must not index arbitrary file contents, secrets, credentials, hashes, or
unclassified machine metadata merely to improve recall.

## Plan text and structure index

The same worktree-local index must expose `pm/plans` as a distinct logical
corpus. Full-text search must cover normalized safe text from plan manifests,
sprints, and tasklets and return the owning plan, lifecycle, record kind and
identity, path, line, heading, and concise excerpt.

The index must also expose the canonical plan graph: direct parents and
children, ancestors and descendants, direct dependencies and reverse
dependents, campaign roots, campaign membership, lifecycle, and stable sprint,
feature, and tasklet identities, states, dependencies, and planned paths. It
must consume the existing campaign census and plan-execution readers rather
than implement another plan parser or infer relationships from directory
names.

Humans and agents must be able to query plan text, descendants, ancestors,
campaign roots, and stranded plans through explicit deterministic CLI
commands. A stranded result means a plan cannot be assigned to a canonical
campaign because its campaign metadata is missing or invalid, its parent is
unresolved, or it is an explicitly permitted unmanaged legacy record; each
result must state the reason. Ponytail must not invent campaign membership.

Traceability and plan data may share a physical SQLite database and refresh
operation, but they retain independent corpus generations, freshness checks,
tables, graph semantics, and FTS policies. A failed or stale plan generation
must not produce partial structural answers or trigger an implicit rebuild.

## Relationship-gap validation

Ponytail must validate configured relationship rules between indexed entity
kinds in either direction. A rule identifies its source kind, target kind,
allowed relationship roles, direction, and required cardinality. Validation
must report the exact unmatched source entities and the missing target kind or
relationship, rather than only returning an aggregate count.

The model must retain the existing requirement coverage rules for
implementation, unit tests or their permitted disposition, integration tests,
and UAT. It must also support project-configured inventories and rules such as
"every endpoint is required" and the inverse "every requirement has an
endpoint" without hardcoding a product framework into Ponytail. Explicit
entity declarations and configured semantic locators are canonical; Ponytail
must not infer endpoint identity from filenames or prose.

Validation exits `0` when all selected rules pass, `1` with one complete typed
gap report when selected data is valid but incomplete, and `2` when invocation,
configuration, repository, index freshness, parsing, or I/O prevents a complete
answer. Human output must be concise; JSON exits `0` and `1` with exactly one
versioned document and one trailing newline.

## Plans, tasklets, and issues

Traceability annotations must cover prospective work without presenting it as
completed coverage. Plans and tasklets may declare that they plan
implementation or verification for an approved requirement. Project issues,
including bugs, may declare requirements they introduce or clarify and the
implementation or verification classes they plan. These prospective roles are
distinct from `implements`, `supports`, and `verifies` and cannot satisfy
completed implementation or test coverage.

The traceability policy must require stable plan, sprint, feature, tasklet, and
issue identities in indexed records. When planned work becomes real, the
resulting implementation and tests retain their own canonical annotations; the
historical plan or issue relationship remains provenance rather than being
rewritten as implementation evidence.

## Plan and campaign scopes

Relationship-gap validation accepts at most one of:

```text
--plan <plan-name-or-path>
--campaign <plan-name-or-path>
```

Plan scope includes the selected plan's requirements, tasklets, linked issues,
and actual artifacts related to those requirements. Campaign scope uses the
canonical campaign census to include the same closure for every campaign
member. Scope never depends on chat history, worker assignments, or path-name
inference. Invalid or ambiguous plan/campaign membership fails without
silently broadening to repository scope.

Acceptance coverage:
[Traceability index and queries Suite](../uat/traceability-index.md).
