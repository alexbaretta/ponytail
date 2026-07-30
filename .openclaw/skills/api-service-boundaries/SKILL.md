---
name: api-service-boundaries
description: "API trust and service architecture"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# API Service Boundaries

## Project Configuration Contract

The host configures this skill in `AGENTS.md`, directly or by reference, with:

- `API architecture and ownership`;
- `Authorization owner`;
- `Public identifier policy`; and
- `API validation commands`.

The defaults are a backend authorization owner, opaque public identifiers that
are distinct from database primary keys, focused endpoint and service tests,
and the host's configured milestone gate. Concrete owners and formats must be
discovered from implementation and recorded before a change depends on them.

## Trust Boundaries And Identity

- Never expose an internal database primary key across a trust boundary.
- Use a stable public identifier designed for external contracts, URLs,
  user-visible output, downloads, and customer-facing logs.
- Authenticate every protected endpoint and enforce authorization on the
  backend.
- Keep authorization decisions in the host project's declared authorization
  owner. A client may hide controls for usability but never supplies the
  authoritative decision.
- Do not move data through a contract whose domain name or semantics do not
  match it. A misleading name is a contract defect.

## Controller And Service Responsibilities

- Keep controllers as protocol adapters: validate transport input, invoke one
  service operation, and map the result to the transport contract.
- Put business workflow orchestration in services or the host's declared
  application layer.
- Keep transaction boundaries explicit and auditable.
- Do not hold a database transaction open across a long-lived external call.
- Within one request, avoid multiple transactions except for a documented
  pre-external-call and post-external-call persistence pattern.
- When an external side effect separates transactions, define durable operation
  state, idempotency, timeout-ambiguity handling, retry behavior, and any
  required compensation or reconciliation. Use an outbox or equivalent durable
  handoff when reliable follow-up work cannot share the transaction.
- Fail contract-critical behavior explicitly; do not add silent fallbacks.

## Workflow

1. Locate the canonical API, identity, authorization, and transaction owners.
2. Identify every trust boundary and public identifier involved.
3. Confirm endpoint authentication and backend authorization for success and
   denial paths.
4. Keep the controller thin and place orchestration in the declared service
   layer.
5. Map database and external-call transaction boundaries explicitly.
6. Use `versioned-data-contracts` when a request or response is durable,
   explicitly versioned, or consumed by independently deployed or external
   clients under a compatibility commitment. Internal controller-to-service
   arguments released atomically do not trigger serialized-contract versioning.
7. Add focused tests for authentication failure, authorization denial, invalid
   public identity, service failure, and transaction or external-call edges.
8. Run the host's focused API checks, then its milestone gate.

The configured API architecture supplies concrete service names, public-ID
formats, and authentication mechanisms.
