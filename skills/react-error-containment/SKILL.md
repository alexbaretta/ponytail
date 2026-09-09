---
name: react-error-containment
description: >-
  Use when designing, implementing, reviewing, or testing React error
  handling, error boundaries, route or section fallbacks, query and mutation
  failures, root render resilience, boot failures, unhandled rejections, or
  frontend error reporting. Require containment at every affected layer,
  runtime boundary validation, visible recovery, and scoped failure-injection
  tests.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# React Error Containment

Keep one failure from erasing unrelated UI. Treat data validation, operation
errors, React render exceptions, event failures, asynchronous failures, and
application boot failures as distinct categories with distinct owners.

## Start From The Host Project

Before editing:

1. Read the host repository instructions and applicable plan or task record.
2. Find the affected application shell, router, root mount, independent UI
   sections, data layer, runtime response validators, and error reporter.
3. Identify which UI must remain visible when each affected component fails.
4. Inventory current error, console, rejection, and browser test coverage for
   the affected layers.

Do not use an error boundary to conceal an invalid owned contract. Validate
external and runtime data before it reaches rendering.

## Classify The Failure

Classify the failure before choosing its recovery path:

- A transport failure occurs before a valid application response exists.
- A response-contract failure means the status, content type, or body does not
  match the owned runtime contract.
- An application error is a valid typed error response or rejected operation.
- A render failure is an exception while React renders, constructs, or runs a
  descendant lifecycle.
- An event failure occurs in an event handler.
- An asynchronous failure occurs in a promise, timer, subscription, worker, or
  callback outside the boundary's render path.
- A boot failure occurs before the React tree is mounted.
- A resource-exhaustion or host failure may prevent JavaScript recovery.

Do not describe graceful degradation as covering literally every exception.
State the recovery limit for each layer.

## Validate Before Rendering

- Decode every runtime response according to its observed status and content
  type before constructing typed application data.
- Reject malformed, framework-generated, unknown, and nonconforming responses
  as transport or response-contract errors.
- Let the query or operation layer expose rejected failures through its normal
  error state. Do not return a failed transport as successful query data.
- Present typed application errors through a nonthrowing view adapter.
- Make every adapter total for its declared input union and give unknown
  infrastructure failures a stable, nonsecret message and correlation path.
- Never dereference a runtime body solely because a generated static type says
  the property exists.

## Layer The Containment

Use the smallest boundary that can preserve meaningful surrounding work:

1. Wrap independent sections so one card or panel cannot remove siblings.
2. Wrap route content inside persistent navigation and application chrome.
3. Wrap the router or shell with a root React fallback.
4. Keep a host-document boot fallback visible until React mounts
   successfully.

Apply only the layers relevant to the affected architecture. A focused
section change does not require unrelated root or boot work unless the host
project already requires those layers.

Each affected React fallback must:

- render without depending on the failed subtree;
- identify the failed section or route in user language;
- preserve the outer shell and unaffected siblings;
- offer an appropriate retry, reset, navigation, or reload action;
- avoid displaying stack traces, secrets, raw response bodies, or internal
  identifiers; and
- report the failure through one shared reporting contract.

Make fallback components simpler than the content they replace. If a fallback
throws, the next outer boundary must contain it.

## Handle What Boundaries Do Not Catch

React error boundaries do not ordinarily catch:

- exceptions thrown by event handlers;
- arbitrary asynchronous callbacks and rejected promises;
- server-side rendering failures;
- exceptions thrown by the boundary itself; or
- failures before the tree mounts.

Handle event and asynchronous failures at their operation boundary. Convert
them into explicit typed state, reject them to the query or mutation layer, or
report and present a local recovery path. When application-wide reporting is
in scope, install root error and unhandled-rejection reporting before
application work begins.

When boot resilience is in scope, keep a static boot fallback in the host
document until a successful mount. Do not claim in-page recovery from a
browser process failure, an out-of-memory condition, or code that never
executes.

## Use One Reporting Contract

Report enough structured context to diagnose the failure:

- failure category;
- boundary or operation identifier;
- route or user-visible surface;
- correlation or request identifier when available;
- component stack when React supplies it; and
- recovery action and result.

Sanitize secrets, credentials, raw payloads, database keys, and personal data.
Deduplicate the same failure across a section boundary, root hook, console
capture, and global rejection handler. Preserve causality rather than
replacing the original error with a generic string.

## Failure Matrix

Select every row corresponding to a layer introduced, changed, or relied on
by the task. Cover the complete matrix only for application-wide containment
designs or audits.

| Input or failure | Expected owner | Required visible result |
| --- | --- | --- |
| Canonical application error | View adapter | Local actionable state |
| Framework error body | Runtime decoder | Rejected contract error |
| Malformed JSON shape | Runtime decoder | Rejected contract error |
| Non-JSON response | Transport decoder | Rejected transport error |
| Network failure | Query or operation | Local retry state |
| Section render throw | Section boundary | Siblings remain visible |
| Route render throw | Route boundary | Shell remains visible |
| Root descendant throw | Root boundary | Root fallback remains visible |
| Boundary fallback throw | Parent boundary | Parent fallback remains visible |
| Event-handler throw | Event operation | Local state and report |
| Async rejection | Async operation | Local state and report |
| Pre-mount failure | Host boot layer | Static boot fallback remains |

## Test Observable Survival

For each applicable failure:

- inject the failure through the real boundary under test;
- assert the smallest expected fallback is visible;
- assert the shell, route chrome, and unaffected siblings that should survive
  are still present;
- assert retry, reset, navigation, or reload behavior;
- assert the error is reported exactly once with the correct category;
- fail on unexpected console errors and unhandled rejections; and
- prove the test helper fails when an expected retained marker is removed.

Test successful rendering too. Use browser tests for boot behavior, global
reporting, real navigation, or route survival when those layers are in scope;
component tests are sufficient only for boundaries they can execute
faithfully.

## Completion

Run focused tests for every affected component, query, transport, reporting,
route, or browser layer, plus the affected frontend typecheck and static
analysis. Run the host repository's broader final gate at its required
milestone. Matching error text without proving retained UI is not containment
evidence.
