# TSTS Architecture

## Purpose

TSTS is an independently buildable TypeScript static-analysis tool. It uses
the TypeScript compiler API to enforce static-safety rules that `tsc` does not
enforce by default.

TSTS owns only generic configuration parsing, TypeScript program analysis,
rule execution, diagnostics, and report formatting. Configuration owns the
selection of workspaces, entrypoints, rules, and versioned contract families.
The analyzer does not embed repository names, package layouts, business
identities, or application policy.

## Design Principles

- Treat successful TypeScript compilation as a prerequisite, not proof of
  contract safety.
- Report all non-fatal analysis diagnostics in one run.
- Make diagnostics actionable by naming the rule, source location, subject,
  and reason for failure.
- Keep rule execution deterministic and independent of editor behavior.
- Maintain one configuration parser and one execution path.
- Reject malformed or unknown configuration instead of guessing intent.

## Runtime Shape

```text
CLI arguments
  -> strict configuration v2 parser
  -> workspace program loader
  -> explicitly selected rules
  -> diagnostics
  -> report formatter
```

The CLI may also receive a TypeScript project directly for checks that do not
require workspace configuration. Supplying both inputs runs their checks in
one invocation and combines their diagnostics.

## Configuration Version 2

Every configuration has `schemaVersion: 2`. The parser accepts only the
documented keys at the root and in every nested object. A missing version, a
different version, an unknown key, or an invalid value is a configuration
error. There is no legacy parser, conversion branch, inferred default rule,
or compatibility fallback.

Each rule is activated independently by the presence of its configuration
block. An absent block is inactive. A present block is active and must satisfy
its complete schema. Rule activation is therefore visible in the
configuration and cannot depend on another rule's settings.

The workspace list defines the TypeScript programs available to configured
rules. Entrypoints belong to unused-code reachability only; they do not select
or activate other rules.

See [Configuration v2 upgrade](configuration-v2-upgrade.md) for the mechanical
upgrade procedure.

## Versioned Contract Manifest Selection

The versioned-data-contract rule reads one canonical manifest. Manifest
structure and duplicate family identifiers are always validated for the
complete document.

When `familyIds` is absent, the rule runs in full mode and checks every family
in the manifest. When `familyIds` is present, it must be a nonempty array of
unique, nonempty identifiers. The rule checks exactly those families and
reports every selected identifier that is absent from the manifest. Selection
does not suppress manifest-shape or duplicate-identifier errors.

## Ownership Boundary

TSTS owns generic rule semantics and validation. Configuration owns which
generic rules and source graphs are selected. The versioned contract manifest
owns its family declarations. These boundaries keep implementation policy in
one declared source without analyzer aliases, embedded exceptions, or
secondary lookup paths.
