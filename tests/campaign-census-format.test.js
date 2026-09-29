#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { humanReport } = require('../src/campaign-census.js');

// Traceability: verifies REQ-CAMPAIGN-CENSUS-CLI
test('human report aligns census columns after long identifiers', () => {
  const report = {
    repository: { commit: 'abc123', branch: 'main', clean: true },
    campaign: {
      rootPlanId: 'root',
      plans: [
        { id: 'short', lifecycle: 'in_progress', taskletCounts: { DONE: 1, PENDING: 18, ERROR: 0 }, totalTasklets: 19 },
        { id: '2026-09-27-approved-product-implementation-campaign', lifecycle: 'in_progress', taskletCounts: { DONE: 13, PENDING: 0, ERROR: 0 }, totalTasklets: 13 },
      ],
      sprints: [
        {
          planId: '2026-09-27-approved-product-implementation-campaign',
          id: 'S01',
          planningStatus: 'APPROVED',
          executionStatus: 'IN_PROGRESS',
          taskletCounts: { DONE: 1, PENDING: 6, ERROR: 0 },
          totalTasklets: 7,
        },
      ],
    },
    totals: {
      plans: 2,
      sprints: 1,
      incompleteSprints: 1,
      plansByLifecycle: { in_progress: 2 },
      taskletsByStatus: { DONE: 14, PENDING: 18, ERROR: 0 },
      taskletCompletionPercentage: 43.75,
    },
  };

  const output = humanReport(report, '/repo', { planTable: true, sprintTable: true });

  assert.doesNotMatch(output, /\t/u);
  assert.match(output, /Lifecycle    Plan                                                 DONE  PENDING  ERROR  Total\nin_progress  short                                                   1       18      0     19\nin_progress  2026-09-27-approved-product-implementation-campaign    13        0      0     13/u);
  assert.match(output, /Plan\/Sprint                                              Planning  Execution    DONE  PENDING  ERROR  Total\n2026-09-27-approved-product-implementation-campaign\/S01  APPROVED  IN_PROGRESS     1        6      0      7/u);
});
