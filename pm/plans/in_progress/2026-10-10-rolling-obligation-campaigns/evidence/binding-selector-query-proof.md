# Shared binding selector query proof

Observed 2026-10-11T00:57:29-07:00 in the designated Ponytail checkout,
starting revision `329f711`, with the OBL-108 change-set uncommitted.

OBL-108 now implements explicit binding-history queries through one effective
projection shared by portable selection and rolling selection. The portable
resource owns the binding reader so generated skill installations include it.
An explicitly selected history's path and content participate in the rolling
graph identity; unrelated worker copies do not. Historical invalidated
certificate inputs no longer prevent scheduling. Historical physical obligation
records and their accepted checkpoint meanings remain unchanged.

Verification after the final relevant source edit:

- Build-impact selected `npm run build`, with no indeterminate target; build passed.
- `node --test dist/tests/binding-selectors.integration.test.js dist/tests/obligation-binding-history.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-campaign.integration.test.js tests/obligations.test.js tests/obligation-execution.test.js`: 47 passed, zero failed or skipped.
- `node --test tests/openclaw-skills.test.js`: 133 passed, zero failed or skipped.
- `npm run check:tsts`: 897 files checked, no violations; existing TSTS implementation unchanged.
- `node dist/scripts/build-runtime.js --check`: passed.
- `node scripts/check-rule-copies.js`: eight copies match.
- `node scripts/check-versions.js`: seven version files pinned at 4.8.4.
- `git diff --check`: passed.
- `npm run build:traceability`: reverse view regenerated; still fails for the nine known implementation/unit/integration gaps across REQ-ROLLING-REVIEW, REQ-ROLLING-PUBLICATION and REQ-ROLLING-INTERFACES. This is not a global traceability pass.

The Git-backed typed query proof exercises prerequisite addition and removal,
current bounded paths, stale graph fencing, historical queries, explicit source
identity, foreign scope rejection, symlink rejection and CLI argument handling.
It uses the immutable history through CHECKPOINT-24 so later assessment records
cannot become self-referential fixture inputs.

This record is evidence, not an accepted discharge certificate. OBL-108 still
needs reconciled assessment and OBL-107 renewal after its owner relocation.
Live amended allocation, frozen lease revision identity and binding-aware
candidate acceptance remain separate required work. These query APIs do not
authorize workers to apply an amended binding through the existing lease path.
