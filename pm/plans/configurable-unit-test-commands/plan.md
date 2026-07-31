# Configurable Unit-Test Commands

Plan ID: `configurable-unit-test-commands`

Status: `IN_PROGRESS`

## Objective

Make unit-test cadence project-configurable and project-neutral: use only
explicitly selected focused unit tests while executing tasklets, features, and
sprints, then run each affected repository's configured full unit-test
command once at plan final acceptance.

## Scope

- Define one host configuration contract for named unit-test families.
- Give every family a focused command or selector form and a full command.
- Support one or many test languages and runners without a portable default.
- Make focused unit tests the only unit-test cadence before plan acceptance.
- Reserve full unit-test commands for final plan acceptance or another
  explicitly configured user, merge, CI, or release gate.
- Synchronize all affected reusable skills and generated portable policy
  copies.
- Configure Ponytail and the governed IPG and GWEN repositories.

## Explicit Exclusions

- Do not hardcode `npm`, `pnpm`, Vitest, Jest, Node test, CTest, or another
  runner in portable policy.
- Do not add a unit-test impact analyzer or infer tests from source changes.
- Do not add wrapper scripts when an existing runner already supports focused
  selection.
- Do not change integration-test, browser-test, build-impact, packaging,
  deployment, or release behavior.
- Do not run full unit-test commands at tasklet, feature, or sprint completion.
- Do not retain deprecated configuration-key aliases.

## Repositories And Ownership

- Management repository and portable policy: Ponytail.
- Ponytail host configuration and acceptance: Ponytail.
- Consumer command values and validation: each governed consumer repository.
- Initial governed consumers: IPG and GWEN.

## Decisions

### [RESOLVED] D01: Portable Configuration Shape

The host configures a named unit-test-family table, directly in `AGENTS.md` or
through its canonical command inventory. Each row owns:

- a stable family name;
- a focused command or command form that accepts explicit test files or named
  test cases; and
- a full command for that family's complete unit-test suite.

Commands may be marked `not applicable` or `not configured` when the project
does not own that operation. There is no portable command default.

Source: user requirement that unit-test commands be configurable and not
assumed to use `npm test`.

### [RESOLVED] D02: Planned-Work Cadence

During tasklet, feature, and sprint execution, run only the smallest explicit
selection of unit-test files or named cases needed to exercise changed
behavior. Do not run a whole repository, package, workspace, language family,
or other broad unit-test subset.

At plan final acceptance, run every configured full unit-test command for each
repository affected by the plan, once after its final relevant edit.

Source: user direction to use focused unit tests while working and perform the
full run at the end of the plan.

### [RESOLVED] D03: Non-Plan Work

Standalone changes and bugs use focused unit tests. A full unit-test command
runs only when the user explicitly requests it or the host assigns it to a
named merge, CI, release, or equivalent acceptance gate.

Source: the same cost-control objective applied outside long-lived plans
without weakening explicit host or user authority.

### [RESOLVED] D04: Multiple Languages

One project may configure any number of named unit-test families. Portable
policy iterates the configured families; language-specific skills refine
selection behavior but do not own a second command registry.

Source: existing mixed-language project requirements and the requirement to
avoid a single hardcoded runner.

### [RESOLVED] D05: Missing Focused Selection

When a relevant family lacks a usable focused command or selector form, report
and repair the project-configuration discrepancy. Do not fall back to its full
command.

Source: focused execution must remain a real constraint rather than a
best-effort preference.

## Questions

No open plan-level questions.

## Plan-Wide Acceptance Criteria

- Portable policy names no package manager, test runner, language, or consumer
  project.
- Host configuration supports multiple named unit-test families.
- Each family independently configures focused and full commands.
- Tasklet, feature, and sprint rules prohibit full and broad unit-test runs.
- Plan final acceptance requires each applicable configured full command once
  after final relevant edits.
- Standalone work cannot fall back from a missing focused selector to a full
  suite.
- `plan-execution`, `project-structure`, `production-test-boundaries`,
  `typescript-unit-testing`, and the always-on Ponytail policy agree.
- Generated host policy copies match the canonical Ponytail skill.
- Ponytail, IPG, and GWEN contain exact command values discovered from their
  authoritative scripts and package configuration.
- Focused validation proves explicit selection in each configured family
  without running a full suite.
- Final plan acceptance runs the configured full unit-test commands once and
  records their results.

## Sprint Manifest

1. [S01: Define Portable Unit-Test Cadence](sprints/S01.md) — `DONE`
2. [S02: Configure Governed Projects](sprints/S02.md) — `IN_PROGRESS`

## Approval

The user explicitly approved implementation and installation by directing the
agent to implement the plan and install the skills.

## Final Validation

Pending implementation and approval.
