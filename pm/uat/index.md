<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail User Acceptance Testing

This linked Markdown web records plain-English acceptance behavior. Ponytail
has no separate UAT operations skill or release-authorization policy. The
campaign census Arcs are automated at the production module and real CLI
boundary by `tests/campaign-census.test.js`.

## Suite index

- [Campaign census](#campaign-census-suite)
- [Debugging pattern observations](debugging-pattern-observations.md)

## Campaign census Suite

**Requirement:**
[`REQ-CAMPAIGN-CENSUS-CLI`](../requirements/index.md#campaign-census-cli),
approved 2026-09-24.

### Arc: Report the same valid campaign from any member

- **Actor:** Ponytail CLI user or agent.
- **Prerequisites:** A valid managed campaign fixture containing a root, at
  least two descendant plans, sprints, features, and tasklets, plus an
  unrelated unmarked historical plan and an unrelated malformed campaign.
- **Profiles:** Automated by `node --test tests/campaign-census.test.js`; no
  manual profile is required.
- **External effects:** None; the operation is read-only.

1. Run campaign validation from the root plan.
   - Validation succeeds with exit `0` and one concise stdout confirmation.
2. Run campaign validation again using only the root's stable plan name,
   without a status directory or `plan.md` path.
   - Validation resolves the unique plan across configured lifecycle locations
     and reports the same campaign.
3. Run the human census report from the root and from each descendant.
   - Every invocation reports the same root, members, statuses, counts, and
     deterministic ordering.
   - The report leads with tasklet counts grouped by plan lifecycle and a
     campaign total, using distinct `DONE`, `PENDING`, and `ERROR` columns plus
     total and completion percentage.
   - The plan census repeats those tasklet counts for each plan, and the
     incomplete sprint census lists only unfinished sprints with their counts.
     It does not label a merely pending tasklet as blocked or print every
     tasklet record.
4. Run the JSON census report from one member.
   - Exit is `0`; stdout is exactly one versioned JSON document plus one
     newline; stderr is empty; its census facts equal the human report.
5. Inspect repository and external state.
   - No project-management record, Git state, worker, worktree, or external
     system was changed.
6. Repeat the reports with the unrelated unmarked historical plan present.
   - The managed campaign census is unchanged; selecting or referencing that
     historical plan instead fails validation until it is explicitly migrated.
7. Repeat the reports with the unrelated malformed campaign present.
   - The selected campaign still validates and reports successfully; no error
     from the unrelated campaign appears.

### Arc: Fail at the first deterministic campaign error

- **Actor:** Ponytail CLI user or agent.
- **Prerequisites:** Invalid fixtures whose earliest deterministic error is,
  respectively, a missing parent, parent cycle, duplicate member plan ID,
  lifecycle-placement error, unsupported version, or invalid sprint or tasklet
  graph.
- **Profiles:** Automated by `node --test tests/campaign-census.test.js`; no
  manual profile is required.
- **External effects:** None; the operation is read-only.

1. Run validation against each invalid fixture.
   - Exit is `1`; stdout is empty; stderr contains exactly one stable,
     actionable diagnostic for the first error in deterministic traversal
     order.
2. Run the report against the same fixture.
   - It returns the same failure and emits no partial census.
3. Invoke the command with an invalid argument or unavailable configuration.
   - Exit is `2`, stdout is empty, and stderr explains why validity could not be
     determined.
4. Invoke the command with a missing bare plan name, then with a bare name that
   exists in two lifecycle locations.
   - The missing name exits `2`; the ambiguous name exits `1`; neither
     invocation selects a plan arbitrarily or emits a partial report.
5. Inspect repository and external state.
   - No state was changed.

### Arc: Enforce campaign-root closure

- **Actor:** Agent maintaining a managed campaign.
- **Prerequisites:** A campaign root with at least one incomplete descendant,
  followed by the same campaign with all member acceptance complete.
- **Profiles:** Automated by `node --test tests/campaign-census.test.js`; no
  manual profile is required.
- **External effects:** None during validation.

1. Validate the campaign while a descendant is incomplete and the root claims
   the successful-completion lifecycle.
   - Validation fails with exit `1` and the root-closure diagnostic.
2. Complete every member's approved acceptance and validate the exact closing
   tree again.
   - Validation succeeds with exit `0`.

### Arc: Keep census separate from orchestration

- **Actor:** Ponytail CLI user or agent.
- **Prerequisites:** A valid campaign containing independent and overlapping
  planned paths across member plans.
- **Profiles:** Automated by `node --test tests/campaign-census.test.js`; no
  manual profile is required.
- **External effects:** None; the operation is read-only.

1. Run the campaign report.
   - It reports the declared paths as census data but emits no runnable lanes,
     worker assignment, worktree comparison, integration queue, throughput,
     ETA, or parallel-safety conclusion.

## Acceptance evidence

The original four Arcs passed on 2026-09-24 in the focused campaign test file
against implementation commit `5329514`; the configured full Ponytail command
then passed with zero failures or skips. The same focused profile owns the
subsequent bare-name and operator-facing tasklet-census refinements.
