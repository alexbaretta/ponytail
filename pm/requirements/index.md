<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail Requirements

This linked Markdown web records Ponytail's approved stakeholder-visible
behavior independently from implementation plans and architecture.

## Campaign census CLI

**Identifier:** `REQ-CAMPAIGN-CENSUS-CLI`

**Approval:** Approved by explicit stakeholder decisions on 2026-09-24.

**Source:**
[`2026-09-24-FEAT-campaign_graph_validation_and_reporting`](../bugs/closed/2026-09-24-FEAT-campaign_graph_validation_and_reporting.md)
and the stakeholder's 2026-09-24 clarification of findings 1–7 and subsequent
approval of bare plan-name input.

Ponytail must provide a read-only CLI that accepts a managed plan's exact
stable name, plan directory, or `plan.md`; follows authored direct-parent
backlinks to the campaign root; derives descendants by scanning configured
plan locations; validates only the resulting campaign; and reports an accurate
census of its plans, sprints, and tasklets. A bare name is resolved across the
configured lifecycle locations and must identify exactly one physical plan.

A plan participates only when its manifest contains the supported campaign
metadata block. An unrelated unmarked historical plan does not invalidate a
managed campaign, while a selected or referenced unmarked plan is invalid and
must be explicitly migrated before certification.

The campaign graph must have one authored source for each fact:

- each plan authors only its direct parent, or `null` when it is the root;
- children and descendants are derived;
- lifecycle is derived from the configured containing directory.

Scanning other plan locations is discovery, not repository-wide validation.
Errors in an unrelated campaign must not affect validation or reporting of the
campaign containing the supplied plan.

Validation must use deterministic traversal and stop at the first error.
Reporting must validate first and must not emit a partial census for an invalid
campaign.

The CLI must provide deterministic human output and a versioned JSON census.
Exit `0` means valid, `1` means invalid project-management data, and `2` means
the tool could not determine validity because invocation, repository,
configuration, I/O, or tool execution failed. Successful output goes to stdout;
fail-fast diagnostics go to stderr. Successful `--json` reporting emits exactly
one JSON document and one trailing newline.

A missing bare plan name is an input-resolution failure with exit `2`. A bare
name present in more than one lifecycle location is invalid project-management
data and fails with exit `1` rather than selecting one arbitrarily.

The tool must not mutate repositories or external systems. It must not schedule
parallel work, assign or inspect workers, compare worktrees, integrate branches,
or calculate throughput or ETA.

A non-root plan may close after its own approved acceptance. A campaign root
with descendants may close only when every campaign member is complete and
final validation succeeds against the exact closing tree.

Acceptance coverage:
[`Campaign census Suite`](../uat/index.md#campaign-census-suite).
