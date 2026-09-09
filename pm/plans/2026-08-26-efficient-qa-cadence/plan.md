# Efficient QA Cadence

- Plan ID: `2026-08-26-efficient-qa-cadence`
- Status: `DONE`
- Approval: The user approved implementation, commit, and subsequent
  `scripts/install.sh` execution on 2026-08-26.

## Objective

Apply automated product QA only to changes consumed by executable product,
build, packaging, deployment, data-contract, generation, or automated-test
paths, and assign progressively broader proof to tasklet, feature, sprint, and
plan convergence gates without rerunning unchanged evidence.

## Scope

- Define QA-relevant and QA-exempt inputs by their configured consumers.
- Specify focused tasklet proof, focused feature integration proof, affected
  sprint Arcs, and plan-final full unit and applicable Suite gates.
- Preserve build-impact, specialized contract guards, browser proof, evidence
  reuse, and unavailable-proof reporting.
- Synchronize Ponytail's always-on testing rule, policy tests, generated rule
  copies, and generated OpenClaw skills.
- Commit the complete repository change-set.

## Exclusions

- Inventing host-specific test commands, environments, Arcs, or Suites.
- Treating filename extensions alone as QA eligibility.
- Requiring product tests for pure prose, project-management records, or inert
  reference data that no executable path consumes.
- Changing integration harness implementation or product behavior.
- Installation is a user-authorized post-commit action, not repository source
  implementation or plan acceptance evidence.

## Acceptance Criteria

- The policy gives a finite, consumer-based QA eligibility test.
- Pure non-executable documentation and inert data skip the product-test
  ladder but retain applicable structural validation.
- Tasklets run the smallest focused unit, static, or contract proof.
- Features reuse tasklet evidence and run only distinct combined proof plus the
  smallest sufficient independently executable integration workflow.
- Sprints run every affected Arc; one Arc is acceptable only when it covers
  the sprint.
- Plans run each affected repository's full unit command once and every
  applicable integration Suite against the final tree.
- Generated policy copies match their canonical sources and repository final
  acceptance passes.

## Sprints

1. [S01](sprints/S01.md): implement and validate the efficient QA cadence.
   Status: `DONE`.

## Questions

- None. The user accepted the refined policy and explicitly requested its
  implementation, commit, and installation.

## Final Validation

- `npm test`: passed (245 core, 23 Pi extension, and 4 MCP tests; 0
  failures).
- `node scripts/check-rule-copies.js`: all 8 generated rule copies match.
- `node scripts/check-versions.js`: all 7 version files remain pinned at
  4.8.4.
- Build: not applicable; the repository declares no build target.
- Integration Suite: not applicable; the repository declares no separate
  integration suite.
