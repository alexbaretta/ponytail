# Starting evidence

Runtime source revision: `fc8f0d43382d7e7b3d38d5881483a074d525a4ff`.
Initial tracked tree was clean. Only this plan's prose/records changed during
starting QA; no source or test input changed.

Configured `npm test` execution established 606 core, 23 extension, 4 MCP and
80 TSTS passing tests, zero failures/skips, plus installer checks. Its final
structure check rejected the newly untracked plan files. After staging those
same files, `npm run check:tsts` passed: 696 files, no violations. This is a
repaired mechanical structure discrepancy, not a waived product failure.
Raw command output is starting-tests.log; it intentionally retains that final
untracked-file diagnosis. Sandbox localhost PostgreSQL denial was resolved
through the authorized runner, not treated as passing execution.

`npm run build:traceability` and `npm run check:traceability` passed the existing
scope (457 relationships). `node scripts/check-rule-copies.js` passed eight
copies; `node scripts/check-versions.js` passed seven versions (4.8.4).
Campaign metadata and obligation V1 validation passed. New Markdown links and
`git diff --check` passed. No runtime/build inputs changed, so no product build
was needed for this documentation sprint.

The eight newly activated rolling requirements introduce expected incomplete
forward coverage: implementation, unit and integration proof are still missing.
S02 owns configuration/graph/scheduling; S03 owns state; S04 owns workers/review;
S05 owns publication; S06 owns interfaces and final whole-scope acceptance.
These gaps are required acceptance work, never exceptions or discharge claims.
