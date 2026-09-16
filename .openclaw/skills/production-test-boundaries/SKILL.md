---
name: production-test-boundaries
description: "Production and test architecture separation"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Production Test Boundaries

Production artifacts contain product behavior. Test harnesses own test
configuration and orchestration without changing the product path they prove.

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `Production compilation and packaging inputs`; and
- `Integration-environment setup`; and
- `Integration execution profiles`; and
- `Build-impact configuration`; and
- `Unit-test command families`.

The host's standard project configuration supplies named unit-test families
with focused and full commands, plus integration, focused-workflow, build,
packaging, and final-acceptance commands.
Production inputs default to those consumed by the configured build and
packaging commands. Integration-environment setup defaults to `not configured`.
Integration execution profiles default to `ephemeral` when integration setup
is configured and otherwise to `not configured`.
Build-impact configuration defaults to `ponytail.json` when the project owns
buildable targets and otherwise defaults to `not applicable`. Unit-test
command families default to `not configured`.

Do not invent a test environment, provider substitute, or integration command
when project configuration is absent. Apply the host's configuration-
discrepancy policy.

## Integration-Test Hierarchy

Use these terms consistently:

- **Suite**: a named set of related Arcs.
- **Arc**: a named ordered sequence of one or more Steps.
- **Step**: the smallest independently reported executable integration-test
  operation together with its assertions.

Steps execute in their declared Arc order. When a Step fails, stop that Arc's
ordinary Steps after running required harness finalization. Do not stop the
complete run: attempt every remaining selected Arc, report the aggregate
results, and return a nonzero final status when any selected Arc failed.

## Production Boundary

- Keep test modes, test-only environment variables, fake scenarios, synthetic
  responses, test-only commands, and test-conditioned branches out of
  production compilation inputs and shipped artifacts.
- Keep test doubles in test or test-support compilation inputs. Production code
  must not import them, read their configuration, or coordinate their state.
- Keep every production call path canonical. Testing must not introduce a
  second implementation or bypass the behavior under test.
- Inspect compilation and packaging inputs before adding test infrastructure.
  Add a focused automated guard when test support could otherwise be imported,
  bundled, configured, or enabled by production code.
- Apply the canonical `build-impact` query before running a build for ordinary
  change validation.

## Unit-Test Boundary

Use real in-process production dependencies when they are deterministic and
safe. Replace only unavailable, nondeterministic, destructive, or external
boundaries such as databases, cloud services, third-party services, devices,
clocks, or process boundaries.

Keep doubles behaviorally subordinate to the production contract. Do not copy
production transformation or validation logic into a double. Apply the host's
language-specific unit-testing and static-contract skills for fixture and
double typing.

## Integration Boundary

Run the complete executable product stack without mocks, fakes, test-mode
product branches, or synthetic provider responses. The integration harness,
not production code, owns repeatable profile configuration, including:

- database and state isolation appropriate to the execution profile, prepared
  with the same migrations and owned custom SQL as the target environment;
- real sandbox accounts or services for configured external dependencies; and
- credentials, endpoints, cleanup, and isolation that prevent effects on
  development, cloud, or live environment data outside the test run.

An integration check that replaces the boundary whose behavior it claims to
prove is not integration evidence. Record unavailable external proof as an
explicitly unverified gate rather than substituting a fake success.

## Execution Profiles

An Arc describes behavior independently of where it runs. An execution profile
selects its environment lifecycle without creating a second product path.

An **ephemeral profile** provisions isolated state for the run and ordinarily
removes that state during finalization. Its database uses the same migrations
and owned custom SQL as the target product environment.

A **persistent non-production profile** exercises an already deployed product
and may preserve final state for inspection. It must:

- refuse production targets unless a separate explicit contract authorizes
  that target and operation;
- operate only on objects whose test ownership it can prove;
- use deterministic ownership identifiers and a unique run identity;
- never delete or overwrite an object merely because its name resembles test
  data;
- record every created, reused, modified, and intentionally preserved object;
- isolate the run from unrelated users and test runs; and
- use real sandbox dependencies when the Arc claims to prove that boundary.

Setup may reconcile or remove state left by the same owned fixture identity.
Finalization may intentionally preserve successful state, but cancellation and
failure handling must still leave an actionable manifest. If intentional
shared state can change an unrelated session's observable behavior, apply
`cross-session-effects` before accepting that profile.

The harness owns profile selection, safety checks, fixture reconciliation, and
evidence capture. Production code must not gain test-only routes, branches, or
configuration to support a profile. Concrete commands, environment names,
credentials, tools, and fixture operations belong to project-local
configuration or a project-local skill, not this reusable policy.

## Review Checklist

- Production compilation and packaging inputs contain no test mechanism.
- Production behavior has one path regardless of who invokes it.
- Unit doubles replace only legitimate boundaries.
- Integration tests execute the real vertical slice with isolated state.
- Execution profiles preserve one Arc and one production path.
- Persistent profiles mutate only proven test-owned non-production state.
- Integration Steps execute in Arc order and stop their Arc on failure.
- Every remaining selected Arc runs before aggregate success or failure is
  reported.
- Focused guards prevent test support from entering shipped artifacts.
