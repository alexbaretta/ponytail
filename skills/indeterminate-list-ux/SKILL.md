---
name: indeterminate-list-ux
description: >-
  Use when designing, implementing, reviewing, or testing a React interface
  that displays a result set whose length is not known to remain small and
  fixed. Require infinite scrolling backed by a bounded paginated API and a
  request-shape unit test that prevents per-row backend request fanout.
---

<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Indeterminate List UX

## Trigger

Use this skill whenever a React screen, card, modal, dropdown, table, or
embedded panel displays a result set whose total size is not known to remain
small and fixed at design time.

Examples include search results, audit logs, credentials, users, sessions,
policies, payments, transactions, and any list that may grow with tenant,
account, user, or operational data.

## Required Shape

An indeterminate list must use:

- a React infinite-scroll container;
- a backend API that accepts a bounded `limit`;
- a backend API that returns a cursor or equivalent page token; and
- a frontend request-shape unit test for the exact list component.

Infinite scrolling is the required interaction for this list shape, not an
optional substitute for fetching the complete result set. Do not fetch the
entire result set and filter, sort, or slice it only in React.

Row components must not fetch their own display data, authorization state,
usage state, relationship counts, or enrichment data. The list API must return
the row DTO needed to render the list. Full details may be loaded only after a
user opens or activates a detail view.

## Request-Shape Contract

For a fixture with `N` records, maximum page size `P_max`, and page count
`P = ceil(N / P_max)`, the browser-to-backend request count must fit:

```text
total_requests = h + i * P + k * N
```

The required values are:

- `h <= 3` for container or bootstrap calls;
- `i == 1` for list or search requests per page;
- `k == 0` for per-record requests;
- `total_requests <= h_max + P`;
- every list or search request uses `limit <= P_max`; and
- large fixtures use `P_max << N`.

Use a fixture large enough that a monolithic query is observable and fails.
For example, with `N = 125` and `P_max = 50`, the test must observe three page
requests, not one request returning all 125 records.

## Forbidden Row Fanout

The list render path must issue zero row-triggered backend requests, including:

- detail requests for each row;
- authorization requests for each row;
- usage requests for each row;
- relationship-count requests for each row;
- enrichment or normalization requests for each row; and
- requests whose path or body contains a fixture row identifier, unless the
  request is the approved list or search request carrying the page payload.

If a row needs a capability, label, count, summary, or disabled reason, add it
to the paginated list DTO and compute it in the list endpoint.

## Unit Test Requirement

Each indeterminate list component must have a focused React unit test that:

1. mocks backend APIs with a deterministic `N`-record fixture;
2. configures `P_max`;
3. renders the list component;
4. scrolls until the list is exhausted;
5. counts all backend API calls by endpoint category;
6. asserts the request-shape contract; and
7. fails if any fixture row identifier appears in an unexpected request.

Categorize endpoints in the test harness as:

- `list_page`: the one allowed paginated list or search endpoint;
- `bootstrap`: explicit setup endpoints, capped by `h_max`; and
- `forbidden_row_fanout`: detail, authorization, usage, enrichment, or
  row-specific endpoints.

Prefer a shared assertion helper so every list test reports `h`, `i`, `P`,
`k`, `N`, `P_max`, and total requests.

## Review Checklist

- The interface does not render from a full unbounded dataset.
- The API exposes `limit` and cursor or page-token fields.
- The component requests at most `P_max` rows per page.
- Infinite scroll loads the next page only when needed.
- Row display uses only data from the list DTO.
- User-initiated detail navigation may call a detail endpoint.
- User-initiated mutations still authorize on the backend.
- The request-shape test fails if a row component adds a backend call.
