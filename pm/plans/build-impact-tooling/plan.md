# Build-Impact Tooling

Plan ID: `build-impact-tooling`

Status: `DONE`

## Objective

Ship a portable build-impact query that lets an agent decide whether its
intended files affect a configured build target without loading the complete
input list into model context.

The first bundled adapter will support TypeScript through
`tsc --listFilesOnly`. One project may compose multiple bundled and custom
adapters so mixed-language targets are classified by their owning tool.

## Scope

- Define one project-local build-impact configuration contract.
- Add one reusable build-impact skill and its bundled TypeScript query tool.
- Resolve the project's installed TypeScript compiler and configured
  `tsconfig` files without bundling another compiler.
- Accept intended changed paths and return only affected targets, build
  commands, and concise reasons.
- Compose multiple bundled or project-owned custom impact adapters in one
  query.
- Replace unconditional build guidance with condition-and-action rules.
- Generate and validate every affected host adapter.
- Document and validate downstream project adoption.

## Explicit Exclusions

- Do not add an MCP wrapper.
- Do not implement language adapters other than TypeScript.
- Do not infer dependency graphs for arbitrary build systems.
- Do not run a build merely to answer a build-impact query.
- Do not place complete build-input lists in agent instructions or tool
  output.
- Do not deploy, release, or modify a non-local environment.
- Do not configure downstream repositories until their own change-sets are
  approved.

## Repositories And Ownership

- Management repository: Ponytail.
- Tool, portable policy, skills, adapters, and tests: Ponytail.
- Project-specific adapter and target configuration: each governed project
  repository.
- Unsupported-language query implementations: the project that owns each
  language and build.

## Decisions

### [RESOLVED] D01: Instruction Form

Use condition-and-action instructions:

> When the configured build-impact query reports affected targets, run their
> build commands once after the final change to their inputs. When it reports
> no affected targets, skip the build.

Source: user direction in the planning discussion.

### [RESOLVED] D02: Canonical Interface

Use a script-backed CLI, not MCP. The complete input set remains internal to
the tool. An MCP proxy is outside this plan.

Source: user preference and approved design discussion.

### [RESOLVED] D03: Bundled Language Support

Bundle a TypeScript adapter using the project-installed compiler and
`--listFilesOnly`. Do not bundle TypeScript into Ponytail. Unsupported
languages use project-configured custom adapters.

Source: user direction in the planning discussion.

### [RESOLVED] D04: Query Scope

The caller supplies the intended changed paths. The query must not treat every
dirty path in a shared working tree as part of the agent's change-set.

Source: selective-change-set requirements and existing repository policy.

### [RESOLVED] D05: Tool Ownership

Add a reusable `build-impact` skill that owns the portable contract and the
bundled CLI resource. Register and package the skill through existing Ponytail
generators rather than adding another runtime service.

Source: Ponytail's existing skill packaging and project-local configuration
architecture.

### [RESOLVED] D06: Mixed-Language Composition

Use one dispatcher with multiple configured adapters. Each adapter owns one or
more build targets. A project may combine the bundled TypeScript adapter,
multiple custom adapters, and future bundled language adapters in one query.
The dispatcher sends the same intended paths to every adapter, validates each
result, and merges affected targets without duplicate ownership.

An adapter failure makes its owned targets indeterminate without discarding
valid results from other adapters. The overall result must not claim that no
build is required while any configured adapter is indeterminate.

Source: user correction in the planning discussion.

### [RESOLVED] D07: Project Configuration Filename

Use one root `ponytail.json` file containing a `buildImpact` object. It keeps
project configuration versioned with the project and avoids mixing build
targets into the user's global Ponytail mode configuration.

Source: the user approved building the plan with this sole remaining
recommendation.

## Questions

No open plan-level questions.

## Plan-Wide Acceptance Criteria

- A TypeScript fixture reports its target for a changed compiler input.
- The same fixture reports no target for documentation, plan, test-only, and
  runtime-only environment files outside the compiler input set.
- A changed configured `tsconfig` invalidates its target.
- Multiple configured TypeScript targets remain independently selectable.
- Bundled TypeScript and multiple custom adapters compose in one
  mixed-language project query.
- Each build target has exactly one owning adapter, and duplicate ownership is
  rejected.
- Paths containing spaces and deleted paths are accepted safely.
- Compiler resolution and compiler-query failures return an explicit unknown
  or error result and never claim that no build is required.
- A fixture custom command receives the documented request and its result is
  validated against the same response schema.
- Agent-facing output excludes the complete TypeScript file list.
- Portable policy, project configuration, plan execution, and specialized
  build guidance use the canonical build-impact rule.
- Generated adapters match their canonical sources.
- Ponytail's configured final acceptance passes.
- Downstream adoption instructions prove both build-required and build-skipped
  cases before removing an unconditional build rule.

## Sprint Manifest

1. [S01: Implement Portable Build-Impact Tooling](sprints/S01.md) — `DONE`
2. [S02: Configure Governed Projects](sprints/S02.md) — `DONE`

## Approval

The user explicitly approved the complete plan by directing the agent to
build it. Sprint S01 began on 2026-07-30.

## Final Validation

Sprint S01 and Sprint S02 are complete. The portable implementation began at
`c67aa58`; Version 2 exact glob inputs, non-code fast-path classification, and
classifier-only configuration handling were completed in `2f2b1e0`,
`8ad69ae`, and `cef278c`.

Final Ponytail acceptance passed with 187 core tests, 23 Pi extension tests,
and 4 MCP tests, plus installer, rule-copy, version, registry, distribution,
manifest, and diff checks. The installed Codex skill resolves to the committed
repository skill.

IPG adoption is commit `db6ca8d40`; GWEN adoption is commit `9ce05709`.
Positive and negative evidence for every configured target and both language
adapter kinds is recorded in Sprint S02. The adoption files themselves
reported no affected targets, so no product build was applicable. No
deployment or non-local environment mutation occurred.
