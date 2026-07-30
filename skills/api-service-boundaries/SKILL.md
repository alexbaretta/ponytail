---
name: api-service-boundaries
description: >-
  Use when defining, changing, reviewing, or testing HTTP endpoints,
  controllers, services, authorization, public identifiers, transaction
  boundaries, or API service workflows. Requires backend-enforced
  authorization, thin controllers, explicit orchestration and transactions,
  and safe public identities.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# API Service Boundaries

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

Host configuration supplies concrete service names, public-ID formats,
and authentication mechanisms.
