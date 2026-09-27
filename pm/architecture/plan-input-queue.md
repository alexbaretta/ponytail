# Plan input queue

[Back to architecture index](index.md) · Governing requirement:
[`REQ-PLAN-INPUT-QUEUE`](../requirements/plan-input-queue.md)

## Approved target architecture

One queue per campaign separates fast human input from the slower plan tasklet
queue. The canonical campaign census resolves any supplied member plan to its
root. Queue entries use the campaign-scoped V2 JSON identity and move through
`open`, `in_progress`, and `closed` lifecycle directories under
`pm/plan-inputs/<campaign-id>/`. Creating the open record is the durability boundary; the
record therefore exists before either producer acknowledges it.

`src/plan-input.js` owns the contract, atomic file creation, deterministic FIFO
selection, lifecycle transitions, and CLI behavior. The main `ponytail`
dispatcher is a thin adapter. A Codex lifecycle hook is the second thin
adapter. It atomically binds a session when the agent executes
`ponytail plan-input coordinate <plan>`, using `PreToolUse.session_id` and the
canonical campaign resolver. `UserPromptSubmit` recognizes only
`/ponytail-enqueue <instruction>`, resolves the campaign through that binding,
calls the shared producer, and blocks ordinary prompt delivery after success.

Bindings are operational V1 state under Codex `PLUGIN_DATA`, keyed both by
repository/session and repository/campaign so one session coordinates one
campaign and one campaign has one coordinator. They are not project records
and never enter Git. Rebinding the same pair is idempotent; conflicting
bindings fail closed. `ponytail plan-input release <plan>` relinquishes the
binding when the coordinator hands off or finishes.

The campaign has exactly one operational coordinator. Only that coordinator
calls the campaign-qualified list, claim, and complete operations at safe plan
boundaries. The hook observes only explicit coordinate/release tool commands
and composer enqueue commands; it never inspects or blocks on queued work, so
unrelated sessions in the checkout are unaffected. A claimed entry
suppresses consumption of newer entries until it is acknowledged, providing
the critical section that prompt steering lacks.

Acknowledgement requires at least one existing `pm/` record path. It moves the
entry to `closed` only after semantic ingestion; failures leave the input in
`in_progress` for recovery. Once no fast-queue entry remains, the reusable
plan-execution policy requires the campaign coordinator to rerun sprint and tasklet selectors
instead of relying on interrupted conversational context.

## Host boundary and viability

Ponytail can prove hook inputs, outputs, persistence, and scheduling decisions,
but cannot define Codex's internal ordering between active-turn interruption
and `UserPromptSubmit`. Official OpenAI documentation says the hook can block a
prompt and that an `Interrupt` hook cannot prevent interruption; it does not
promise which occurs first for a Steer submission. The live UAT profile is
therefore an architectural viability gate for the composer adapter, not for
the queue core or CLI producer.

The unreleased repository-scoped V1 physical entry remains an immutable reader
fixture but is retired from queue consumption because it contains no campaign
identity and cannot be normalized without inventing one. Ordinary writers emit
only V2. No V1 production records or installed producer exist.
