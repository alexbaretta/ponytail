# Shared message contracts (configuration V3)

`sharedMessageContracts` checks configurable producer/consumer methods using
the existing workspace TypeScript programs. It is independent of duplicate
exported-name checking. Run TypeScript compilation as well as TSTS: the compiler
checks argument values; this rule checks canonical declaration provenance and
transport coupling. No transport runtime is supplied.

Declare one finite canonical map and derive both APIs from it:

```typescript
export interface Messages {
    patch: [patchJson: string];
    ready: [];
}

export interface Transport {
    send<C extends keyof Messages>(channel: C, ...args: Messages[C]): void;
    on<C extends keyof Messages>(channel: C, listener: (...args: Messages[C]) => void): void;
}
```

With this contract, `send('patch', {})` fails TypeScript compilation; the payload
must be JSON text. Do not redeclare structurally equivalent tuples at either
endpoint. Contextually inferred listener parameters are valid; explicit listener
annotations must use the canonical rest tuple. Tuple/listener helper aliases
are resolved through their canonical declarations and type-parameter bindings.

```json
{
  "schemaVersion": 3,
  "workspaces": [{ "projectPath": "tsconfig.json" }],
  "sharedMessageContracts": {
    "contracts": [{ "id": "sidebar", "path": "messages.ts", "exportName": "Messages" }],
    "apis": [
      {
        "id": "sidebar-send", "role": "producer", "contractId": "sidebar",
        "receiver": { "path": "transport.ts", "exportName": "Transport" },
        "method": "send", "channelParameter": 0, "payloadParameter": 1
      },
      {
        "id": "sidebar-on", "role": "consumer", "contractId": "sidebar",
        "receiver": { "path": "transport.ts", "exportName": "Transport" },
        "method": "on", "channelParameter": 0,
        "callbackParameter": 1, "callbackPayloadParameter": 0
      }
    ]
  }
}
```

Paths resolve relative to the TSTS configuration and must occur in a configured
program. Configure every supported transport's receiver export and method;
names and zero-based parameter positions are not hard-coded to IPC, Electron,
WebSocket or any other transport. Consumer callbacks may have context/event
parameters before their canonical rest tuple. IDs and declaration locations
are unique. A channel cannot have competing canonical maps.

The rule inspects every exposed overload, even unused ones. Channel types must
be finite string-literal sets, including constrained generic channels; plain
`string`, `unknown` and unregistered literals fail. Non-generic multi-channel
signatures lose channel/argument correlation and fail. Maps cannot have index
signatures, optional channels, untyped tuples or unspecified type parameters.
Direct and extracted method calls are discovered independently of the channel
inventory. Indirect `call`, `apply` and `bind` invocations fail rather than
silently bypass discovery. Unsupported transport APIs must be configured;
the rule does not guess all methods named `send` in a repository.

## Dependency adapters

Register a raw dependency API with `"raw": true` and its exported receiver in
a dependency declaration file, then designate a narrow exported adapter:

```json
"adapters": [
  { "path": "adapter.ts", "exportName": "adaptTransport", "apiId": "sidebar-send" }
]
```

The adapter must return the configured canonical typed receiver. Raw calls are
allowed only inside that resolved export, not everywhere in its file. Raw
owned interfaces are forbidden. Raw calls still undergo finite-channel and
registration checks. API IDs on adapters reference non-raw APIs sharing the
same contract as the dependency transport. Do not list adapters as a blanket
exception to contract checking.

External data still requires runtime validation before becoming owned typed
messages. This static rule does not prove adapter serialization correctness or
runtime validation; cover those with the host's boundary tests.

V2 remains supported with its exact original fields and cannot contain this
rule. Set `schemaVersion` to 3 to opt in; all prior fields keep their semantics.
V1 remains retired. Unknown fields, unsupported versions and malformed rule
configuration fail with actionable diagnostics.
