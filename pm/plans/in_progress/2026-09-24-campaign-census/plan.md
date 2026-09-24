# Campaign census

- **Plan ID:** `2026-09-24-campaign-census`
- **Status:** `in_progress`
- **Issue:**
  [`2026-09-24-FEAT-campaign_graph_validation_and_reporting`](../../../bugs/in_progress/2026-09-24-FEAT-campaign_graph_validation_and_reporting.md)
- **Approval:** The user explicitly requested implementation on 2026-09-24
  after approving the refined requirements and acceptance contract.
- **Management and component repository:** Ponytail.

<!-- ponytail-plan-campaign
{
  "schemaVersion": 1,
  "id": "2026-09-24-campaign-census",
  "parent_plan_id": null
}
-->

## Objective

Implement the read-only `ponytail campaign validate` and `ponytail campaign
report` commands for the campaign containing an explicitly supplied plan.
Discover membership through one authored parent backlink, validate only the
selected campaign, and report its plan, sprint, and tasklet census.

## Scope

- Add the versioned project-management, plan metadata, and JSON report
  contracts.
- Add a separately testable Node implementation and small `ponytail` dispatch.
- Validate plan-local sprint and tasklet structure through the canonical
  selectors.
- Enforce fail-fast diagnostics, closure rules, read-only behavior, and exact
  exit/output semantics.
- Synchronize reusable policy, generated copies, project structure, package
  contents, and user documentation.
- Preserve the approved requirement and UAT coverage.

## Exclusions

- No validation or reporting of unrelated campaigns.
- No issue traversal or issue metadata contract.
- No parallel scheduling, worker inspection, worktree enumeration, integration,
  throughput, or ETA behavior.
- No migration of historical plans other than this implementation plan's own
  campaign metadata.
- No installation outside the repository and no external publication.

## Architecture and contracts

- `.agents/config/project/management.json` owns V1 management and plan roots,
  lifecycle directory order and roles, and the supported legacy flat layout.
- A `ponytail-plan-campaign` JSON comment in each managed `plan.md` owns V1
  `id` and `parent_plan_id`. Lifecycle and children remain derived.
- `src/campaign-census.js` owns exact physical readers, campaign discovery,
  validation, census normalization, and human/JSON rendering.
- `cli/ponytail` performs only dispatch after ordinary project validation.
- `plan_stats.sh` remains an explicitly legacy-only tool.
- The three serialized families are registered in
  `versioned-data-contracts.json`; ordinary writers emit only V1.

## Resolved questions

- [RESOLVED] Use a dedicated
  `.agents/config/project/management.json` rather than parse prose or enlarge
  unrelated project identity metadata.
- [RESOLVED] Use marker `ponytail-plan-campaign` with exact V1 keys
  `schemaVersion`, `id`, and `parent_plan_id`.
- [RESOLVED] Use `src/campaign-census.js` as the documented non-script source
  owner.
- [RESOLVED] Retain `plan_stats.sh` as clearly legacy-only.
- [RESOLVED] Fail fast and validate only the campaign containing the supplied
  plan; repository scanning is membership discovery, not global validation.

## Acceptance

- The canonical requirement and all four UAT Arcs are represented by focused
  automated tests of the real CLI path or its production module boundary.
- Starting from any member returns the same selected campaign and ignores an
  unrelated malformed campaign.
- The implementation derives lifecycle and children without authored aliases.
- Invalid selected-campaign data returns the first stable diagnostic with exit
  `1`; usage or environment failures return exit `2`.
- Successful human and JSON reports contain equivalent census facts and obey
  the exact stream contract.
- Closed-plan and campaign-root invariants are enforced.
- Focused tests, build-impact-selected builds, full Ponytail acceptance,
  rule-copy validation, version validation, and documentation/configuration
  checks pass against the final tree.

## Sprint

1. [S01](sprints/S01.md): implement and accept the campaign census — approved,
   in progress.

## Starting checkpoint

At revision `283ffb3cac1bf1ca7afbe96a44a9c7291623a43e`, with only the approved
issue, requirements, UAT, and planning records untracked, the configured full
command passed on 2026-09-24: 331 core tests, Codex installer checks, 23 Pi
tests, 4 MCP tests, 58 TSTS tests, and the TSTS directory-structure check; zero
failures or skips.

## Final validation record

Pending.
