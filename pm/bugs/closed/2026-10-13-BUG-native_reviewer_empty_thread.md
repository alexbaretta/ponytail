<!-- Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root. -->

# Empty native reviewer could not resume

- ID: 2026-10-13-BUG-native_reviewer_empty_thread
- Type: BUG
- Status: CLOSED
- Authority: stakeholder authorized repair of Ponytail coordination tooling.
Traceability: introduces REQ-ROLLING-REVIEW from issue 2026-10-13-BUG-native_reviewer_empty_thread
- Atomic obligation: the canonical reviewer creation command starts its actual
  review before closing the native connection, retaining that actor across retry
  and rework and permitting replacement only for explicitly observed loss.
- Observation: a reviewer created with thread/start alone had no persisted rollout;
  dispatch after disconnect failed with no rollout found.
- Root cause: native thread creation does not persist a resumable thread before
  its first actual turn; existing commands required externally supplied identity.
- Repair: start-review connects creation/reuse, immutable request, durable dispatch
  and collection on the same connection. It uses the stored reviewer thread ID,
  preserves unresolved dispatches, and uses existing loss replacement records.
- Proof: controlled native protocol rejects premature resume. The canonical
  reviewer begins the real review as turn-1, with distinct thread/session IDs;
  retries retain the same PostgreSQL request and attached turn.
- Validation: canonical reviewer regression 1/1; review/operation/client tests
  36/36; generated runtime consistency, rule-copy and version checks pass.
  TSTS checks 1560 files and traceability checks 922 relationships.
- Independent adversarial review: accepted; no material findings.
- Implementation commit: `275b7917` (rebased equivalent of `10648a05`).
- Final acceptance (2026-10-14): complete `npm test` passed 559 legacy Node,
  325 typed, 23 Pi, four MCP and 100 TSTS tests, including the canonical reviewer
  regression. Installer, generated-resource and traceability checks passed;
  TSTS analyzed 1,649 files without violations. Rule-copy and version checks passed.
- Resolution: fixed and accepted; no remaining work for this bug.
- Subsequent scope correction: native session operations, including public
  `start-review`, were retired from CLI/MCP by the swarm implementation.
  The fix remains covered by the internal protocol regression; coordinators
  operate reviewer sessions through host tools.
