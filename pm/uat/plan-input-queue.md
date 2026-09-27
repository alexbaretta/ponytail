# Plan input queue Suite

[Back to UAT index](index.md)

**Requirement:** [`REQ-PLAN-INPUT-QUEUE`](../requirements/plan-input-queue.md),
approved 2026-09-27.

## Arc: Enqueue through either producer

Traceability: verifies REQ-PLAN-INPUT-QUEUE

1. Submit one instruction with `ponytail plan-input <instruction>`.
   - The command returns a stable receipt only after one open V1 record contains
     the exact instruction and identifies the CLI producer.
2. Submit another instruction as `/ponytail-enqueue <instruction>` to the
   `UserPromptSubmit` hook.
   - The same queue contract records it with the composer producer, and the
     hook blocks ordinary prompt delivery with the receipt as its reason.
3. List the queue.
   - Both entries appear once in FIFO order without truncation or rewriting.

Profile: automated by `node --test tests/plan-input.test.js` and
`node --test tests/plan-input-hooks.test.js`.

## Arc: Serialize ingestion before resuming the plan

1. Enqueue two inputs, claim the first, then enqueue a third.
   - Exactly the first entry is `in_progress`; later entries remain open and do
     not preempt it.
2. Attempt to acknowledge without an existing `pm/` record.
   - Acknowledgement fails and the original entry remains recoverable.
3. Persist the applicable PM records and acknowledge the first entry.
   - It closes with links to those records; the second entry becomes claimable.
4. Drain the remaining entries and inspect the plan-execution instructions.
   - They require FIFO draining and a fresh canonical selector run before slow
     plan work resumes.

Profile: automated by the same focused tests and the plan-execution policy
test.

## Arc: Determine composer viability in live Codex

1. In a trusted installation of the candidate plugin, start a long-running
   turn that repeatedly reaches tool boundaries while writing a sentinel
   requirement record.
2. While that turn is active, submit `/ponytail-enqueue <second instruction>`.
3. Inspect the original turn, hook receipt, and queue records.
   - Positive: the command is enqueued and blocked without interrupting the
     original turn; retain both producers.
   - Negative: the original turn is interrupted before the hook can protect
     it; remove the composer producer, record this evidence, and retain the CLI
     producer.
4. In either outcome, drain the queue and confirm the original sentinel, every
   queued instruction, and resumed plan tasklets are all present exactly once.

Profile: manual because the host's active-turn event ordering is not exposed
by the hook contract and cannot be established by invoking the hook script in
isolation. Status: not yet executed against the candidate implementation.
