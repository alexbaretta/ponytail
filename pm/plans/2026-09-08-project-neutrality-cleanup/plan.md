# Project neutrality cleanup

Plan ID: 2026-09-08-project-neutrality-cleanup
Status: DONE

## Objective and authority

Remove every real foreign-project reference reported by `ponytail qa` from
Ponytail's tracked files. The user reviewed the remaining findings as real and
authorized correction on 2026-09-08.

## Contract

- Portable tests use fictional neutral sentinels rather than names belonging
  to registered downstream projects.
- Historical management records retain the technical result and validation
  evidence while expressing downstream adoption generically.
- `ponytail qa` completes with no forbidden-reference findings.

## Sprint

1. [S01](sprints/S01.md): neutralize tests and management records, validate,
   and commit — DONE.

## Acceptance

Run focused tests for every edited test file, build impact for all changed
paths, `ponytail qa`, the full unit-test command, rule-copy validation, and
version validation.

## Evidence

Starting revision: `a5d2a55`; working tree clean. Initial QA reported 73
findings across 15 tracked files.

All findings were removed without exceptions. Build impact reported no
affected or indeterminate targets. Focused tests and the full `npm test`
command passed, as did rule-copy and version validation. Final reference QA
reported zero findings across both registered downstream projects.
