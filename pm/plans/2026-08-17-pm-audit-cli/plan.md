# Plan: Project-Management Structure Auditor

- Plan ID: `2026-08-17-pm-audit-cli`
- Status: `DONE`
- Objective: Add an installable CLI that audits the mandated `pm/` structure
  and safely repairs missing creation-date prefixes from Git history.
- Management repository: Ponytail.
- Component repository: Ponytail.

## Scope

- Add `audit_pm.sh` to the canonical `cli/` collection.
- Audit plan directories, plan manifests, sprint directories and filenames,
  bug lifecycle directories and filenames, duplicate bugs, and unexpected
  entries under `pm/`.
- Add `--fix` support only for missing date prefixes on tracked plan
  directories and bug files when an unambiguous Git creation date and unused
  destination exist.
- Add focused regression coverage and synchronize package and user docs.

## Exclusions

- Creating missing manifests or directories.
- Moving unexpected files, deleting duplicates, rewriting document contents,
  or guessing dates outside Git history.
- Auditing project-management content semantics beyond placement and naming.

## Acceptance

- Audit-only mode reports every detected deviation and exits nonzero without
  modifying the worktree.
- `--fix` uses `git mv` and the oldest relevant Git history date for repairable
  missing prefixes, then reports all remaining deviations.
- Untracked paths, unavailable dates, invalid existing date-like prefixes, and
  destination collisions are reported without mutation.
- The existing CLI installer automatically discovers `audit_pm.sh`.
- Focused and final acceptance pass.

## Sprints

- [S01](sprints/S01.md): `DONE`

## Questions

- `[RESOLVED]` Fix boundary: only missing date prefixes are automatically
  repaired, exactly as requested; every other deviation is report-only.
- `[RESOLVED]` Date source: the oldest commit touching the current tracked path.
- `[RESOLVED]` Approval: the user's direct request explicitly authorizes this
  implementation plan.

## Final Validation

- `npm test`: passed, including 210 core tests, Codex installer tests, 23 Pi
  tests, and 4 MCP tests.
- `node scripts/check-rule-copies.js`: passed within full acceptance.
- `node scripts/check-versions.js`: passed; all version files remain `4.8.4`.
- Package distribution proof includes `cli/audit_pm.sh`.
