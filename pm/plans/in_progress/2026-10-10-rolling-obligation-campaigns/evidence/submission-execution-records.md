# Exact submission proof command identities

CERT-19 corrects CERT-18's abbreviated command descriptions. CHECKPOINT-35
withdraws that assessment without modifying its history. The actual executions
are unchanged passing evidence, independently captured after the traceability
repair. No additional source or configuration change is made.

Focused command:

```text
node --test dist/tests/rolling-worker-submission.test.js dist/tests/rolling-campaign-store.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/obligation-binding-history.test.js dist/tests/binding-selectors.integration.test.js tests/obligations.test.js tests/obligation-execution.test.js
```

Observed output: tmp/binding-selectors/submission-focused-corrected.txt; 56
passes, zero failures/skips/cancellations.

Prior-outcome renewal command:

```text
node --test dist/tests/campaign-invocation.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-inventory.test.js tests/campaign-census.test.js tests/campaign-census-format.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js dist/tests/tasklet-statuses.test.js dist/tests/ready-tasklets-cli.test.js dist/tests/rolling-codex.test.js
```

Observed output: tmp/binding-selectors/submission-renewal-corrected.txt; 57
passes, zero failures/skips/cancellations. Full outputs and unchanged complete
conditions are preserved in submission-traceability-reassessment.md and
frozen-worker-submission.md. The generated-resource command is exactly
`node --test tests/openclaw-skills.test.js` (133 passing tests), and static
validation is exactly `npm run check:tsts`, using the unchanged checker.

CERT-19 accepts the same 34 atomic component outcomes on current inputs with
precise execution identities. This metadata correction does not establish
worker application dispatch, adversarial review, semantic-rebase execution,
publication, bound certificate acceptance or global campaign completion. The
nine global review/publication/interface traceability gaps remain open.
