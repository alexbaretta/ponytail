# Portable requirements traceability

Plan ID: 2026-09-27-requirements-traceability
Status: closed

## Objective and authority

Implement the stakeholder's 2026-09-27 request for portable bidirectional
traceability among approved requirements, owned implementation, unit tests,
plain-English UAT, and executable integration tests.

Repository: Ponytail. Starting branch: `local_rules`. Starting revision:
`401982572a44021d2f5249cc53d14fc02e675e8d`; clean working tree.

## Scope

- Publish one reusable traceability policy and bind the existing requirements,
  UAT, TypeScript-test, plan-execution, project-structure, and Ponytail policy
  surfaces to it without duplicating the contract.
- Add a project-neutral, configuration-driven structural checker and generated
  reverse view.
- Add semantic TypeScript annotation validation to TSTS without making TSTS
  own Markdown, UAT, integration-Arc, or non-TypeScript structure.
- Adopt the contract in Ponytail itself, including requirements,
  architecture, UAT, project configuration, regression tests, generated host
  artifacts, and documented commands.

Publishing packages, installing changes globally, changing another repository,
and adding cloud resources are excluded.

## Architecture and contracts

The canonical architecture is documented in
[`pm/architecture/requirements-traceability.md`](../../../architecture/requirements-traceability.md).
Annotations beside stable owned units are the relationship source. The
structural checker derives reverse views and completeness; TSTS checks only
semantic TypeScript attachment. Approved roles are `implements`, `supports`,
and `verifies`.

## Acceptance

- Unknown IDs, stale reverse views, missing required relationship classes,
  unresolved structural and TypeScript locators, and missing generated
  canonical sources fail deterministically.
- Unit-test coverage or an explicit justified disposition, executable
  integration coverage, and plain-English UAT coverage are required for every
  configured approved requirement.
- Generated outputs map to canonical sources and do not duplicate
  annotations.
- Focused structural and TSTS tests, build-impact-selected targets, generated
  copy checks, the complete configured Ponytail unit command, rule-copy check,
  version check, and clean-tree verification pass.

## Sprint

1. [S01](sprints/S01.md): define, implement, adopt, publish, and validate the
   portable traceability contract — IN_PROGRESS.

## Questions and approval

Questions: [RESOLVED] The stakeholder explicitly selected the three roles,
canonical-source handling for generated outputs, required unit/integration/UAT
coverage, project-neutral configuration, assessment of the named policy
surfaces, implementation, cohesive commits, and final semantic rebase. The
smallest conforming architecture uses a companion structural checker and
keeps TSTS limited to semantic TypeScript locators.

Implementation was explicitly approved in the 2026-09-27 request.

## Starting checkpoint

After installing the repository's declared local dependencies, the complete
configured test command passed 343 core tests, installer checks, 23 Pi tests,
4 MCP tests, and 70 TSTS tests. Its final directory-structure check exposed
one setup-created untracked nested lockfile; removing that incidental file and
rerunning the exact check passed across 430 tracked files. The working tree
was clean before plan edits.

## Final validation

Build impact selected the `tsts` target from the final changed inputs, and
`npm run build:tsts` passed. The complete configured `npm test` command
passed 356 core tests, installer checks, 23 Pi tests, 4 MCP tests, 74 TSTS
tests, and the TSTS placement check across 450 files. The full selection
includes the real traceability CLI integration Arc.

The traceability checker resolved six canonical relationships with no
violations. Registry, runtime-registry, command-adapter, repeated-manifest,
eight rule-copy, seven version-pin, Skill Creator, generated OpenClaw, and
`git diff --check` validation passed.

`ponytail qa` could not run because its global registered-project scan stops
on an unrelated uncommitted
`/Users/alex/git/anchorbase/ipg/.agents/config`. This repository does not own
that state, it was not modified, and no acceptance claim depends on it.

All approved scope and acceptance criteria are complete. No package was
published and no global installation was performed.
