# Configuration v2 Upgrade

Configuration version 2 is intentionally strict. Upgrade the configuration
mechanically; do not add a compatibility parser or a second configuration
file.

## Upgrade Steps

1. Add the required root property `"schemaVersion": 2`.
2. Keep only documented keys. Remove misspelled, retired, or speculative
   properties rather than relying on them being ignored.
3. Keep a rule block only when that rule is intended to run. Block presence
   activates the rule; block absence leaves it inactive.
4. Add an `unusedCode` block when preserving the previous implicit unused-code
   enforcement. Supply the workspace entrypoints that seed its reachability
   analysis.
5. Remove `noAliasing.enabled`. Presence of the `noAliasing` block activates
   the rule.
6. For `versionedDataContracts`, keep `manifestPath` and optionally add
   `familyIds`. When present, `familyIds` must contain the exact nonempty,
   unique identifiers to check. Omit it to check the complete manifest.
7. Run the canonical command and resolve every configuration diagnostic:

   ```bash
   pnpm tsts --config <configuration-file>
   ```

   When the same invocation also requires direct TypeScript project checks,
   add `--project <typescript-project-file>`.

## Known Keys

The root keys are:

- `schemaVersion`
- `workspaces`
- `noAliasing`
- `unusedCode`
- `typeSafeSerdes`
- `versionedDataContracts`

A workspace accepts:

- `projectPath`
- `entrypoints`
- `name`
- `packageName`

The `noAliasing` and `unusedCode` blocks accept only `severity`.

The `typeSafeSerdes` block accepts `severity` and `contracts`. Each contract
accepts `canonicalSchemaName`, `canonicalTypeName`, `contractName`, and
`propertyNames`.

The `versionedDataContracts` block accepts `manifestPath`, `severity`, and
`familyIds`.

Unknown keys fail validation at every level. Do not rename a known key, retain
a disabled rule block, duplicate a manifest, or add an alternate execution
path to preserve version 1 behavior.
