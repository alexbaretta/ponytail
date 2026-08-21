---
name: cross-session-effects
description: "Cross-session behavior approval and test-first safety"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Cross-Session Effects

A cross-session effect exists when activity from one user, tenant, device,
process, network origin, deployment instance, or time window can change
whether another otherwise independent session succeeds, fails, is delayed, or
receives different observable behavior. Examples include broadly keyed rate
limits, shared lockouts, reputation scores, circuit breakers, quotas,
concurrency caps, abuse counters, and automatic bans.

A shared implementation mechanism alone is not a cross-session effect. This
policy applies when independently testable sessions influence one another's
observable behavior.

## Authority

- Do not introduce, design into a plan, implement, or treat as accepted any
  cross-session effect unless the user specifically requested that effect or
  approved it through the gate below.
- The agent may recommend an unrequested cross-session effect only as a
  security countermeasure. Keep it outside the proposed implementation, plan
  architecture, acceptance criteria, tasklets, and bug fix until specifically
  approved.
- Do not recommend an unrequested cross-session effect for convenience,
  performance, cost control, resilience, product policy, or operational
  simplicity. Surface it as an unselected product or architectural choice
  requiring user direction.
- Approval of a plan, bug fix, security-hardening effort, or implementation
  generally does not authorize a cross-session effect.

## Mandatory Alarm And Approval

Before incorporating a recommended cross-session effect, stop and display:

> 🚨 **HIGH-RISK CROSS-SESSION EFFECT — EXPLICIT ACKNOWLEDGMENT REQUIRED**
>
> This implementation allows activity outside one user's session to change
> that user's behavior or availability.
>
> **Proposed effect:** [exact mechanism]
>
> **Aggregation key:** [IP address, account, tenant, device, global
> population, or other key]
>
> **Affected population:** [who can influence whom]
>
> **Trigger and duration:** [threshold, window, reset, and persistence]
>
> **Production failure mode:** [how legitimate users could be denied,
> delayed, or otherwise affected]
>
> **Required cross-session test:** [specific multi-session or load scenario]
>
> Generic approval does not authorize this effect. To approve it, explicitly
> identify the mechanism and acknowledge its cross-session production risk.

Proceed only after the user names both the aggregation mechanism and its
cross-session risk and approves that specific implementation. For example:

> I acknowledge that the proposed IP-based login rate limit allows login
> attempts from users sharing an IP address to prevent other users from
> logging in. I accept that production availability risk and approve this
> specific implementation.

`Approved`, `looks good`, approval of the surrounding plan, or other generic
assent is insufficient. If the acknowledgment does not name the mechanism and
risk, keep the effect out of the plan and implementation.

Record the exact acknowledgment in the durable plan or bug record when the
host project uses one.

## Test-First Gate

Before implementing or changing a cross-session effect:

1. Add a focused integration test that exercises the effect across
   independently modeled sessions.
2. Run it before the production change and record that it fails for the
   expected missing behavior. A test written after implementation does not
   satisfy this gate.
3. Reproduce the production aggregation topology. For example, an IP-based
   limit exercises independent users or sessions sharing one IP and, when
   relevant, control sessions using different IPs.
4. Assert both that the intended abusive or excessive activity is constrained
   and that legitimate independent sessions retain the specifically approved
   availability behavior.
5. Generate bounded artificial concurrency or load when ordinary test traffic
   cannot reach the shared threshold. Keep it isolated from production and
   from shared environments whose state could affect unrelated users or test
   runs.
6. Control or reset shared state, time windows, aggregation keys, and
   concurrency sufficiently to make the result deterministic.
7. After implementation, run the same integration test and require it to pass
   before considering the work complete.

The test must encode the approved availability contract, not merely prove that
blocking occurs.

If the repository lacks an integration boundary capable of testing the real
shared behavior, do not implement the effect. Report the missing test
capability as a blocker to that countermeasure. Do not substitute a unit test,
mock-only test, or manual single-session check.
