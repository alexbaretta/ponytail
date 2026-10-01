<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail Requirements

This linked Markdown web records Ponytail's approved stakeholder-visible
behavior independently from implementation plans and architecture.

## Requirement sets

- [Debugging pattern observations](debugging-pattern-observations.md)
- [Requirements traceability](requirements-traceability.md)
- [Plan input queue](plan-input-queue.md)
- [Campaign orchestration](campaign-orchestration.md)
- [Ponytail CLI agent harness](ponytail-cli-agent-harness.md)
- [Traceability index and queries](traceability-index.md)
- [Issue requirement activation](issue-requirement-activation.md)
- [Pre-commit project isolation](precommit-project-isolation.md)
- [Ponytail project isolation](project-isolation.md)
- [Developer-private agent instructions](developer-private-agent-instructions.md)
- [Repository text index and grep](repository-text-index.md)
- [Worktree reclamation](worktree-reclamation.md)
- [Retained workers and worker-owned recovery](worker-worktree-retention.md)

## Campaign census CLI

**Identifier:** `REQ-CAMPAIGN-CENSUS-CLI`

**Approval:** Approved by explicit stakeholder decisions on 2026-09-24.

**Source:**
[`2026-09-24-FEAT-campaign_graph_validation_and_reporting`](../bugs/closed/2026-09-24-FEAT-campaign_graph_validation_and_reporting.md)
and the stakeholder's 2026-09-24 clarification of findings 1–7 and subsequent
approval of lifecycle-independent plan-name input, including
`<plan-name>/plan.md`, and an operator-facing tasklet census modeled on the
supplied 2026-09-24 campaign snapshot, including aligned human-report tables;
plus the stakeholder's 2026-09-28 clarification of default table selection and
omitted report input. The stakeholder's 2026-09-29
[`REQ-CAMPAIGN-ORCHESTRATION`](campaign-orchestration.md) decision supersedes
only the single-active-campaign assumption for omitted report input.

With explicit plan input, Ponytail must provide a read-only CLI that accepts a
managed plan's exact stable name, `<stable-name>/plan.md`, explicit plan
directory, or explicit `plan.md` path; follows authored direct-parent metadata
to the campaign root; derives descendants by scanning configured plan
locations; validates only the resulting campaign; and reports an accurate
census of its plans, sprints, and tasklets. The first two forms are resolved
across the configured lifecycle locations and must identify exactly one
physical plan. No-input repository inventory is governed by
`REQ-CAMPAIGN-ORCHESTRATION`.

A plan participates only when its manifest contains the supported campaign
metadata block. An unrelated unmarked historical plan does not invalidate a
managed campaign, while a selected or referenced unmarked plan is invalid and
must be explicitly migrated before certification.

The campaign graph must have one authored source for each fact:

- each plan authors only its direct parent, or `null` when it is the root;
- each declared parent contains a human-readable reference to each direct
  member that names it;
- children and descendants are derived;
- lifecycle is derived from the configured containing directory.

Scanning other plan locations is discovery, not repository-wide validation.
Errors in an unrelated campaign must not affect validation or reporting of the
campaign containing the supplied plan.

Explicitly selected campaign validation must use deterministic traversal and
stop at the first error. Explicitly selected reporting must validate first and
must not emit a partial census for an invalid campaign. The no-input repository
inventory is complete when it classifies invalid plans with diagnostics rather
than inventing their membership; those records are not a partial campaign
census.

The CLI must provide deterministic human output and versioned JSON contracts.
Exit `0` means every reported managed record is valid, `1` means the selected
campaign or repository inventory contains invalid project-management data, and
`2` means the tool could not determine the requested result because invocation,
repository, configuration, I/O, or tool execution failed. Selected-campaign
fail-fast diagnostics go to stderr without a partial report. Repository
inventory output may carry invalid plan records and their diagnostics as typed
data. Every `--json` success or data-invalid result emits exactly one JSON
document and one trailing newline.

The report's plan input is optional. With explicit plan input, it reports only
the selected campaign and remains isolated from unrelated campaign defects.
Without plan input, it emits the repository-wide campaign inventory governed by
`REQ-CAMPAIGN-ORCHESTRATION`. Each top-level worktree may contain zero or one
valid active campaign; multiple candidates are reported completely as invalid
state rather than reduced to an opaque ambiguity. Lifecycle placement and
campaign backlinks remain the sources of truth. A coordinator's separate
operational binding selects that worktree's one current campaign.

The human report must show only the campaign's summary tasklet table by
default. CLI options independently enable or disable that summary table, the
per-plan table, and the incomplete-sprint table. Its enabled tables must
keep every column aligned when plan and sprint identifiers have different
lengths, without depending on terminal tab stops. It reports
`DONE`, `PENDING`, `ERROR`, and total tasklets grouped by plan lifecycle, the
same campaign-wide totals and completion percentage. When enabled, the plan
table reports the same counts for each plan and the sprint table identifies
incomplete sprints with their tasklet counts. Every human-report table aligns
its columns for the actual labels and values.
`PENDING` is not reported as blocked, and the human report does not need to
print every tasklet record; the JSON report retains normalized tasklet-level
data for programmatic queries.

A missing bare plan name is an input-resolution failure with exit `2`. A bare
name present in more than one lifecycle location is invalid project-management
data and fails with exit `1` rather than selecting one arbitrarily.

Campaign validation and reporting must not mutate repositories or external
systems. They must not schedule parallel work, assign or inspect workers,
compare worktrees, integrate branches, or calculate throughput or ETA. The
separate campaign status and advance contracts are governed by
`REQ-CAMPAIGN-ORCHESTRATION`.

A non-root plan may close after its own approved acceptance. A campaign root
with descendants may close only when every campaign member is complete and
final validation succeeds against the exact closing tree.

Acceptance coverage:
[`Campaign census Suite`](../uat/index.md#campaign-census-suite).
