# Plan input queue Suite

[Back to UAT index](index.md)

**Requirement:** [`REQ-PLAN-INPUT-QUEUE`](../requirements/plan-input-queue.md),
approved 2026-09-27.

## Arc: Enqueue through either producer

Traceability: verifies REQ-PLAN-INPUT-QUEUE

1. Submit one instruction with `ponytail plan-input <member-plan> -- <instruction>`.
   - The command returns a stable receipt only after one open V2 record contains
     the exact instruction and identifies the CLI producer.
2. Have the campaign coordinator run `ponytail plan-input coordinate
   <member-plan>`, then submit another instruction as
   `/ponytail-enqueue <instruction>` to the `UserPromptSubmit` hook.
   - The same queue contract records it with the composer producer, and the
     hook derives the root campaign from the coordinator session binding and
     blocks ordinary prompt delivery with the receipt as its reason.
   - Exercise coordinator binding with object-shaped `code` input and the
     same JavaScript in a free-form tool-input string. Both establish the
     hook-provided owner's binding; a different session cannot take ownership
     or mutate that campaign. Unrelated commands remain unaffected.
3. List the queue.
   - Both entries appear once in FIFO order without truncation or rewriting.
   - Both are stored under the campaign root's identity even when submitted
     through a non-root member plan.

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
   - The final `claim --json` returns `null` with exit status zero, not a
     silent nonzero failure; it writes no queue entry.

Profile: automated by the same focused tests and the plan-execution policy
test.

## Arc: Isolate campaign coordination

1. Create two campaigns in one checkout and bind one coordinator session for
   each campaign.
2. Enqueue an input through a non-root member of the first campaign.
   - It resolves to the first campaign root and is invisible when listing or
     claiming the second campaign's queue.
3. Let a non-coordinator session execute unrelated work in the same checkout.
   - The producer hook neither reads the queue nor blocks that session's tools
     or turn completion.
   - `/ponytail-enqueue` in that unbound session is blocked without writing a
     queue entry.
4. Attempt to bind a second session to the first campaign.
   - The binding fails closed and identifies the existing coordinator; an
     explicit release is required before handoff.
5. Have the first campaign coordinator drain its queue and release coordination.
   - Only that coordinator consumes the entry, then resumes its campaign from
     fresh selectors.

Profile: automated for campaign resolution and queue isolation; coordinator
exclusivity is an operational rule inspected in the plan-execution policy.

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
