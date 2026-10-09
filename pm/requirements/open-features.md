# Activated feature requirements

[Requirements index](index.md)

Approved and authorized by the human on 2026-10-09 through kickoff of
[Open feature requests](../plans/in_progress/2026-10-09-open-feature-requests/plan.md).
These are approved but not yet implemented; no completed coverage is claimed.

## REQ-TRACEABILITY-BATCH-RESUME: Durable file batches

Source: [batch resume issue](../bugs/in_progress/2026-10-08-FEAT-traceability_index_batch_resume.md).
Extend [traceability indexing](traceability-index.md) with durable file-batch
commits. Restart after abrupt crash must reuse compatible completed work and
retry incomplete work. Ten files is an example, not a fixed mandated size.
Exact content, configuration, parser and schema identities control reuse.
Dirty edits, adds, renames, removals and configuration changes must produce the
current logical index without mixing incompatible cached results. Readers see
only complete published generations. Failure/cancellation retains the prior
complete generation and durable reusable progress. Preserve existing project,
repository, worktree and corpus isolation and same-key writer serialization.

## REQ-TRACEABILITY-PROGRESS: Honest indexing progress

Source: [progress issue](../bugs/in_progress/2026-10-08-FEAT-traceability_index_progress.md).
Traceability indexing must show advancing TTY progress and periodic printable
newline-delimited progress when redirected, without ANSI/cursor controls in
regular-file logs. Report actual processing/reuse and distinguish it from
successful publication. Interrupted/failed updates must not report success.
Preserve a single valid machine-readable JSON result, separate from progress.

## REQ-TSTS-SHARED-MESSAGE-CONTRACTS: Canonical typed channels

Source: [shared message issue](../bugs/in_progress/2026-10-09-FEAT-tsts_shared_message_contracts.md)
and human scope decisions on 2026-10-09.
Support configurable producer and consumer APIs across transports. Each owned
message channel belongs to a finite canonical channel-to-argument contract.
Producer arguments and consumer callback arguments must derive from the same
declaration, not independent structurally equivalent definitions. Reject
unrestricted channel strings/payloads and permissive overloads bypassing that
contract. Discover supported calls independently of channel registration and
report unregistered channels. Reject unrestricted dynamic strings. Raw
dependency transports are permitted only in designated adapters exposing the
canonical typed interface. External input still requires runtime validation.
Diagnostics identify offending units and canonical-contract remediation.

## REQ-TYPESCRIPT-ONLY-SOURCE: Fully typed authored JavaScript replacement

Source: [TypeScript migration issue](../bugs/in_progress/2026-10-01-FEAT-typescript_only_source.md).
Replace every repository-owned handwritten JS/CJS/MJS source with strict
TypeScript analyzed by TSTS, including runtime, hooks, scripts, tests, skills,
host adapters, package subprojects and isolated benchmarks. Do not weaken
typing or introduce unchecked casts, any, suppression comments, or duplicate
test contracts. Runtime/distributable JavaScript must be generated from its
canonical source, with functioning build, install, package and test entrypoints
and synchronized generated adapters. Reject new authored JavaScript through a
durable repository check. Preserve benchmark isolation from core commands.
