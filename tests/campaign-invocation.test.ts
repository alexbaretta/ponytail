// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignError } from '../src/campaign-configuration.js';
import { campaignUsage, parseCampaignInvocation, type CampaignListInvocation,
  type CampaignActivateInvocation, type CampaignValidateInvocation, type CampaignReportInvocation } from '../src/campaign-invocation.js';
import type { CampaignStatus } from '../src/campaign-inventory.js';

// Traceability: verifies REQ-PONYTAIL-STATIC-LANGUAGE
test('typed list and activation invocations retain status flags, required selection and inputs', () => {
  const campaignStatuses: readonly CampaignStatus[] = ['active', 'pending', 'closed', 'deferred', 'rejected'];
  for (const campaignStatus of campaignStatuses) {
    const campaignListInvocation: CampaignListInvocation = { operation: 'list', campaignStatus };
    assert.deepEqual(parseCampaignInvocation(['list', `--${campaignStatus}`]), campaignListInvocation);
  }
  const campaignListInvocation: CampaignListInvocation = { operation: 'list', campaignStatus: 'active' };
  assert.deepEqual(parseCampaignInvocation(['list']), campaignListInvocation);
  const campaignActivateInvocation: CampaignActivateInvocation = { operation: 'activate', input: 'pm/plans/open/plan/plan.md' };
  const args = ['activate', campaignActivateInvocation.input];
  assert.deepEqual(parseCampaignInvocation(args), campaignActivateInvocation);
  assert.deepEqual(args, ['activate', campaignActivateInvocation.input]);
});

test('typed validation selection retains all/json ordering and plan selection', () => {
  const allCampaignValidateInvocation: CampaignValidateInvocation = { operation: 'validate', selection: { mode: 'all', json: false } };
  const jsonCampaignValidateInvocation: CampaignValidateInvocation = { operation: 'validate', selection: { mode: 'all', json: true } };
  const planCampaignValidateInvocation: CampaignValidateInvocation = { operation: 'validate', selection: { mode: 'plan', input: 'plan' } };
  assert.deepEqual(parseCampaignInvocation(['validate', '--all']), allCampaignValidateInvocation);
  assert.deepEqual(parseCampaignInvocation(['validate', '--all', '--json']), jsonCampaignValidateInvocation);
  assert.deepEqual(parseCampaignInvocation(['validate', '--json', '--all']), jsonCampaignValidateInvocation);
  assert.deepEqual(parseCampaignInvocation(['validate', 'plan']), planCampaignValidateInvocation);
});

test('typed report parsing retains last table flag, optional input and ordinary property names', () => {
  const emptyCampaignReportInvocation: CampaignReportInvocation = { operation: 'report', input: undefined, json: false, campaignReportTableOptions: {} };
  assert.deepEqual(parseCampaignInvocation(['report']), emptyCampaignReportInvocation);
  const campaignReportInvocation: CampaignReportInvocation = { operation: 'report', input: 'plan', json: false,
    campaignReportTableOptions: { summaryTable: true, planTable: false, sprintTable: true } };
  assert.deepEqual(parseCampaignInvocation(['report', '--no-summary-table', 'plan', '--summary-table', '--plan-table', '--no-plan-table', '--no-sprint-table', '--sprint-table']), campaignReportInvocation);
  const jsonCampaignReportInvocation: CampaignReportInvocation = { operation: 'report', input: 'plan', json: true, campaignReportTableOptions: {} };
  assert.deepEqual(parseCampaignInvocation(['report', '--json', 'plan', '--json']), jsonCampaignReportInvocation);
  for (const input of ['constructor', '__proto__', 'toString']) {
    const namedCampaignReportInvocation: CampaignReportInvocation = { operation: 'report', input, json: false, campaignReportTableOptions: {} };
    assert.deepEqual(parseCampaignInvocation(['report', input]), namedCampaignReportInvocation);
  }
});

test('invalid invocation vectors preserve exact usage errors and JSON/table conflict', () => {
  const invalidArguments: readonly (readonly string[])[] = [[], ['unknown'], ['list', 'active'], ['list', '--unknown'],
    ['list', '--active', '--pending'], ['activate'], ['activate', '--plan'], ['activate', 'a', 'b'],
    ['validate'], ['validate', '--json'], ['validate', '--unknown'], ['validate', 'a', 'b'],
    ['validate', 'plan', '--json'], ['validate', '--all', 'plan'], ['validate', '--json', 'plan'],
    ['validate', '--all', '--all'], ['validate', '--all', '--json', '--json'],
    ['report', '--unknown'], ['report', 'a', 'b']];
  for (const args of invalidArguments) assert.throws(() => parseCampaignInvocation(args), error =>
    error instanceof CampaignError && error.status === 2 && error.code === 'CAMPAIGN_USAGE' && error.message === campaignUsage());
  assert.throws(() => parseCampaignInvocation(['report', '--no-plan-table', '--json']), error =>
    error instanceof CampaignError && error.status === 2 && error.code === 'CAMPAIGN_USAGE'
    && error.message === 'table options cannot be combined with --json');
});
