# Plan input queue

[Back to architecture index](index.md) · Governing requirement:
[`REQ-PLAN-INPUT-QUEUE`](../requirements/plan-input-queue.md)

## Approved target architecture

One repository-scoped queue separates fast human input from the slower plan
tasklet queue. Queue entries use an immutable V1 JSON identity and move through
`open`, `in_progress`, and `closed` lifecycle directories under
`pm/plan-inputs/`. Creating the open record is the durability boundary; the
record therefore exists before either producer acknowledges it.

`src/plan-input.js` owns the contract, atomic file creation, deterministic FIFO
selection, lifecycle transitions, and CLI behavior. The main `ponytail`
dispatcher is a thin adapter. A Codex lifecycle hook is the second thin
adapter: `UserPromptSubmit` recognizes only `/ponytail-enqueue`, calls the same
producer, and blocks ordinary prompt delivery after success.

The hook also enforces scheduling at safe host boundaries. `PreToolUse`
redirects unrelated tool work to the oldest open entry, while allowing the
queue-management command used to claim it. `Stop` continues a turn while an
entry is open or in progress. A claimed entry suppresses preemption by newer
entries until it is acknowledged, providing the critical section that prompt
steering lacks.

Acknowledgement requires at least one existing `pm/` record path. It moves the
entry to `closed` only after semantic ingestion; failures leave the input in
`in_progress` for recovery. Once no fast-queue entry remains, the reusable
plan-execution policy requires the agent to rerun sprint and tasklet selectors
instead of relying on interrupted conversational context.

## Host boundary and viability

Ponytail can prove hook inputs, outputs, persistence, and scheduling decisions,
but cannot define Codex's internal ordering between active-turn interruption
and `UserPromptSubmit`. Official OpenAI documentation says the hook can block a
prompt and that an `Interrupt` hook cannot prevent interruption; it does not
promise which occurs first for a Steer submission. The live UAT profile is
therefore an architectural viability gate for the composer adapter, not for
the queue core or CLI producer.
