---
name: requirements-traceability
description: >-
  Define and check identified requirements, atomic obligations, acceptances,
  tests and implementing code blocks. Maintain canonical forward annotations
  and generated reverse discovery without confusing links with passing proof.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Requirements Traceability

Use the [Ponytail glossary](../plan-execution/references/glossary.md) for atomicity
and terminology. Each relationship is owned by its source declaration. Generate
reverse discovery from those annotations; do not maintain a second manual map.

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `Traceability configuration`;
- `Traceability check command`;
- `Traceability reverse-view generation command`; and
- `Traceability TypeScript semantic checker`.

Each value defaults to `not configured`. Do not invent project paths, commands,
approval, IDs or coverage. Explicit configuration version 5 adopts the contract
below. Installation alone does not migrate a project. When inspecting or working
on a V1–V4 project, read [legacy-graph.md](references/legacy-graph.md); its physical
readers retain their original meanings. Do not silently reinterpret old direct
requirement links as obligation or acceptance links.

V5 configuration declares `projectRoot`, `requirementsRoot`, `uatRoot`, source
scopes, exclusions with reasons, generated-source mappings, `reverseViewPath`
and a TypeScript checker configuration or `null`. Paths are relative to the
invoking project except `projectRoot`, which is relative to the configuration.
Source scopes each declare `kind` (`implementation`, `unit-test` or
`integration-test`), `include` globs and `locator` (`text` or `typescript`). Keep
classification unambiguous. TypeScript source requires the semantic locator and
its configured `cliPath` and `projectPath`. Do not classify TypeScript as text to
avoid attachment checks. Generated output maps directly to a classified canonical
source and contains no relationship annotations.

Canonical Markdown scopes enumerate every declaration, including unreferenced,
untracked or ignored acceptances. Code scopes include tracked and unignored new
files; exclusions cannot hide canonical requirements or UAT. Do not narrow scope
to make coverage pass. The generated reverse view is excluded from discovery. JavaScript and TypeScript
files with canonical relationship declarations in comments must have an explicit
source classification or exclusion; otherwise discovery reports `unclassified-source`
at that file and comment line. Comment parsing resolves TypeScript from the
invoking project, not from the installed skill directory. String examples do not
declare ownership.

## Canonical Graph

| Source | Role | Target |
| --- | --- | --- |
| Obligation | `decomposes` | Requirement |
| Acceptance | `verifies` | Obligation |
| Unit or integration test | `verifies` | Acceptance |
| Code block | `implements` | Obligation |

Keep individually identified requirements and atomic obligations in the configured
requirements root, normally `pm/requirements`. Keep individually identified
acceptances in the UAT root, normally `pm/uat`. Every source has a stable ID;
links must resolve to exactly one declaration of the expected kind.

Declare Markdown IDs with an ATX heading containing an explicit kind and ID,
such as `## requirement ACC-LOGIN`, `## obligation LOGIN-ATOMIC`, or
`## acceptance LOGIN-CHECK`. Preserve existing IDs; their prefixes need not
encode their kind. Prefix-based headings and bold-ID list labels beginning with
`REQ-`, `OBL-` or `ACC-` retain their respective kinds when no explicit kind is
given. A requirement may also use `**Identifier:**` followed by its backticked
ID, regardless of prefix. IDs use uppercase letters, digits and hyphens. Incidental
mentions and fenced examples are not declarations. Place each Markdown edge
after its own declaration, before another declaration:

```markdown
## REQ-ORDER: Place an order
Approved behavior and provenance.

## OBL-ORDER-SAVE: Persist the accepted order
The atomic condition and discharge criterion.
Traceability: decomposes REQ-ORDER from obligation OBL-ORDER-SAVE
```

```markdown
## ACC-ORDER-SAVED: Accepted order can be retrieved
Prerequisites, actions and expected observations.
Traceability: verifies OBL-ORDER-SAVE from acceptance ACC-ORDER-SAVED
```

Use an ordinary language comment immediately beside each stable owned code block
or executable test registration:

```typescript
// Traceability: implements OBL-ORDER-SAVE from implementation saveOrder
function saveOrder() { /* product behavior */ }

// Traceability: verifies ACC-ORDER-SAVED from unit-test TEST-ORDER-SAVED
test('accepted order can be retrieved', () => { /* assertions */ });
```

Use `integration-test` for an integration registration. Test and code IDs must be
stable and unique across the graph; do not derive identity from a changing line
number. Several adjacent annotations may give the same source unit multiple
edges without duplicating its declaration. Shared helpers are implementation
support, not executable tests; attach test IDs to the runner registrations.

For a project-owned test runner or wrapper, place `/** @traceabilityRunner */`
on its canonical exported `test`, `it`, `describe` or `suite` function or variable
declaration. TSTS resolves imports to that declaration; tags on calls or imports
do not register a runner. Review must establish that this boundary actually
registers and executes tests. The tag admits a locator, not behavioral adequacy
or passing proof; explicitly disabled and todo registrations remain excluded.
Conditional `runIf`/`skipIf` registrations retain links unless their boolean
condition statically disables them. A runtime-dependent condition is not passing
proof: credit requires the configured run to enable and execute the identified
tests without skips. Preserve real environment gates. Do not tag ordinary helpers
to obtain coverage credit.

Do not annotate every line. Identify all blocks declaring that they implement
an obligation so the reverse view can find them. Review verifies that the named
blocks actually implement that condition. A direct test-to-requirement or
code-to-requirement link cannot replace the required V5 edge. Plan, tasklet and
issue references are provenance, not completed graph coverage.

## Coverage And Adequacy

### JSON source declarations

For an implementation-classified `.json` or `.jsonc` source using the text locator, put
canonical annotations in a direct `traceability` string array on the object
that implements the obligation. The owning JSON schema must explicitly allow
that field; do not add unsupported metadata. Ponytail build-impact V3 permits
it on input objects (see `build-impact`). Include that JSON path in the
implementation source scope.

```json
{
  "kind": "file",
  "path": "docs/legal/terms.md",
  "traceability": [
    "Traceability: implements OBL-LEGAL-BUILD from implementation legalTermsBuildInput"
  ]
}
```

Discovery parses JSON/JSONC, preserves existing comment annotations, rejects
duplicate properties, and uses the owning property's source location. JSONC
comments and trailing commas are supported even in `.json` files such as
TypeScript configuration. The owning configuration reader still enforces its
own dialect: build-impact files remain strict JSON. Repeated edges within that object's array share
one implementation ID; separate objects require distinct IDs. Other string
values cannot declare coverage. Configured executable JSON tests (such as registered
interpreted integration Arcs) use their configured test kind and reference
acceptances. Implementation-classified JSON cannot declare tests. Discovery
establishes links only; runtime execution and adequacy review remain required.
No sidecar relationship map or duplicated policy is needed.

### Campaign completeness command

Run `ponytail traceability completeness --campaign <name> --assessment-tag <tag>`
on the clean integrated commit. It reads the invoking project's V5 graph directly,
without a database, and prints only the `(O,A,T,I)` vector by default. Use
`--verbose` for unresolved IDs, assessment context and individual findings;
`--json` retains the complete structured report with no progress output. Human
output includes an early progress bar on stderr, beginning before repository
inspection and updating during source discovery and verification. Blocking
annotation findings produce a short stderr summary even without `--verbose`. Without `--assessment-tag`, it selects the
unique `ponytail/completeness/<name>/*` annotated tag at HEAD; no arguments work
when exactly one campaign assessment tag exists there. Ambiguity requires an
explicit tag. For an initial unassessed scope, use
`--campaign <name> --requirement REQ-A --requirement REQ-B`; repeat for the exact
approved scope. All adequacy starts unresolved.

The coordinator owns one compact assessment snapshot, stored only in an annotated
Git tag on the assessed commit. Prepare its JSON in ignored temporary storage,
then use `git tag -a ponytail/completeness/<name>/<unique> -F <file> HEAD`:

```json
{
  "schemaVersion": 2,
  "campaign": "example",
  "requirementIds": ["REQ-A"],
  "complete": {"O": [], "A": [], "T": [], "I": []},
  "reviewReferences": [],
  "validationTags": []
}
```

Version 2 uses `O` for obligation decomposition. Existing version 1 tags with
`complete.R` remain readable and normalize to `O`; create new assessments as version 2.

`complete.O` lists requirements with reviewed complete decomposition;
`complete.A` lists obligations with reviewed adequate acceptances;
`complete.T` lists acceptances with adequate tests and passing implementation;
`complete.I` lists adequately implemented obligations with passing coverage.
Nonempty completion sets require review references covering those claims. T/I
claims additionally require references to actual passing annotated validation
tags on ancestor commits (including HEAD). The coordinator must inspect those
results and confirm their continued applicability to HEAD. The command verifies
tag existence, ancestry, exact assessment commit, scope and graph structure;
it cannot establish the truth of a review or test claim from prose. Never include
failed, skipped, stale or inadequate proof in completed sets.

The assessment cannot override missing graph relationships. Unassessed IDs stay
unresolved; I also requires adequate acceptance coverage and passing linked
tests. Ambiguous graphs, wrong-kind/out-of-scope assessment IDs,
dirty worktrees, stale assessment tags and missing evidence references fail.
Canonical inputs must match committed bytes; ignored canonical files and index
flags that hide inputs (`assume-unchanged`, `skip-worktree`) are rejected.
Annotation findings, including legacy Markdown relationship markers, are
returned in `findings` with `completionBlocked: true`. Malformed markers grant
no coverage. Resolve every finding before final acceptance, even at zero.
O/A completion attests adequate decomposition of the actual requirements and
obligations, not merely the declarations currently parsed. Unidentified work
remains unresolved in O/A until decomposed. Explicit scope, unique identities,
valid edges and ownership of every declared entity remain mandatory; a declared
acceptance with no valid obligation edge is a graph error.
Exit zero means the report was computed, not that its vector is zero or completion
is permitted.

After a merge, create a new immutable assessment tag on the integrated commit.
Its Git target supplies the commit binding; never put a commit ID in the
annotation, including review references or validation tag names containing one.
Carry forward only claims whose reviews and relevant test inputs remain valid;
remove uncertain claims and rerun affected proof. Preserve the full approved
requirement scope and newly discovered descendants. Do not copy logs, graph
edges or worker bookkeeping into the snapshot, and never track its staging file.
A zero vector is provisional until all workers are DONE and independent full QA
passes on that commit.

Every requirement needs adequate atomic decomposition. Every obligation needs
adequate acceptance coverage and implementing code. Every acceptance needs an
identified executable unit test or integration test. Either test layer may be
sufficient; V5 has no mandatory per-layer quota and no no-unit-test waiver.
Manual observations may supplement automated proof but cannot replace the
required executable acceptance link. Multiple acceptances can jointly prove an
obligation; every one remains individually accountable for its own tests.

The checker discovers declarations before assessing edges. A second acceptance
without a test must remain a gap even if another acceptance of the same
obligation has passing tests. Duplicate IDs, missing parents, dangling references,
wrong kinds and malformed annotations fail validation. Planned tests, skipped
registrations, helpers and empty assertions cannot establish behavioral proof.

Structural validity establishes discoverability, not adequacy or execution.
Adversarial review assesses whether decomposition, observations, selected tests
and implementation establish the approved conditions. Unknown adequacy remains
unresolved. T and I in the campaign completeness vector may decrease only when
both linked tests and implementation exist and the implementation passes those
tests. An unrelated successful command cannot establish their coverage.

Validation evidence belongs to the tested commit's metadata, not source files.
Do not add passing output, certificate ledgers or evidence-only commits. Keep
requirements, acceptances and executable tests as durable source; diagnostic
records are distinct from certificates. Historical certificates retain their
original meaning and do not certify a changed candidate.

## Checks And Workflow

1. Reconcile authorized requirements and atomic obligations with canonical UAT
   acceptances. Preserve stakeholder provenance and unresolved scope.
2. Maintain the four edges beside their source declarations; classify source and
   test scopes and generated-source mappings in the same change.
3. Run the configured reverse-view generation and structural/semantic check.
4. Run the applicable focused tests and obtain adequacy review before claiming
   discharged coverage. Preserve failures and unknowns as unfinished work.

TSTS owns only semantic TypeScript locators: real leading comments attached to
supported declarations and executable test registrations in the configured
program. It does not own Markdown, requirements, UAT, source inventory or reverse
views. The structural checker owns that inventory and graph validation. Neither
checker certifies runtime results or replaces adversarial review.

The generated reverse view exactly matches canonical annotations. It may be
checked in as a derived navigation aid; it is not validation evidence. Existing
authored files and symbolic links cannot be overwritten as generated output.

For indexed inspection, run `ponytail traceability update-index` before queries;
use `--rebuild` only for explicit reconstruction. V5 requirement filters follow
the graph through obligations and acceptances. Repository validation includes
every indexed acceptance. Historical `--plan` and `--campaign` selectors are
not V5 scope selectors: they currently fail explicitly. Do not bypass that error
by silently substituting repository scope or by claiming scoped completeness.
