<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Traceability index and queries Suite

[Back to UAT index](index.md) · Requirement:
[`REQ-TRACEABILITY-INDEX`](../requirements/traceability-index.md), approved
2026-09-29.

## Arc: Incrementally index the exact repository state

Traceability: verifies REQ-TRACEABILITY-INDEX

- **Actor:** Repository agent or developer.
- **Prerequisites:** A test repository containing configured requirements,
  implementation, tests, UAT, plans, tasklets, bugs, and declared endpoints.
- **Profiles:** Automated real CLI and isolated Git-repository profile.
- **External effects:** Writes only rebuildable rows in the configured
  PostgreSQL `ponytail_index` schema.

1. Build the index and inspect its JSON result.
   - Every supported entity and annotation is present; the result identifies
     the repository revision, worktree, generation, processed files, and
     database schema version.
2. Reindex without changing inputs.
   - No source file is reparsed and the logical query result is unchanged.
3. Create a second worktree at the same revision and index it.
   - No database is created in that worktree; identical content reuses cached
     parse results while the worktree receives its own published generations.
4. Change one tracked file without committing, add one file, rename one,
   delete one, and reindex.
   - The dirty file is detected despite unchanged `HEAD`; only invalidated
     files are processed; removed paths leave no stale rows.
5. Change parser or configuration identity and reindex.
   - Every affected file is reparsed.
6. Interrupt a rebuild and query concurrently.
   - Readers observe the prior complete generation; no partial generation is
     published. A same-worktree writer succeeds serially or returns the bounded
     retryable diagnostic, while an independent worktree refresh can proceed
     and neither can replace the other's generation.

## Arc: Search annotations quickly and safely

Traceability: verifies REQ-TRACEABILITY-INDEX

- **Actor:** Human or agent.
- **Prerequisites:** A current index containing overlapping words, identifiers,
  kinds, roles, paths, and lifecycle states.
- **Profiles:** Automated real CLI profile.
- **External effects:** None.

1. Search by words and phrases, then combine exact filters.
   - Results match normalized safe fields, apply every filter, and retain
     stable ordering in human and JSON output.
2. Search using punctuation and SQL/FTS metacharacters.
   - Input is safely parsed and parameter-bound; it cannot change the query or
     database.
3. Search an index whose source state or schema is stale.
   - The command fails with an actionable freshness diagnostic and does not
     silently rebuild or return stale results.
4. Inspect indexed values.
   - Arbitrary file content, credentials, hashes, and excluded machine metadata
     are absent.

## Arc: Search and traverse the plan corpus

Traceability: verifies REQ-TRACEABILITY-INDEX

- **Actor:** Campaign coordinator, planning agent, or developer.
- **Prerequisites:** A current index containing nested campaigns, direct plan
  dependencies, lifecycle states, tasklets, and deliberately invalid or
  unmanaged plan records.
- **Profiles:** Automated real CLI and campaign-census integration profile.
- **External effects:** None.

1. Search plan text for `processor` and combine exact lifecycle, record-kind,
   and owning-plan filters.
   - Stable human and JSON results identify the owning plan, record identity,
     path, line, heading, and excerpt without returning arbitrary file text.
2. Query a plan's direct children, all descendants, ancestors, dependencies,
   and reverse dependents.
   - Results match the canonical census and plan-execution graph without
     path-name or prose inference.
3. Query campaign roots and membership from both a root and a member.
   - Both identify the same canonical root and complete member set.
4. Query stranded plans.
   - Only unresolved or invalid managed records are returned, each with its
     derivation reason; explicitly permitted flat-layout legacy plans remain
     searchable as unmanaged legacy records but are not reported as stranded,
     and no membership is invented.
5. Change only one sprint or tasklet file and reindex.
   - Only invalidated plan inputs are reparsed, the plan generation changes,
     and the unchanged traceability corpus remains queryable.
6. Query after plan inputs or the plan schema become stale.
   - Structural and text commands fail with an actionable diagnostic and do
     not silently rebuild or return a partial graph.

## Arc: Report every relationship gap

Traceability: verifies REQ-TRACEABILITY-INDEX

- **Actor:** Planning agent or reviewer.
- **Prerequisites:** Configured bidirectional coverage rules with complete and
  incomplete requirements, implementations, endpoints, unit tests, integration
  tests, UAT, tasklets, and issues.
- **Profiles:** Automated production-module and real CLI profile.
- **External effects:** None.

1. Validate the repository-wide graph.
   - The report evaluates every configured source/target/direction rule and
     identifies each unmatched source entity, missing target kind, role, and
     cardinality with exit `1`.
2. Add the missing canonical relationships, reindex, and repeat.
   - Validation exits `0`; inverse queries return the same relationships.
3. Leave only a prospective plan or bug relationship for missing actual work.
   - The plan remains discoverable, but validation still reports missing
     implementation or verification coverage.
4. Query endpoint-to-requirement and requirement-to-endpoint rules.
   - Each direction reports its own unmatched entities without assuming the
     inverse rule.

## Arc: Restrict gaps to one plan or campaign

Traceability: verifies REQ-TRACEABILITY-INDEX

- **Actor:** Plan or campaign coordinator.
- **Prerequisites:** Two unrelated plans plus a multi-plan campaign, with
  distinct and shared requirements and linked bugs.
- **Profiles:** Automated real CLI and campaign-census integration profile.
- **External effects:** None.

1. Validate with `--plan` using the plan name and exact path forms.
   - Only that plan's tasklets, linked issues, named requirements, and actual
     related artifacts participate.
2. Validate with `--campaign` from the root and a member.
   - Both resolve the same canonical campaign and include every member plan's
     closure exactly once.
3. Supply both scope options, an ambiguous plan, or invalid campaign metadata.
   - The command fails without falling back to repository scope or emitting a
     partial gap report.

## Incremental execution evidence

On 2026-09-29, the first two Arcs passed incrementally against the Ponytail
repository and its configured PostgreSQL database. The real-database contract
script proved exact dirty-state invalidation, cache-hit parse skipping,
cross-worktree cache reuse with generation isolation, rename/deletion cleanup,
transaction rollback, same-worktree contention, independent-worktree
progress, safe generated `tsvector` search, and public-role exclusion. The
real `ponytail traceability` dispatcher then indexed the current worktree,
reported 23 reused files on an unchanged repeat, returned the expected
role-filtered implementation relationship in versioned JSON, safely treated a
punctuation-heavy injection probe as search text, and rejected a deliberately
stale generation with exit status 2 and `PROJECT_INDEX_STALE` without
rebuilding. Focused unit, setup-stub, versioned-contract, installer, and
distribution tests cover the same boundaries without requiring a global CLI
installation.

The plan-corpus Arc then passed focused canonical-census, immutable-cache,
invalid-parent, missing-backlink, cycle, exact-filter, injection-safe search,
recursive graph, and versioned-result tests. The real PostgreSQL contract and
public `ponytail plan` dispatcher published a separate current plan generation,
searched normalized plan text, listed canonical campaign roots, and returned
invalid stranded records with explicit reasons while retaining permitted flat
legacy records under their distinct unmanaged classification. Final S01
reconciliation proved one-file plan invalidation, unchanged-file parse reuse,
traceability-corpus isolation, stale-generation rejection, installation, and
distribution after the last relevant edit.
