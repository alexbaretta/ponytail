# Incidental Configuration Repair

Plan ID: `incidental-configuration-repair`

Status: `DONE`

## Objective

Keep approved work moving when pre-existing project-configuration drift has
one narrow, source-proven local repair, while preserving approval gates for
ambiguous, material, destructive, external, and user-owned changes.

## Scope

- Revise the canonical `project-structure` synchronization policy.
- Align `plan-execution` stop and whole-goal blocker rules.
- Add focused policy-conformance coverage.

## Exclusions

- Changes to Codex platform goal-management implementation.
- Installation into global host skill directories.
- Changes to product, security, authorization, persistence, public contracts,
  infrastructure, deployments, or external systems.

## Ownership

Ponytail is the management and only component repository. Canonical policy is
owned by `skills/`; focused regression coverage is owned by `tests/`.

## Acceptance Criteria

- Source-proven, narrow, local, reversible configuration repairs proceed
  without a user approval stop and are validated and reported.
- Material or ambiguous resolutions still stop for user direction.
- Independent approved work continues when one path is genuinely blocked.
- Focused tests, the full core suite, rule-copy check, and version check pass.

## Sprints

- [S01](sprints/S01.md): `DONE`

## Approval

Approved by the user's 2026-08-14 request to make the reviewed incident
recommendations happen.

## Final Validation

- `node --test tests/testing-cadence.test.js tests/openclaw-skills.test.js`:
  97/97 passed.
- `npm test`: 193/193 core tests, 23/23 Pi-extension tests, and 4/4 MCP
  tests passed; installer checks passed.
- `node scripts/check-rule-copies.js`: all 8 copies match.
- `node scripts/check-versions.js`: all 7 version files are pinned at 4.8.4.
- Build: not applicable; Ponytail ships source files.
