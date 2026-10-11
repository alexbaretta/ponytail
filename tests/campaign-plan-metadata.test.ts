// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CampaignError } from '../src/campaign-configuration.js';
import { readPlanMetadataV1, readPlanMetadataV2, readPlanMetadataV3, metadataBlocks, parseCandidate, parsePlanSource, readManagedPlan,
  type CampaignPlanInput, type CampaignPlanCandidate, type CampaignPlanMetadataV1, type CampaignPlanMetadataV2, type CampaignPlanMetadataV3,
  type CampaignPlanV1, type CampaignPlanV2, type CampaignPlanV3 } from '../src/campaign-plan-metadata.js';

function candidateInput(metadata: unknown): CampaignPlanInput {
  return { planFile: '/fixture/pm/plans/open/example/plan.md', relativePlanFile: 'pm/plans/open/example/plan.md',
    lifecycle: 'open', text: '# Example\n\nPlan ID: example\n', metadata };
}

// Traceability: verifies REQ-OBLIGATION-COMPATIBILITY
test('physical metadata readers retain versions, normalize dependencies and expose V3 obligation identity', () => {
  const campaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'example', parent_plan_id: null };
  const campaignPlanMetadataV2: CampaignPlanMetadataV2 = { schemaVersion: 2, id: 'example', parent_plan_id: null, depends_on: ['z', 'a'] };
  const campaignPlanMetadataV3: CampaignPlanMetadataV3 = { schemaVersion: 3, id: 'example', parent_plan_id: null, depends_on: ['z', 'a'], obligation_document: 'pm/obligations.json' };
  const campaignPlanV1: CampaignPlanV1 = readPlanMetadataV1(candidateInput(campaignPlanMetadataV1));
  const campaignPlanV2: CampaignPlanV2 = readPlanMetadataV2(candidateInput(campaignPlanMetadataV2));
  const campaignPlanV3: CampaignPlanV3 = readPlanMetadataV3(candidateInput(campaignPlanMetadataV3));
  assert.equal(campaignPlanV1.schemaVersion, 1);
  assert.deepEqual(campaignPlanV1.dependsOn, []);
  assert.equal(campaignPlanV2.schemaVersion, 2);
  assert.deepEqual(campaignPlanV2.dependsOn, ['a', 'z']);
  assert.equal(campaignPlanV3.schemaVersion, 3);
  assert.equal(campaignPlanV3.obligationDocument, 'pm/obligations.json');
  assert.deepEqual(campaignPlanV3.dependsOn, ['a', 'z']);
  assert.deepEqual(campaignPlanMetadataV2.depends_on, ['z', 'a']);
});

test('metadata rejects malformed dependencies, inconsistent prose and unsafe obligation paths', () => {
  const campaignPlanMetadataV2: CampaignPlanMetadataV2 = { schemaVersion: 2, id: 'example', parent_plan_id: null, depends_on: [] };
  const invalidDependencies: readonly unknown[] = [['example'], ['a', 'a'], [7], [''], null];
  for (const depends_on of invalidDependencies) {
    const campaignPlanInput: CampaignPlanInput = candidateInput({ ...campaignPlanMetadataV2, depends_on });
    assert.throws(() => readPlanMetadataV2(campaignPlanInput), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_DEPENDENCY');
  }
  const proseCampaignPlanInput: CampaignPlanInput = { ...candidateInput(campaignPlanMetadataV2), text: '# Missing identity\n' };
  assert.throws(() => readPlanMetadataV2(proseCampaignPlanInput), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_PLAN_PROSE_ID');
  const dispatchCampaignPlanInput: CampaignPlanInput = { ...candidateInput(campaignPlanMetadataV2),
    text: 'Plan ID: example\n\n## Dependencies\n- Dispatch only after [source](../source/plan.md)\n' };
  assert.throws(() => readPlanMetadataV2(dispatchCampaignPlanInput), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_DEPENDENCY');
  const campaignPlanMetadataV3: CampaignPlanMetadataV3 = { schemaVersion: 3, id: 'example', parent_plan_id: null, depends_on: [], obligation_document: 'pm/obligations.json' };
  for (const obligation_document of ['../foreign.json', '/absolute.json', 'pm\\obligations.json', 'pm//obligations.json']) {
    const campaignPlanInput: CampaignPlanInput = candidateInput({ ...campaignPlanMetadataV3, obligation_document });
    assert.throws(() => readPlanMetadataV3(campaignPlanInput), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_OBLIGATION_PATH');
  }
});

test('selected files dispatch physical versions while text parsing uses the supplied source and preserves parse failures', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-metadata-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const relative = 'pm/plans/open/example/plan.md';
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const campaignPlanMetadataV1: CampaignPlanMetadataV1 = { schemaVersion: 1, id: 'example', parent_plan_id: null };
  const campaignPlanMetadataV2: CampaignPlanMetadataV2 = { schemaVersion: 2, id: 'example', parent_plan_id: null, depends_on: [] };
  const campaignPlanMetadataV3: CampaignPlanMetadataV3 = { schemaVersion: 3, id: 'example', parent_plan_id: null, depends_on: [], obligation_document: 'pm/obligations.json' };
  for (const metadata of [campaignPlanMetadataV1, campaignPlanMetadataV2, campaignPlanMetadataV3]) {
    const text = `Plan ID: example\n\n<!-- ponytail-plan-campaign\n${JSON.stringify(metadata)}\n-->\n`;
    fs.writeFileSync(file, text);
    const campaignPlanCandidate: CampaignPlanCandidate = parseCandidate(file, 'open', root);
    assert.equal(campaignPlanCandidate.parseError, null);
    assert.equal(readManagedPlan(campaignPlanCandidate).schemaVersion, metadata.schemaVersion);
    assert.equal(metadataBlocks(text).length, 1);
  }
  const suppliedText = `Plan ID: example\n\n<!-- ponytail-plan-campaign\n${JSON.stringify(campaignPlanMetadataV1)}\n-->\n`;
  assert.equal(parsePlanSource(root, relative, 'open', suppliedText).schemaVersion, 1);
  fs.writeFileSync(file, 'Plan ID: example\n<!-- ponytail-plan-campaign\n{\n-->\n');
  const invalidCampaignPlanCandidate: CampaignPlanCandidate = parseCandidate(file, 'open', root);
  assert.ok(invalidCampaignPlanCandidate.parseError instanceof SyntaxError);
  assert.throws(() => readManagedPlan(invalidCampaignPlanCandidate), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_PLAN_JSON');
  const missingCampaignPlanCandidate: CampaignPlanCandidate = parseCandidate(path.join(root, 'missing.md'), 'open', root);
  assert.equal(missingCampaignPlanCandidate.text, null);
  assert.ok(missingCampaignPlanCandidate.parseError instanceof Error);
  fs.unlinkSync(file);
  fs.writeFileSync(path.join(root, 'source.md'), suppliedText);
  fs.symlinkSync(path.join(root, 'source.md'), file);
  assert.throws(() => parsePlanSource(root, relative, 'open', suppliedText), (error: unknown) => error instanceof CampaignError && error.code === 'CAMPAIGN_PLAN_FILE');
});
