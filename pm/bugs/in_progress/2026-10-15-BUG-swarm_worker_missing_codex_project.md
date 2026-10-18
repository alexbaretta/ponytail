<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Swarm worker missing Codex project association

- ID: 2026-10-15-BUG-swarm_worker_missing_codex_project
- Type: BUG
- Status: IN_PROGRESS
- Authority: stakeholder reported the recurring defect and activated its repair
  on 2026-10-15.
Historical coverage: introduces REQ-SWARM-SESSIONS from issue 2026-10-15-BUG-swarm_worker_missing_codex_project
- Requirement: [REQ-SWARM-SESSIONS OBL-5](../../requirements/swarms.md#req-swarm-sessions-membership-quiescence-and-names).
- UAT: [Arc SWARM-SESSIONS](../../uat/swarms.md#arc-swarm-sessions-remove-and-conditionally-reattach-originals), Step 1.
- Observation: workers created through swarm guidance frequently answer that
  their Codex `projectId` is `null`.
- Expected behavior: a worker executes in its designated managed checkout while
  inheriting the exact Codex project association of the original coordinator
  session that the user created through the UI.
- Root cause: the exported skill instructed coordinators to find a saved project
  whose local root equaled the designated managed checkout instead of freezing
  the original coordinator session's project ID. Managed worker checkouts
  intentionally have different paths, so the lookup cannot succeed and
  coordinators can fall back to a projectless thread.
- Repair scope: correct the canonical swarm admission procedure and its focused
  policy regression. Do not add session operations to Ponytail CLI or create a
  second project registry.
- Acceptance: guidance freezes the coordinator session's exact project ID,
  forbids projectless dispatch/binding, establishes that same association through
  supported host tools when necessary, and verifies both project identity and
  designated checkout before admitting the worker.
- Observation: [confirmed causal incident](../../debugging-pattern-observations/2026-10-15-managed_checkout_used_as_saved_project_identity.json).
