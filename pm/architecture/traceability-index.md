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

### SQLite projection

Each worktree stores one ignored SQLite database at a project-configured path,
defaulting to `tmp/requirements-traceability/index.sqlite`. SQLite FTS5 supplies
full-text search over explicitly safe normalized fields. This avoids a required
PostgreSQL service and avoids Python pickle's opaque, language-specific,
unsafe deserialization while retaining transactional reads, one serialized
writer, deterministic SQL queries, and portable rebuilds.

The physical database schema is versioned and disposable. Tables represent
index metadata, indexed files, entities, relationships, diagnostics, scope
memberships, and one external-content FTS5 projection. Foreign keys and unique
constraints protect stable identities. Rebuild and incremental update write a
new generation in one transaction; readers select one published generation.
The database stores no authoritative approval or completion state.

### Incremental identity

Each file record retains repository-relative path, exact content object ID or
digest, observed `HEAD`, Git state, parser/configuration identity, and last
result. The exact content identity—not merely the last modifying commit—is the
skip key, because uncommitted edits can change annotations while `HEAD` stays
constant. Configuration, grammar, schema, or semantic-locator changes
invalidate every affected file. A current tracked-file inventory detects adds,
deletes, and renames; one file update replaces all of that file's indexed rows
atomically.

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

### CLI boundary

The installed dispatcher exposes one command family:

```text
ponytail traceability index [--rebuild] [--json]
ponytail traceability search <query> [filters] [--json]
ponytail traceability validate [--plan <plan> | --campaign <plan>] [--json]
```

`index` is the only mutating operation and changes only the configured ignored
cache. `search` and `validate` are read-only, require a current compatible
index, and never rebuild implicitly. All SQL values are bound parameters.
Human and JSON output use the same normalized query result.

Plan scope resolves one plan through the campaign census locator and includes
its tasklets, linked issues, directly named requirements, and actual artifacts
related to those requirements. Campaign scope first resolves the canonical
campaign membership and unions those plan scopes. Scope derivation is stored as
rebuildable index data and never becomes another campaign or plan relationship
source.

### Concurrency and failure

SQLite WAL mode permits concurrent snapshot readers. One bounded writer lock
serializes reindexing inside a worktree; a second writer reports a retryable
busy diagnostic. The transaction publishes no partial generation. A crash,
schema mismatch, integrity failure, or projection-policy change requires an
explicit rebuild. Separate worktrees do not share the database, so one
worktree's dirty files, indexing failure, or lock cannot alter another's query
result.
