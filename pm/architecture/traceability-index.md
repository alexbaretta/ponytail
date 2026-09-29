<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Traceability index

[Back to architecture index](index.md) · Governing requirement:
[`REQ-TRACEABILITY-INDEX`](../requirements/traceability-index.md)

## Proposed architecture

The canonical traceability parser remains the only owner of requirement
declarations, entity declarations, annotation grammar, artifact
classification, and relationship semantics. A separate index component
consumes its normalized entities, relationships, and diagnostics and persists
a rebuildable local projection. The existing checked-in Markdown reverse view
continues to be generated from canonical annotations; the database does not
replace it.

The same projection component also indexes plan records, but traceability and
plan data remain separate logical corpora. They share database lifecycle,
and content-addressed file-identity machinery without conflating their entity
models, graph semantics, safe-text policies, worktree generations, or
freshness checks.

### PostgreSQL projection

The projection uses the PostgreSQL 18 service, database connection settings,
and stable project identity already configured by `ponytail-journal.json`.
The journal and index remain separate components: journal tables stay in
`ponytail_journal`, while a separately owned `ponytail_index` schema contains
only rebuildable index state. The existing setup command provisions both
schemas idempotently. This adds no database service and stores no secret in the
repository configuration.

PostgreSQL `tsvector` columns with GIN indexes provide full-text search over
explicitly safe normalized fields; B-tree indexes serve exact filters and
graph joins. The Node projection component uses the `pg` client and PostgreSQL
parameter binding rather than constructing SQL or `tsquery` text from user
input. PostgreSQL replaces both a per-worktree SQLite lifecycle and Python
pickle's opaque, language-specific, unsafe deserialization.

The physical index schema is versioned and disposable. Shared tables represent
projects, repositories, worktrees, index metadata, exact content identities,
and reusable parse results. Separate generation, entity, relationship,
diagnostic, and search-document tables represent the traceability and plan
corpora. Foreign keys and unique constraints protect stable identities.
The project key is the configured journal project UUID; the repository-instance
key is its canonical absolute Git common-directory path, and the worktree key
is its canonical absolute top-level path. These machine locators are excluded
from full-text search. Moving or removing a checkout retires that locator
rather than aliasing it to a different tree.
Rebuild and incremental update write new worktree corpus generations in one
transaction; readers select the published generation for their exact project,
repository, worktree, and corpus. The database stores no authoritative
approval or completion state. Superseded generation rows are removed without
invalidating concurrent PostgreSQL snapshots; reusable content and parse rows
are garbage-collected only after no published worktree generation references
them.

### Incremental identity

Each generation maps a repository-relative path to its exact content object ID
or digest, observed `HEAD`, Git state, parser/configuration identity, and last
result. The exact content and parser identity—not merely the last modifying
commit—is the reusable parse-cache key, because uncommitted edits can change
annotations while `HEAD` stays constant. A newly created worktree can reuse
already parsed identical content without recreating a database. Configuration,
grammar, schema, or semantic-locator changes invalidate every affected parse
result. A current tracked-file inventory detects adds, deletes, and renames;
publication replaces the complete worktree corpus generation atomically.

### Entity and relationship graph

The current artifact annotations normalize into stable entity records and
directed relationship records. Existing roles remain `implements`, `supports`,
and `verifies`. New prospective roles record `plans implementation`, `plans
verification`, and `introduces` without counting as completed coverage.

Plans, tasklets, and issues use their canonical project-management identities.
Other inventory kinds, including endpoints, use an explicit adjacent entity
declaration or a configured semantic locator. The index never guesses entities
from paths. Project configuration owns a versioned validation matrix whose
rules select a source kind, target kind, roles, direction, and cardinality.
The validator evaluates each rule in both repository and selected scopes and
emits each unmatched source entity.

### Plan corpus and graph

Plan indexing delegates campaign identity, lifecycle, parentage, and direct
plan dependencies to the canonical campaign census. It delegates sprint,
feature, tasklet, dependency, and readiness records to the plan-execution
readers. The projection stores those normalized facts and derives children,
ancestors, descendants, reverse dependents, campaign roots, membership, and
reasoned stranded-plan results. Directory names and prose never create graph
edges.

The plan full-text projection contains only normalized safe text from plan
manifests, sprints, and tasklets, linked to owning plan, lifecycle, record kind
and identity, source path and line, heading, and excerpt. Plan and traceability
files share exact content and cached parse identities where applicable,
including across worktrees, but each corpus has its own parser/configuration
identity and worktree generation so invalidation is precise and partial answers
are impossible.

### CLI boundary

The installed dispatcher exposes one command family:

```text
ponytail traceability index [--rebuild] [--json]
ponytail traceability search <query> [filters] [--json]
ponytail traceability validate [--plan <plan> | --campaign <plan>] [--json]
ponytail plan search <query> [filters] [--json]
ponytail plan descendants <plan> [--direct] [--json]
ponytail plan ancestors <plan> [--json]
ponytail plan roots [--json]
ponytail plan stranded [--json]
```

`index` is the only mutating operation and changes only the rebuildable
`ponytail_index` schema; it refreshes the current worktree's configured corpora
transactionally. Traceability and plan queries are read-only, select only the
calling worktree's current compatible corpus, and never rebuild implicitly.
All SQL values are bound parameters. Human and JSON output use the same
normalized query result.

Plan scope resolves one plan through the campaign census locator and includes
its tasklets, linked issues, directly named requirements, and actual artifacts
related to those requirements. Campaign scope first resolves the canonical
campaign membership and unions those plan scopes. Scope derivation is stored as
rebuildable index data and never becomes another campaign or plan relationship
source.

### Concurrency and failure

PostgreSQL MVCC permits concurrent snapshot readers. A transaction-scoped
advisory lock is keyed by project, repository, worktree, and corpus; it
serializes competing refreshes of the same answer without globally locking
other worktrees or corpora. A second same-key writer reports a bounded,
retryable diagnostic. Immutable content-cache insertion is idempotent and does
not publish another worktree's generation. A transaction publishes no partial
generation. A crash leaves the prior generation current; a schema mismatch,
integrity failure, or projection-policy change requires explicit setup or
rebuild. One worktree's dirty files, indexing failure, or lock cannot alter
another worktree's published query result.
