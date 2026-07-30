# Unified Agentic Coding Harness

Plan ID: `unified-agentic-harness`

Status: `IN_PROGRESS`

## Objective

Combine Ponytail's portable agent runtime and general coding heuristics
with the reusable engineering and project-management skills currently
maintained in `agent_harness`.

The result will be one open-source Ponytail distribution that supplies:

- general agentic coding guidance;
- optional Ponytail implementation-minimization modes;
- reusable engineering, contract, and project-management skills;
- portable adapters for supported agent hosts; and
- project-local configuration through the host project's instructions.

## Scope

- Reconcile overlapping and contradictory rules deliberately.
- Establish canonical sources for rules, skills, commands, and metadata.
- Migrate the approved reusable skills into Ponytail.
- Extend Ponytail's adapters, generators, tests, and publication
  metadata.
- Preserve project-local configuration as a separate host-owned concern.
- Preserve upstream Ponytail attribution and imported-work provenance.

## Explicit Exclusions

- Do not create a compatibility installer or compatibility layer in
  Ponytail.
- Do not retire or delete the standalone `agent_harness` repository as
  part of this plan.
- Do not migrate project-specific GWEN rules into Ponytail.
- Do not migrate GWEN's web-client/API parity rule into Ponytail.
- Do not include the disabled `git-write-escalation` skill in a
  published skill surface.
- Do not start implementation while a reconciliation question is open.

## Repositories And Ownership

- Management repository: Ponytail.
- Primary component repository: Ponytail.
- Compatibility owner during transition: the standalone `agent_harness`
  repository.
- Source material: Ponytail and `agent_harness` Git histories.

Ponytail will not duplicate compatibility behavior. Existing consumers
may continue using `agent_harness` until they move to the combined
distribution.

## Decisions

### [RESOLVED] D01: Compatibility Ownership

The standalone `agent_harness` repository remains the compatibility
layer for as long as it is needed. The combined Ponytail project will
target its final architecture directly.

Source: user decision in the session that created this plan.

### [RESOLVED] D02: License

The combined project will use Ponytail's MIT license.

Source: user decision in the session that created this plan.

### [RESOLVED] D03: Authorship And Copyright

- Files entirely contributed by Alex Baretta will carry Alex Baretta's
  authorship and copyright claim.
- Existing Ponytail files edited by Alex Baretta will carry a combined
  copyright claim.
- Unmodified Ponytail files will retain their existing attribution.

Source: user decision in the session that created this plan.

### [RESOLVED] D04: Rule Precedence By Origin

Neither repository's rules prevail merely because of their source. Rules
will be reconciled according to authority, applicability, specificity,
safety, and the requirements of the requested work.

Source: the user withdrew the earlier blanket precedence instruction.

### [RESOLVED] D05: Testing Cadence

Retain the testing cadence defined by `plan-tasklets`:

- tasklets own focused success and failure or edge-path unit coverage;
- features or stories own their complete package unit suite and the
  integration tests for the executable vertical slice;
- sprints own required cross-story integration; and
- plans own all host-configured final acceptance gates.

Remove Ponytail's conflicting one-check limit, prohibition on fixtures
or test frameworks, and trivial-change test exemption. Broader
validation may be deferred only to a named owning gate.

Source: user approval while resolving Sprint S01 question Q01.

### [RESOLVED] D06: Implementation Complexity

The agent SHOULD choose the simplest implementation that fully satisfies
the approved behavior, acceptance criteria, contracts, safety rules, and
project architecture.

Compare conforming implementations in this order:

1. minimize conditional branches; and
2. among implementations with the same branch count, minimize lines of
   code.

Simplicity does not authorize reduced behavior or a materially
different result. Obtain user approval before omitting or changing a
requirement to reduce complexity.

Source: user decision while resolving Sprint S01 question Q02.

### [RESOLVED] D07: File And Abstraction Minimalism

Use as few files as necessary given architectural requirements and best
practices. Make a conscious effort to avoid file proliferation and
sprawl.

Do not create files whose only purpose is to re-export names defined
elsewhere unless the specific file serves a key architectural purpose.
File boundaries and abstractions must still preserve required ownership,
contracts, sources of truth, and host-project architecture.

Source: user decision while resolving Sprint S01 question Q03.

### [RESOLVED] D08: No Aliasing

Aliasing is prohibited. Do not introduce a second name for an existing
declaration, type, value, module, or import. In particular, do not
rename an imported symbol with TypeScript `import { x as y }` syntax.

Source: user decision during Sprint S01 reconciliation.

### [RESOLVED] D09: Deletion Authority

A clean tracked file whose contents are committed may be deleted within
approved scope without separate deletion authorization. Explicit user
authorization is required before deleting an untracked file or a tracked
file containing uncommitted edits.

Deletion remains subject to correctness, architecture, provenance, and
scope requirements.

Source: user decision while resolving Sprint S01 question Q04.

### [RESOLVED] D10: Do Not Repeat Yourself

Do not repeat yourself. Maintain one canonical implementation for each
piece of logic, contract, schema, constant, or policy. Do not duplicate
the same code in multiple places.

Apply the same principle to communication. Do not repeat information
already established unless repetition is necessary for the current
decision or prevents a material misunderstanding.

Source: user decision during Sprint S01 reconciliation.

### [RESOLVED] D11: Decision-Relevant Communication

Keep explanations clear, succinct, and decision-relevant. State the
outcome and verification result. Beyond that, report only matters that
could reasonably affect the user's judgment:

- decisions made without prior agreement;
- debatable implementation choices;
- meaningful alternatives or tradeoffs;
- deviations from the approved approach;
- unresolved risks; and
- points where user guidance would improve the result.

Do not narrate routine implementation steps, repeat agreed decisions, or
pad responses with generic summaries. Answer explicit requests for
explanation fully.

Do not announce intended actions, research, inspection, tool use, or the
reasoning process. Begin work silently and report the result. Send an
intermediate update only for a material finding, risk, blocker, required
user action, or decision-relevant partial result.

Source: user decisions while resolving Sprint S01 question Q05.

### [RESOLVED] D12: Local Technical-Debt Owner

The combined Ponytail repository will contain a root `tech_debt.md`
document as its canonical local technical-debt record.

Source: user decision while resolving Sprint S01 question Q06.

### [RESOLVED] D13: Inline Technical-Debt Markers

When inline technical-debt markers are necessary, use `tech-debt:` in
the language's ordinary comment syntax. Do not use the branded
`ponytail:` marker.

Prefer recording technical debt directly in `tech_debt.md`. Inline
markers are exceptional and do not replace the canonical document.

Source: user decision while resolving Sprint S01 question Q06.

### [RESOLVED] D14: Web-Client/API Parity

Web-client/API parity is a GWEN-specific architectural rule. Remove it
from the reusable harness material and do not migrate it into Ponytail.
Keep the rule in GWEN's project-local customizations.

Source: user decision while resolving Sprint S01 question Q07.

### [RESOLVED] D15: One Canonical Path

Do not add defensive backstops. There must be one canonical way to
perform each operation. Do not add fallback implementations, secondary
lookup routes, duplicate validation, or try-one-then-another behavior to
compensate for defects in the canonical path.

Fix the canonical path and fail explicitly when it cannot satisfy its
contract. Explicitly modeled product requirements and contract variants
are not backstops; normalize them into the one canonical internal path.

Source: user decision during Sprint S01 reconciliation.

### [RESOLVED] D16: Mirrored Contract Artifacts

When a host project declares generated or maintained artifacts that
mirror a contract, update and validate every affected artifact with the
contract change.

Use project-agnostic terminology. Do not assume that mirrored artifacts
are SDKs or that they use any particular implementation language.

Source: user decision while resolving Sprint S01 question Q08.

### [RESOLVED] D17: Rule Activation

All combined harness rules are always active except aggressive code
compaction. Aggressive code compaction is enabled by default and may be
turned off without disabling any other rule.

Retain Ponytail's existing `lite`, `full`, and `ultra` levels to control
compaction intensity.

Source: user decision while resolving Sprint S01 question Q09.

### [RESOLVED] D18: Instruction Ownership

Maintain one repository-neutral policy source for portable, always-on
rules and configurable compaction behavior. Generate host-specific
adapters and runtime payloads from that source.

Keep specialized skills as separately triggered modules. Use each
project's `AGENTS.md` only for project-local configuration and skill
bindings. Ponytail's root `AGENTS.md` configures the Ponytail
repository; it is not a portable rule artifact.

Source: user approval while resolving Sprint S01 question Q10.

### [RESOLVED] D19: Product And Marketing Surfaces

Remove `ponytail-gain` entirely as a skill and command. Keep benchmark
claims and evidence in documentation and benchmark artifacts.

Retain `ponytail-help` as an explicit command, not as an agent skill.

Source: user decision while resolving Sprint S01 question Q11.

### [RESOLVED] D20: Example Artifacts

Delete the `examples/` directory, its dedicated benchmark-output
generator, and inbound README links. Benchmark inputs, correctness
checks, results, and reproduction tooling remain under `benchmarks/`.

Source: explicit user direction while resolving Sprint S01 question
Q12.

### [RESOLVED] D21: Skill And Command Registry

Maintain one declarative registry as the source of truth for skills and
commands, including activation status and host exposure. Generate host
manifests and adapters from the registry. Directory presence alone does
not activate a skill or command.

Source: user approval while resolving Sprint S01 question Q13.

### [RESOLVED] D22: Project-Local Skills

Store project-local skills under `.agents/skills/` in their owning
repository. Project-wide skills belong to the management repository;
component-specific skills belong to the owning component repository.

Project configuration declares every skill root and binding explicitly.
Ponytail registers or links those roots through the selected host
adapter without copying the skills into Ponytail or inferring roots from
directory scans.

Source: user approval while resolving Sprint S01 question Q14.

### [RESOLVED] D23: Migration History

Do not merge `agent_harness` and Ponytail at the Git-history level.
Apply changes directly to Ponytail and commit each individually
meaningful change-set separately. Preserve source provenance and
authorship in the affected files and commit messages.

Source: user decision while resolving Sprint S01 question Q15.

### [RESOLVED] D24: Publication Identity

Publish the combined fork from `github.com/alexbaretta/ponytail` and use
the npm package name `@alexbaretta/ponytail`. Alex Baretta is the fork
publisher and maintainer. Retain Dietrich Gebert as Ponytail's original
author.

Update package metadata, plugin manifests, marketplace ownership,
generated metadata sources, and current installation documentation to
use the fork's coordinates.

Source: explicit user direction while resolving Sprint S01 question
Q16.

### [RESOLVED] D25: Gemini CLI Support

Remove the Gemini CLI extension adapter. Use the conventional
`hooks/hooks.json` path for shared Claude Code and Codex lifecycle hooks.
Codex relies on automatic discovery; Claude Code references the same file
from its manifest. Record the removed Gemini support and its restoration
conditions in `tech_debt.md`.

Source: explicit user direction after Q16.

### [RESOLVED] D26: Benchmark Isolation

Separate all benchmark artifacts, dependencies, commands, tests, claims,
and publication concerns from the core Ponytail distribution used for
live development. Core setup, development, testing, packaging, and
publication must not execute benchmark code or require benchmark
dependencies.

Benchmarks may remain as an optional isolated subsystem with its own
documentation, dependency provisioning, commands, and validation. Core
documentation may link to that subsystem but must not depend on its
results for ordinary correctness or acceptance.

Source: explicit user direction while resolving Sprint S01 question
Q17.

## Inspection Findings

- Ponytail has mature cross-host adapters, runtime modes, generators,
  publication workflows, and adapter regression tests.
- Ponytail duplicates instruction parsing and configuration behavior in
  its JavaScript and Hermes Python runtimes; observable semantics have
  drifted.
- Ponytail's root `AGENTS.md` currently serves both as repository-local
  instructions and as a portable rule artifact.
- Ponytail manually duplicates rule, command, skill, and manifest
  metadata across multiple host formats.
- Ponytail's optimization guidance includes categorical rules about
  tests, fixtures, file count, deletion, output length, and reduced
  implementations.
- The harness contains more specific correctness, contract, approval,
  project-structure, and validation workflows that sometimes conflict
  with those categorical rules.
- The harness's API-product client-parity profile was generalized from
  GWEN and is not a universal API boundary rule.
- The phrase `SDK parity` is not a harness rule. SDK references identify
  possible consumers or configured validation surfaces.
- The `ponytail-gain` skill reports older single-shot benchmark figures
  while the README treats the agentic benchmark as the current headline
  evidence.
- Ponytail's local rule and version checks pass. Its root test suite
  currently requires an externally provisioned Python `pandas`
  dependency; without it, one benchmark correctness test fails without a
  clear dependency preflight.
- The standalone harness validation suite passes.

## Architectural Direction

The intended conceptual layers are:

1. platform, user, and host-project authority;
2. applicable project configuration and specialized contract rules;
3. concise general engineering defaults; and
4. Ponytail's solution-minimization heuristic within those constraints.

This direction is approved. Sprint S01 resolved every reconciliation
question, and the user explicitly instructed completion of the planned
Ponytail edits.

## Plan-Wide Acceptance Criteria

- Every reconciliation question is recorded and marked `[RESOLVED]`.
- Canonical sources replace manually drifting instruction and metadata
  copies.
- Every enabled reusable skill is valid and exposed only by intended
  hosts.
- Ponytail modes cannot disable independent engineering or contract
  skills.
- Cross-runtime conformance tests cover instruction and mode behavior.
- Focused tests cover every resolved conflict as an executable
  invariant.
- Instruction-only and skill-capable hosts receive coherent
  distributions.
- Authorship, copyright, license, package, and repository metadata
  conform to the recorded decisions.
- Ponytail's configured final validation passes from a provisioned
  development environment.
- The standalone `agent_harness` repository remains usable throughout
  the transition.

## Sprint Manifest

- [S01](sprints/S01.md): `DONE` - Resolve semantics and architecture.
- [S02](sprints/S02.md): `DONE` - Establish the isolated core.
- [S03](sprints/S03.md): `DONE` - Migrate reusable skills.
- [S04](sprints/S04.md): `PENDING` - Generate supported host adapters.
- [S05](sprints/S05.md): `PENDING` - Complete publication quality.

## Approval

Plan creation and implementation were explicitly requested by the user.
The user resolved the final S01 question and instructed completion of the
planned Ponytail edits.

## Final Validation Record

Pending.
