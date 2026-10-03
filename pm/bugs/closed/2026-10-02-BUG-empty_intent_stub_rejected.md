# Empty intent-only sprint rejected by campaign validation

- ID: `2026-10-02-BUG-empty_intent_stub_rejected`
- Type: `BUG`
- Status: `closed`
- Reported: 2026-10-02 during GWEN campaign validation.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
- UAT: [assign an initial planning sprint](../../uat/campaign-orchestration.md#arc-assign-an-initial-planning-sprint-without-inventing-runnable-tasklets).

## Confirmed mechanism

GWEN's deferred onboarding S06–S09 are intent-only planning `STUB`s with
`execution: null`, no tasklet headings, and valid empty tasklet metadata.
`campaign validate --all` attempted to parse their tasklet status with the
executable-sprint rule requiring at least one heading, so it rejected S06
with `CAMPAIGN_TASKLET_INVALID`. A focused fixture reproduced the same failure.

## Resolution and acceptance

Allow an empty heading set only while parsing a `STUB` with `execution: null`.
Still validate any metadata and require its tasklet IDs to match the Markdown.
`READY_FOR_REVIEW` and executable sprints retain the nonempty-heading rule.
The focused campaign census test passes, and repository-wide inventory of
GWEN's current tree reports `valid: true`. No deferred feature was activated.
