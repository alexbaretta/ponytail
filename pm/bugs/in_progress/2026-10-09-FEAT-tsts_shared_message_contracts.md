# TSTS shared message channel contracts

- ID: `2026-10-09-FEAT-tsts_shared_message_contracts`
- Type: `FEAT`
- Source: Human-provided client-agent analysis, 2026-10-09.
- Approval: Human-filed proposal approved for possible planning at intake.
- Status: `in_progress`.
- Implementation authorization: Explicit human plan kickoff on 2026-10-09.

## Reported incident and existing capabilities

The supplied client-agent analysis attributes an object-versus-JSON-text
mismatch to an owned sender with this permissive signature:

```typescript
send(channel: string, ...args: unknown[]): void;
```

The signature relates neither the channel to its payload nor the producer to
the receiver's expected arguments. The agent reports that the client's
`typeSafeSerdes` configuration covers only the gateway lifecycle request and
that a shared `[patchJson: string]` contract now repairs the sidebar incident.
Supplied source references:

- `/Users/alex/.codex/worktrees/2a4d/ipg-001/tsts.json:9`
- `/Users/alex/.codex/worktrees/2a4d/ipg-001/packages/samba-rpa/src/types/IpcTypes.ts:154`

These client facts are supplied evidence, not independently verified in this
Ponytail checkout. TSTS already has `uniqueExportedTypeNames` for independently
duplicated exported type names and `typeSafeSerdes` for configured serialization
contracts. Duplicate-name checking does not establish channel/payload coupling.
The earlier duplicate-definition feature request was withdrawn by the user
because that capability already exists.

## Proposed behavior: sharedMessageContracts

1. Every owned message channel belongs to one canonical channel-to-argument
   contract.
2. Producer arguments and consumer callback arguments derive from that same
   declaration. Independently written, structurally compatible declarations
   do not satisfy canonical ownership.
3. Reject owned transport interfaces with unrestricted channels or payloads,
   such as `string` plus `unknown[]`, including permissive overloads that bypass
   the contract.
4. Permit raw dependency transports only inside a narrow adapter exposing the
   canonical typed interface. External input still requires runtime validation;
   static agreement does not establish external input validity.
5. Discover supported transport calls and report unregistered channels, so
   missing configuration cannot silently exempt an owned channel.

For the reported incident, an actionable diagnostic would explain:

```text
RpaSidebarWebContents.send permits arbitrary payloads for owned sidebar channels.
Derive its arguments from the canonical message contract.
```

When the canonical channel contract specifies `[patchJson: string]`, the
producer's attempt to send an object must fail static validation.

## Acceptance criteria and proposed verification

- Reject the original unrestricted sender signature.
- Reject independently duplicated producer/consumer endpoint contracts even
  when structurally compatible.
- Reject a permissive overload that bypasses an otherwise typed interface.
- Report unregistered owned channels discovered in supported transport calls.
- Accept producer and consumer arguments derived from the canonical contract.
- Accept properly contained dependency adapters exposing that typed contract.
- Prove that an object argument fails for a channel requiring JSON text, while
  the correct string argument succeeds.
- Preserve runtime validation obligations for externally supplied input.

## Scope questions before implementation

Specify the supported transport APIs, owned-code scope, channel discovery and
dynamic-channel policy, adapter containment criteria, and canonical declaration
identity checks during planning. Do not infer a universal transport scanner or
impose one framework from this example.

## Requirements reconciliation, planning, and disposition

This proposes additional TSTS enforcement, rather than a duplicate-name rule.
Its outcomes and acceptance ideas remain issue-local. At implementation
activation, reconcile approved requirements, UAT procedures, and issue-to-
requirement-to-implementation/unit/integration-test traceability.
No canonical requirement or UAT record is created by intake.
Implementation plan: [Open feature requests](../../plans/in_progress/2026-10-09-open-feature-requests/plan.md),
S03. Planning admission does not authorize implementation. No implementation or
passing acceptance is claimed.

Traceability: introduces REQ-TSTS-SHARED-MESSAGE-CONTRACTS from issue 2026-10-09-FEAT-tsts_shared_message_contracts

## Implementation activation

Explicit human kickoff on 2026-10-09 authorizes implementation within
[Open feature requests](../../plans/in_progress/2026-10-09-open-feature-requests/plan.md).
Reconciled [requirements](../../requirements/open-features.md) and
[UAT](../../uat/open-features.md) apply. Earlier intake-only statements
above describe filing history, not current authority.
