# Issue tracking and requirements skills

Plan ID: 2026-09-08-issue-requirements-skills
Status: closed

## Objective and authority

Implement the user's requested `issue-tracking` and `requirements` skills and
shared configurable issue/plan lifecycle directories. The 2026-09-08 request
authorizes these skill definitions and their publication/configuration sync.

Repository: Ponytail only. Starting revision: `8959bb7`; clean working tree.

## Scope

- One portable owner for issue types, shared lifecycle defaults and customization.
- Linked Markdown requirements, reconciled whenever an issue enters active work.
- Status directories for new plans; preserve existing records and sprint schemas.
- Publish skills through the canonical registry and generated host adapters.
- Preserve existing validation and execution authority while extracting issue policy.

Configuration remains agent-readable project instructions, directly or through
a referenced management document. No JSON contract, CLI migration, installation,
existing-record migration, or external-system mutation is included.

## Sprint and acceptance

1. [S01](sprints/S01.md): define and publish the skills, validate their contracts — DONE.

Validate frontmatter, references, publication metadata, focused policy tests,
build impact, full Node acceptance, rule copies, and versions. Review default
and customized lifecycles, FEAT activation, already-documented BUG activation,
TASK activation, epic links, reopen, and plan moves against the written rules.

Questions: [RESOLVED] The request supplies types, statuses, naming, epic meaning,
and requirements timing. Use the existing agent-readable configuration model.

## Acceptance evidence

Implementation: `4c64098`. All focused policy/publication checks, skill syntax
and metadata checks, full `npm test`, rule-copy validation, version validation,
and command-adapter validation passed. Build impact reported no affected or
indeterminate targets. No tracked dependency changes resulted from setup.

This plan alone moves into the new closed lifecycle directory at acceptance;
all pre-existing plans and issues retain their paths. Legacy PM CLI commands
remain limited to their documented old layout. The requested deliverable is
agent skills and publication, not executable lifecycle automation.
