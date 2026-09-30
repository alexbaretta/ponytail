<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.

Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail CLI agent harness

[Back to requirements index](index.md)

**Identifier:** `REQ-PONYTAIL-CLI-AGENT-HARNESS`

**Approval:** Approved by the stakeholder on 2026-09-30 with the instruction
to provide agents with understanding of the Ponytail CLI through the agentic
harness and to teach campaign coordinators to monitor and resolve campaign
state.

**Source:** Stakeholder instruction in the 2026-09-30 campaign-session
observability implementation request.

Ponytail must publish its campaign-coordination command contract through the
canonical reusable agent harness and generated host adapters. Project-local
agent instructions must identify the supported commands without duplicating
the detailed operational policy owned by the reusable skill.

The campaign coordinator policy must require an authenticated coordinator to:

- refresh live host observations and inspect the versioned programmatic
  campaign status whenever coordination begins or resumes and periodically
  while assigned work remains unfinished;
- distinguish a session that is actively working, waiting for coordinator
  input, finished, archived, missing, or not observable rather than treating
  every non-running session as reusable;
- inspect and resolve campaign diagnostics before dispatching new work,
  integrating another worker, or performing cleanup;
- when a worker has finished, drive the existing evidence-backed rebase and
  fast-forward transition before reusing or archiving its session and managed
  worktree; and
- reuse a session and worktree only when Ponytail reports them as reusable,
  otherwise preserve or garbage-collect them only through the typed campaign
  action selected by Ponytail.

The harness must never direct an agent to infer live session state from chat
memory, absence from a partial listing, filesystem paths, or a conversational
completion claim. Generated host copies must remain synchronized with their
canonical skill sources.
