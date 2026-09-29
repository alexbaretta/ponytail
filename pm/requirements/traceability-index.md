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
traceability annotations. On 2026-09-29, the stakeholder clarified that the
index must use the PostgreSQL service already mandated for the project journal
instead of recreating a SQLite database in every worktree. The stakeholder also
defined a stranded plan exactly as plan P referencing campaign C without the
reciprocal C-to-P reference.

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
never a partial rebuild. Concurrent writers for the same worktree and corpus
must serialize with a bounded, actionable failure instead of corrupting the
cache. Distinct worktrees retain independently published generations because
their working-tree content may differ, while identical content and parse
results may be reused through the long-lived project index.

The index must use the project's existing configured PostgreSQL service and
stable project identity. It must not require a per-worktree database or a
second database service. Every indexed generation and query is isolated by
project, repository, worktree, and corpus so one worktree's dirty state,
failed refresh, or rebuild cannot replace another worktree's published answer.

## Search

Ponytail must provide fast human and versioned-JSON queries over indexed entity
identities, kinds, roles, requirement identifiers, owning paths, stable unit
names, annotations, and safe descriptive text. Search must support full-text
terms plus exact kind, role, requirement, path, and lifecycle filters; stable
ordering; safe parameter binding; and actionable stale-index diagnostics.
It must not index arbitrary file contents, secrets, credentials, hashes, or
unclassified machine metadata merely to improve recall.

## Plan text and structure index

The same project index must expose each worktree's `pm/plans` state as a
distinct logical corpus. Full-text search must cover normalized safe text from
plan manifests, sprints, and tasklets and return the owning plan, lifecycle,
record kind and identity, path, line, heading, and concise excerpt.

The index must also expose the canonical plan graph: direct parents and
children, ancestors and descendants, direct dependencies and reverse
dependents, campaign roots, campaign membership, lifecycle, and stable sprint,
feature, and tasklet identities, states, dependencies, and planned paths. It
must consume the existing campaign census and plan-execution readers rather
than implement another plan parser or infer relationships from directory
names.

Humans and agents must be able to query plan text, descendants, ancestors,
campaign roots, and stranded plans through explicit deterministic CLI
commands. A stranded result means exactly that plan P declares campaign parent
C, but C does not reference P. Each stranded result must identify P, C, and the
missing reciprocal reference. Malformed metadata, missing parents or
dependencies, duplicate identities, and cycles are invalid-plan diagnostics,
not stranded results. An unmarked plan not referenced by managed campaign
metadata is classified separately as unmanaged legacy data regardless of its
location and must not appear in the stranded query. Ponytail must not invent
campaign membership.

Traceability and plan data share the configured PostgreSQL database and refresh
operation, but they retain independent corpus generations, freshness checks,
tables, graph semantics, and full-text policies. A failed or stale plan
generation must not produce partial structural answers or trigger an implicit
rebuild.

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
