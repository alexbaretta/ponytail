# User acceptance testing policy

Plan ID: 2026-09-16-user-acceptance-testing
Status: in_progress

## Objective and authority

Implement the user's 2026-09-16 request for project-agnostic requirements
provenance and user-acceptance-testing policy, publish it through Ponytail's
configured host surfaces, and install the accepted source.

Repository: Ponytail. Starting revision: `eb2b782891689f905ad196ac11a33e9463c029be`;
clean working tree.

## Scope

- Extend requirements policy for sourced, ranked, and explicitly reconciled
  imported and reverse-engineered claims.
- Add a reusable user-acceptance-testing skill that owns plain-English Suites,
  Arcs, Steps, release evidence, and execution-profile semantics.
- Extend production-test and project-structure policy for persistent
  non-production profiles and a configured UAT documentation root.
- Publish the reusable skill through every configured Ponytail host surface.
- Install the accepted Ponytail source.

Project-specific UAT commands, product behavior, concrete UAT Suites, remote
environment mutation, and an adopting project's local configuration are
excluded from this reusable-policy plan.

## Sprint and acceptance

1. [S01](sprints/S01.md): define, publish, validate, and install the reusable
   policy — IN_PROGRESS.

Acceptance requires exact source ownership, generated publication parity,
focused policy tests, the configured full Ponytail suite, and successful Codex
installation.

Questions: [RESOLVED] The user chose a reusable project-agnostic skill,
project-local operational mechanics, no integration commands in reusable
policy, and no new core Ponytail rule.

## Starting checkpoint

`DEVELOPER_DIR=/Library/Developer/CommandLineTools npm test` passed before the
first source edit. Selecting Command Line Tools avoids the host's unrelated
full-Xcode license gate without changing host state.
