---
name: production-test-boundaries
description: >-
  Use when adding, changing, reviewing, or testing test infrastructure,
  production test modes, test-only branches, mocks, fakes, synthetic responses,
  integration harnesses, packaging inputs, or boundaries between shipped code
  and test support. Keep test mechanisms out of production and require
  integration tests to exercise the real product path.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Production Test Boundaries

Production artifacts contain product behavior. Test harnesses own test
configuration and orchestration without changing the product path they prove.

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `Production compilation and packaging inputs`; and
- `Integration-environment setup`.

The host's standard project configuration supplies the unit, integration,
focused-workflow, build, packaging, and final-acceptance commands. Production
inputs default to those consumed by the configured build and packaging commands.
Integration-environment setup defaults to `not configured`.

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
not production code, owns repeatable isolated configuration, including:

- an isolated database prepared with the same migrations and owned custom SQL
  as the target environment;
- real sandbox accounts or services for configured external dependencies; and
- credentials, endpoints, cleanup, and isolation that prevent effects on
  development, cloud, or live environment data outside the test run.

An integration check that replaces the boundary whose behavior it claims to
prove is not integration evidence. Record unavailable external proof as an
explicitly unverified gate rather than substituting a fake success.

## Review Checklist

- Production compilation and packaging inputs contain no test mechanism.
- Production behavior has one path regardless of who invokes it.
- Unit doubles replace only legitimate boundaries.
- Integration tests execute the real vertical slice with isolated state.
- Integration Steps execute in Arc order and stop their Arc on failure.
- Every remaining selected Arc runs before aggregate success or failure is
  reported.
- Focused guards prevent test support from entering shipped artifacts.
