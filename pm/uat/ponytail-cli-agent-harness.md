<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail CLI agent harness Suite

[Back to UAT index](index.md)

**Requirement:**
[`REQ-PONYTAIL-CLI-AGENT-HARNESS`](../requirements/ponytail-cli-agent-harness.md),
approved 2026-09-30.

## Arc: Rehydrate and monitor campaign workers

Traceability: verifies REQ-PONYTAIL-CLI-AGENT-HARNESS

- **Actor:** Authenticated campaign coordinator agent.
- **Prerequisites:** A campaign containing working, waiting, finished, missing,
  and archived worker sessions with authenticated assignment records.
- **Profiles:** Automated policy and campaign CLI profiles; supported live
  Codex host tools for final host-boundary acceptance.
- **External effects:** Read-only observation until Ponytail selects a typed
  campaign transition.

1. Begin or resume campaign coordination.
   - The agent refreshes host observations and reads versioned campaign status
     instead of reconstructing assignments from chat history.
2. Leave assigned workers running, waiting for coordinator input, and finished.
   - Periodic monitoring distinguishes all three states and preserves each
     session-to-plan and worktree-to-plan association.
3. Introduce a blocking campaign diagnostic.
   - The coordinator prioritizes resolving it and does not dispatch, merge, or
     clean up unrelated campaign work first.
4. Complete an assigned worker.
   - The coordinator initiates the Ponytail-selected rebase and fast-forward
     path, then reuses the worker only when status reports it reusable or
     executes the selected worktree and session archival actions.
5. Inspect every generated host adapter.
   - Each carries the same canonical coordinator protocol.
