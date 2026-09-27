# Plan input queue

[Back to requirements index](index.md)

**Identifier:** `REQ-PLAN-INPUT-QUEUE`

**Approval:** Approved by explicit stakeholder direction on 2026-09-27.

**Source:** The stakeholder reported that a second Steer prompt can replace a
requirement before the first requirement has been durably ingested during an
active long-lived Goal. The stakeholder explicitly required full,
documented, and tested implementations of both the Codex composer and CLI
input options; a failed live viability test must result in removal of that
option with the reason recorded.

Ponytail must provide a repository-scoped, durable, first-in-first-out plan
input queue in front of long-lived plan execution. An input is safe only after
its original text has been recorded by the queue; an acknowledgement must not
claim requirement ingestion until the agent has persisted the applicable
requirement, UAT, issue, architecture, traceability, and plan changes.

The queue must have two first-class producers:

- `/ponytail-enqueue <instruction>` in the Codex prompt composer; and
- `ponytail plan-input <instruction>` in a terminal.

Both producers must create the same queue-entry contract. The composer command
must be blocked from ordinary prompt delivery after successful enqueue so it
cannot become a competing Steer instruction. The terminal command must not
interact with the active Codex turn.

Exactly one entry may be in semantic ingestion at a time. New entries remain
ordered behind it and must not interrupt it. Before resuming plan tasklets, the
agent must finish and acknowledge the current entry, drain all older queued
entries in order, then rerun the canonical plan selectors from durable state.
Failed ingestion leaves the entry recoverable and visible.

Automated tests must prove queue persistence, ordering, producer equivalence,
single-entry ingestion, acknowledgement gates, and plan-loop prompting. A
live Codex acceptance profile must separately determine whether
`UserPromptSubmit` blocks the composer command before the active turn is
interrupted. Until that profile is run, both options remain implemented and
the composer ordering claim remains explicitly unverified. If the live result
is negative, Ponytail must remove the composer producer and document the
evidence and retained CLI workflow in the same change.

Acceptance coverage: [Plan input queue Suite](../uat/plan-input-queue.md).
